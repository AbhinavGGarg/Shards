"""MAC vendor resolution using the manuf library."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_parser = None

_REPO_ROOT = Path(__file__).resolve().parents[2]
_LOCAL_OUI = _REPO_ROOT / "data" / "oui.txt"


def _get_parser():  # type: ignore[no-untyped-def]
    global _parser
    if _parser is None:
        try:
            import manuf
            if _LOCAL_OUI.exists():
                _parser = manuf.MacParser(manuf_name=str(_LOCAL_OUI))
                logger.info("OUI parser loaded from %s", _LOCAL_OUI)
            else:
                _parser = manuf.MacParser()
                logger.info("OUI parser loaded from bundled manuf data")
        except Exception as e:
            logger.warning("Failed to initialize OUI parser: %s", e)
    return _parser


def lookup_vendor(mac: str) -> str:
    """Return vendor name for a MAC address, or empty string if unknown."""
    parser = _get_parser()
    if parser is None:
        return ""
    try:
        result = parser.get_manuf(mac)
        return str(result) if result else ""
    except Exception:
        return ""
