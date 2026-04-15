"""Tests for compliance parser and assessor."""

import json
import os
import tempfile

import pytest

from backend.compliance.parser import parse_compliance_document
from backend.compliance.assessor import assess_framework
from backend.ai.rag import ingestion
from backend.ai.rag.ingestion import ingest_scan_data


@pytest.fixture(autouse=True)
def reset_chroma(monkeypatch: pytest.MonkeyPatch):
    """Use fresh ChromaDB for each test."""
    test_dir = tempfile.mkdtemp()
    monkeypatch.setattr("backend.config.CHROMA_PERSIST_DIR", test_dir)
    monkeypatch.setattr("backend.ai.rag.ingestion.CHROMA_PERSIST_DIR", test_dir)
    ingestion._client = None
    ingestion._collection = None
    yield


@pytest.fixture
def mock_controls():
    """Load mock compliance controls."""
    path = os.path.join(os.path.dirname(__file__), "fixtures", "mock_compliance.json")
    with open(path) as f:
        return json.load(f)


def test_parse_json_controls(mock_controls):
    """Parser should extract controls from JSON."""
    content = json.dumps(mock_controls).encode("utf-8")
    controls = parse_compliance_document(content=content, filename="test.json")
    assert len(controls) == 5
    assert controls[0]["control_id"] == "CIS-1.1"
    assert controls[0]["title"] == "Maintain Detailed Asset Inventory"


def test_parse_json_with_wrapper():
    """Parser should handle JSON with 'controls' wrapper."""
    data = {"controls": [
        {"control_id": "AC-1", "title": "Access Control Policy", "description": "Test"}
    ]}
    controls = parse_compliance_document(
        content=json.dumps(data).encode("utf-8"),
        filename="test.json",
    )
    assert len(controls) == 1
    assert controls[0]["control_id"] == "AC-1"


def test_parse_csv_controls():
    """Parser should extract controls from CSV."""
    csv_content = (
        "control_id,title,description,category,severity\n"
        "1.1,Asset Inventory,Maintain inventory,inventory,high\n"
        "1.2,Software Inventory,Track software,inventory,medium\n"
    ).encode("utf-8")
    controls = parse_compliance_document(content=csv_content, filename="test.csv")
    assert len(controls) == 2
    assert controls[0]["control_id"] == "1.1"


def test_unsupported_format():
    """Parser should raise ValueError for unsupported formats."""
    with pytest.raises(ValueError, match="Unsupported"):
        parse_compliance_document(content=b"test", filename="test.xyz")


@pytest.mark.asyncio
async def test_assess_framework_with_mock_data(mock_controls, mock_devices):
    """Assessment should produce verdicts for all controls."""
    # Ingest scan data first
    ingest_scan_data(mock_devices)

    assessments = await assess_framework(mock_controls)
    assert len(assessments) == 5

    for a in assessments:
        assert a["verdict"] in ("Compliant", "Partial", "Non-Compliant")
        assert a["reasoning"]
        assert "control_id" in a

    # CIS-4.6 (encryption) should be Non-Compliant because mock data has telnet
    encryption_control = next(a for a in assessments if a["control_id"] == "CIS-4.6")
    assert encryption_control["verdict"] == "Non-Compliant"
