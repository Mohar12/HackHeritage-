"""
attacks.py
==========
Purpose: API routes for /simulate-attack/{attack_type} with audit ledger integration.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from attack_sim.channel_manipulation import simulate_channel_manipulation
from attack_sim.forgery import simulate_forgery
from attack_sim.impersonation import simulate_impersonation
from attack_sim.replay import simulate_replay
from backend.audit_ledger import ledger

router = APIRouter()


class SimulateAttackRequest(BaseModel):
    params: dict[str, Any] = Field(default_factory=dict)
    shots: int = Field(default=1024, ge=64, le=8192)
    seed: int = Field(default=42, ge=0)


class SimulateAttackResponse(BaseModel):
    attack_type: str
    attack_result: dict[str, Any]
    measurement_data: dict[str, Any]


@router.post("/{attack_type}", response_model=SimulateAttackResponse, tags=["Attacks"])
async def simulate_attack_endpoint(
    attack_type: str,
    request: SimulateAttackRequest,
) -> SimulateAttackResponse:
    """Execute one of the four adversarial attack vectors and create an audit log entry."""
    atype = attack_type.lower()
    params = request.params
    shots = request.shots
    seed = request.seed

    if atype in ("intercept_resend", "depolarizing"):
        res = simulate_channel_manipulation(
            attack_type=atype,
            params=params,
            shots=shots,
            seed=seed,
        )
    elif atype == "forgery":
        res = simulate_forgery(
            signature=params.get("signature", {}),
            strategy=params.get("strategy", "blind_guess"),
            n_qubits=params.get("n_qubits", 8),
            shots=shots,
            seed=seed,
        )
    elif atype == "impersonation":
        res = simulate_impersonation(
            target_identity=params.get("target_identity", "Alice"),
            n_qubits=params.get("n_qubits", 8),
            strategy=params.get("strategy", "unentangled_spoof"),
            shots=shots,
            seed=seed,
        )
    elif atype == "replay":
        res = simulate_replay(
            captured_signature=params.get("signature", {}),
            target_recipient=params.get("target_recipient", "Charlie"),
            new_session_id=params.get("new_session_id"),
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown attack type: '{attack_type}'. Must be one of: intercept_resend, depolarizing, forgery, impersonation, replay."
        )

    # Format measurement_data dictionary
    counts = res.get("counts") or res.get("measurement_counts") or {"00": 512, "11": 512}
    fidelity = res.get("fidelity", 0.5)
    measured_qber = res.get("measured_qber") or res.get("forgery_qber") or 0.25

    measurement_data = {
        "measurement_counts": counts,
        "fidelity": fidelity,
        "measured_qber": measured_qber,
        "session_id": f"attack-{atype}-{seed}",
    }
    if "sent_bits" in res:
        measurement_data["sent_bits"] = res["sent_bits"]
    if "received_bits" in res:
        measurement_data["received_bits"] = res["received_bits"]

    # Record non-blocking audit event
    ledger.record_event(
        session_id=measurement_data["session_id"],
        event_type="ATTACK_SIMULATION",
        node_id="Adversary-Eve",
        attack_type=atype,
        qber=measured_qber,
        fidelity=fidelity,
    )

    return SimulateAttackResponse(
        attack_type=atype,
        attack_result=res,
        measurement_data=measurement_data,
    )
