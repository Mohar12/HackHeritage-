"""
schemas.py
==========
Purpose: Pydantic v2 request/response models for the QDS Threat Detection API.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

import numpy as np
from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class AttackType(str, Enum):
    """Supported quantum channel attack modes."""
    NONE             = "none"
    INTERCEPT_RESEND = "intercept_resend"
    DEPOLARIZING     = "depolarizing"
    FORGERY          = "forgery"
    IMPERSONATION    = "impersonation"
    REPLAY           = "replay"


class QBERClass(str, Enum):
    """QBER classification labels (BB84-derived)."""
    SECURE      = "SECURE"
    WARNING     = "WARNING"
    COMPROMISED = "COMPROMISED"


class FidelityClass(str, Enum):
    """State fidelity classification labels."""
    HIGH     = "HIGH"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"


class Chi2Class(str, Enum):
    """Chi-squared distribution classification labels."""
    NORMAL    = "NORMAL"
    WARNING   = "WARNING"
    ANOMALOUS = "ANOMALOUS"


class RecommendedAction(str, Enum):
    """Protocol action directive from the threat detector."""
    NONE  = "NONE"
    ALERT = "ALERT"
    ABORT = "ABORT"


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class MeasurementDataSchema(BaseModel):
    """Strictly typed schema for threat detection measurement payloads."""
    measurement_counts: dict[str, int] = Field(description="Raw observed measurement counts.")
    fidelity: float = Field(ge=0.0, le=1.0, description="Quantum state fidelity")
    measured_qber: float | None = Field(default=None, ge=0.0, le=1.0)
    sent_bits: list[int] | None = Field(default=None, description="Sequence of sent bits")
    received_bits: list[int] | None = Field(default=None, description="Sequence of received bits")
    sent_bases: list[str] | None = Field(default=None, description="Sequence of sent Pauli bases")
    received_bases: list[str] | None = Field(default=None, description="Sequence of received Pauli bases")
    expected_distribution: dict[str, float] | None = None
    session_id: str | None = None
    total_shots: int | None = Field(default=None, ge=1, description="Actual observed measurement count total.")
    shot_count_mismatch: bool | None = Field(default=None, description="Indicator if observed shots differ from requested shots.")

    @field_validator("fidelity", "measured_qber", mode="before")
    @classmethod
    def validate_float_not_bool(cls, v: Any) -> Any:
        if isinstance(v, bool):
            raise ValueError("Floating-point metric cannot be a boolean.")
        return v

    @field_validator("total_shots", mode="before")
    @classmethod
    def validate_total_shots_not_bool(cls, v: Any) -> Any:
        if isinstance(v, bool):
            raise ValueError("total_shots cannot be a boolean.")
        return v

    @field_validator("measurement_counts", mode="before")
    @classmethod
    def validate_measurement_counts(cls, v: Any) -> dict[str, int]:
        if not isinstance(v, dict):
            raise ValueError("measurement_counts must be a dictionary/object.")
        if len(v) == 0:
            raise ValueError("measurement_counts dictionary cannot be empty.")
        validated: dict[str, int] = {}
        for key, count in v.items():
            if not isinstance(key, str) or not key.strip():
                raise ValueError("measurement_counts keys must be non-empty strings.")
            if isinstance(count, bool):
                raise ValueError(f"measurement_counts value for key '{key}' cannot be a boolean.")
            if not isinstance(count, (int, np.integer)):
                raise ValueError(f"measurement_counts value for key '{key}' must be an integer, got {type(count).__name__}.")
            count_val = int(count)
            if count_val < 0:
                raise ValueError(f"measurement_counts value for key '{key}' must be >= 0 (got {count_val}).")
            validated[key] = count_val
        return validated

    @field_validator("expected_distribution", mode="before")
    @classmethod
    def validate_expected_distribution(cls, v: Any) -> dict[str, float] | None:
        if v is None:
            return v
        if not isinstance(v, dict):
            raise ValueError("expected_distribution must be a dictionary/object.")
        if len(v) == 0:
            raise ValueError("expected_distribution dictionary cannot be empty when provided.")
        validated: dict[str, float] = {}
        for key, prob in v.items():
            if not isinstance(key, str) or not key.strip():
                raise ValueError("expected_distribution keys must be non-empty strings.")
            if isinstance(prob, bool):
                raise ValueError(f"expected_distribution value for key '{key}' cannot be a boolean.")
            if not isinstance(prob, (int, float, np.floating, np.integer)):
                raise ValueError(f"expected_distribution value for key '{key}' must be numeric.")
            p_val = float(prob)
            if p_val < 0.0:
                raise ValueError(f"expected_distribution probability for key '{key}' must be >= 0 (got {p_val}).")
            validated[key] = p_val
        total_p = sum(validated.values())
        if not (0.95 <= total_p <= 1.05):
            raise ValueError(f"expected_distribution probabilities must sum to approximately 1.0 (got {total_p:.4f}).")
        return validated

    @field_validator("session_id", mode="before")
    @classmethod
    def validate_session_id(cls, v: Any) -> str | None:
        if v is None:
            return v
        if not isinstance(v, str) or not v.strip():
            raise ValueError("session_id must be a non-empty string.")
        return v.strip()

    @field_validator("sent_bits", "received_bits", mode="before")
    @classmethod
    def validate_bits_sequence(cls, v: Any) -> Any:
        if v is None:
            return v
        if not isinstance(v, (list, tuple)):
            raise ValueError("Must be a list or sequence of binary integers, not a scalar.")
        for b in v:
            if isinstance(b, bool):
                raise ValueError(f"Bit values cannot be boolean. Got: {b}")
            if b not in (0, 1):
                raise ValueError(f"Bit values must be 0 or 1. Got: {b}")
        return list(v)

    @field_validator("sent_bases", "received_bases", mode="before")
    @classmethod
    def validate_bases_sequence(cls, v: Any) -> Any:
        if v is None:
            return v
        if not isinstance(v, (list, tuple)):
            raise ValueError("Must be a list or sequence of basis strings ('X', 'Z').")
        for b in v:
            if not isinstance(b, str) or str(b).upper() not in ("X", "Z"):
                raise ValueError(f"Bases must be 'X' or 'Z'. Got: {b}")
        return [str(b).upper() for b in v]

    @model_validator(mode="after")
    def validate_sequence_consistency(self) -> MeasurementDataSchema:
        sent_b = self.sent_bits
        rec_b = self.received_bits
        sent_bases = self.sent_bases
        rec_bases = self.received_bases

        # 1. sent_bits and received_bits must have same length
        if sent_b is not None and rec_b is not None:
            if len(sent_b) != len(rec_b):
                raise ValueError(
                    f"sent_bits length ({len(sent_b)}) must match received_bits length ({len(rec_b)})."
                )

        # 2. sent_bases and received_bases must have same length
        if sent_bases is not None and rec_bases is not None:
            if len(sent_bases) != len(rec_bases):
                raise ValueError(
                    f"sent_bases length ({len(sent_bases)}) must match received_bases length ({len(rec_bases)})."
                )

        # 3. If sent_bits and sent_bases are both provided, they must have same length
        if sent_b is not None and sent_bases is not None:
            if len(sent_b) != len(sent_bases):
                raise ValueError(
                    f"sent_bits length ({len(sent_b)}) must match sent_bases length ({len(sent_bases)})."
                )

        # 4. If received_bits and received_bases are both provided, they must have same length
        if rec_b is not None and rec_bases is not None:
            if len(rec_b) != len(rec_bases):
                raise ValueError(
                    f"received_bits length ({len(rec_b)}) must match received_bases length ({len(rec_bases)})."
                )

        # 5. If expected_distribution is provided, observed measurement_counts keys must be valid states in expected_distribution
        if self.expected_distribution is not None and self.measurement_counts is not None:
            exp_keys = set(self.expected_distribution.keys())
            cnt_keys = set(self.measurement_counts.keys())
            if not cnt_keys.issubset(exp_keys):
                raise ValueError(
                    f"measurement_counts contains unknown states not present in expected_distribution: {sorted(cnt_keys - exp_keys)}."
                )

        return self


class SignaturePayloadSchema(BaseModel):
    """Strictly typed and validated model for a Quantum Digital Signature payload."""
    message: str | None = None
    message_hash: str = Field(description="SHA-256 hash of the signed message")
    session_id: str = Field(description="Unique session identifier for the key distribution")
    measurement_outcomes: list[int] = Field(description="Classical measurement outcome bits")
    correction_bits: list[list[int]] = Field(description="Pauli correction bit pairs [c0, c1] per qubit")
    sent_bits: list[int] | None = None
    bases: list[str] | None = None
    sent_states: list[Any] | None = None
    measurement_counts: dict[str, int] | None = None
    fidelity: float | None = Field(default=None, ge=0.0, le=1.0)
    measured_qber: float | None = Field(default=None, ge=0.0, le=1.0)

    @field_validator("measurement_outcomes", "sent_bits", mode="before")
    @classmethod
    def validate_outcome_bits(cls, v: Any) -> Any:
        if v is None:
            return v
        if not isinstance(v, (list, tuple)):
            raise ValueError("Must be a list or sequence of binary integers.")
        for b in v:
            if int(b) not in (0, 1):
                raise ValueError(f"Bit values must be 0 or 1. Got: {b}")
        return [int(b) for b in v]

    @field_validator("correction_bits", mode="before")
    @classmethod
    def validate_correction_pairs(cls, v: Any) -> Any:
        if v is None:
            return v
        if not isinstance(v, (list, tuple)):
            raise ValueError("correction_bits must be a list of 2-element bit pairs.")
        validated = []
        for pair in v:
            if not isinstance(pair, (list, tuple)) or len(pair) != 2:
                raise ValueError(f"Each correction bit pair must contain exactly 2 integers. Got: {pair}")
            c0, c1 = int(pair[0]), int(pair[1])
            if c0 not in (0, 1) or c1 not in (0, 1):
                raise ValueError(f"Correction bits must be 0 or 1. Got: {[c0, c1]}")
            validated.append([c0, c1])
        return validated


class DetectRequest(BaseModel):
    measurement_data: MeasurementDataSchema


class SimulationRequest(BaseModel):
    num_qubits: int = Field(
        default=8,
        ge=1,
        le=5000,
        description="Number of logical EPR protocol samples to generate (max 5000).",
    )
    batch_size: int = Field(
        default=14,
        ge=1,
        le=14,
        description="Physical circuit batch size (max 14 EPR pairs = 28 qubits per Aer circuit).",
    )
    attack_type: AttackType = Field(
        default=AttackType.NONE,
        description="Channel attack mode to simulate.",
    )
    noise_rate: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Depolarizing error probability (active only for depolarizing mode).",
    )
    shots: int = Field(
        default=1024,
        ge=64,
        le=8192,
        description="Requested simulation/Aer shot count.",
    )
    seed: int = Field(
        default=42,
        ge=0,
        description="RNG seed for deterministic simulation runs.",
    )

    @field_validator("num_qubits", "batch_size", "noise_rate", "shots", "seed", mode="before")
    @classmethod
    def validate_simulation_numeric_not_bool(cls, v: Any) -> Any:
        if isinstance(v, bool):
            raise ValueError("Simulation numeric parameters cannot be boolean.")
        return v

    @model_validator(mode="after")
    def validate_noise_rate_scope(self) -> "SimulationRequest":
        invalid_attacks = {
            AttackType.FORGERY,
            AttackType.IMPERSONATION,
            AttackType.INTERCEPT_RESEND,
            AttackType.REPLAY,
            AttackType.NONE,
        }
        if self.noise_rate is not None and self.attack_type in invalid_attacks:
            raise ValueError(
                f"noise_rate is only a valid field when attack_type is 'depolarizing'. "
                f"Got noise_rate={self.noise_rate} for attack_type='{self.attack_type.value}'."
            )
        return self


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------

class StatisticsDetail(BaseModel):
    qber: float = Field(ge=0.0, le=1.0)
    excess_qber: float = Field(ge=0.0)
    chi2_statistic: float = Field(ge=0.0)
    chi2_p_value: float = Field(ge=0.0, le=1.0)
    shannon_entropy: float = Field(ge=0.0)
    total_shots: int = Field(
        ge=1,
        description="Actual number of measurement observations represented by measurement_counts.",
    )
    measurement_counts: dict[str, int] = Field(
        description="Raw observed measurement counts.",
    )


class ThreatClassification(BaseModel):
    qber_classification: str
    chi2_classification: str
    fidelity_classification: str
    recommended_action: str


class SimulationResponse(BaseModel):
    is_malicious: bool
    confidence_score: float = Field(ge=0.0, le=1.0)
    fidelity: float = Field(ge=0.0, le=1.0)
    attack_type: str
    num_qubits: int = Field(ge=1)
    shots: int = Field(
        ge=1,
        description="Requested simulation/Aer shot count.",
    )
    seed: int = Field(ge=0)
    batches_executed: int = Field(default=1)
    physical_qubits_per_circuit: int = Field(default=28)
    execution_time_ms: float = Field(default=0.0)
    samples_per_sec: float = Field(
        default=0.0,
        description="Simulation throughput in logical EPR protocol samples processed per second.",
    )
    statistics: StatisticsDetail
    classification: ThreatClassification
    thresholds: dict[str, float]
    # Quantum-mechanical security bounds (Hoeffding, Helstrom, Dunjko, Gottesman-Chuang)
    quantum_security_bounds: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Information-theoretic quantum security bounds: "
            "Hoeffding QBER confidence, Helstrom distinguishability, "
            "Dunjko unforgeability/non-repudiation bounds, and "
            "Gottesman-Chuang random-guessing forgery probability."
        ),
    )



class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    engine_status: str
    thresholds: dict[str, float]


class ErrorDetail(BaseModel):
    error: str
    detail: str
    status_code: int = Field(default=500, ge=400, le=599)


class AuditVerifyResponse(BaseModel):
    valid: bool
    records_checked: int
    error: str | None = None


class VerifyRequest(BaseModel):
    signature: SignaturePayloadSchema = Field(description="Strictly typed and validated quantum digital signature payload.")
    public_key: dict[str, Any] = Field(default_factory=dict)
    message: str | None = None

