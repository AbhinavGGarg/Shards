"""Device data model."""

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class Device:
    mac: str
    ip: str
    hostname: str = ""
    vendor: str = ""
    os: str = ""
    device_type: str = "unknown"
    open_ports: dict[int, str] = field(default_factory=dict)
    services: dict[str, str] = field(default_factory=dict)
    risk_score: float = 0.0
    is_trusted: bool = False
    is_flagged: bool = False
    cves: list[str] = field(default_factory=list)
    first_seen: str = ""
    last_seen: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Device":
        return cls(
            mac=data["mac"],
            ip=data["ip"],
            hostname=data.get("hostname", ""),
            vendor=data.get("vendor", ""),
            os=data.get("os", ""),
            device_type=data.get("device_type", "unknown"),
            open_ports=data.get("open_ports", {}),
            services=data.get("services", {}),
            risk_score=data.get("risk_score", 0.0),
            is_trusted=data.get("is_trusted", False),
            is_flagged=data.get("is_flagged", False),
            cves=data.get("cves", []),
            first_seen=data.get("first_seen", ""),
            last_seen=data.get("last_seen", ""),
        )
