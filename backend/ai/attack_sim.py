"""Attack path simulation — build lateral movement graph from device data."""

import logging
from typing import Any

from backend.config import ANTHROPIC_API_KEY, LLM_MODEL, FRAGMENTS_MOCK
from backend.database import get_all_devices, get_device

logger = logging.getLogger(__name__)

# Ports that enable lateral movement
LATERAL_PORTS = {
    22: "SSH access",
    23: "Telnet access (unencrypted)",
    445: "SMB file sharing",
    3389: "RDP remote desktop",
    5900: "VNC remote desktop",
    3306: "MySQL database",
    5432: "PostgreSQL database",
    21: "FTP file transfer",
    135: "MSRPC",
    139: "NetBIOS",
    5555: "ADB debugging",
}


async def simulate_attack(device_id: str) -> dict[str, Any]:
    """Simulate lateral movement from a compromised device.

    Returns attack path (list of device MACs) and narration.
    """
    source = get_device(device_id)
    if not source:
        return {"path": [], "narration": "Device not found.", "steps": []}

    all_devices = get_all_devices()
    path, steps = _build_attack_path(source, all_devices)

    narration = _generate_narration(source, path, steps)

    return {
        "path": [d["mac"] for d in path],
        "narration": narration,
        "steps": steps,
        "source": source["mac"],
    }


def _build_attack_path(
    source: dict[str, Any],
    all_devices: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Build attack path using greedy traversal toward highest-value targets."""
    visited = {source["mac"]}
    path = [source]
    steps: list[dict[str, Any]] = []

    current = source
    # Up to 5 hops
    for _ in range(5):
        best_target = None
        best_score = -1
        best_method = ""

        source_ports = set(int(p) for p in current.get("open_ports", {}))

        for device in all_devices:
            if device["mac"] in visited:
                continue

            target_ports = set(int(p) for p in device.get("open_ports", {}))

            # Find exploitable connection
            method = _find_lateral_method(source_ports, target_ports, current, device)
            if not method:
                continue

            # Prefer high-value targets (servers, databases)
            value = device.get("risk_score", 0)
            if device.get("device_type") == "server":
                value += 20
            if any(int(p) in (3306, 5432) for p in device.get("open_ports", {})):
                value += 15

            if value > best_score:
                best_score = value
                best_target = device
                best_method = method

        if best_target is None:
            break

        visited.add(best_target["mac"])
        path.append(best_target)
        steps.append({
            "from_ip": current["ip"],
            "from_host": current.get("hostname", ""),
            "to_ip": best_target["ip"],
            "to_host": best_target.get("hostname", ""),
            "method": best_method,
            "risk": best_target.get("risk_score", 0),
        })
        current = best_target

    return path, steps


def _find_lateral_method(
    source_ports: set[int],
    target_ports: set[int],
    source: dict[str, Any],
    target: dict[str, Any],
) -> str:
    """Determine if lateral movement is possible and return the method."""
    methods: list[str] = []

    for port, desc in LATERAL_PORTS.items():
        if port in target_ports:
            methods.append(f"Port {port} ({desc})")

    # Check for shared CVEs that enable exploitation
    source_cves = set(source.get("cves", []))
    target_cves = set(target.get("cves", []))
    if target_cves:
        methods.append(f"Exploit CVEs: {', '.join(list(target_cves)[:2])}")

    # Untrusted devices are easier targets
    if not target.get("is_trusted"):
        methods.append("Untrusted device — no NAC enforcement")

    if methods:
        return methods[0]  # Return primary method
    return ""


def _generate_narration(
    source: dict[str, Any],
    path: list[dict[str, Any]],
    steps: list[dict[str, Any]],
) -> str:
    """Generate attack narration text."""
    if not steps:
        return (
            f"Starting from **{source['ip']}** ({source.get('hostname', 'unknown')}), "
            f"no viable lateral movement paths were found. This device is relatively isolated."
        )

    lines: list[str] = []
    lines.append(
        f"**Attack Origin:** {source['ip']} ({source.get('hostname', 'unknown')}) — "
        f"{source.get('vendor', 'Unknown vendor')}, Risk: {source.get('risk_score', 0)}/100"
    )
    lines.append("")

    for i, step in enumerate(steps, 1):
        lines.append(
            f"**Step {i}:** Move from {step['from_ip']} ({step['from_host'] or '?'}) "
            f"→ {step['to_ip']} ({step['to_host'] or '?'})"
        )
        lines.append(f"  Method: {step['method']}")
        lines.append(f"  Target Risk: {step['risk']}/100")
        lines.append("")

    final = path[-1]
    lines.append(
        f"**Impact:** Attacker reaches **{final['ip']}** ({final.get('hostname', 'unknown')}) "
        f"— a {final.get('device_type', 'unknown')} device with risk score {final.get('risk_score', 0)}/100. "
        f"Total chain: {len(steps)} hop(s) across {len(path)} devices."
    )

    return "\n".join(lines)
