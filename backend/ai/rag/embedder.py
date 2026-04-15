"""Convert Device/Alert records into structured text chunks for embedding."""

import logging
from typing import Any

logger = logging.getLogger(__name__)


def device_to_chunks(device: dict[str, Any], scan_id: int | None = None) -> list[dict[str, Any]]:
    """Convert a device record into embeddable text chunks with metadata."""
    mac = device.get("mac", "unknown")
    ip = device.get("ip", "unknown")
    hostname = device.get("hostname", "") or "unknown"
    vendor = device.get("vendor", "") or "unknown"
    os_info = device.get("os", "") or "unknown"
    device_type = device.get("device_type", "unknown")
    risk_score = device.get("risk_score", 0)
    ports = device.get("open_ports", {})
    services = device.get("services", {})
    cves = device.get("cves", [])
    is_trusted = device.get("is_trusted", False)
    last_seen = device.get("last_seen", "")

    # Determine risk tier for metadata filtering
    if risk_score >= 76:
        risk_tier = "critical"
    elif risk_score >= 51:
        risk_tier = "high"
    elif risk_score >= 21:
        risk_tier = "medium"
    else:
        risk_tier = "low"

    # Build device summary chunk
    port_list = ", ".join(f"{p}/{s}" for p, s in ports.items()) if ports else "none"
    cve_list = ", ".join(cves) if cves else "none"

    summary = (
        f"Device: {hostname} ({ip})\n"
        f"MAC: {mac} | Vendor: {vendor} | Type: {device_type}\n"
        f"OS: {os_info}\n"
        f"Risk Score: {risk_score}/100 ({risk_tier})\n"
        f"Open Ports: {port_list}\n"
        f"Known CVEs: {cve_list}\n"
        f"Trusted: {'Yes' if is_trusted else 'No'}\n"
        f"Last Seen: {last_seen}"
    )

    metadata = {
        "type": "device",
        "mac": mac,
        "ip": ip,
        "device_type": device_type,
        "risk_tier": risk_tier,
        "risk_score": risk_score,
    }
    if scan_id is not None:
        metadata["scan_id"] = scan_id

    chunks = [{"id": f"device-{mac}", "text": summary, "metadata": metadata}]

    # Add per-port chunks for detailed retrieval
    for port, service in ports.items():
        port_text = (
            f"Device {hostname} ({ip}) has port {port} open running {service}.\n"
            f"Device type: {device_type}, Vendor: {vendor}, Risk: {risk_score}/100"
        )
        chunks.append({
            "id": f"device-{mac}-port-{port}",
            "text": port_text,
            "metadata": {**metadata, "port": str(port), "service": service},
        })

    return chunks


def alert_to_chunk(alert: dict[str, Any]) -> dict[str, Any]:
    """Convert an alert record into an embeddable text chunk."""
    text = (
        f"Alert: {alert.get('alert_type', 'unknown')} "
        f"(Severity: {alert.get('severity', 'unknown')})\n"
        f"Device: {alert.get('device_mac', 'N/A')}\n"
        f"Message: {alert.get('message', '')}\n"
        f"Time: {alert.get('timestamp', '')}"
    )
    return {
        "id": f"alert-{alert.get('id', 0)}",
        "text": text,
        "metadata": {
            "type": "alert",
            "alert_type": alert.get("alert_type", ""),
            "severity": alert.get("severity", ""),
            "device_mac": alert.get("device_mac", ""),
        },
    }
