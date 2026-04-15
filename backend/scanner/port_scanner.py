"""Nmap port and service scanning."""

import asyncio
import logging
from typing import Any

import nmap

logger = logging.getLogger(__name__)


def _scan_blocking(ip: str) -> dict[str, Any]:
    scanner = nmap.PortScanner()
    scanner.scan(
        ip,
        arguments="-sV -T4 --top-ports 100 --min-parallelism 10 --max-retries 1 --host-timeout 30s",
    )
    ports: dict[int, str] = {}
    os_guess = ""
    if ip in scanner.all_hosts():
        host = scanner[ip]
        for proto in host.all_protocols():
            for port in host[proto]:
                state = host[proto][port]
                if state.get("state") == "open":
                    ports[port] = state.get("name", "unknown")
        if "osmatch" in host and host["osmatch"]:
            os_guess = host["osmatch"][0].get("name", "")
    return {"ports": ports, "os": os_guess}


async def scan_ports(ip: str) -> dict[str, Any]:
    """Scan top 100 ports on a host, return open ports and OS guess.

    Returns:
        {
            "ports": {port_number: service_name, ...},
            "os": "OS guess string"
        }
    """
    try:
        logger.info("Port scanning %s", ip)
        return await asyncio.to_thread(_scan_blocking, ip)
    except Exception as e:
        logger.error("Port scan failed for %s: %s", ip, e)
        return {"ports": {}, "os": ""}
