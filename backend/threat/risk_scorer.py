"""Device risk scoring algorithm (0-100).

Scoring breakdown per spec:
- Open ports:        30 pts max
- Identity:          15 pts max
- OS currency:       20 pts max
- CVEs:              25 pts max
- Insecure protocols:10 pts max
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Dangerous ports and their base scores
DANGEROUS_PORTS = {
    21: 6,    # FTP
    23: 8,    # Telnet
    25: 3,    # SMTP
    53: 2,    # DNS
    80: 1,    # HTTP (not HTTPS)
    135: 4,   # MSRPC
    139: 5,   # NetBIOS
    445: 6,   # SMB
    554: 3,   # RTSP
    1433: 5,  # MSSQL
    1521: 5,  # Oracle
    3306: 4,  # MySQL
    3389: 5,  # RDP
    5432: 4,  # PostgreSQL
    5555: 6,  # ADB
    5900: 5,  # VNC
    8080: 2,  # HTTP alt
    9100: 3,  # JetDirect
}

INSECURE_PROTOCOLS = {"telnet", "ftp", "tftp", "rlogin", "rsh", "rexec", "snmp"}

EOL_OS_KEYWORDS = [
    "windows xp", "windows 7", "windows 8",
    "centos 6", "centos 7",
    "ubuntu 16", "ubuntu 14", "ubuntu 12",
    "linux 2.", "linux 3.",
    "android 8", "android 9", "android 10",
]


def score_device(device: dict[str, Any]) -> float:
    """Calculate risk score (0-100) for a device."""
    port_score = _score_open_ports(device)
    identity_score = _score_identity(device)
    os_score = _score_os(device)
    cve_score = _score_cves(device)
    protocol_score = _score_insecure_protocols(device)

    total = port_score + identity_score + os_score + cve_score + protocol_score
    clamped = min(100.0, max(0.0, total))

    logger.debug(
        "Risk score for %s: ports=%.1f identity=%.1f os=%.1f cve=%.1f proto=%.1f total=%.1f",
        device.get("mac", "?"),
        port_score, identity_score, os_score, cve_score, protocol_score, clamped,
    )
    return round(clamped, 1)


def _score_open_ports(device: dict[str, Any]) -> float:
    """Score based on open ports (max 30)."""
    ports = device.get("open_ports", {})
    if not ports:
        return 0.0

    score = 0.0
    for port_str in ports:
        port = int(port_str)
        score += DANGEROUS_PORTS.get(port, 1)

    return min(30.0, score)


def _score_identity(device: dict[str, Any]) -> float:
    """Score based on device identity unknowns (max 15)."""
    score = 0.0
    if not device.get("hostname"):
        score += 5
    if not device.get("vendor"):
        score += 5
    if device.get("device_type", "unknown") == "unknown":
        score += 5
    return min(15.0, score)


def _score_os(device: dict[str, Any]) -> float:
    """Score based on OS currency / end-of-life (max 20)."""
    os_info = (device.get("os") or "").lower()
    if not os_info:
        return 10.0  # Unknown OS is moderate risk

    for keyword in EOL_OS_KEYWORDS:
        if keyword in os_info:
            return 20.0

    return 0.0


def _score_cves(device: dict[str, Any]) -> float:
    """Score based on known CVEs (max 25)."""
    cves = device.get("cves", [])
    if not cves:
        return 0.0
    # 8 points per CVE, capped at 25
    return min(25.0, len(cves) * 8.0)


def _score_insecure_protocols(device: dict[str, Any]) -> float:
    """Score based on insecure protocols detected (max 10)."""
    ports = device.get("open_ports", {})
    services = device.get("services", {})
    score = 0.0

    all_services = set()
    for v in list(ports.values()) + list(services.values()):
        all_services.add(str(v).lower())

    for proto in INSECURE_PROTOCOLS:
        if any(proto in svc for svc in all_services):
            score += 5

    # Check for telnet/FTP by port number
    port_numbers = {int(p) for p in ports}
    if 23 in port_numbers:
        score += 3  # Extra penalty for telnet
    if 21 in port_numbers:
        score += 2  # Extra penalty for FTP

    return min(10.0, score)
