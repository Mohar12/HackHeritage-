"""
keys.py
=======
Purpose: API route for /generate-keys.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any

from qds_core.key_distribution import distribute_public_keys

router = APIRouter()


class GenerateKeysRequest(BaseModel):
    n_qubits: int = Field(default=8, ge=1, le=128)
    shots: int = Field(default=1024, ge=64, le=8192)
    seed: int = Field(default=42, ge=0)


class GenerateKeysResponse(BaseModel):
    session_id: str
    num_keys: int
    shots: int
    hardware_baseline_qber: float
    measured_qber: float
    measurement_counts: dict[str, int]
    alice_public_key: dict[str, Any]
    bob_shared_material: dict[str, Any]
    charlie_shared_material: dict[str, Any]


@router.post("/", response_model=GenerateKeysResponse, tags=["Keys"])
async def generate_keys_endpoint(request: GenerateKeysRequest) -> GenerateKeysResponse:
    """Generate quantum public keys and distributed EPR pairs."""
    result = distribute_public_keys(
        num_keys=request.n_qubits,
        shots=request.shots,
        seed=request.seed,
    )
    return GenerateKeysResponse(**result)
