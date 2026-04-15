# Fragments

**AI-powered network security platform** — discover devices on your LAN, score their risk, simulate lateral movement, chat with a RAG analyst about your scan, assess compliance frameworks, and export PDF reports.

Built for the HackTheBay hackathon. Runs fully offline in mock mode for demos.

---

## Quickstart

### Requirements
- Python 3.11+
- Node 20+
- (Live mode only) macOS or Linux with `nmap` installed and ability to run the backend with `sudo` for ARP scans

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Mock mode — no root, no network scanning, uses pre-recorded fixtures
FRAGMENTS_MOCK=1 uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Live mode — needs root for ARP/ICMP and an ANTHROPIC_API_KEY for AI features
export ANTHROPIC_API_KEY=sk-ant-...
sudo -E .venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend boots on `http://localhost:8000`. Health check at `/health`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at `http://localhost:3000`.

### 3. Docker (optional)

```bash
docker-compose up --build
```

---

## What's inside

| Area | Path | Highlights |
|---|---|---|
| Scanner | `backend/scanner/` | ARP discovery (scapy), port/service scan (nmap), traceroute, OS fingerprint, OUI vendor lookup |
| Threat | `backend/threat/` | 0–100 risk scoring, CVE enrichment (NVD), alert generation |
| AI | `backend/ai/` | Claude-powered analyzer, attack path simulator, segmentation advisor, RAG chat |
| RAG | `backend/ai/rag/` | ChromaDB embeddings of scan data + compliance controls |
| Compliance | `backend/compliance/` | Framework parser, control assessor, PDF report generator |
| Frontend | `frontend/src/app/` | Dashboard, device inventory, threat feed, attack simulator, chat, compliance, reports |

Design system: black `#222831` / grey `#393E46` / orange `#D65A31` / white `#EEEEEE`, Sora + IBM Plex Mono + Instrument Serif.

---

## Environment variables

All are optional except `ANTHROPIC_API_KEY` (required for AI features in live mode).

| Variable | Default | Purpose |
|---|---|---|
| `FRAGMENTS_MOCK` | `0` | Set to `1` for offline demo mode with pre-recorded fixtures |
| `BIND_HOST` | `127.0.0.1` | Backend bind address |
| `BACKEND_PORT` | `8000` | Backend port |
| `SCAN_SUBNET` | `192.168.1.0/24` | CIDR to scan in live mode |
| `SCAN_INTERVAL` | `60` | Seconds between background scans |
| `DB_PATH` | `data/fragments.db` | SQLite path |
| `CHROMA_PERSIST_DIR` | `data/chroma` | ChromaDB persistence directory |
| `ANTHROPIC_API_KEY` | — | Required for Claude-powered analyze / attack-sim / RAG chat |
| `LLM_MODEL` | `claude-sonnet-4-20250514` | Anthropic model ID |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Frontend → backend URL |

Place variables in `backend/.env` — `python-dotenv` will pick them up.

---

## Tests

```bash
cd backend && pytest -v
cd frontend && npm test
```

---

## Mock mode

`FRAGMENTS_MOCK=1` ships 15 synthetic devices (laptops, phones, IoT, a misconfigured camera, a vulnerable DB server), 6 alerts across severities, and a working topology graph. Every feature — risk scoring, attack simulation, RAG chat, PDF report — runs against this fixture set without touching the network or needing root.

The Anthropic API is still used for AI endpoints in mock mode if `ANTHROPIC_API_KEY` is set; otherwise the analyzer falls back to deterministic rule-based summaries.

---

## Project layout

```
fragments/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── scanner/             # ARP, port, OS, OUI
│   ├── threat/              # Risk scoring, CVE lookup
│   ├── ai/                  # Claude integration + RAG
│   ├── compliance/          # Framework assessor
│   ├── report.py            # PDF security report
│   └── tests/
├── frontend/
│   └── src/app/             # Next.js 16 App Router
├── data/
│   ├── oui.txt              # Pre-cached IEEE OUI database
│   ├── fragments.db         # SQLite (created on first run)
│   └── chroma/              # Vector store (created on first run)
└── specs/                   # Product spec, plan, tasks, constitution
```
