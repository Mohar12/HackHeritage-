# Delivery Table — QDS Threat Detection Framework

| # | Deliverable | Module / File | Status |
|---|-------------|---------------|--------|
| 1 | Bell-pair generation | `qds_core/key_distribution.py` | 🔲 Scaffold |
| 2 | Quantum public key distribution | `qds_core/key_distribution.py` | 🔲 Scaffold |
| 3 | Alice-Bob-Charlie teleportation circuit | `qds_core/teleportation.py` | 🔲 Scaffold |
| 4 | QDS Signing (`sign(message)`) | `qds_core/signing.py` | 🔲 Scaffold |
| 5 | QDS Verification (`verify(signature)`) | `qds_core/verification.py` | 🔲 Scaffold |
| 6 | Pauli operator & Bell-state utilities | `qds_core/pauli_ops.py` | 🔲 Scaffold |
| 7 | Forgery attack simulation | `attack_sim/forgery.py` | 🔲 Scaffold |
| 8 | Impersonation attack simulation | `attack_sim/impersonation.py` | 🔲 Scaffold |
| 9 | Replay attack simulation | `attack_sim/replay.py` | 🔲 Scaffold |
| 10 | Channel manipulation simulation | `attack_sim/channel_manipulation.py` | 🔲 Scaffold |
| 11 | Measurement statistical analysis (QBER, χ²) | `detection_engine/statistics.py` | 🔲 Scaffold |
| 12 | Threshold decision rules | `detection_engine/thresholds.py` | 🔲 Scaffold |
| 13 | `detect_threat()` pipeline | `detection_engine/detector.py` | 🔲 Scaffold |
| 14 | FastAPI entrypoint | `backend/main.py` | 🔲 Scaffold |
| 15 | `/generate-keys` route | `backend/routes/keys.py` | 🔲 Scaffold |
| 16 | `/sign`, `/verify` routes | `backend/routes/signatures.py` | 🔲 Scaffold |
| 17 | `/simulate-attack` route | `backend/routes/attacks.py` | 🔲 Scaffold |
| 18 | `/detect` route | `backend/routes/detection.py` | 🔲 Scaffold |
| 19 | React dashboard entrypoint | `dashboard/src/main.jsx` | 🔲 Scaffold |
| 20 | ProtocolRunPanel component | `dashboard/src/components/ProtocolRunPanel.jsx` | 🔲 Scaffold |
| 21 | AttackSelectionPanel component | `dashboard/src/components/AttackSelectionPanel.jsx` | 🔲 Scaffold |
| 22 | ResultsCharts component | `dashboard/src/components/ResultsCharts.jsx` | 🔲 Scaffold |
| 23 | API client | `dashboard/src/api/client.js` | 🔲 Scaffold |
| 24 | Backend Dockerfile | `backend/Dockerfile` | ✅ Done |
| 25 | Dashboard Dockerfile | `dashboard/Dockerfile` | ✅ Done |
| 26 | Docker Compose orchestration | `docker-compose.yml` | ✅ Done |
| 27 | QDS core unit tests | `tests/test_qds_core.py` | 🔲 Scaffold |
| 28 | Attack sim unit tests | `tests/test_attack_sim.py` | 🔲 Scaffold |
| 29 | Detection engine unit tests | `tests/test_detection_engine.py` | 🔲 Scaffold |
| 30 | Architecture documentation | `docs/architecture.md` | ✅ Done |
| 31 | Security analysis | `docs/security_analysis.md` | ✅ Done |

**Legend**: ✅ Done · 🔲 Scaffold (implementation TODO) · 🚧 In Progress
