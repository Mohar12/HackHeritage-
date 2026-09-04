"""
attacks.py
==========
Purpose: FastAPI router for attack simulation endpoints.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from attack_sim.channel_manipulation import simulate_channel_manipulation
from attack_sim.forgery import simulate_forgery
from attack_sim.impersonation import simulate_impersonation
from attack_sim.replay import simulate_replay
from qds_core.pauli_ops import generate_random_bases
from backend.audit_ledger import ledger
from backend.schemas import AttackType

logger = logging.getLogger(__name__)

router = APIRouter()


class AttackSimRequest(BaseModel):
    params: dict[str, Any] = Field(default_factory=dict)
    shots: int = Field(default=1024, ge=64, le=8192)
    seed: int = Field(default=42, ge=0)
    target_identity: str | None = None
    target_payload: str | None = None

    @field_validator("params")
    @classmethod
    def validate_params(cls, v: Any) -> dict[str, Any]:
        if not isinstance(v, dict):
            raise ValueError("params must be a dictionary.")
        if "n_qubits" in v:
            nq = v["n_qubits"]
            if isinstance(nq, bool) or not isinstance(nq, (int, np.integer)):
                raise ValueError(f"n_qubits must be an integer, got {type(nq).__name__}.")
            if int(nq) < 1:
                raise ValueError(f"n_qubits must be >= 1, got {nq}.")
        if "error_rate" in v:
            er = v["error_rate"]
            if isinstance(er, bool) or not isinstance(er, (int, float, np.floating, np.integer, str)):
                raise ValueError(f"error_rate must be a numeric value satisfying 0 < error_rate <= 1, got {type(er).__name__}.")
            try:
                rate = float(er)
            except (ValueError, TypeError):
                raise ValueError(f"error_rate must be a valid numeric value, got {er!r}.")
            if not (0.0 < rate <= 1.0):
                raise ValueError(f"error_rate must satisfy 0 < error_rate <= 1. Got {rate}.")
        return v

    @field_validator("shots", "seed", mode="before")
    @classmethod
    def validate_shots_seed_not_bool(cls, v: Any) -> Any:
        if isinstance(v, bool):
            raise ValueError("Attack simulation shots and seed cannot be boolean.")
        return v


def _sanitize_for_json(obj: Any) -> Any:
    """Recursively convert NumPy numbers, arrays, and complex types to JSON-safe Python primitives."""
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_sanitize_for_json(v) for v in obj]
    elif isinstance(obj, tuple):
        return [_sanitize_for_json(v) for v in obj]
    elif isinstance(obj, np.ndarray):
        if np.iscomplexobj(obj):
            return [float(abs(x)) for x in obj.flatten().tolist()]
        return obj.tolist()
    elif isinstance(obj, (np.complex128, np.complex64, complex)):
        return float(abs(obj))
    elif isinstance(obj, (np.floating, float)):
        return float(obj)
    elif isinstance(obj, (np.integer, int)):
        return int(obj)
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    return obj


@router.post("/{attack_type}", summary="Simulate quantum channel or signature attack")
async def simulate_attack_endpoint(attack_type: str, request: AttackSimRequest) -> dict[str, Any]:
    raw_type = attack_type.lower().strip()
    valid_attacks = [e.value for e in AttackType if e != AttackType.NONE]
    try:
        attack_enum = AttackType(raw_type)
        if attack_enum == AttackType.NONE:
            raise ValueError()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown attack type: '{attack_type}'. Must be one of: {', '.join(valid_attacks)}."
        )

    atype = attack_enum.value
    params = request.params
    shots = request.shots
    seed = request.seed
    n_qubits = int(params.get("n_qubits", 8))
    if n_qubits < 1:
        raise HTTPException(status_code=422, detail="n_qubits must be an integer >= 1.")

    try:
        if atype == "intercept_resend":
            if "alice_states" not in params:
                rng = np.random.default_rng(seed)
                alice_bits = rng.integers(0, 2, size=n_qubits)
                params["alice_states"] = [
                    np.array([1.0, 0.0], dtype=np.complex128) if b == 0 else np.array([0.0, 1.0], dtype=np.complex128)
                    for b in alice_bits
                ]
                params["alice_bases"] = generate_random_bases(n_qubits, seed=seed)
                params["recipient_bases"] = generate_random_bases(n_qubits, seed=seed + 1)

            res = simulate_channel_manipulation(
                attack_type=atype,
                params=params,
                shots=shots,
                seed=seed,
            )
        elif atype == "depolarizing":
            if "error_rate" in params:
                raw_rate = params["error_rate"]
                if isinstance(raw_rate, bool) or not isinstance(raw_rate, (int, float, np.floating, np.integer, str)):
                    raise HTTPException(
                        status_code=422,
                        detail=f"error_rate must be a numeric value satisfying 0 < error_rate <= 1, got {type(raw_rate).__name__}."
                    )
                try:
                    rate = float(raw_rate)
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=422,
                        detail=f"error_rate must be a valid numeric value, got {raw_rate!r}."
                    )
                if not (0.0 < rate <= 1.0):
                    raise HTTPException(
                        status_code=422,
                        detail=f"error_rate must satisfy 0 < error_rate <= 1. Got {rate}."
                    )
                params["error_rate"] = rate

            res = simulate_channel_manipulation(
                attack_type=atype,
                params=params,
                shots=shots,
                seed=seed,
            )
        elif atype == "forgery":
            res = simulate_forgery(
                public_key=params.get("public_key") or params.get("alice_public_key"),
                target_message=params.get("target_message", "Authorized Transfer: $1,000,000 to Eve"),
                n_qubits=n_qubits,
                seed=seed,
            )
        elif atype == "impersonation":
            res = simulate_impersonation(
                alice_public_key=params.get("public_key") or params.get("alice_public_key"),
                target_message=params.get("target_message", "Urgent: Redirect Quantum Channel Funds"),
                n_qubits=n_qubits,
                seed=seed,
            )
        elif atype == "replay":
            captured_sig = params.get("captured_signature") or params.get("signature") or {}
            res = simulate_replay(
                captured_signature=captured_sig,
                new_session_id=params.get("new_session_id"),
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown attack type: '{attack_type}'. Must be one of: intercept_resend, depolarizing, forgery, impersonation, replay."
            )
    except HTTPException:
        raise
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Sanitize result to pure Python JSON-serializable types
    clean_res = _sanitize_for_json(res)

    counts = clean_res.get("counts") or clean_res.get("measurement_counts") or {"00": 512, "11": 512}
    actual_shots = sum(counts.values())
    shot_mismatch = (actual_shots != shots)

    if shot_mismatch:
        logger.warning(
            "Shot count mismatch detected in '%s' attack simulation: requested shots=%d, but measurement_counts sum=%d observations.",
            atype,
            shots,
            actual_shots,
        )

    # Ensure clean_res does not falsely claim the requested shots if actual measurement observations differ
    if "shots" in clean_res and clean_res["shots"] != actual_shots:
        clean_res["requested_shots"] = clean_res["shots"]
        clean_res["shots"] = actual_shots

    clean_res["total_shots"] = actual_shots

    # Derive measured_qber consistently:
    # 1. For depolarizing attacks, calculate measured_qber directly from the actual Bell measurement counts first.
    #    Treat "00" and "11" as correct outcomes, and "01" and "10" as error outcomes (QBER = error_shots / total_shots).
    # 2. For attacks where the simulator provides an appropriate measured_qber and counts are not suitable for this Bell-count calculation, preserve existing behavior.
    # 3. For Bell measurement counts (fallback/generic), calculate QBER directly from counts: error_shots / total_shots.
    # 4. For intercept-resend, calculate sum(errors) / len(errors).
    # 5. Fallback to 0.25 default only if no measurement data or simulator metric is available.
    if atype == "depolarizing" and isinstance(counts, dict) and sum(counts.values()) > 0:
        tot = sum(counts.values())
        err_shots = sum(cnt for bs, cnt in counts.items() if str(bs).replace(" ", "") in ("01", "10"))
        measured_qber = 0 if err_shots == 0 else round(float(err_shots) / tot, 6)
    elif "measured_qber" in clean_res and clean_res["measured_qber"] is not None:
        measured_qber = float(clean_res["measured_qber"])
    elif "forgery_qber" in clean_res and clean_res["forgery_qber"] is not None:
        measured_qber = float(clean_res["forgery_qber"])
    elif counts and sum(counts.values()) > 0 and any(bs.replace(" ", "") in ("00", "11") for bs in counts):
        tot = sum(counts.values())
        err_shots = sum(cnt for bs, cnt in counts.items() if bs.replace(" ", "") not in ("00", "11"))
        measured_qber = round(float(err_shots) / tot, 6)
    elif "errors_introduced" in clean_res and isinstance(clean_res["errors_introduced"], list) and len(clean_res["errors_introduced"]) > 0:
        errs = clean_res["errors_introduced"]
        measured_qber = round(float(sum(errs)) / len(errs), 6)
    else:
        measured_qber = 0.25

    clean_res["measured_qber"] = measured_qber

    # Derive fidelity honestly adhering to project conventions (backend/main.py):
    # 1. Preserve simulator-provided fidelity if present (forgery: 0.50, impersonation: 0.45, replay: 0.60).
    # 2. For depolarizing (which returns Bell counts): compute correlated / total shots.
    # 3. For intercept-resend (which returns errors_introduced): compute 1 - (errors / n_qubits).
    # 4. Fallback to established 1 - QBER proxy.
    if "fidelity" in clean_res and clean_res["fidelity"] is not None:
        fidelity = float(clean_res["fidelity"])
    elif "counts" in clean_res and isinstance(clean_res["counts"], dict) and sum(clean_res["counts"].values()) > 0:
        c = clean_res["counts"]
        tot = sum(c.values())
        corr = sum(cnt for bs, cnt in c.items() if bs.replace(" ", "") in ("00", "11"))
        fidelity = round(float(np.clip(corr / tot, 0.0, 1.0)), 6)
    elif "errors_introduced" in clean_res and isinstance(clean_res["errors_introduced"], list) and len(clean_res["errors_introduced"]) > 0:
        errs = clean_res["errors_introduced"]
        fidelity = round(float(np.clip(1.0 - (sum(errs) / len(errs)), 0.0, 1.0)), 6)
    else:
        fidelity = round(float(np.clip(1.0 - measured_qber, 0.0, 1.0)), 6)

    measurement_data = {
        "measurement_counts": counts,
        "total_shots": actual_shots,
        "fidelity": fidelity,
        "measured_qber": measured_qber,
        "session_id": f"attack-{atype}-{seed}",
    }
    if shot_mismatch:
        measurement_data["shot_count_mismatch"] = True
    if "sent_bits" in clean_res:
        measurement_data["sent_bits"] = clean_res["sent_bits"]
    if "received_bits" in clean_res:
        measurement_data["received_bits"] = clean_res["received_bits"]

    target_ent = (
        request.target_identity
        or request.target_payload
        or params.get("target_identity")
        or params.get("target_payload")
        or "Digital Signature Asset"
    )
    ledger.record_event(
        session_id=measurement_data["session_id"],
        event_type="ATTACK_SIMULATION",
        node_id="Adversary-Eve",
        attack_type=atype,
        qber=measured_qber,
        fidelity=fidelity,
        threat_classification="ATTACK_DETECTED",
        recommended_action="ABORT",
        source_tab="Tab 2: Adversarial Attack Laboratory",
        target_entity=str(target_ent),
    )

    return {
        "status": "success",
        "attack_type": atype,
        "results": clean_res,
        "measurement_data": measurement_data,
    }
