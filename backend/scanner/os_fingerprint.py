"""OS fingerprinting via nmap -O output parsing."""

import logging

import nmap

logger = logging.getLogger(__name__)


async def fingerprint_os(ip: str) -> str:
    """Attempt OS fingerprinting on target IP. Returns OS string or empty."""
    scanner = nmap.PortScanner()
    try:
        scanner.scan(ip, arguments="-O -T4")
        if ip in scanner.all_hosts():
            host = scanner[ip]
            if "osmatch" in host and host["osmatch"]:
                return host["osmatch"][0].get("name", "")
        return ""
    except Exception as e:
        logger.warning("OS fingerprint failed for %s: %s", ip, e)
        return ""
