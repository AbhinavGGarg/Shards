"""Shards — FastAPI application entry point."""

import asyncio
import json
import logging
import os
import sys
import types
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator

# Support both import styles:
# - `import backend.main` (repo root on PYTHONPATH)
# - `import main` (backend/ as working directory, common on serverless entrypoints)
_backend_dir = Path(__file__).resolve().parent
_repo_root = _backend_dir.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

# Some serverless runtimes execute from the backend directory itself
# (flattened layout: main.py, config.py, scanner/, ...). In that case
# there is no physical `backend/` package folder, but our imports use
# `backend.*`. Create a lightweight package alias that points at the
# current directory so those imports still work.
if not (_backend_dir / "backend").exists() and "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(_backend_dir)]  # type: ignore[attr-defined]
    backend_pkg.__file__ = str(_backend_dir / "__init__.py")
    sys.modules["backend"] = backend_pkg

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.config import BIND_HOST, SCAN_SUBNET, SCAN_INTERVAL, DATA_DIR
from backend.database import (
    init_db,
    insert_device,
    get_all_devices,
    get_device,
    insert_scan,
    get_stats,
    get_alerts,
    acknowledge_alert,
    trust_device,
    insert_alert,
    insert_framework,
    get_frameworks,
    get_framework,
    insert_assessment,
    get_assessment,
)
from backend.websocket import manager

logger = logging.getLogger(__name__)


_background_scanner_task: asyncio.Task[None] | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize resources on startup, clean up on shutdown."""
    global _background_scanner_task
    init_db()
    logger.info("Shards backend started")
    _background_scanner_task = asyncio.create_task(_background_scan_loop())
    yield
    if _background_scanner_task:
        _background_scanner_task.cancel()
    logger.info("Shards backend shutting down")


app = FastAPI(
    title="Shards",
    description="AI-Powered Network Security Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health ---

@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "shards"}


# --- Scanning ---

@app.post("/api/scan")
async def trigger_scan() -> dict[str, Any]:
    """Trigger a network scan, store results, return summary."""
    from backend.scanner import run_scan

    started = datetime.now(timezone.utc).isoformat()
    devices = await run_scan()

    # Store devices and detect rogue devices
    alerts_generated = 0
    for device in devices:
        insert_device(device.to_dict())

        # Rogue device detection: untrusted devices generate alerts
        if not device.is_trusted:
            existing = get_device(device.mac)
            is_newly_untrusted = existing is None or not existing.get("is_trusted", False)
            if is_newly_untrusted:
                now = datetime.now(timezone.utc).isoformat()
                alert_id = insert_alert({
                    "timestamp": now,
                    "alert_type": "rogue_device",
                    "severity": "high",
                    "device_mac": device.mac,
                    "message": f"Rogue device detected: {device.ip} ({device.vendor or 'Unknown vendor'}) — MAC {device.mac}",
                })
                alerts_generated += 1
                await manager.broadcast("alert", {
                    "id": alert_id,
                    "alert_type": "rogue_device",
                    "severity": "high",
                    "device_mac": device.mac,
                    "message": f"Rogue device detected: {device.ip}",
                })

    # Store scan record
    completed = datetime.now(timezone.utc).isoformat()
    scan_id = insert_scan({
        "started_at": started,
        "completed_at": completed,
        "devices_found": len(devices),
        "alerts_generated": alerts_generated,
        "subnet": SCAN_SUBNET,
        "snapshot": [d.to_dict() for d in devices],
    })

    # Auto-ingest into ChromaDB for RAG
    try:
        from backend.ai.rag.ingestion import ingest_scan_data
        ingest_scan_data(
            [d.to_dict() for d in devices],
            get_alerts(),
            scan_id=scan_id,
        )
    except Exception as e:
        logger.warning("RAG ingestion failed: %s", e)

    # Broadcast scan complete event
    await manager.broadcast("scan_complete", {
        "scan_id": scan_id,
        "devices_found": len(devices),
        "alerts_generated": alerts_generated,
    })

    return {
        "scan_id": scan_id,
        "status": "complete",
        "devices_found": len(devices),
    }


# --- Devices ---

@app.get("/api/devices")
async def list_devices() -> list[dict[str, Any]]:
    """Return all discovered devices."""
    return get_all_devices()


@app.get("/api/devices/{mac}")
async def device_detail(mac: str) -> dict[str, Any]:
    """Return full details for a single device."""
    device = get_device(mac)
    if not device:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@app.patch("/api/devices/{mac}/trust")
async def mark_trusted(mac: str) -> dict[str, Any]:
    """Mark a device as trusted."""
    success = trust_device(mac)
    return {"success": success}


# --- Topology ---

@app.get("/api/topology")
async def topology() -> dict[str, Any]:
    """Return nodes and edges for the network graph."""
    devices = get_all_devices()

    # Find router (device_type == 'router') or use first device as gateway
    router_mac = None
    for d in devices:
        if d["device_type"] == "router":
            router_mac = d["mac"]
            break

    nodes = []
    edges = []
    for d in devices:
        nodes.append({
            "id": d["mac"],
            "ip": d["ip"],
            "hostname": d["hostname"],
            "vendor": d["vendor"],
            "device_type": d["device_type"],
            "risk_score": d["risk_score"],
            "open_ports": d["open_ports"],
            "is_router": d["mac"] == router_mac,
        })
        # Connect every device to the router (star topology)
        if router_mac and d["mac"] != router_mac:
            edges.append({"source": router_mac, "target": d["mac"]})

    return {"nodes": nodes, "edges": edges}


# --- Stats ---

@app.get("/api/stats")
async def stats() -> dict[str, Any]:
    """Return summary statistics."""
    return get_stats()


# --- Alerts ---

@app.get("/api/alerts")
async def list_alerts(
    severity: str | None = Query(None),
    type: str | None = Query(None),
) -> list[dict[str, Any]]:
    """Return alerts with optional filters."""
    return get_alerts(severity=severity, alert_type=type)


@app.patch("/api/alerts/{alert_id}/ack")
async def ack_alert(alert_id: int) -> dict[str, Any]:
    """Acknowledge an alert."""
    success = acknowledge_alert(alert_id)
    return {"success": success}


# --- RAG Chat ---

_chat_history: list[dict[str, str]] = []


@app.post("/api/rag/query")
async def rag_query(body: dict[str, Any]) -> dict[str, Any]:
    """Accept analyst question, run RAG pipeline, return response."""
    from backend.ai.analyzer import analyze_query

    question = body.get("question", "")
    if not question:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Question is required")

    _chat_history.append({"role": "user", "content": question})
    result = await analyze_query(question)
    _chat_history.append({"role": "assistant", "content": result["response"]})

    return result


@app.get("/api/rag/history")
async def rag_history() -> dict[str, Any]:
    """Return chat history for current session."""
    return {"messages": _chat_history}


@app.post("/api/rag/ingest")
async def rag_ingest() -> dict[str, Any]:
    """Manually trigger ingestion of current scan data into ChromaDB."""
    from backend.ai.rag.ingestion import ingest_scan_data

    devices = get_all_devices()
    alerts = get_alerts()
    count = ingest_scan_data(devices, alerts)
    return {"status": "complete", "documents_ingested": count}


# --- Compliance ---

@app.post("/api/compliance/upload")
async def compliance_upload(body: dict[str, Any]) -> dict[str, Any]:
    """Accept compliance document content (JSON), parse, and store framework."""
    from backend.compliance.parser import parse_compliance_document
    import uuid

    content = body.get("content")
    filename = body.get("filename", "document.json")
    framework_name = body.get("framework_name", "Unknown Framework")

    if not content:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Content is required")

    # Parse content based on type
    if isinstance(content, list):
        controls = content
    elif isinstance(content, str):
        controls = parse_compliance_document(
            content=content.encode("utf-8"),
            filename=filename,
        )
    else:
        controls = parse_compliance_document(
            content=json.dumps(content).encode("utf-8"),
            filename="document.json",
        )

    framework_id = str(uuid.uuid4())[:8]
    insert_framework({
        "id": framework_id,
        "name": framework_name,
        "controls": controls,
        "upload_date": datetime.now(timezone.utc).isoformat(),
    })

    # Ingest controls into ChromaDB for RAG-based assessment
    try:
        from backend.ai.rag.ingestion import ingest_scan_data
        control_docs = [{
            "mac": f"control-{c.get('control_id', i)}",
            "ip": "N/A",
            "hostname": c.get("title", ""),
            "vendor": framework_name,
            "os": "",
            "device_type": "compliance_control",
            "open_ports": {},
            "services": {},
            "risk_score": 0,
            "cves": [],
            "first_seen": "",
            "last_seen": "",
        } for i, c in enumerate(controls)]
        # Don't ingest as devices, just store in framework
    except Exception:
        pass

    return {
        "framework_id": framework_id,
        "name": framework_name,
        "controls_parsed": len(controls),
    }


@app.get("/api/compliance/frameworks")
async def list_frameworks() -> list[dict[str, Any]]:
    """List ingested compliance frameworks."""
    frameworks = get_frameworks()
    return [{"id": f["id"], "name": f["name"], "version": f.get("version", ""),
             "controls_count": len(f.get("controls", [])), "upload_date": f["upload_date"]}
            for f in frameworks]


@app.post("/api/compliance/assess")
async def compliance_assess(body: dict[str, Any]) -> dict[str, Any]:
    """Run compliance assessment against a framework."""
    from backend.compliance.assessor import assess_framework
    from backend.compliance.report_generator import generate_compliance_report

    framework_id = body.get("framework_id", "")
    framework = get_framework(framework_id)
    if not framework:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Framework not found")

    controls = framework.get("controls", [])
    assessments = await assess_framework(controls)

    # Generate PDF report
    report_path = generate_compliance_report(framework["name"], assessments)

    # Store assessment
    assessment_id = insert_assessment({
        "framework_id": framework_id,
        "assessed_at": datetime.now(timezone.utc).isoformat(),
        "results": assessments,
        "report_path": report_path,
    })

    return {
        "assessment_id": assessment_id,
        "framework": framework["name"],
        "controls_assessed": len(assessments),
        "compliant": sum(1 for a in assessments if a["verdict"] == "Compliant"),
        "partial": sum(1 for a in assessments if a["verdict"] == "Partial"),
        "non_compliant": sum(1 for a in assessments if a["verdict"] == "Non-Compliant"),
        "report_path": report_path,
    }


@app.get("/api/compliance/report/{assessment_id}")
async def compliance_report_download(assessment_id: int):
    """Download a generated compliance report PDF."""
    from fastapi.responses import FileResponse

    assessment = get_assessment(assessment_id)
    if not assessment or not assessment.get("report_path"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")

    return FileResponse(
        assessment["report_path"],
        media_type="application/pdf",
        filename=os.path.basename(assessment["report_path"]),
    )


# --- Security Report ---

@app.post("/api/report")
async def generate_report() -> dict[str, Any]:
    """Generate a full security assessment PDF report."""
    from backend.report import generate_security_report

    filepath = await generate_security_report()
    filename = os.path.basename(filepath)
    return {"report_url": f"/api/report/download/{filename}", "filepath": filepath}


@app.get("/api/report/download/{filename}")
async def download_report(filename: str):
    """Download a generated security report."""
    from fastapi.responses import FileResponse

    filepath = str(DATA_DIR / "reports" / filename)
    if not os.path.exists(filepath):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")

    return FileResponse(filepath, media_type="application/pdf", filename=filename)


# --- Attack Simulation ---

@app.post("/api/ai/attack-sim")
async def attack_simulation(body: dict[str, Any]) -> dict[str, Any]:
    """Simulate lateral movement from a compromised device."""
    from backend.ai.attack_sim import simulate_attack

    device_id = body.get("device_id", "")
    if not device_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="device_id is required")

    return await simulate_attack(device_id)


# --- Background Scanner ---

async def _background_scan_loop() -> None:
    """Run scans at SCAN_INTERVAL, detect changes, broadcast events."""
    # Wait for initial manual scan before starting background loop
    await asyncio.sleep(SCAN_INTERVAL)

    while True:
        try:
            logger.info("Background scan starting")
            previous_devices = {d["mac"]: d for d in get_all_devices()}

            from backend.scanner import run_scan
            current_devices = await run_scan()

            current_macs = {d.mac for d in current_devices}
            previous_macs = set(previous_devices.keys())

            # Detect joined devices
            for device in current_devices:
                if device.mac not in previous_macs:
                    insert_device(device.to_dict())
                    await manager.broadcast("device_joined", device.to_dict())
                    logger.info("Device joined: %s (%s)", device.ip, device.mac)
                else:
                    # Check for port changes
                    old = previous_devices[device.mac]
                    old_ports = set(old.get("open_ports", {}).keys())
                    new_ports = set(str(p) for p in device.open_ports.keys())
                    if old_ports != new_ports:
                        insert_device(device.to_dict())
                        await manager.broadcast("port_change", {
                            "mac": device.mac,
                            "ip": device.ip,
                            "old_ports": list(old_ports),
                            "new_ports": list(new_ports),
                        })
                        logger.info("Port change on %s: %s -> %s", device.ip, old_ports, new_ports)
                    else:
                        # Update last_seen
                        insert_device(device.to_dict())

            # Detect left devices
            for mac in previous_macs - current_macs:
                old = previous_devices[mac]
                await manager.broadcast("device_left", {
                    "mac": mac,
                    "ip": old.get("ip", ""),
                })
                logger.info("Device left: %s (%s)", old.get("ip", ""), mac)

            # Rogue detection for new untrusted devices
            for device in current_devices:
                if device.mac not in previous_macs and not device.is_trusted:
                    now = datetime.now(timezone.utc).isoformat()
                    alert_id = insert_alert({
                        "timestamp": now,
                        "alert_type": "rogue_device",
                        "severity": "high",
                        "device_mac": device.mac,
                        "message": f"Rogue device detected: {device.ip} ({device.vendor or 'Unknown vendor'}) — MAC {device.mac}",
                    })
                    await manager.broadcast("alert", {
                        "id": alert_id,
                        "alert_type": "rogue_device",
                        "severity": "high",
                        "device_mac": device.mac,
                        "message": f"Rogue device detected: {device.ip}",
                    })

            # Store scan record
            now = datetime.now(timezone.utc).isoformat()
            insert_scan({
                "started_at": now,
                "completed_at": now,
                "devices_found": len(current_devices),
                "alerts_generated": 0,
                "subnet": SCAN_SUBNET,
                "snapshot": [d.to_dict() for d in current_devices],
            })

            await manager.broadcast("scan_complete", {
                "devices_found": len(current_devices),
                "background": True,
            })

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Background scan error: %s", e)

        await asyncio.sleep(SCAN_INTERVAL)


# --- WebSocket ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time events."""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
