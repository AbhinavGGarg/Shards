"""ARP scan (scapy) with ICMP sweep fallback for NAT-isolated networks."""

import asyncio
import ipaddress
import logging
import re
import subprocess
from typing import Any

logger = logging.getLogger(__name__)

_MAC_RE = re.compile(r"([0-9a-fA-F]{1,2}(?::[0-9a-fA-F]{1,2}){5})")
_PING_SWEEP_MAX_HOSTS = 1024


async def arp_scan(subnet: str) -> list[tuple[str, str]]:
    """Discover live hosts on a subnet.

    Uses scapy ARP broadcast for L2 discovery (real MACs), then augments with:
    - Self-inclusion: the scanning host's own interface, which ARP cannot see.
    - ICMP ping sweep: catches peers on NAT-isolated networks (e.g., phone
      hotspots with AP client isolation) where ARP broadcasts don't reach them.
      Skipped for subnets larger than 1024 addresses to keep corporate-LAN
      scan times bounded.

    Requires root/sudo privileges for raw socket access.
    """
    try:
        from scapy.all import ARP, Ether, conf, get_if_addr, get_if_hwaddr, srp
    except PermissionError:
        logger.error("ARP scan requires root/sudo privileges")
        raise

    logger.info("Starting ARP scan on %s", subnet)
    found: dict[str, str] = {}

    try:
        arp_request = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=subnet)
        answered, _ = srp(arp_request, timeout=10, verbose=False)
        for _, received in answered:
            ip = str(received.psrc)
            mac = str(received.hwsrc).upper()
            found[ip] = mac
        logger.info("ARP broadcast returned %d hosts", len(found))
    except Exception as e:
        logger.error("ARP broadcast failed: %s", e)
        raise

    # Self-inclusion: ARP never returns the scanning interface.
    try:
        iface = conf.iface
        own_ip = get_if_addr(iface)
        own_mac = get_if_hwaddr(iface).upper()
        net = ipaddress.ip_network(subnet, strict=False)
        if own_ip and ipaddress.ip_address(own_ip) in net and own_ip not in found:
            found[own_ip] = own_mac
            logger.info("Added scanning host %s (%s)", own_ip, own_mac)
    except Exception as e:
        logger.warning("Self-inclusion failed: %s", e)

    # ICMP sweep augmentation for NAT-isolated networks.
    try:
        net = ipaddress.ip_network(subnet, strict=False)
        if net.num_addresses > _PING_SWEEP_MAX_HOSTS:
            logger.info(
                "Subnet %s has %d addresses (>%d); skipping ICMP sweep",
                subnet, net.num_addresses, _PING_SWEEP_MAX_HOSTS,
            )
        else:
            targets = [str(ip) for ip in net.hosts() if str(ip) not in found]
            if targets:
                alive = await _icmp_sweep(targets)
                for ip in alive:
                    if ip in found:
                        continue
                    mac = _lookup_mac_from_system_arp(ip) or "00:00:00:00:00:00"
                    found[ip] = mac.upper()
                logger.info("ICMP sweep added %d hosts", len(alive))
    except Exception as e:
        logger.warning("ICMP sweep failed: %s", e)

    results = list(found.items())
    logger.info("Total hosts discovered: %d", len(results))
    return results


async def _icmp_sweep(targets: list[str]) -> list[str]:
    """Ping a list of IPs concurrently, return those that respond."""
    try:
        from icmplib import async_multiping
    except ImportError:
        logger.warning("icmplib not available; skipping ICMP sweep")
        return []

    logger.info("ICMP sweeping %d addresses", len(targets))
    hosts = await async_multiping(
        targets,
        count=1,
        interval=0.1,
        timeout=1,
        concurrent_tasks=64,
        privileged=True,
    )
    return [h.address for h in hosts if h.is_alive]


def _lookup_mac_from_system_arp(ip: str) -> str:
    """Query the kernel ARP cache for an IP's MAC (best-effort)."""
    try:
        out = subprocess.run(
            ["arp", "-n", ip],
            capture_output=True,
            text=True,
            timeout=2,
        ).stdout
        m = _MAC_RE.search(out)
        if not m:
            return ""
        mac = m.group(1)
        parts = [p.zfill(2) for p in mac.split(":")]
        return ":".join(parts)
    except Exception:
        return ""
