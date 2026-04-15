"""Tests for database operations."""

import pytest
from backend.database import insert_device, get_all_devices, get_device, insert_scan, get_stats


def test_insert_and_query_device():
    """Test device insert and retrieval."""
    device = {
        "mac": "AA:BB:CC:DD:EE:01",
        "ip": "192.168.1.1",
        "hostname": "test-device",
        "vendor": "TestVendor",
        "os": "TestOS",
        "device_type": "router",
        "open_ports": {"80": "http"},
        "services": {"http": "nginx"},
        "risk_score": 15.0,
        "is_trusted": True,
        "is_flagged": False,
        "cves": [],
        "first_seen": "2026-04-11T10:00:00Z",
        "last_seen": "2026-04-11T14:00:00Z",
    }
    insert_device(device)

    # Query all
    devices = get_all_devices()
    assert len(devices) == 1
    assert devices[0]["mac"] == "AA:BB:CC:DD:EE:01"
    assert devices[0]["hostname"] == "test-device"
    assert devices[0]["open_ports"] == {"80": "http"}

    # Query single
    d = get_device("AA:BB:CC:DD:EE:01")
    assert d is not None
    assert d["ip"] == "192.168.1.1"


def test_device_upsert():
    """Test that inserting same MAC updates existing record."""
    device1 = {
        "mac": "AA:BB:CC:DD:EE:01",
        "ip": "192.168.1.1",
        "hostname": "original",
        "first_seen": "2026-04-11T10:00:00Z",
        "last_seen": "2026-04-11T10:00:00Z",
    }
    device2 = {
        "mac": "AA:BB:CC:DD:EE:01",
        "ip": "192.168.1.2",
        "hostname": "updated",
        "first_seen": "2026-04-11T10:00:00Z",
        "last_seen": "2026-04-11T14:00:00Z",
    }
    insert_device(device1)
    insert_device(device2)

    devices = get_all_devices()
    assert len(devices) == 1
    assert devices[0]["ip"] == "192.168.1.2"
    assert devices[0]["hostname"] == "updated"


def test_insert_scan_and_stats():
    """Test scan record storage and stats calculation."""
    # Insert a device first
    insert_device({
        "mac": "AA:BB:CC:DD:EE:01",
        "ip": "192.168.1.1",
        "risk_score": 50.0,
        "first_seen": "2026-04-11T10:00:00Z",
        "last_seen": "2026-04-11T14:00:00Z",
    })

    scan_id = insert_scan({
        "started_at": "2026-04-11T10:00:00Z",
        "completed_at": "2026-04-11T10:01:30Z",
        "devices_found": 1,
        "alerts_generated": 0,
        "subnet": "192.168.1.0/24",
        "snapshot": [],
    })
    assert scan_id >= 1

    stats = get_stats()
    assert stats["total_devices"] == 1
    assert stats["avg_risk_score"] == 50.0
    assert stats["last_scan"] == "2026-04-11T10:01:30Z"


def test_get_nonexistent_device():
    """Querying a nonexistent device returns None."""
    assert get_device("FF:FF:FF:FF:FF:FF") is None
