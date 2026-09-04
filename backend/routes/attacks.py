"""
attacks.py
==========
Purpose: FastAPI router for attack simulation endpoints.
"""

from __future__ import annotations

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from attack_sim.channel_manipulation import simulate_channel_manipulation
from attack_sim.forgery import simulate_forgery
from attack_sim.impersonation import simulate_impersonation
from attack_sim.replay import simulate_replay
from qds_core.pauli_ops import generate_random_bases
from backend.audit_ledger import ledger
from backend.schemas import AttackType

router = APIRouter()


class AttackSimRequest(BaseModel):
    params: dict[str, Any] = Field(default_factory=dict)
    shots: int = 1024
    seed: int = 42


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


@router.post("/{attack_type}")
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

    if atype == AttackType.INTERCEPT_RESEND.value:
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
    elif atype == AttackType.DEPOLARIZING.value:
        res = simulate_channel_manipulation(
            attack_type=atype,
            params=params,
            shots=shots,
            seed=seed,
        )
    elif atype == AttackType.FORGERY.value:
        res = simulate_forgery(
            public_key=params.get("public_key") or params.get("alice_public_key"),
            target_message=params.get("target_message", "Authorized Transfer: $1,000,000 to Eve"),
            n_qubits=n_qubits,
            seed=seed,
        )
    elif atype == AttackType.IMPERSONATION.value:
        res = simulate_impersonation(
            alice_public_key=params.get("public_key") or params.get("alice_public_key"),
            target_message=params.get("target_message", "Urgent: Redirect Quantum Channel Funds"),
            n_qubits=n_qubits,
            seed=seed,
        )
    elif atype == AttackType.REPLAY.value:
        captured_sig = params.get("captured_signature") or params.get("signature") or {}
        res = simulate_replay(
            captured_signature=captured_sig,
            new_session_id=params.get("new_session_id"),
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown attack type: '{attack_type}'. Must be one of: {', '.join(valid_attacks)}."
        )

    # Sanitize result to pure Python JSON-serializable types
    clean_res = _sanitize_for_json(res)

    counts = clean_res.get("counts") or clean_res.get("measurement_counts") or {"00": 512, "11": 512}
    fidelity = float(clean_res.get("fidelity", 0.5))
    measured_qber = float(clean_res.get("measured_qber") or clean_res.get("forgery_qber") or 0.25)

    measurement_data = {
        "measurement_counts": counts,
        "fidelity": fidelity,
        "measured_qber": measured_qber,
        "session_id": f"attack-{atype}-{seed}",
    }
    if "sent_bits" in clean_res:
        measurement_data["sent_bits"] = clean_res["sent_bits"]
    if "received_bits" in clean_res:
        measurement_data["received_bits"] = clean_res["received_bits"]

    ledger.record_event(
        session_id=measurement_data["session_id"],
        event_type="ATTACK_SIMULATION",
        node_id="Adversary-Eve",
        attack_type=atype,
        qber=measured_qber,
        fidelity=fidelity,
        threat_classification="ATTACK_DETECTED",
        recommended_action="ABORT",
    )

    return {
        "status": "success",
        "attack_type": atype,
        "results": clean_res,
        "measurement_data": measurement_data,
    }
