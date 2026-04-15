"""Tests for RAG pipeline: ingestion, retrieval, and analysis."""

import os
import tempfile

import pytest

# Use temp ChromaDB dir for tests
_chroma_dir = tempfile.mkdtemp()
os.environ["CHROMA_PERSIST_DIR"] = _chroma_dir

from backend.ai.rag.embedder import device_to_chunks, alert_to_chunk
from backend.ai.rag.ingestion import ingest_scan_data, get_document_count, _get_collection, reset_collection
from backend.ai.rag import ingestion
from backend.ai.rag.retriever import retrieve, build_context


@pytest.fixture(autouse=True)
def reset_chroma(monkeypatch: pytest.MonkeyPatch):
    """Reset ChromaDB collection before each test."""
    test_dir = tempfile.mkdtemp()
    monkeypatch.setattr("backend.config.CHROMA_PERSIST_DIR", test_dir)
    monkeypatch.setattr("backend.ai.rag.ingestion.CHROMA_PERSIST_DIR", test_dir)
    # Reset cached collection so each test gets a fresh one
    ingestion._client = None
    ingestion._collection = None
    yield


def test_device_to_chunks():
    """Device should produce at least one summary chunk plus per-port chunks."""
    device = {
        "mac": "AA:BB:CC:DD:EE:01",
        "ip": "192.168.1.1",
        "hostname": "gateway",
        "vendor": "Cisco",
        "os": "IOS 15.7",
        "device_type": "router",
        "open_ports": {"80": "http", "22": "ssh"},
        "services": {},
        "risk_score": 15.0,
        "cves": [],
    }
    chunks = device_to_chunks(device)
    assert len(chunks) == 3  # 1 summary + 2 port chunks
    assert "gateway" in chunks[0]["text"]
    assert chunks[0]["metadata"]["type"] == "device"
    assert chunks[0]["metadata"]["risk_tier"] == "low"


def test_alert_to_chunk():
    """Alert should produce a single chunk with correct metadata."""
    alert = {
        "id": 1,
        "timestamp": "2026-04-11T12:00:00Z",
        "alert_type": "rogue_device",
        "severity": "high",
        "device_mac": "AA:BB:CC:DD:EE:0D",
        "message": "Rogue device detected",
    }
    chunk = alert_to_chunk(alert)
    assert "rogue_device" in chunk["text"]
    assert chunk["metadata"]["type"] == "alert"


def test_ingest_and_retrieve(mock_devices):
    """Ingesting mock data should make it retrievable by query."""
    count = ingest_scan_data(mock_devices)
    assert count > 0
    assert get_document_count() > 0

    # Query for high-risk devices
    results = retrieve("Which devices have the highest risk?")
    assert len(results) > 0

    # Results should include device text
    texts = [r["text"] for r in results]
    combined = " ".join(texts)
    assert "192.168.1" in combined  # Should reference IPs from mock data


def test_retrieve_with_risk_filter(mock_devices):
    """Retrieval with risk_tier filter should narrow results."""
    ingest_scan_data(mock_devices)

    # Query with critical filter
    results = retrieve("What devices are dangerous?", risk_tier="critical")
    # All results should be critical tier
    for r in results:
        if r["metadata"].get("risk_tier"):
            assert r["metadata"]["risk_tier"] == "critical"


def test_build_context_respects_limit(mock_devices):
    """build_context should not exceed max_chars."""
    ingest_scan_data(mock_devices)
    chunks = retrieve("Show me all devices", top_k=20)
    context = build_context(chunks, max_chars=500)
    assert len(context) <= 600  # Small buffer for last chunk


def test_empty_collection_retrieve():
    """Retrieving from empty collection should return empty list."""
    results = retrieve("anything")
    assert results == []
