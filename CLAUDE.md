# Shards Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-11

## Active Technologies

- **Backend**: Python 3.11+, FastAPI, scapy, python-nmap, manuf, icmplib, anthropic SDK, chromadb, reportlab
- **Frontend**: Next.js 14 (App Router), TypeScript 5.x, D3.js v7, Tailwind CSS
- **Database**: SQLite 3 (relational), ChromaDB embedded (vector)
- **AI**: Claude API (Sonnet) via Anthropic Python SDK
- **Testing**: pytest + httpx (backend), Jest + React Testing Library (frontend)
- **Deployment**: Docker Compose (optional), direct process execution (primary)

## Project Structure

```text
backend/
├── main.py                     # FastAPI entry point
├── config.py                   # Environment variable management
├── database.py                 # SQLite setup and queries
├── websocket.py                # WebSocket event broadcaster
├── report.py                   # PDF security report builder
├── scanner/                    # Network discovery engine
│   ├── arp_scanner.py          # ARP discovery (scapy)
│   ├── port_scanner.py         # Port/service scanning (nmap)
│   ├── traceroute.py           # ICMP hop mapping
│   ├── os_fingerprint.py       # OS detection
│   ├── oui_lookup.py           # MAC vendor resolution
│   └── mock_scanner.py         # Demo mode mock data
├── threat/                     # Threat detection
│   ├── risk_scorer.py          # Risk scoring algorithm (0-100)
│   ├── cve_lookup.py           # NVD API enrichment
│   └── threat_feeds.py         # External threat intel
├── ai/                         # AI analysis engine
│   ├── analyzer.py             # Claude API integration
│   ├── attack_sim.py           # Attack path simulation
│   ├── segmentation.py         # Network segmentation advisor
│   └── rag/                    # RAG pipeline
│       ├── embedder.py         # Scan data → embeddings
│       ├── retriever.py        # Vector DB retrieval
│       └── ingestion.py        # Scan → ChromaDB pipeline
├── compliance/                 # Compliance engine
│   ├── parser.py               # Document parser
│   ├── assessor.py             # Control assessment
│   └── report_generator.py     # PDF compliance report
├── models/                     # Data models
│   ├── device.py, alert.py, scan.py
├── tests/                      # Backend tests
│   ├── fixtures/               # Mock data JSON files
│   └── test_*.py
└── requirements.txt

frontend/
├── src/app/                    # Next.js App Router pages
│   ├── page.tsx                # Dashboard
│   ├── devices/page.tsx        # Device inventory
│   ├── threats/page.tsx        # Alert feed
│   ├── simulate/page.tsx       # Attack simulation
│   ├── chat/page.tsx           # RAG chatbot
│   ├── compliance/page.tsx     # Compliance assessment
│   ├── report/page.tsx         # Report generation
│   └── components/             # Shared components
├── hooks/                      # Custom React hooks
├── lib/                        # API client utilities
└── package.json
```

## Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
sudo uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Backend (mock mode)
FRAGMENTS_MOCK=1 uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd frontend
npm install
npm run dev

# Tests
cd backend && pytest -v
cd frontend && npm test

# Docker
docker-compose up --build
```

## Code Style

### Python
- Type hints on ALL function signatures
- async/await for all I/O operations
- `logging` module for all output (no print statements)
- Parameterized SQL queries only (no f-strings in SQL)
- Dataclasses for all models

### TypeScript
- Strict mode enabled
- Functional components only
- Hooks for state management (no external state libraries)
- All API responses typed with interfaces

### General
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`
- Feature branches: `p[phase]-[feature]` (e.g., `p1-arp-scanner`)
- No hardcoded credentials anywhere

## Recent Changes

1. **Project initialization** — Created spec, plan, tasks, constitution, and checklist documents
2. **Name change** — Project renamed from NetScope to Shards
3. **Tech stack update** — Frontend changed from React+Vite to Next.js 14 App Router

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
