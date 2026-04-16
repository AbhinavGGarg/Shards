# Shards

![Shards Cyber Defense](./frontend/public/shards-logo-wordmark.svg)

**AI-powered network security and threat intelligence platform**.
Shards helps teams discover devices, score risk, monitor threats, simulate lateral movement, assess compliance, and generate security reports.

---

## Quickstart

### Requirements
- Python 3.11+
- Node 20+
- (Live mode only) macOS or Linux with `nmap` installed and ability to run backend scans with `sudo`

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Mock mode — no root, no LAN scan, uses built-in synthetic telemetry
SHARDS_MOCK=1 uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Live mode — needs root for ARP/ICMP and ANTHROPIC_API_KEY for AI features
export ANTHROPIC_API_KEY=sk-ant-...
sudo -E .venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at `http://localhost:8000`.
Health check: `/health`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:3000`.

### 3. Docker (optional)

```bash
docker-compose up --build
```

---

## What's inside

| Area | Path | Highlights |
|---|---|---|
| Scanner | `backend/scanner/` | ARP discovery, port/service scan, traceroute, OS fingerprint, OUI vendor lookup |
| Threat Engine | `backend/threat/` | 0–100 risk scoring, CVE enrichment, alert generation |
| AI | `backend/ai/` | AI analyzer, attack-path simulation, segmentation advisor, RAG chat |
| RAG | `backend/ai/rag/` | ChromaDB embeddings over telemetry and compliance controls |
| Compliance | `backend/compliance/` | Framework parser, control assessor, PDF report generation |
| Frontend | `frontend/src/app/` | Landing, auth entry, dashboard, devices, threats, simulate, compliance, reports |

---

## Environment variables

Most are optional. `ANTHROPIC_API_KEY` is required for live AI features.

| Variable | Default | Purpose |
|---|---|---|
| `SHARDS_MOCK` | auto (`1` on Vercel, otherwise `0`) | Force synthetic telemetry mode |
| `FRAGMENTS_MOCK` | alias | Backward-compatible fallback for mock mode |
| `BIND_HOST` | `127.0.0.1` | Backend bind address |
| `BACKEND_PORT` | `8000` | Backend port |
| `SCAN_SUBNET` | `192.168.1.0/24` | CIDR to scan in live mode |
| `SCAN_INTERVAL` | `60` | Seconds between background scans |
| `DB_PATH` | `data/shards.db` | SQLite path |
| `CHROMA_PERSIST_DIR` | `data/chroma` | ChromaDB persistence directory |
| `ANTHROPIC_API_KEY` | — | Enables AI analyzer / simulation / RAG endpoints |
| `LLM_MODEL` | `claude-sonnet-4-20250514` | Anthropic model ID |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `NEXT_PUBLIC_API_URL` | auto runtime fallback | Frontend backend base URL |
| `NEXT_PUBLIC_WS_URL` | auto runtime fallback | Frontend websocket URL |

Put backend vars in `backend/.env` (`python-dotenv` is enabled).

---

## Mock mode

`SHARDS_MOCK=1` provides synthetic devices, alerts, and topology data so the full product experience works without LAN access or root privileges.

---

## Tests

```bash
cd backend && pytest -v
cd frontend && npm run build
```

---

## Project layout

```text
shards/
├── backend/
│   ├── main.py
│   ├── scanner/
│   ├── threat/
│   ├── ai/
│   ├── compliance/
│   ├── report.py
│   └── tests/
├── frontend/
│   └── src/app/
├── data/
│   ├── oui.txt
│   ├── shards.db
│   └── chroma/
└── specs/
```
