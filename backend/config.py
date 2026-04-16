"""Environment variable management for Shards."""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Base paths
PROJECT_ROOT = Path(__file__).parent.parent


def _resolve_data_dir() -> Path:
    """Resolve a writable data directory for both local and Vercel runtimes."""
    configured = os.getenv("DATA_DIR")
    if configured:
        preferred = Path(configured)
    elif os.getenv("VERCEL") == "1":
        preferred = Path("/tmp/shards-data")
    else:
        preferred = PROJECT_ROOT / "data"

    try:
        preferred.mkdir(parents=True, exist_ok=True)
        return preferred
    except Exception as e:
        fallback = Path("/tmp/shards-data")
        fallback.mkdir(parents=True, exist_ok=True)
        logger.warning("Falling back to %s for data directory: %s", fallback, e)
        return fallback


DATA_DIR = _resolve_data_dir()

# Core settings
# On Vercel/serverless, real LAN scans are not feasible, so default to mock telemetry
# unless explicitly overridden.
_mock_default = "1" if os.getenv("VERCEL") == "1" else "0"
FRAGMENTS_MOCK: bool = (
    os.getenv("SHARDS_MOCK", os.getenv("FRAGMENTS_MOCK", _mock_default)) == "1"
)
BIND_HOST: str = os.getenv("BIND_HOST", "127.0.0.1")
BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

# Database
DB_PATH: str = os.getenv("DB_PATH", str(DATA_DIR / "shards.db"))

# Scanning
SCAN_INTERVAL: int = int(os.getenv("SCAN_INTERVAL", "60"))
SCAN_SUBNET: str = os.getenv("SCAN_SUBNET", "192.168.1.0/24")

# AI / LLM
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
LLM_MODEL: str = os.getenv("LLM_MODEL", "claude-sonnet-4-20250514")

# ChromaDB
CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", str(DATA_DIR / "chroma"))

# Logging
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
