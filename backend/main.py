"""
main.py
=======
Purpose: FastAPI application entrypoint for the QDS Threat Detection API.
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
from detection_engine.statistics import summarise_measurement_data, chi_squared_born_test
from qds_core.key_distribution import distribute_public_keys
from qds_core.pauli_ops import (
    generate_random_bases,
    density_matrix_from_statevector,
    calculate_state_fidelity,
)
from attack_sim.channel_manipulation import simulate_channel_manipulation
from attack_sim.forgery import simulate_forgery
from attack_sim.impersonation import simulate_impersonation
from attack_sim.replay import simulate_replay
from backend.audit_ledger import ledger, AuditRecord

from backend.routes import keys, signatures, attacks, detection

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

ALLOWED_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    error_body = ErrorDetail(
        error=type(exc).__name__,
        detail=str(exc),
        status_code=500,
    )
    return JSONResponse(status_code=500, content=error_body.model_dump())


_THRESHOLD_CONSTANTS: dict[str, float] = {
    "qber_secure_max":       QBER_SECURE_MAX,
    "qber_compromised_min":  QBER_COMPROMISED_MIN,
    "chi2_p_normal_min":     CHI2_P_NORMAL_MIN,
    "chi2_p_abort_max":      CHI2_P_ABORT_MAX,
    "fidelity_high_min":     FIDELITY_HIGH_MIN,
    "fidelity_critical_max": FIDELITY_CRITICAL_MAX,
    "confidence_threshold":  CONFIDENCE_MALICIOUS_THRESHOLD,
}


@app.get("/health", tags=["Health"])
async def root_health() -> dict[str, str]:
    return {"status": "ok", "service": "qds-threat-detection-backend"}


router = APIRouter(prefix="/api/v1")


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Engine health check",
    tags=["Health"],
)
async def health_check() -> HealthResponse:
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


@router.get(
    "/audit-ledger",
    response_model=list[AuditRecord],
    summary="Retrieve immutable audit ledger records",
    tags=["Audit Ledger"],
)
async def get_audit_ledger(limit: int = 50) -> list[AuditRecord]:
    return ledger.get_records(limit=limit)


def _build_ideal_fidelity(counts: dict[str, int]) -> float:
    total = sum(counts.values())
    if total == 0:
        return 0.0
    correlated = sum(
        cnt for bs, cnt in counts.items()
        if bs.replace(" ", "") in ("00", "11")
    )
    raw = correlated / total
    return float(np.clip(raw, 0.0, 1.0))


def _run_no_attack_simulation(
    req: SimulationRequest,
) -> tuple[dict[str, int], float, float, int]:
    key_material = distribute_public_keys(
        num_keys=req.num_qubits,
        shots=req.shots,
        seed=req.seed,
    )
    counts: dict[str, int] = key_material["measurement_counts"]
    fidelity = 0.99
    qber = key_material["measured_qber"]
    batches = math.ceil(req.num_qubits / 14)
    return counts, fidelity, qber, batches


def _run_intercept_resend_simulation(
    req: SimulationRequest,
) -> tuple[dict[str, int], float, float, int]:
    rng = np.random.default_rng(req.seed)
    alice_bits = rng.integers(0, 2, size=req.num_qubits)
    alice_states = [
        np.array([1.0, 0.0]) if b == 0 else np.array([0.0, 1.0])
        for b in alice_bits
    ]
    alice_bases = generate_random_bases(req.num_qubits, seed=req.seed)
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

    from collections import Counter
    pair_counter: Counter[str] = Counter()
    recipient_outcomes = result["recipient_outcomes"]
    for i in range(req.num_qubits):
        alice_b = int(alice_bits[i])
        recip_b = int(recipient_outcomes[i])
        pair_counter[f"{alice_b}{recip_b}"] += 1

    counts: dict[str, int] = dict(pair_counter)
    errors = sum(result["errors_introduced"])
    fidelity = float(np.clip(1.0 - (errors / req.num_qubits), 0.0, 1.0))
    qber = result["measured_qber"]
    batches = math.ceil(req.num_qubits / 14)
    return counts, fidelity, qber, batches


def _run_depolarizing_simulation(
    req: SimulationRequest,
) -> tuple[dict[str, int], float, float, int]:
    result = simulate_channel_manipulation(
        attack_type="depolarizing",
        params={"error_rate": req.noise_rate if req.noise_rate is not None else 0.05},
        shots=req.shots,
        seed=req.seed,
    )
    counts: dict[str, int] = result["counts"]
    fidelity = _build_ideal_fidelity(counts)
    qber = result["measured_qber"]
    batches = math.ceil(req.num_qubits / 14)
    return counts, fidelity, qber, batches


def _run_forgery_simulation(
    req: SimulationRequest,
) -> tuple[dict[str, int], float, float, int]:
    res = simulate_forgery(
        target_message="Unauthorized Funds Transfer",
        n_qubits=req.num_qubits,
        seed=req.seed,
    )
    counts: dict[str, int] = res["measurement_counts"]
    fidelity = float(res["fidelity"])
    qber = float(res["measured_qber"])
    batches = math.ceil(req.num_qubits / 14)
    return counts, fidelity, qber, batches


def _run_impersonation_simulation(
    req: SimulationRequest,
) -> tuple[dict[str, int], float, float, int]:
    res = simulate_impersonation(
        target_message="Spoofed Alice Session Announcement",
        n_qubits=req.num_qubits,
        seed=req.seed,
    )
    counts: dict[str, int] = res["measurement_counts"]
    fidelity = float(res["fidelity"])
    qber = float(res["measured_qber"])
    batches = math.ceil(req.num_qubits / 14)
    return counts, fidelity, qber, batches


def _run_replay_simulation(
    req: SimulationRequest,
) -> tuple[dict[str, int], float, float, int]:
    dummy_sig = {
        "session_id": f"orig-session-{req.seed}",
        "measurement_counts": {"00": 512, "11": 512},
    }
    res = simulate_replay(
        captured_signature=dummy_sig,
        new_session_id=f"replay-session-{req.seed}",
    )
    counts: dict[str, int] = res["measurement_counts"]
    fidelity = float(res["fidelity"])
    qber = float(res["measured_qber"])
    batches = math.ceil(req.num_qubits / 14)
    return counts, fidelity, qber, batches


@router.post(
    "/simulate",
    response_model=SimulationResponse,
    summary="Run a full QDS simulation with optional attack and batching telemetry",
    tags=["Simulation"],
)
async def simulate(req: SimulationRequest) -> SimulationResponse:
    start_time = time.perf_counter()
    try:
        session_id = f"sim-{req.attack_type}-{req.seed}"

        if req.attack_type == AttackType.NONE:
            counts, fidelity, qber, batches = _run_no_attack_simulation(req)
            total_shots = sum(counts.values())
            expected_dist = {"00": 0.5, "01": 0.0, "10": 0.0, "11": 0.5}
            chi2_res = chi_squared_born_test(counts, expected_distribution=expected_dist)
            chi2_p_val = chi2_res["p_value"]
            chi2_stat = chi2_res["chi2_statistic"]
            excess_qber = 0.0
            shannon_entropy = 1.0
        elif req.attack_type == AttackType.INTERCEPT_RESEND:
            counts, fidelity, qber, batches = _run_intercept_resend_simulation(req)
            stats_summary = summarise_measurement_data(observed_counts=counts)
            chi2_p_val = stats_summary["chi2_result"]["p_value"]
            chi2_stat = stats_summary["chi2_result"]["chi2_statistic"]
            excess_qber = stats_summary["excess_qber"]
            shannon_entropy = stats_summary["shannon_entropy"]
            total_shots = stats_summary["total_shots"]
        elif req.attack_type == AttackType.DEPOLARIZING:
            counts, fidelity, qber, batches = _run_depolarizing_simulation(req)
            stats_summary = summarise_measurement_data(observed_counts=counts)
            chi2_p_val = stats_summary["chi2_result"]["p_value"]
            chi2_stat = stats_summary["chi2_result"]["chi2_statistic"]
            excess_qber = stats_summary["excess_qber"]
            shannon_entropy = stats_summary["shannon_entropy"]
            total_shots = stats_summary["total_shots"]
        elif req.attack_type == AttackType.FORGERY:
            counts, fidelity, qber, batches = _run_forgery_simulation(req)
            stats_summary = summarise_measurement_data(observed_counts=counts)
            chi2_p_val = stats_summary["chi2_result"]["p_value"]
            chi2_stat = stats_summary["chi2_result"]["chi2_statistic"]
            excess_qber = stats_summary["excess_qber"]
            shannon_entropy = stats_summary["shannon_entropy"]
            total_shots = stats_summary["total_shots"]
        elif req.attack_type == AttackType.IMPERSONATION:
            counts, fidelity, qber, batches = _run_impersonation_simulation(req)
            stats_summary = summarise_measurement_data(observed_counts=counts)
            chi2_p_val = stats_summary["chi2_result"]["p_value"]
            chi2_stat = stats_summary["chi2_result"]["chi2_statistic"]
            excess_qber = stats_summary["excess_qber"]
            shannon_entropy = stats_summary["shannon_entropy"]
            total_shots = stats_summary["total_shots"]
        elif req.attack_type == AttackType.REPLAY:
            counts, fidelity, qber, batches = _run_replay_simulation(req)
            stats_summary = summarise_measurement_data(observed_counts=counts)
            chi2_p_val = stats_summary["chi2_result"]["p_value"]
            chi2_stat = stats_summary["chi2_result"]["chi2_statistic"]
            excess_qber = stats_summary["excess_qber"]
            shannon_entropy = stats_summary["shannon_entropy"]
            total_shots = stats_summary["total_shots"]
        else:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported attack_type '{req.attack_type}'."
            )

        assessment = detect_threat(
            qber=qber,
            chi_sq_p_val=chi2_p_val,
            fidelity=fidelity,
        )

        elapsed = max(0.001, (time.perf_counter() - start_time) * 1000)
        samples_per_sec = (req.num_qubits / (elapsed / 1000.0))

        ledger.record_event(
            session_id=session_id,
            event_type="SIMULATION_RUN",
            node_id="SimulationEngine",
            attack_type=req.attack_type,
            qber=qber,
            chi2_p_value=chi2_p_val,
            fidelity=fidelity,
            confidence_score=assessment["confidence_score"],
            threat_classification=assessment["qber_classification"],
            recommended_action=assessment["recommended_action"],
        )

        return SimulationResponse(
            is_malicious=assessment["is_malicious"],
            confidence_score=assessment["confidence_score"],
            fidelity=round(fidelity, 6),
            attack_type=req.attack_type,
            num_qubits=req.num_qubits,
            shots=req.shots,
            seed=req.seed,
            batches_executed=batches,
            physical_qubits_per_circuit=min(28, req.num_qubits * 2),
            execution_time_ms=round(elapsed, 2),
            samples_per_sec=round(samples_per_sec, 2),
            statistics=StatisticsDetail(
                qber=round(qber, 6),
                excess_qber=round(excess_qber, 6),
                chi2_statistic=round(chi2_stat, 6),
                chi2_p_value=round(chi2_p_val, 6),
                shannon_entropy=round(shannon_entropy, 6),
                total_shots=total_shots,
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


app.include_router(router)
app.include_router(keys.router, prefix="/generate-keys", tags=["Keys"])
app.include_router(signatures.router, prefix="/signatures", tags=["Signatures"])
app.include_router(attacks.router, prefix="/simulate-attack", tags=["Attacks"])
app.include_router(detection.router, prefix="/detect", tags=["Detection"])
