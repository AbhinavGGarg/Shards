"""ICMP traceroute to discover network hops."""

import logging

logger = logging.getLogger(__name__)


async def traceroute(target: str, max_hops: int = 30) -> list[str]:
    """Trace route to target, return list of hop IPs."""
    try:
        from icmplib import traceroute as icmp_traceroute

        logger.info("Traceroute to %s", target)
        hops = icmp_traceroute(target, max_hops=max_hops, timeout=2)
        return [hop.address for hop in hops if hop.address != "*"]

    except Exception as e:
        logger.error("Traceroute failed: %s", e)
        return []
