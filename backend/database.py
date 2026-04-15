"""SQLite database setup, migrations, and parameterized query helpers."""

import sqlite3
import json
import logging
from pathlib import Path
from typing import Any

from backend.config import DB_PATH

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS devices (
    mac TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    hostname TEXT DEFAULT '',
    vendor TEXT DEFAULT '',
    os TEXT DEFAULT '',
    device_type TEXT DEFAULT 'unknown',
    open_ports TEXT DEFAULT '{}',
    services TEXT DEFAULT '{}',
    risk_score REAL DEFAULT 0.0,
    is_trusted INTEGER DEFAULT 0,
    is_flagged INTEGER DEFAULT 0,
    cves TEXT DEFAULT '[]',
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    device_mac TEXT,
    message TEXT NOT NULL,
    acknowledged INTEGER DEFAULT 0,
    FOREIGN KEY (device_mac) REFERENCES devices(mac)
);

CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    devices_found INTEGER DEFAULT 0,
    alerts_generated INTEGER DEFAULT 0,
    subnet TEXT NOT NULL,
    snapshot TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS compliance_frameworks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT DEFAULT '',
    controls TEXT DEFAULT '[]',
    upload_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS compliance_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    framework_id TEXT NOT NULL,
    assessed_at TEXT NOT NULL,
    results TEXT DEFAULT '[]',
    report_path TEXT DEFAULT '',
    FOREIGN KEY (framework_id) REFERENCES compliance_frameworks(id)
);

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
);
"""


def get_connection() -> sqlite3.Connection:
    """Get a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Initialize database schema. Safe to call multiple times."""
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    try:
        conn.executescript(SCHEMA_SQL)
        conn.execute(
            "INSERT OR IGNORE INTO schema_version (version) VALUES (?)",
            (SCHEMA_VERSION,),
        )
        conn.commit()
        logger.info("Database initialized at %s (schema v%d)", DB_PATH, SCHEMA_VERSION)
    finally:
        conn.close()


def execute(query: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
    """Execute a query and return all rows."""
    conn = get_connection()
    try:
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        conn.commit()
        return rows
    finally:
        conn.close()


def execute_many(query: str, params_list: list[tuple[Any, ...]]) -> None:
    """Execute a query with multiple parameter sets."""
    conn = get_connection()
    try:
        conn.executemany(query, params_list)
        conn.commit()
    finally:
        conn.close()


def insert_device(device: dict[str, Any]) -> None:
    """Insert or update a device record."""
    execute(
        """INSERT INTO devices (mac, ip, hostname, vendor, os, device_type,
           open_ports, services, risk_score, is_trusted, is_flagged, cves,
           first_seen, last_seen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(mac) DO UPDATE SET
               ip=excluded.ip, hostname=excluded.hostname, vendor=excluded.vendor,
               os=excluded.os, device_type=excluded.device_type,
               open_ports=excluded.open_ports, services=excluded.services,
               risk_score=excluded.risk_score, is_flagged=excluded.is_flagged,
               cves=excluded.cves, last_seen=excluded.last_seen""",
        (
            device["mac"],
            device["ip"],
            device.get("hostname", ""),
            device.get("vendor", ""),
            device.get("os", ""),
            device.get("device_type", "unknown"),
            json.dumps(device.get("open_ports", {})),
            json.dumps(device.get("services", {})),
            device.get("risk_score", 0.0),
            device.get("is_trusted", 0),
            device.get("is_flagged", 0),
            json.dumps(device.get("cves", [])),
            device["first_seen"],
            device["last_seen"],
        ),
    )


def get_all_devices() -> list[dict[str, Any]]:
    """Return all devices as dicts."""
    rows = execute("SELECT * FROM devices ORDER BY risk_score DESC")
    return [_row_to_device(r) for r in rows]


def get_device(mac: str) -> dict[str, Any] | None:
    """Return a single device by MAC address."""
    rows = execute("SELECT * FROM devices WHERE mac = ?", (mac,))
    if rows:
        return _row_to_device(rows[0])
    return None


def insert_alert(alert: dict[str, Any]) -> int:
    """Insert an alert and return its ID."""
    rows = execute(
        """INSERT INTO alerts (timestamp, alert_type, severity, device_mac, message)
           VALUES (?, ?, ?, ?, ?) RETURNING id""",
        (
            alert["timestamp"],
            alert["alert_type"],
            alert["severity"],
            alert.get("device_mac"),
            alert["message"],
        ),
    )
    return rows[0]["id"]


def get_alerts(severity: str | None = None, alert_type: str | None = None) -> list[dict[str, Any]]:
    """Return alerts with optional filters."""
    query = "SELECT * FROM alerts WHERE 1=1"
    params: list[Any] = []
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    if alert_type:
        query += " AND alert_type = ?"
        params.append(alert_type)
    query += " ORDER BY timestamp DESC"
    rows = execute(query, tuple(params))
    return [dict(r) for r in rows]


def acknowledge_alert(alert_id: int) -> bool:
    """Mark an alert as acknowledged. Returns True if found."""
    rows = execute(
        "UPDATE alerts SET acknowledged = 1 WHERE id = ? RETURNING id",
        (alert_id,),
    )
    return len(rows) > 0


def insert_scan(scan: dict[str, Any]) -> int:
    """Insert a scan record and return its ID."""
    rows = execute(
        """INSERT INTO scans (started_at, completed_at, devices_found,
           alerts_generated, subnet, snapshot)
           VALUES (?, ?, ?, ?, ?, ?) RETURNING id""",
        (
            scan["started_at"],
            scan.get("completed_at"),
            scan.get("devices_found", 0),
            scan.get("alerts_generated", 0),
            scan["subnet"],
            json.dumps(scan.get("snapshot", [])),
        ),
    )
    return rows[0]["id"]


def get_stats() -> dict[str, Any]:
    """Return summary statistics."""
    devices = execute("SELECT COUNT(*) as total, AVG(risk_score) as avg_risk FROM devices")
    alerts = execute("SELECT COUNT(*) as total FROM alerts WHERE acknowledged = 0")
    scans = execute("SELECT completed_at FROM scans ORDER BY id DESC LIMIT 1")
    return {
        "total_devices": devices[0]["total"],
        "avg_risk_score": round(devices[0]["avg_risk"] or 0, 1),
        "unacknowledged_alerts": alerts[0]["total"],
        "last_scan": scans[0]["completed_at"] if scans else None,
    }


def trust_device(mac: str) -> bool:
    """Mark a device as trusted. Returns True if found."""
    rows = execute(
        "UPDATE devices SET is_trusted = 1 WHERE mac = ? RETURNING mac",
        (mac,),
    )
    return len(rows) > 0


def insert_framework(framework: dict[str, Any]) -> str:
    """Insert a compliance framework. Returns its ID."""
    execute(
        """INSERT OR REPLACE INTO compliance_frameworks (id, name, version, controls, upload_date)
           VALUES (?, ?, ?, ?, ?)""",
        (
            framework["id"],
            framework["name"],
            framework.get("version", ""),
            json.dumps(framework.get("controls", [])),
            framework["upload_date"],
        ),
    )
    return framework["id"]


def get_frameworks() -> list[dict[str, Any]]:
    """Return all compliance frameworks."""
    rows = execute("SELECT * FROM compliance_frameworks ORDER BY upload_date DESC")
    results = []
    for r in rows:
        d = dict(r)
        d["controls"] = json.loads(d["controls"]) if isinstance(d["controls"], str) else d["controls"]
        results.append(d)
    return results


def get_framework(framework_id: str) -> dict[str, Any] | None:
    """Return a single framework by ID."""
    rows = execute("SELECT * FROM compliance_frameworks WHERE id = ?", (framework_id,))
    if rows:
        d = dict(rows[0])
        d["controls"] = json.loads(d["controls"]) if isinstance(d["controls"], str) else d["controls"]
        return d
    return None


def insert_assessment(assessment: dict[str, Any]) -> int:
    """Insert a compliance assessment and return its ID."""
    rows = execute(
        """INSERT INTO compliance_assessments (framework_id, assessed_at, results, report_path)
           VALUES (?, ?, ?, ?) RETURNING id""",
        (
            assessment["framework_id"],
            assessment["assessed_at"],
            json.dumps(assessment.get("results", [])),
            assessment.get("report_path", ""),
        ),
    )
    return rows[0]["id"]


def get_assessment(assessment_id: int) -> dict[str, Any] | None:
    """Return a single assessment by ID."""
    rows = execute("SELECT * FROM compliance_assessments WHERE id = ?", (assessment_id,))
    if rows:
        d = dict(rows[0])
        d["results"] = json.loads(d["results"]) if isinstance(d["results"], str) else d["results"]
        return d
    return None


def _row_to_device(row: sqlite3.Row) -> dict[str, Any]:
    """Convert a database row to a device dict with parsed JSON fields."""
    d = dict(row)
    d["open_ports"] = json.loads(d["open_ports"]) if isinstance(d["open_ports"], str) else d["open_ports"]
    d["services"] = json.loads(d["services"]) if isinstance(d["services"], str) else d["services"]
    d["cves"] = json.loads(d["cves"]) if isinstance(d["cves"], str) else d["cves"]
    d["is_trusted"] = bool(d["is_trusted"])
    d["is_flagged"] = bool(d["is_flagged"])
    return d
