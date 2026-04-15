"""Mock scanner that returns deterministic fixture data for demo/test mode."""

import json
import logging
from pathlib import Path
from typing import Any

from backend.models.device import Device

logger = logging.getLogger(__name__)

FIXTURES_PATH = Path(__file__).parent.parent / "tests" / "fixtures" / "mock_devices.json"


async def mock_scan() -> list[Device]:
    """Return mock devices from fixture data."""
    logger.info("Running mock scan (FRAGMENTS_MOCK=1)")
    with open(FIXTURES_PATH) as f:
        raw: list[dict[str, Any]] = json.load(f)
    return [Device.from_dict(d) for d in raw]
