"""
main.py
=======
Purpose: FastAPI application entrypoint for the QDS Threat Detection API.

Registers all route modules and configures CORS, startup events, and
global exception handling. The API exposes endpoints for key generation,
signing, verification, attack simulation, and threat detection.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# TODO: import route modules when implemented:
# from backend.routes import keys, signatures, attacks, detection

app = FastAPI(
    title="QDS Threat Detection API",
    description=(
        "Quantum-Inspired Cyber Threat Detection Framework for "
        "Teleportation-Based Quantum Digital Signatures (QDS). "
        "Deterministic, physics-based simulation — no AI/ML."
    ),
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the React dashboard (port 5173) to call the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://dashboard:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Route registration
# ---------------------------------------------------------------------------
# TODO: app.include_router(keys.router,       prefix="/generate-keys", tags=["Keys"])
# TODO: app.include_router(signatures.router, prefix="/signatures",    tags=["Signatures"])
# TODO: app.include_router(attacks.router,    prefix="/simulate-attack",tags=["Attacks"])
# TODO: app.include_router(detection.router,  prefix="/detect",        tags=["Detection"])


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Liveness probe used by Docker and the dashboard."""
    return {"status": "ok", "service": "qds-threat-detection-backend"}
