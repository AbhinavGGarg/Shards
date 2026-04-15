"""PDF security assessment report builder using ReportLab."""

import logging
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
from backend.database import get_all_devices, get_alerts, get_stats

logger = logging.getLogger(__name__)

REPORTS_DIR = DATA_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

RISK_COLORS = {
    "critical": colors.HexColor("#ef4444"),
    "high": colors.HexColor("#f97316"),
    "medium": colors.HexColor("#eab308"),
    "low": colors.HexColor("#22c55e"),
}


def _risk_tier(score: float) -> str:
    if score >= 76:
        return "critical"
    if score >= 51:
        return "high"
    if score >= 21:
        return "medium"
    return "low"


async def generate_security_report() -> str:
    """Generate a full security assessment PDF. Returns file path."""
    devices = get_all_devices()
    alerts = get_alerts()
    stats_data = get_stats()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"security_report_{timestamp}.pdf"
    filepath = str(REPORTS_DIR / filename)

    doc = SimpleDocTemplate(filepath, pagesize=letter,
                            topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("RTitle", parent=styles["Title"], fontSize=24, spaceAfter=20)
    h2 = ParagraphStyle("RH2", parent=styles["Heading2"], fontSize=14, spaceAfter=10, spaceBefore=15)
    body = styles["BodyText"]
    small = ParagraphStyle("Small", parent=body, fontSize=8)

    elements: list[Any] = []

    # ── Title Page ──
    elements.append(Spacer(1, 2 * inch))
    elements.append(Paragraph("Fragments", title_style))
    elements.append(Paragraph("Network Security Assessment Report", styles["Heading2"]))
    elements.append(Spacer(1, 0.5 * inch))
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    elements.append(Paragraph(f"<b>Generated:</b> {now_str}", body))
    elements.append(Paragraph(f"<b>Devices Scanned:</b> {stats_data['total_devices']}", body))
    elements.append(Paragraph(f"<b>Average Risk Score:</b> {stats_data['avg_risk_score']}/100", body))
    elements.append(Paragraph(f"<b>Active Alerts:</b> {stats_data['unacknowledged_alerts']}", body))
    elements.append(PageBreak())

    # ── Executive Summary ──
    elements.append(Paragraph("1. Executive Summary", h2))

    critical = sum(1 for d in devices if d["risk_score"] >= 76)
    high = sum(1 for d in devices if 51 <= d["risk_score"] < 76)
    medium = sum(1 for d in devices if 21 <= d["risk_score"] < 51)
    low = sum(1 for d in devices if d["risk_score"] < 21)

    elements.append(Paragraph(
        f"This report summarizes the security posture of the scanned network. "
        f"A total of <b>{len(devices)}</b> devices were discovered. "
        f"Risk distribution: <font color='#ef4444'><b>{critical} critical</b></font>, "
        f"<font color='#f97316'><b>{high} high</b></font>, "
        f"<font color='#eab308'><b>{medium} medium</b></font>, "
        f"<font color='#22c55e'><b>{low} low</b></font>.",
        body,
    ))

    if critical > 0 or high > 0:
        elements.append(Spacer(1, 0.2 * inch))
        elements.append(Paragraph("<b>Critical Findings:</b>", body))
        for d in sorted(devices, key=lambda x: x["risk_score"], reverse=True):
            if d["risk_score"] < 51:
                break
            cve_str = f" CVEs: {', '.join(d['cves'])}" if d["cves"] else ""
            ports = ", ".join(str(p) for p in list(d["open_ports"].keys())[:5])
            elements.append(Paragraph(
                f"&bull; <b>{d['ip']}</b> ({d.get('hostname') or 'unknown'}) — "
                f"Risk {d['risk_score']}/100, Ports: {ports}{cve_str}",
                body,
            ))

    elements.append(PageBreak())

    # ── Device Inventory ──
    elements.append(Paragraph("2. Device Inventory", h2))

    table_data = [["IP", "Hostname", "Vendor", "Type", "OS", "Ports", "Risk"]]
    for d in sorted(devices, key=lambda x: x["risk_score"], reverse=True):
        table_data.append([
            d["ip"],
            (d.get("hostname") or "—")[:20],
            (d.get("vendor") or "—")[:18],
            d.get("device_type", "?"),
            (d.get("os") or "—")[:18],
            str(len(d.get("open_ports", {}))),
            f"{d['risk_score']:.0f}",
        ])

    t = Table(table_data, colWidths=[1.1 * inch, 1.1 * inch, 1.0 * inch, 0.7 * inch, 1.0 * inch, 0.5 * inch, 0.5 * inch])
    ts = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a1a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#333333")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#0a0a0a"), colors.HexColor("#141414")]),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#cccccc")),
    ])
    # Color risk column
    for i, d in enumerate(sorted(devices, key=lambda x: x["risk_score"], reverse=True), start=1):
        tier = _risk_tier(d["risk_score"])
        ts.add("TEXTCOLOR", (6, i), (6, i), RISK_COLORS[tier])
    t.setStyle(ts)
    elements.append(t)
    elements.append(PageBreak())

    # ── Vulnerability Findings ──
    elements.append(Paragraph("3. Vulnerability Findings", h2))

    vuln_devices = [d for d in devices if d.get("cves")]
    if vuln_devices:
        for d in vuln_devices:
            elements.append(Paragraph(
                f"<b>{d['ip']}</b> ({d.get('hostname') or 'unknown'}) — {d.get('vendor', 'Unknown')}",
                body,
            ))
            for cve in d["cves"]:
                elements.append(Paragraph(f"&nbsp;&nbsp;&bull; {cve}", small))
            elements.append(Spacer(1, 0.1 * inch))
    else:
        elements.append(Paragraph("No known CVEs detected in the current scan.", body))

    # ── Network Topology Summary ──
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph("4. Network Topology", h2))

    type_counts: dict[str, int] = {}
    for d in devices:
        dt = d.get("device_type", "unknown")
        type_counts[dt] = type_counts.get(dt, 0) + 1

    topo_data = [["Device Type", "Count"]]
    for dt, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
        topo_data.append([dt, str(count)])

    tt = Table(topo_data, colWidths=[2 * inch, 1 * inch])
    tt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a1a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#333333")),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#cccccc")),
    ]))
    elements.append(tt)
    elements.append(PageBreak())

    # ── Segmentation Recommendations ──
    elements.append(Paragraph("5. Segmentation Recommendations", h2))

    iot_devices = [d for d in devices if d["device_type"] == "iot"]
    untrusted = [d for d in devices if not d.get("is_trusted")]

    if iot_devices:
        elements.append(Paragraph(
            f"<b>IoT Isolation:</b> {len(iot_devices)} IoT devices detected. "
            f"Recommend placing on a dedicated VLAN with restricted access to corporate resources.",
            body,
        ))
    if untrusted:
        elements.append(Paragraph(
            f"<b>Guest/Untrusted Segmentation:</b> {len(untrusted)} untrusted devices detected. "
            f"Recommend a guest network segment with no access to internal services.",
            body,
        ))
    elements.append(Paragraph(
        "<b>Server Zone:</b> Database and web servers should be in a DMZ with strict "
        "firewall rules allowing only necessary traffic.",
        body,
    ))

    # ── Remediation Checklist ──
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph("6. Remediation Checklist", h2))

    remediation_items = []
    insecure_port_devices = [d for d in devices if any(int(p) in (21, 23) for p in d.get("open_ports", {}))]
    if insecure_port_devices:
        ips = ", ".join(d["ip"] for d in insecure_port_devices)
        remediation_items.append(f"Disable Telnet/FTP on: {ips}")
    if vuln_devices:
        remediation_items.append("Patch CVEs: " + ", ".join(
            cve for d in vuln_devices for cve in d["cves"]
        ))
    if untrusted:
        remediation_items.append(f"Investigate {len(untrusted)} untrusted device(s) and add to trusted list or isolate")
    if iot_devices:
        remediation_items.append(f"Segment {len(iot_devices)} IoT device(s) onto dedicated VLAN")
    remediation_items.append("Review and harden all devices with risk score > 50")
    remediation_items.append("Enable network-level encryption for all management interfaces")

    for i, item in enumerate(remediation_items, 1):
        elements.append(Paragraph(f"{i}. {item}", body))

    doc.build(elements)
    logger.info("Security report generated: %s", filepath)
    return filepath
