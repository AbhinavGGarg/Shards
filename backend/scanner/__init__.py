"""Scanner orchestrator — coordinates ARP, port, OUI, and OS scanning."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from backend.config import FRAGMENTS_MOCK, SCAN_SUBNET
from backend.models.device import Device

logger = logging.getLogger(__name__)


async def run_scan(subnet: str | None = None) -> list[Device]:
    """Run a full network scan and return discovered devices.

    In mock mode (FRAGMENTS_MOCK=1), returns fixture data.
    In live mode, runs ARP → port scan → OUI → OS fingerprint pipeline.
    """
    if FRAGMENTS_MOCK:
        from backend.scanner.mock_scanner import mock_scan
        devices = await mock_scan()
        # Re-score with the risk scorer for consistency
        from backend.threat.risk_scorer import score_device
        for device in devices:
            device.risk_score = score_device(device.to_dict())
        return devices

    subnet = subnet or SCAN_SUBNET
    now = datetime.now(timezone.utc).isoformat()

    # Step 1: ARP discovery
    from backend.scanner.arp_scanner import arp_scan
    hosts = await arp_scan(subnet)

    from backend.scanner.oui_lookup import lookup_vendor
    from backend.scanner.os_fingerprint import fingerprint_os
    from backend.scanner.port_scanner import scan_ports

    async def _profile_host(ip: str, mac: str) -> Device:
        vendor = lookup_vendor(mac)
        port_result = await scan_ports(ip)
        os_info = port_result.get("os", "") or await fingerprint_os(ip)
        ports = port_result.get("ports", {})
        return Device(
            mac=mac,
            ip=ip,
            hostname="",
            vendor=vendor,
            os=os_info,
            device_type=_guess_device_type(ports, vendor),
            open_ports=ports,
            services={str(k): v for k, v in ports.items()},
            first_seen=now,
            last_seen=now,
        )

    devices: list[Device] = list(
        await asyncio.gather(*(_profile_host(ip, mac) for ip, mac in hosts))
    )

    # Score all devices
    from backend.threat.risk_scorer import score_device
    for device in devices:
        device.risk_score = score_device(device.to_dict())

    logger.info("Scan complete: found %d devices", len(devices))
    return devices


def _guess_device_type(ports: dict[Any, str], vendor: str) -> str:
    """Heuristic device type classification based on ports and vendor."""
    vendor_lower = vendor.lower()
    port_numbers = {int(p) for p in ports}

    if any(kw in vendor_lower for kw in ("cisco", "netgear", "ubiquiti", "tp-link")):
        if 80 in port_numbers or 443 in port_numbers:
            return "router"

    if 9100 in port_numbers or ("hp" in vendor_lower and "jet" in vendor_lower):
        return "printer"

    if 3389 in port_numbers or 445 in port_numbers:
        return "desktop"

    if 22 in port_numbers and (80 in port_numbers or 443 in port_numbers):
        if 3306 in port_numbers or 5432 in port_numbers:
            return "server"

    if not ports:
        if any(kw in vendor_lower for kw in ("apple", "samsung", "google")):
            return "phone"

    if any(p in port_numbers for p in (554, 8080, 9998)):
        return "iot"

    return "unknown"
