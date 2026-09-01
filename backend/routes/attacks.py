"""
attacks.py
==========
Purpose: API route for /simulate-attack.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Literal, Any

from attack_sim.forgery import simulate_forgery
from attack_sim.impersonation import simulate_impersonation
from attack_sim.replay import simulate_replay
from attack_sim.channel_manipulation import simulate_channel_manipulation

router = APIRouter()

AttackType = Literal["forgery", "impersonation", "replay", "channel_manipulation", "intercept_resend", "depolarizing"]


class SimulateAttackRequest(BaseModel):
    attack_type: AttackType = Field(default="intercept_resend")
    params: dict[str, Any] = Field(default_factory=dict)
    n_qubits: int = Field(default=8, ge=1, le=128)
    seed: int = Field(default=42, ge=0)


class SimulateAttackResponse(BaseModel):
    attack_type: str
    attack_result: dict[str, Any]
    measurement_data: dict[str, Any]


@router.post("/", response_model=SimulateAttackResponse, tags=["Attacks"])
async def simulate_attack_endpoint(request: SimulateAttackRequest) -> SimulateAttackResponse:
    """Execute the selected quantum/cyber attack simulation."""
    atype = request.attack_type

    if atype == "forgery":
        res = simulate_forgery(
            public_key=request.params.get("public_key"),
            target_message=request.params.get("target_message", "Forged Bank Wire: $500,000"),
            n_qubits=request.n_qubits,
            seed=request.seed,
        )
    elif atype == "impersonation":
        res = simulate_impersonation(
            alice_public_key=request.params.get("alice_public_key"),
            target_message=request.params.get("target_message", "Malicious Key Delegation"),
            n_qubits=request.n_qubits,
            seed=request.seed,
        )
    elif atype == "replay":
        captured = request.params.get("captured_signature", {})
        res = simulate_replay(
            captured_signature=captured,
            new_session_id=request.params.get("new_session_id"),
        )
    elif atype in ("channel_manipulation", "intercept_resend", "depolarizing"):
        sub_type = "depolarizing" if atype == "depolarizing" else "intercept_resend"
        res = simulate_channel_manipulation(
            attack_type=sub_type,
            params=request.params if request.params else {
                "alice_states": [[1.0, 0.0] for _ in range(request.n_qubits)],
                "error_rate": request.params.get("error_rate", 0.15),
            },
            seed=request.seed,
        )
    else:
        raise ValueError(f"Unknown attack type: {atype}")

    # Package measurement data for detection engine
    measurement_data = {
        "measurement_counts": res.get("measurement_counts", {"00": 512, "11": 512}),
        "fidelity": res.get("fidelity", 0.70),
        "measured_qber": res.get("measured_qber", 0.15),
        "session_id": res.get("session_id", "session-sim"),
    }
    if "sent_bits" in res:
        measurement_data["sent_bits"] = res["sent_bits"]
    if "received_bits" in res:
        measurement_data["received_bits"] = res["received_bits"]

    return SimulateAttackResponse(
        attack_type=atype,
        attack_result=res,
        measurement_data=measurement_data,
    )
