"""Shared pytest fixtures for Fragments backend tests."""

import json
import os
import tempfile
from pathlib import Path
from typing import Generator

import pytest

# Force mock mode and temp database for tests
os.environ["FRAGMENTS_MOCK"] = "1"


@pytest.fixture(autouse=True)
def temp_database(monkeypatch: pytest.MonkeyPatch) -> Generator[str, None, None]:
    """Use a temporary database for each test."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    monkeypatch.setattr("backend.config.DB_PATH", db_path)
    monkeypatch.setattr("backend.database.DB_PATH", db_path)
    from backend.database import init_db
    init_db()
    yield db_path
    os.unlink(db_path)


@pytest.fixture
def mock_devices() -> list[dict]:
    """Load mock device data from fixtures."""
    fixtures_path = Path(__file__).parent / "fixtures" / "mock_devices.json"
    with open(fixtures_path) as f:
        return json.load(f)


@pytest.fixture
def mock_scan_data(mock_devices: list[dict]) -> dict:
    """Create a mock scan result."""
    return {
        "started_at": "2026-04-11T10:00:00Z",
        "completed_at": "2026-04-11T10:01:30Z",
        "devices_found": len(mock_devices),
        "alerts_generated": 0,
        "subnet": "192.168.1.0/24",
        "snapshot": mock_devices,
    }
