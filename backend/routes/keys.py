"""
keys.py
=======
Purpose: API route for /generate-keys with audit ledger logging and scalability.
"""

from __future__ import annotations

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Any

from qds_core.key_distribution import distribute_public_keys
from backend.audit_ledger import ledger

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


class GenerateKeysRequest(BaseModel):
    n_qubits: int = Field(default=8, ge=1, le=5000, description="Number of EPR key pairs to generate (supports arbitrary positive N).")
    shots: int = Field(default=1024, ge=64, le=8192)
    seed: int = Field(default=42, ge=0)

    @field_validator("n_qubits", "shots", "seed", mode="before")
    @classmethod
    def validate_numeric_not_bool(cls, v: Any) -> Any:
        if isinstance(v, bool):
            raise ValueError("Numeric key generation parameters cannot be boolean.")
        return v


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


@router.post("", response_model=GenerateKeysResponse, tags=["Keys"], include_in_schema=False)
@router.post("/", response_model=GenerateKeysResponse, tags=["Keys"], summary="Generate quantum keys and distributed EPR pairs")
async def generate_keys_endpoint(request: GenerateKeysRequest) -> GenerateKeysResponse:
    """Generate quantum public keys, distributed EPR pairs, and record audit event."""
    try:
        result = distribute_public_keys(
            num_keys=request.n_qubits,
            shots=request.shots,
            seed=request.seed,
        )

        clean_result = _sanitize_for_json(result)
        qber_val = clean_result["measured_qber"]
        is_secure = qber_val <= 0.05

        ledger.record_event(
            session_id=clean_result["session_id"],
            event_type="KEY_DISTRIBUTION",
            node_id="KDC-Alice",
            qber=qber_val,
            threat_classification="SECURE" if is_secure else "WARNING",
            recommended_action="NONE" if is_secure else "ALERT",
        )

        return GenerateKeysResponse(**clean_result)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Key generation error: {type(exc).__name__}: {exc}",
        ) from exc
