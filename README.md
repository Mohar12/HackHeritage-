# Quantum-Inspired Cyber Threat Detection Framework  
### for Teleportation-Based Quantum Digital Signatures (QDS)

---

## Summary

This project implements a **deterministic, physics-based simulation framework** for detecting cyber threats against a Teleportation-Based Quantum Digital Signature (QDS) protocol. The signing scheme, originally proposed by Gottesman & Chuang (2001) and refined by Dunjko et al. (2014), distributes entangled Bell pairs between three parties — Alice (signer), Bob, and Charlie (verifiers) — and uses quantum teleportation as the signing primitive. The framework models four classes of adversarial attacks (forgery, impersonation, replay, and quantum-channel manipulation), quantifies their statistical fingerprints via Quantum Bit Error Rate (QBER) and χ² analysis, and exposes a `detect_threat()` pipeline that classifies measurement data as benign or malicious with a continuous confidence score. All simulation logic is implemented with **Qiskit + Qiskit Aer** and **numpy/scipy** — no AI or machine learning libraries are used anywhere in the stack.

---

## Folder Structure

```
qds-threat-detection/
├── qds_core/               # QDS protocol primitives (Qiskit circuits)
│   ├── key_distribution.py #   Bell-pair generation, public key distribution
│   ├── teleportation.py    #   Alice-Bob-Charlie teleportation circuit
│   ├── signing.py          #   sign(message) → signature
│   ├── verification.py     #   verify(signature) → is_valid
│   └── pauli_ops.py        #   Pauli matrices, Bell states, fidelity
├── attack_sim/             # Adversarial simulation modules
│   ├── forgery.py          #   simulate_forgery()
│   ├── impersonation.py    #   simulate_impersonation()
│   ├── replay.py           #   simulate_replay()
│   └── channel_manipulation.py # simulate_channel_manipulation()
├── detection_engine/       # Physics-based anomaly detection
│   ├── statistics.py       #   QBER, χ², excess-error analysis
│   ├── thresholds.py       #   BB84 / Holevo-bound decision rules
│   └── detector.py         #   detect_threat() → (is_malicious, confidence_score)
├── backend/                # FastAPI REST API
│   ├── main.py             #   App entrypoint (CORS, health check)
│   ├── routes/             #   /generate-keys · /sign · /verify · /simulate-attack · /detect
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── dashboard/              # React 18 + Vite SPA
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/     #   ProtocolRunPanel · AttackSelectionPanel · ResultsCharts
│   │   └── api/client.js   #   Typed fetch wrappers for each API endpoint
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── .dockerignore
├── docs/
│   ├── architecture.md     #   System architecture and data-flow diagrams
│   ├── delivery_table.md   #   Project deliverable tracker
│   ├── security_analysis.md#   Attack bounds and threshold justification
│   └── diagrams/           #   (Mermaid / image assets — TBD)
├── tests/
│   ├── test_qds_core.py
│   ├── test_attack_sim.py
│   └── test_detection_engine.py
├── docker-compose.yml      # Orchestrates backend + dashboard
├── requirements.txt        # Root-level Python deps (local dev / CI)
├── .gitignore
├── .env.example            # Environment variable reference
└── README.md
```

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Docker | 24.x |
| Docker Compose | 2.x (plugin) |
| Git | 2.x |

For local development without Docker:

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 20+ |

---

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone <repo-url>
cd qds-threat-detection

# 2. Copy and (optionally) edit environment variables
cp .env.example .env

# 3. Build and start all services
docker compose up --build

# Services will be available at:
#   Backend API  → http://localhost:8000
#   API Docs     → http://localhost:8000/docs
#   Dashboard    → http://localhost:5173
```

To stop all services:

```bash
docker compose down
```

---

## Local Development (without Docker)

### Backend

```bash
# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Run the API
uvicorn backend.main:app --reload --port 8000
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

### Tests

```bash
pytest tests/ -v
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate-keys` | Generate Bell-pair-based quantum key material |
| POST | `/signatures/sign` | Sign a message using teleportation-based QDS |
| POST | `/signatures/verify` | Verify a signature with Pauli corrections |
| POST | `/simulate-attack` | Run an adversarial attack simulation |
| POST | `/detect` | Analyse measurement data → threat assessment |
| GET  | `/health` | Service liveness probe |
| GET  | `/docs` | Interactive Swagger UI |

---

## References

- Gottesman, D. & Chuang, I. (2001). *Quantum Digital Signatures*. arXiv:quant-ph/0105032
- Dunjko, V. et al. (2014). *Quantum Digital Signatures without Quantum Memory*. PRL 112, 040502
- Amiri, R. & Andersson, E. (2015). *Unconditionally Secure Quantum Signatures*. Entropy 17(8)
- Bennett, C.H. & Brassard, G. (1984). *Quantum Cryptography: Public Key Distribution and Coin Tossing*. IEEE
- Nielsen, M.A. & Chuang, I.L. (2000). *Quantum Computation and Quantum Information*. Cambridge University Press

---

## Licence

MIT — see `LICENSE` (to be added).
