"""Alert data model."""

from dataclasses import dataclass, asdict
from typing import Any


@dataclass
class Alert:
    id: int = 0
    timestamp: str = ""
    alert_type: str = ""
    severity: str = ""
    device_mac: str | None = None
    message: str = ""
    acknowledged: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Alert":
        return cls(
            id=data.get("id", 0),
            timestamp=data.get("timestamp", ""),
            alert_type=data.get("alert_type", ""),
            severity=data.get("severity", ""),
            device_mac=data.get("device_mac"),
            message=data.get("message", ""),
            acknowledged=data.get("acknowledged", False),
        )
