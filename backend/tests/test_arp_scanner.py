"""Tests for the mock ARP scanner."""

import pytest
from backend.scanner.mock_scanner import mock_scan


@pytest.mark.asyncio
async def test_mock_scan_returns_devices():
    """Mock scan should return expected device count and format."""
    devices = await mock_scan()
    assert len(devices) == 15

    for device in devices:
        assert device.mac
        assert device.ip
        assert device.first_seen
        assert device.last_seen


@pytest.mark.asyncio
async def test_mock_scan_has_varied_risk_profiles():
    """Mock data should include devices across risk spectrum."""
    devices = await mock_scan()
    scores = [d.risk_score for d in devices]
    assert min(scores) < 20, "Should have low-risk devices"
    assert max(scores) > 70, "Should have high-risk devices"


@pytest.mark.asyncio
async def test_mock_scan_has_varied_device_types():
    """Mock data should include multiple device types."""
    devices = await mock_scan()
    types = {d.device_type for d in devices}
    assert "router" in types
    assert "server" in types
    assert "iot" in types
