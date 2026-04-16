"""PDF compliance report builder using ReportLab."""

import logging
import os
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

from backend.config import DATA_DIR

logger = logging.getLogger(__name__)

REPORTS_DIR = DATA_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

VERDICT_COLORS = {
    "Compliant": colors.HexColor("#22c55e"),
    "Partial": colors.HexColor("#eab308"),
    "Non-Compliant": colors.HexColor("#ef4444"),
}


def generate_compliance_report(
    framework_name: str,
    assessments: list[dict[str, Any]],
) -> str:
    """Generate a PDF compliance report. Returns the file path."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"compliance_{framework_name.replace(' ', '_')}_{timestamp}.pdf"
    filepath = str(REPORTS_DIR / filename)

    doc = SimpleDocTemplate(filepath, pagesize=letter,
                            topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("ReportTitle", parent=styles["Title"],
                                  fontSize=24, spaceAfter=20)
    heading_style = ParagraphStyle("ReportHeading", parent=styles["Heading2"],
                                    fontSize=14, spaceAfter=10, spaceBefore=15)
    body_style = styles["BodyText"]

    elements: list[Any] = []

    # --- Title Page ---
    elements.append(Spacer(1, 2 * inch))
    elements.append(Paragraph("Shards", title_style))
    elements.append(Paragraph("Compliance Assessment Report", styles["Heading2"]))
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph(f"<b>Framework:</b> {framework_name}", body_style))
    elements.append(Paragraph(f"<b>Date:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", body_style))
    elements.append(Paragraph(f"<b>Controls Assessed:</b> {len(assessments)}", body_style))

    # Summary counts
    compliant = sum(1 for a in assessments if a.get("verdict") == "Compliant")
    partial = sum(1 for a in assessments if a.get("verdict") == "Partial")
    non_compliant = sum(1 for a in assessments if a.get("verdict") == "Non-Compliant")
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph(f"<b>Compliant:</b> {compliant} | <b>Partial:</b> {partial} | <b>Non-Compliant:</b> {non_compliant}", body_style))

    elements.append(PageBreak())

    # --- Executive Summary ---
    elements.append(Paragraph("Executive Summary", heading_style))
    total = len(assessments)
    compliance_pct = round((compliant / total) * 100, 1) if total > 0 else 0
    elements.append(Paragraph(
        f"This report assesses the network security posture against the <b>{framework_name}</b> framework. "
        f"Of {total} controls evaluated, {compliant} ({compliance_pct}%) are fully compliant, "
        f"{partial} require partial remediation, and {non_compliant} are non-compliant.",
        body_style,
    ))
    elements.append(Spacer(1, 0.3 * inch))

    # --- Summary Table ---
    elements.append(Paragraph("Assessment Summary", heading_style))
    table_data = [["Control ID", "Title", "Verdict"]]
    for a in assessments:
        table_data.append([
            a.get("control_id", ""),
            a.get("title", "")[:50],
            a.get("verdict", ""),
        ])

    table = Table(table_data, colWidths=[1.2 * inch, 3.5 * inch, 1.5 * inch])
    table_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a1a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#333333")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#0a0a0a"), colors.HexColor("#141414")]),
    ])

    # Color verdict cells
    for i, a in enumerate(assessments, start=1):
        color = VERDICT_COLORS.get(a.get("verdict", ""), colors.gray)
        table_style.add("TEXTCOLOR", (2, i), (2, i), color)

    table.setStyle(table_style)
    elements.append(table)
    elements.append(PageBreak())

    # --- Control Details ---
    elements.append(Paragraph("Control-by-Control Assessment", heading_style))
    for a in assessments:
        verdict = a.get("verdict", "Unknown")
        color = "#22c55e" if verdict == "Compliant" else "#eab308" if verdict == "Partial" else "#ef4444"

        elements.append(Paragraph(
            f"<b>{a.get('control_id', '')}: {a.get('title', '')}</b>",
            ParagraphStyle("ControlTitle", parent=body_style, fontSize=11, spaceBefore=12),
        ))
        elements.append(Paragraph(
            f"Verdict: <font color='{color}'><b>{verdict}</b></font>",
            body_style,
        ))
        if a.get("reasoning"):
            elements.append(Paragraph(f"<i>{a['reasoning']}</i>", body_style))
        if a.get("remediation") and a["remediation"] != "N/A":
            elements.append(Paragraph(f"<b>Remediation:</b> {a['remediation']}", body_style))

    # --- Remediation Plan ---
    non_compliant_items = [a for a in assessments if a.get("verdict") != "Compliant"]
    if non_compliant_items:
        elements.append(PageBreak())
        elements.append(Paragraph("Remediation Plan", heading_style))
        for i, a in enumerate(non_compliant_items, 1):
            elements.append(Paragraph(
                f"{i}. <b>{a.get('control_id', '')}</b> — {a.get('remediation', 'Review and remediate.')}",
                body_style,
            ))

    doc.build(elements)
    logger.info("Compliance report generated: %s", filepath)
    return filepath
