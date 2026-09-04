"""
signatures.py
=============
Purpose: API routes for /signatures/sign and /signatures/verify with ledger audit hooks.
"""

from __future__ import annotations

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from qds_core.signing import sign
from qds_core.verification import verify
from backend.audit_ledger import ledger
from backend.schemas import SignaturePayloadSchema

router = APIRouter()


def _sanitize_for_json(data: Any) -> Any:
    """Recursively convert complex numbers and NumPy arrays to JSON serializable objects."""
    if isinstance(data, dict):
        return {k: _sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, (list, tuple)):
        return [_sanitize_for_json(item) for item in data]
    elif isinstance(data, (np.ndarray,)):
        return _sanitize_for_json(data.tolist())
    elif isinstance(data, (complex, np.complex128, np.complex64)):
        return [float(data.real), float(data.imag)]
    elif isinstance(data, (np.integer, np.int64, np.int32)):
        return int(data)
    elif isinstance(data, (np.floating, np.float64, np.float32)):
        return float(data)
    return data


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
    sent_bits: list[int]
    measurement_outcomes: list[int]
    correction_bits: list[list[int]]
    bases: list[str]
    fidelity: float
    measurement_counts: dict[str, int]


@router.post("/sign", response_model=SignResponse, tags=["Signatures"])
async def sign_endpoint(request: SignRequest) -> SignResponse:
    """Sign a classical message using teleportation-based QDS and record to audit ledger."""
    try:
        sig = sign(
            message=request.message,
            private_key=request.private_key,
            n_qubits=request.n_qubits,
            shots=request.shots,
            seed=request.seed,
        )

        clean_sig = _sanitize_for_json(sig)

        # Record asynchronous non-blocking audit entry
        ledger.record_event(
            session_id=clean_sig["session_id"],
            event_type="SIGNING",
            node_id="Alice",
            message_hash=clean_sig["message_hash"],
            fidelity=clean_sig["fidelity"],
            threat_classification="SECURE",
            recommended_action="NONE",
        )

        return SignResponse(
            message=clean_sig["message"],
            message_hash=clean_sig["message_hash"],
            session_id=clean_sig["session_id"],
            signature=clean_sig,
            sent_bits=clean_sig["sent_bits"],
            measurement_outcomes=clean_sig["measurement_outcomes"],
            correction_bits=clean_sig["correction_bits"],
            bases=clean_sig["bases"],
            fidelity=clean_sig["fidelity"],
            measurement_counts=clean_sig["measurement_counts"],
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Sign operation error: {type(exc).__name__}: {exc}",
        ) from exc


# ---- /verify -------------------------------------------------------------

class VerifyRequest(BaseModel):
    signature: SignaturePayloadSchema
    public_key: dict[str, Any] = Field(default_factory=dict)
    message: str | None = None


class VerifyResponse(BaseModel):
    is_valid: bool
    message_intact: bool
    session_valid: bool
    qber: float
    fidelity: float
    received_bits: list[int]
    reason: str


@router.post("/verify", response_model=VerifyResponse, tags=["Signatures"])
async def verify_endpoint(request: VerifyRequest) -> VerifyResponse:
    """Verify a QDS signature and log outcome to immutable ledger."""
    try:
        sig_dict = request.signature.model_dump(exclude_none=True)
        result = verify(
            signature=sig_dict,
            public_key=request.public_key,
            message=request.message,
        )

        clean_result = _sanitize_for_json(result)
        is_valid = clean_result["is_valid"]

        # Record audit log
        ledger.record_event(
            session_id=sig_dict.get("session_id", "unknown-session"),
            event_type="VERIFICATION",
            node_id="Bob",
            message_hash=sig_dict.get("message_hash"),
            verification_outcome="ACCEPT" if is_valid else "REJECT",
            qber=clean_result["qber"],
            fidelity=clean_result["fidelity"],
            threat_classification="SECURE" if is_valid else "COMPROMISED",
            recommended_action="NONE" if is_valid else "ABORT",
        )

        return VerifyResponse(**clean_result)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Verification operation error: {type(exc).__name__}: {exc}",
        ) from exc
