"""
keys.py
=======
Purpose: API route for /generate-keys.

Exposes a POST endpoint that triggers Bell-pair generation and returns
the simulated quantum public key material for Alice, Bob, and Charlie.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class GenerateKeysRequest(BaseModel):
    n_qubits: int = 8  # Number of qubits in the key register


class GenerateKeysResponse(BaseModel):
    alice_public_key: dict
    bob_shared_material: dict
    charlie_shared_material: dict
    session_id: str


@router.post("/", response_model=GenerateKeysResponse, tags=["Keys"])
async def generate_keys(request: GenerateKeysRequest) -> GenerateKeysResponse:
    """
    Generate a set of quantum public keys for the QDS protocol.

    Internally calls qds_core.key_distribution.distribute_public_keys().
    """
    # TODO: from qds_core.key_distribution import distribute_public_keys
    # TODO: result = distribute_public_keys(n_qubits=request.n_qubits)
    # TODO: return GenerateKeysResponse(**result)
    raise NotImplementedError("key_distribution not yet implemented")
