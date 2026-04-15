"""NVD API enrichment for CVE lookups with 24-hour caching."""

import json
import logging
import time
from typing import Any

import httpx

from backend.database import execute

logger = logging.getLogger(__name__)

NVD_API_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"
CACHE_TTL = 86400  # 24 hours


async def lookup_cves(service: str, version: str = "") -> list[str]:
    """Query NVD for CVEs matching a service + version. Returns CVE IDs.

    Results are cached in SQLite for 24 hours. Gracefully returns
    empty list if NVD API is unreachable.
    """
    query = f"{service} {version}".strip()
    if not query:
        return []

    # Check cache
    cached = _get_cached(query)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                NVD_API_BASE,
                params={"keywordSearch": query, "resultsPerPage": 5},
            )
            response.raise_for_status()
            data = response.json()

        cve_ids: list[str] = []
        for item in data.get("vulnerabilities", []):
            cve_id = item.get("cve", {}).get("id", "")
            if cve_id:
                cve_ids.append(cve_id)

        _set_cache(query, cve_ids)
        return cve_ids

    except Exception as e:
        logger.warning("NVD API lookup failed for '%s': %s", query, e)
        return []


def _get_cached(query: str) -> list[str] | None:
    """Check SQLite cache for recent CVE lookup results."""
    try:
        # Ensure cache table exists
        execute(
            """CREATE TABLE IF NOT EXISTS cve_cache (
                query TEXT PRIMARY KEY,
                results TEXT NOT NULL,
                cached_at REAL NOT NULL
            )"""
        )
        rows = execute(
            "SELECT results, cached_at FROM cve_cache WHERE query = ?",
            (query,),
        )
        if rows:
            cached_at = rows[0]["cached_at"]
            if time.time() - cached_at < CACHE_TTL:
                return json.loads(rows[0]["results"])
    except Exception:
        pass
    return None


def _set_cache(query: str, cve_ids: list[str]) -> None:
    """Store CVE lookup results in SQLite cache."""
    try:
        execute(
            """INSERT OR REPLACE INTO cve_cache (query, results, cached_at)
               VALUES (?, ?, ?)""",
            (query, json.dumps(cve_ids), time.time()),
        )
    except Exception:
        pass
