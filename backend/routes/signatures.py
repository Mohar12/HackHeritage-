"""
signatures.py
=============
Purpose: API routes for /sign and /verify.

Exposes POST endpoints that invoke the QDS signing and verification logic
from the qds_core package and return structured results suitable for
display in the React dashboard.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


# ---- /sign ---------------------------------------------------------------

class SignRequest(BaseModel):
    message: str
    private_key: dict


class SignResponse(BaseModel):
    signature: dict
    message_hash: str
    session_id: str


@router.post("/sign", response_model=SignResponse, tags=["Signatures"])
async def sign_message(request: SignRequest) -> SignResponse:
    """
    Sign a classical message using the teleportation-based QDS protocol.

    Internally calls qds_core.signing.sign().
    """
    # TODO: from qds_core.signing import sign
    # TODO: result = sign(message=request.message, private_key=request.private_key)
    # TODO: return SignResponse(**result)
    raise NotImplementedError("signing not yet implemented")


# ---- /verify -------------------------------------------------------------

class VerifyRequest(BaseModel):
    signature: dict
    public_key: dict


class VerifyResponse(BaseModel):
    is_valid: bool
    measurement_outcome: int
    expected_outcome: int


@router.post("/verify", response_model=VerifyResponse, tags=["Signatures"])
async def verify_signature(request: VerifyRequest) -> VerifyResponse:
    """
    Verify a QDS signature using Pauli corrections and projective measurement.

    Internally calls qds_core.verification.verify().
    """
    # TODO: from qds_core.verification import verify
    # TODO: result = verify(signature=request.signature, public_key=request.public_key)
    # TODO: return VerifyResponse(**result)
    raise NotImplementedError("verification not yet implemented")
