"""Compliance document parser — extracts controls from PDF, DOCX, CSV, JSON."""

import csv
import io
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def parse_compliance_document(file_path: str | None = None, content: bytes | None = None, filename: str = "") -> list[dict[str, Any]]:
    """Parse a compliance document into individual controls.

    Supports: JSON, CSV, PDF (via PyPDF2), DOCX (via python-docx).
    Returns list of controls with: control_id, title, description, category, severity.
    """
    ext = Path(filename or file_path or "").suffix.lower()

    if ext == ".json":
        return _parse_json(content or Path(file_path).read_bytes() if file_path else content)
    elif ext == ".csv":
        return _parse_csv(content or Path(file_path).read_bytes() if file_path else content)
    elif ext == ".pdf":
        return _parse_pdf(content or Path(file_path).read_bytes() if file_path else content)
    elif ext in (".docx", ".doc"):
        return _parse_docx(content or Path(file_path).read_bytes() if file_path else content)
    else:
        raise ValueError(f"Unsupported file format: {ext}. Supported: .json, .csv, .pdf, .docx")


def _parse_json(content: bytes) -> list[dict[str, Any]]:
    """Parse JSON compliance document."""
    data = json.loads(content)

    controls: list[dict[str, Any]] = []
    items = data if isinstance(data, list) else data.get("controls", [])

    for item in items:
        control = _normalize_control(item)
        if control:
            controls.append(control)

    logger.info("Parsed %d controls from JSON", len(controls))
    return controls


def _parse_csv(content: bytes) -> list[dict[str, Any]]:
    """Parse CSV compliance document. Expects columns: control_id, title, description, category, severity."""
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    controls: list[dict[str, Any]] = []
    for row in reader:
        control = _normalize_control(row)
        if control:
            controls.append(control)

    logger.info("Parsed %d controls from CSV", len(controls))
    return controls


def _parse_pdf(content: bytes) -> list[dict[str, Any]]:
    """Parse PDF compliance document — extract text and split into controls."""
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        logger.warning("PyPDF2 not installed, cannot parse PDF files")
        raise ValueError("PDF parsing requires PyPDF2. Install with: pip install PyPDF2")

    reader = PdfReader(io.BytesIO(content))
    full_text = ""
    for page in reader.pages:
        full_text += page.extract_text() + "\n"

    return _extract_controls_from_text(full_text, "PDF")


def _parse_docx(content: bytes) -> list[dict[str, Any]]:
    """Parse DOCX compliance document."""
    try:
        from docx import Document
    except ImportError:
        logger.warning("python-docx not installed, cannot parse DOCX files")
        raise ValueError("DOCX parsing requires python-docx. Install with: pip install python-docx")

    doc = Document(io.BytesIO(content))
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    return _extract_controls_from_text(full_text, "DOCX")


def _extract_controls_from_text(text: str, source: str) -> list[dict[str, Any]]:
    """Extract controls from plain text by splitting on common patterns."""
    controls: list[dict[str, Any]] = []
    lines = text.split("\n")

    current_id = ""
    current_title = ""
    current_desc_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Look for control ID patterns like "1.1", "AC-1", "CIS 1.1", etc.
        import re
        match = re.match(r'^((?:CIS\s+)?(?:[A-Z]{1,4}[-.])?[\d]+(?:\.[\d]+)*)\s*[:\-–]\s*(.+)', stripped)
        if match:
            # Save previous control
            if current_id:
                controls.append({
                    "control_id": current_id,
                    "title": current_title,
                    "description": " ".join(current_desc_lines),
                    "category": "general",
                    "severity": "medium",
                })
            current_id = match.group(1).strip()
            current_title = match.group(2).strip()
            current_desc_lines = []
        else:
            current_desc_lines.append(stripped)

    # Save last control
    if current_id:
        controls.append({
            "control_id": current_id,
            "title": current_title,
            "description": " ".join(current_desc_lines),
            "category": "general",
            "severity": "medium",
        })

    logger.info("Parsed %d controls from %s text", len(controls), source)
    return controls


def _normalize_control(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Normalize a control dict to standard fields."""
    control_id = raw.get("control_id") or raw.get("id") or raw.get("ID") or ""
    title = raw.get("title") or raw.get("Title") or raw.get("name") or ""

    if not control_id and not title:
        return None

    return {
        "control_id": str(control_id),
        "title": str(title),
        "description": str(raw.get("description") or raw.get("Description") or ""),
        "category": str(raw.get("category") or raw.get("Category") or "general"),
        "severity": str(raw.get("severity") or raw.get("Severity") or "medium"),
    }
