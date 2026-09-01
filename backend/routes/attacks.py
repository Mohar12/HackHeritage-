"""
attacks.py
==========
Purpose: API route for /simulate-attack.

Exposes a POST endpoint that dispatches to the appropriate attack simulation
module (forgery, impersonation, replay, or channel_manipulation) and returns
the simulated attack artefacts and measurement data.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Literal

router = APIRouter()

AttackType = Literal["forgery", "impersonation", "replay", "channel_manipulation"]


class SimulateAttackRequest(BaseModel):
    attack_type: AttackType
    params: dict = {}


class SimulateAttackResponse(BaseModel):
    attack_type: str
    attack_result: dict
    measurement_data: dict


@router.post("/", response_model=SimulateAttackResponse, tags=["Attacks"])
async def simulate_attack(request: SimulateAttackRequest) -> SimulateAttackResponse:
    """
    Simulate a chosen attack against the QDS protocol.

    Dispatches to the corresponding attack_sim module based on attack_type.
    """
    # TODO: from attack_sim import forgery, impersonation, replay, channel_manipulation
    # TODO: dispatch table:
    #   "forgery"              -> forgery.simulate_forgery(**request.params)
    #   "impersonation"        -> impersonation.simulate_impersonation(**request.params)
    #   "replay"               -> replay.simulate_replay(**request.params)
    #   "channel_manipulation" -> channel_manipulation.simulate_channel_manipulation(**request.params)
    # TODO: return SimulateAttackResponse(attack_type=request.attack_type, ...)
    raise NotImplementedError("attack simulation not yet implemented")
