"""
main.py
=======
Purpose: FastAPI application entrypoint for the QDS Threat Detection API.

Exposes deterministic, physics-based quantum simulation capabilities over
REST. All endpoints are pure JSON — no streaming, no websockets.

Routes
------
GET  /api/v1/health    — liveness probe + engine status
POST /api/v1/simulate  — run full simulation pipeline (attack + detection)

CORS
----
Configured for the React/Vite development server at port 5173 and the
Docker service hostname 'dashboard'. Adjust allow_origins for production.

Architecture
------------
backend/
  main.py      ← this file  (app factory + route definitions)
  schemas.py   ← Pydantic v2 request/response models
  Dockerfile   ← multi-stage build, exposes port 8000

Simulation pipeline (per request)
----------------------------------
1. Validate SimulationRequest via Pydantic.
2. Generate quantum key material (qds_core.key_distribution).
3. If attack_type != "none": run channel attack simulation.
4. Compute measurement fidelity from circuit result.
5. Run statistics.summarise_measurement_data() for QBER + χ².
6. Run detection_engine.detector.detect_threat() for classification.
7. Marshal result into SimulationResponse and return.

Compliance
----------
- No ML/AI components.
- Deterministic: identical SimulationRequest → identical SimulationResponse.
- All cross-package imports follow the allowed direction:
  backend → detection_engine → attack_sim → qds_core.
"""

from __future__ import annotations

import math
import time
from typing import Any

import numpy as np
from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.schemas import (
    AttackType,
    SimulationRequest,
    SimulationResponse,
    HealthResponse,
    StatisticsDetail,
    ThreatClassification,
    ErrorDetail,
)
from detection_engine.detector import (
    detect_threat,
    QBER_SECURE_MAX,
    QBER_COMPROMISED_MIN,
    CHI2_P_NORMAL_MIN,
    CHI2_P_ABORT_MAX,
    FIDELITY_HIGH_MIN,
    FIDELITY_CRITICAL_MAX,
    CONFIDENCE_MALICIOUS_THRESHOLD,
)
from detection_engine.statistics import summarise_measurement_data
from qds_core.key_distribution import distribute_public_keys
from qds_core.pauli_ops import (
    generate_random_bases,
    density_matrix_from_statevector,
    calculate_state_fidelity,
)
from attack_sim.channel_manipulation import simulate_channel_manipulation

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="QDS Threat Detection API",
    description=(
        "Quantum-Inspired Cyber Threat Detection Framework for "
        "Teleportation-Based Quantum Digital Signatures (QDS). "
        "Deterministic physics-based simulation — no AI/ML."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — React/Vite dev server (port 5173) + Docker service 'dashboard'
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://dashboard:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
)

# ---------------------------------------------------------------------------
# Global exception handler — always return structured ErrorDetail JSON
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a structured JSON error body for any unhandled exception."""
    error_body = ErrorDetail(
        error=type(exc).__name__,
        detail=str(exc),
        status_code=500,
    )
    return JSONResponse(status_code=500, content=error_body.model_dump())


# ---------------------------------------------------------------------------
# API Router  (/api/v1/*)
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/v1")


# ---------------------------------------------------------------------------
# Constant table for threshold export
# ---------------------------------------------------------------------------

_THRESHOLD_CONSTANTS: dict[str, float] = {
    "qber_secure_max":       QBER_SECURE_MAX,
    "qber_compromised_min":  QBER_COMPROMISED_MIN,
    "chi2_p_normal_min":     CHI2_P_NORMAL_MIN,
    "chi2_p_abort_max":      CHI2_P_ABORT_MAX,
    "fidelity_high_min":     FIDELITY_HIGH_MIN,
    "fidelity_critical_max": FIDELITY_CRITICAL_MAX,
    "confidence_threshold":  CONFIDENCE_MALICIOUS_THRESHOLD,
}


# ---------------------------------------------------------------------------
# GET /api/v1/health
# ---------------------------------------------------------------------------

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Engine health check",
    description=(
        "Liveness probe. Returns real-time operational status of the quantum "
        "detection engine. Used by Docker health checks and the React dashboard."
    ),
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """Return the operational status of the QDS detection engine.

    Verifies that the core physics packages are importable and that the
    threshold constants are within expected ranges (a basic sanity check
    that the module state has not been corrupted).

    Returns
    -------
    HealthResponse
        ``status`` = "ok" when all subsystems are operational.
        ``engine_status`` = "operational" | "degraded".
    """
    # Lightweight sanity check: verify threshold ordering invariants
    engine_ok = (
        QBER_SECURE_MAX < QBER_COMPROMISED_MIN
        and CHI2_P_ABORT_MAX < CHI2_P_NORMAL_MIN
        and FIDELITY_CRITICAL_MAX < FIDELITY_HIGH_MIN
    )

    return HealthResponse(
        status="ok" if engine_ok else "degraded",
        service="qds-threat-detection-backend",
        version="1.0.0",
        engine_status="operational" if engine_ok else "degraded",
        thresholds=_THRESHOLD_CONSTANTS,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/simulate
# ---------------------------------------------------------------------------

def _build_ideal_fidelity(counts: dict[str, int]) -> float:
    """Estimate teleportation fidelity from Bell-pair measurement counts.

    For an ideal noise-free |Φ⁺⟩ channel, only "00" and "11" outcomes appear.
    The fidelity is computed as the fraction of correlated outcomes weighted
    by their probability, compared to the ideal |0⟩ density matrix.

    This is a lightweight proxy for the full Uhlmann fidelity used in
    teleportation.py — appropriate for the key-distribution circuit where
    explicit state vectors are not tracked per shot.

    Parameters
    ----------
    counts : dict[str, int]
        Aer measurement count histogram for a Bell-pair circuit.

    Returns
    -------
    float
        Fidelity estimate ∈ [0.0, 1.0].
    """
    total = sum(counts.values())
    if total == 0:
        return 0.0
    # Correlated outcomes (|00⟩ + |11⟩) indicate intact entanglement
    correlated = sum(
        cnt for bs, cnt in counts.items()
        if bs.replace(" ", "") in ("00", "11")
    )
    # Raw correlation rate as fidelity proxy
    raw = correlated / total
    return float(np.clip(raw, 0.0, 1.0))


def _run_no_attack_simulation(
    req: SimulationRequest,
) -> tuple[dict[str, int], float]:
    """Distribute EPR keys and return (counts, fidelity) for the honest channel.

    Parameters
    ----------
    req : SimulationRequest
        Validated simulation request.

    Returns
    -------
    (counts, fidelity) : tuple
    """
    key_material = distribute_public_keys(
        num_keys=req.num_qubits,
        shots=req.shots,
        seed=req.seed,
    )
    counts: dict[str, int] = key_material["measurement_counts"]
    fidelity = _build_ideal_fidelity(counts)
    return counts, fidelity


def _run_intercept_resend_simulation(
    req: SimulationRequest,
) -> tuple[dict[str, int], float]:
    """Run an intercept-resend attack and return (synthetic_counts, fidelity).

    Eve intercepts each qubit, measures in a random basis, and re-forwards.
    The returned counts dict is synthesised from the per-qubit outcomes so
    that the chi-squared and QBER statistics can be computed uniformly.

    Parameters
    ----------
    req : SimulationRequest
        Validated simulation request.

    Returns
    -------
    (counts, fidelity) : tuple
    """
    rng = np.random.default_rng(req.seed)
    # Alice prepares Z-basis |0⟩ or |1⟩ states
    alice_bits = rng.integers(0, 2, size=req.num_qubits)
    alice_states = [
        np.array([1.0, 0.0]) if b == 0 else np.array([0.0, 1.0])
        for b in alice_bits
    ]
    alice_bases    = generate_random_bases(req.num_qubits, seed=req.seed)
    recipient_bases = generate_random_bases(req.num_qubits, seed=req.seed + 1)

    result = simulate_channel_manipulation(
        attack_type="intercept_resend",
        params={
            "alice_states": alice_states,
            "alice_bases": alice_bases,
            "recipient_bases": recipient_bases,
        },
        seed=req.seed,
    )

    # Build synthetic 2-bit count histogram from paired outcomes
    # Each qubit pair: (alice_bit, recipient_outcome)
    from collections import Counter
    pair_counter: Counter[str] = Counter()
    recipient_outcomes = result["recipient_outcomes"]
    for i in range(req.num_qubits):
        alice_b  = int(alice_bits[i])
        recip_b  = int(recipient_outcomes[i])
        pair_counter[f"{alice_b}{recip_b}"] += 1

    counts: dict[str, int] = dict(pair_counter)
    # Fidelity: fraction of qubits Bob received correctly
    errors = sum(result["errors_introduced"])
    fidelity = float(np.clip(1.0 - (errors / req.num_qubits), 0.0, 1.0))
    return counts, fidelity


def _run_depolarizing_simulation(
    req: SimulationRequest,
) -> tuple[dict[str, int], float]:
    """Run a depolarizing noise attack and return (counts, fidelity).

    Parameters
    ----------
    req : SimulationRequest
        Validated simulation request.

    Returns
    -------
    (counts, fidelity) : tuple
    """
    result = simulate_channel_manipulation(
        attack_type="depolarizing",
        params={"error_rate": req.noise_rate},
        shots=req.shots,
        seed=req.seed,
    )
    counts: dict[str, int] = result["counts"]
    fidelity = _build_ideal_fidelity(counts)
    return counts, fidelity


@router.post(
    "/simulate",
    response_model=SimulationResponse,
    summary="Run a full QDS simulation with optional attack",
    description=(
        "Executes the complete QDS pipeline: EPR key generation, optional "
        "channel attack, QBER + χ² statistical analysis, and BB84/Holevo "
        "threat classification. Returns a full JSON threat assessment."
    ),
    tags=["Simulation"],
    responses={
        422: {"model": ErrorDetail, "description": "Invalid request parameters."},
        500: {"model": ErrorDetail, "description": "Physics engine runtime error."},
    },
)
async def simulate(req: SimulationRequest) -> SimulationResponse:
    """POST /api/v1/simulate — run the full QDS simulation pipeline.

    Parameters
    ----------
    req : SimulationRequest
        Validated simulation parameters from request body.

    Returns
    -------
    SimulationResponse
        Complete threat assessment with QBER, fidelity, confidence score,
        classification, and recommended protocol action.

    Raises
    ------
    HTTPException 422
        If Pydantic validation rejects the request body.
    HTTPException 500
        If the quantum simulation engine raises a runtime exception.
    """
    try:
        # ---- Step 1: Run the selected simulation mode -------------------
        if req.attack_type == AttackType.NONE:
            counts, fidelity = _run_no_attack_simulation(req)
        elif req.attack_type == AttackType.INTERCEPT_RESEND:
            counts, fidelity = _run_intercept_resend_simulation(req)
        elif req.attack_type == AttackType.DEPOLARIZING:
            counts, fidelity = _run_depolarizing_simulation(req)
        else:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported attack_type '{req.attack_type}'."
            )

        # ---- Step 2: Statistical analysis -------------------------------
        stats_summary = summarise_measurement_data(observed_counts=counts)

        qber       = stats_summary["qber"]
        chi2_result = stats_summary["chi2_result"]
        chi2_p_val = chi2_result["p_value"]
        chi2_stat  = chi2_result["chi2_statistic"]

        # ---- Step 3: Threat detection -----------------------------------
        assessment = detect_threat(
            qber=qber,
            chi_sq_p_val=chi2_p_val,
            fidelity=fidelity,
        )

        # ---- Step 4: Marshal response -----------------------------------
        return SimulationResponse(
            is_malicious=assessment["is_malicious"],
            confidence_score=assessment["confidence_score"],
            fidelity=round(fidelity, 6),
            attack_type=req.attack_type,
            num_qubits=req.num_qubits,
            shots=req.shots,
            seed=req.seed,
            statistics=StatisticsDetail(
                qber=stats_summary["qber"],
                excess_qber=stats_summary["excess_qber"],
                chi2_statistic=chi2_stat,
                chi2_p_value=chi2_p_val,
                shannon_entropy=stats_summary["shannon_entropy"],
                total_shots=stats_summary["total_shots"],
                measurement_counts=counts,
            ),
            classification=ThreatClassification(
                qber_classification=assessment["qber_classification"],
                chi2_classification=assessment["chi2_classification"],
                fidelity_classification=assessment["fidelity_classification"],
                recommended_action=assessment["recommended_action"],
            ),
            thresholds=assessment["thresholds"],
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation engine error: {type(exc).__name__}: {exc}",
        ) from exc


# ---------------------------------------------------------------------------
# Register router
# ---------------------------------------------------------------------------

app.include_router(router)
