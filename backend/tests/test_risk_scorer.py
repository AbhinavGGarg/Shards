"""Tests for the risk scoring algorithm."""

from backend.threat.risk_scorer import score_device


def test_high_risk_device():
    """Device with telnet, FTP, unknown identity, EOL OS should score 50+."""
    device = {
        "mac": "AA:BB:CC:DD:EE:0D",
        "ip": "192.168.1.100",
        "hostname": "",
        "vendor": "",
        "os": "",
        "device_type": "unknown",
        "open_ports": {"21": "ftp", "23": "telnet", "80": "http"},
        "services": {"ftp": "vsftpd 2.3.4", "telnet": "telnetd"},
        "cves": ["CVE-2011-2523"],
    }
    score = score_device(device)
    assert score >= 50, f"High-risk device should score >= 50, got {score}"


def test_clean_device():
    """Trusted device with few ports, known identity, no CVEs should score < 20."""
    device = {
        "mac": "AA:BB:CC:DD:EE:02",
        "ip": "192.168.1.10",
        "hostname": "dev-laptop",
        "vendor": "Apple Inc.",
        "os": "macOS 15.4",
        "device_type": "laptop",
        "open_ports": {"22": "ssh"},
        "services": {"ssh": "OpenSSH 9.6"},
        "cves": [],
    }
    score = score_device(device)
    assert score < 20, f"Clean device should score < 20, got {score}"


def test_iot_camera_high_risk():
    """IoT camera with telnet + CVEs should be high risk."""
    device = {
        "mac": "AA:BB:CC:DD:EE:0B",
        "ip": "192.168.1.52",
        "hostname": "security-camera",
        "vendor": "Hikvision",
        "os": "Linux 3.18",
        "device_type": "iot",
        "open_ports": {"80": "http", "554": "rtsp", "23": "telnet", "8000": "unknown"},
        "services": {"telnet": "telnetd"},
        "cves": ["CVE-2021-36260", "CVE-2017-7921"],
    }
    score = score_device(device)
    assert score >= 50, f"IoT camera should score >= 50, got {score}"


def test_deterministic_scoring():
    """Same device config should always produce the same score."""
    device = {
        "mac": "AA:BB:CC:DD:EE:01",
        "ip": "192.168.1.1",
        "hostname": "gateway",
        "vendor": "Cisco Systems",
        "os": "IOS 15.7",
        "device_type": "router",
        "open_ports": {"80": "http", "443": "https", "22": "ssh"},
        "services": {},
        "cves": [],
    }
    scores = [score_device(device) for _ in range(10)]
    assert len(set(scores)) == 1, "Scoring should be deterministic"


def test_no_ports_low_risk():
    """Device with no open ports and known identity should be low risk."""
    device = {
        "mac": "AA:BB:CC:DD:EE:07",
        "ip": "192.168.1.40",
        "hostname": "iphone",
        "vendor": "Apple Inc.",
        "os": "iOS 18.4",
        "device_type": "phone",
        "open_ports": {},
        "services": {},
        "cves": [],
    }
    score = score_device(device)
    assert score < 10, f"Phone with no ports should score < 10, got {score}"
