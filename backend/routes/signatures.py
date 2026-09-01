"""
signatures.py
=============
Purpose: API routes for /signatures/sign and /signatures/verify with ledger audit hooks.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any

from qds_core.signing import sign
from qds_core.verification import verify
from backend.audit_ledger import ledger

router = APIRouter()


# ---- /sign ---------------------------------------------------------------

class SignRequest(BaseModel):
    message: str = Field(default="Transfer Authorization Payload")
    private_key: dict[str, Any] = Field(default_factory=dict)
    n_qubits: int = Field(default=8, ge=1, le=128)
    shots: int = Field(default=1024, ge=64, le=8192)
    seed: int = Field(default=42, ge=0)


class SignResponse(BaseModel):
    message: str
    message_hash: str
    session_id: str
    signature: dict[str, Any]
    measurement_outcomes: list[int]
    correction_bits: list[list[int]]
    bases: list[str]
    fidelity: float
    measurement_counts: dict[str, int]


@router.post("/sign", response_model=SignResponse, tags=["Signatures"])
async def sign_endpoint(request: SignRequest) -> SignResponse:
    """Sign a classical message using teleportation-based QDS and record to audit ledger."""
    sig = sign(
        message=request.message,
        private_key=request.private_key,
        n_qubits=request.n_qubits,
        shots=request.shots,
        seed=request.seed,
    )

    # Record asynchronous non-blocking audit entry
    ledger.record_event(
        session_id=sig["session_id"],
        event_type="SIGNING",
        node_id="Alice",
        message_hash=sig["message_hash"],
        fidelity=sig["fidelity"],
    )

    return SignResponse(
        message=sig["message"],
        message_hash=sig["message_hash"],
        session_id=sig["session_id"],
        signature=sig,
        measurement_outcomes=sig["measurement_outcomes"],
        correction_bits=sig["correction_bits"],
        bases=sig["bases"],
        fidelity=sig["fidelity"],
        measurement_counts=sig["measurement_counts"],
    )


# ---- /verify -------------------------------------------------------------

class VerifyRequest(BaseModel):
    signature: dict[str, Any]
    public_key: dict[str, Any] = Field(default_factory=dict)
    message: str | None = None


class VerifyResponse(BaseModel):
    is_valid: bool
    message_intact: bool
    session_valid: bool
    qber: float
    fidelity: float
    reason: str


@router.post("/verify", response_model=VerifyResponse, tags=["Signatures"])
async def verify_endpoint(request: VerifyRequest) -> VerifyResponse:
    """Verify a QDS signature and log outcome to immutable ledger."""
    result = verify(
        signature=request.signature,
        public_key=request.public_key,
        message=request.message,
    )

    # Record audit log
    ledger.record_event(
        session_id=request.signature.get("session_id", "unknown-session"),
        event_type="VERIFICATION",
        node_id="Bob",
        message_hash=request.signature.get("message_hash"),
        verification_outcome="ACCEPT" if result["is_valid"] else "REJECT",
        qber=result["qber"],
        fidelity=result["fidelity"],
        recommended_action="NONE" if result["is_valid"] else "ABORT",
    )

    return VerifyResponse(**result)
