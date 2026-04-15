"""Scan session data model."""

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class Scan:
    id: int = 0
    started_at: str = ""
    completed_at: str | None = None
    devices_found: int = 0
    alerts_generated: int = 0
    subnet: str = ""
    snapshot: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Scan":
        return cls(
            id=data.get("id", 0),
            started_at=data.get("started_at", ""),
            completed_at=data.get("completed_at"),
            devices_found=data.get("devices_found", 0),
            alerts_generated=data.get("alerts_generated", 0),
            subnet=data.get("subnet", ""),
            snapshot=data.get("snapshot", []),
        )
