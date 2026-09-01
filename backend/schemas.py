"""
schemas.py
==========
Purpose: Pydantic v2 request/response models for the QDS Threat Detection API.

Provides strict input validation and typed output serialisation for all
/api/v1/* endpoints. Uses Pydantic v2 field validators and model_config
for JSON schema generation and OpenAPI integration.

Enum Definitions
----------------
AttackType     — supported simulation modes
QBERClass      — QBER classification labels (mirrors detector.py constants)
FidelityClass  — fidelity classification labels
Chi2Class      — chi-squared classification labels
RecommendedAction — protocol action directive

Compliance
----------
- No ML/AI libraries imported.
- All float fields carry explicit ge/le bounds so invalid values are rejected
  at the validation layer before reaching the physics engine.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class AttackType(str, Enum):
    """Supported quantum channel attack modes."""
    NONE             = "none"
    INTERCEPT_RESEND = "intercept_resend"
    DEPOLARIZING     = "depolarizing"


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

class SimulationRequest(BaseModel):
    """Input parameters for POST /api/v1/simulate.

    Attributes
    ----------
    num_qubits : int
        Number of qubits (= EPR pairs) to simulate. Range [1, 256].
    attack_type : AttackType
        The adversarial channel attack mode to apply during the simulation.
    noise_rate : float
        Depolarizing error probability per gate. Only effective when
        ``attack_type == "depolarizing"``. Range (0.0, 1.0].
    shots : int
        Number of Aer simulation shots. Range [64, 8192].
    seed : int
        RNG seed for deterministic reproducibility. Any non-negative integer.
    """

    num_qubits: int = Field(
        default=8,
        ge=1,
        le=256,
        description="Number of EPR pairs (qubits) to generate.",
        examples=[8, 16, 32],
    )
    attack_type: AttackType = Field(
        default=AttackType.NONE,
        description="Channel attack mode to simulate.",
        examples=["none", "intercept_resend", "depolarizing"],
    )
    noise_rate: float = Field(
        default=0.05,
        gt=0.0,
        le=1.0,
        description="Depolarizing error probability (active for depolarizing mode).",
        examples=[0.05, 0.1, 0.25],
    )
    shots: int = Field(
        default=1024,
        ge=64,
        le=8192,
        description="Aer simulation shot count.",
        examples=[512, 1024, 4096],
    )
    seed: int = Field(
        default=42,
        ge=0,
        description="RNG seed for deterministic simulation runs.",
        examples=[42, 0, 99],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "num_qubits": 8,
                    "attack_type": "intercept_resend",
                    "noise_rate": 0.05,
                    "shots": 1024,
                    "seed": 42,
                }
            ]
        }
    }


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------

class StatisticsDetail(BaseModel):
    """Detailed statistical metrics from a simulation run."""

    qber: float = Field(
        description="Quantum Bit Error Rate ∈ [0, 1].",
        ge=0.0,
        le=1.0,
    )
    excess_qber: float = Field(
        description="QBER above the 1% hardware noise baseline.",
        ge=0.0,
    )
    chi2_statistic: float = Field(
        description="Pearson's χ² statistic from the Born-rule goodness-of-fit test.",
        ge=0.0,
    )
    chi2_p_value: float = Field(
        description="p-value of the χ² test ∈ [0, 1].",
        ge=0.0,
        le=1.0,
    )
    shannon_entropy: float = Field(
        description="Shannon entropy of the measurement distribution (bits).",
        ge=0.0,
    )
    total_shots: int = Field(
        description="Total measurement shots executed.",
        ge=1,
    )
    measurement_counts: dict[str, int] = Field(
        description="Raw Aer measurement count histogram.",
    )


class ThreatClassification(BaseModel):
    """Per-metric classification labels and the overall recommended action."""

    qber_classification: QBERClass = Field(
        description="QBER classification: SECURE | WARNING | COMPROMISED."
    )
    chi2_classification: Chi2Class = Field(
        description="χ² distribution classification: NORMAL | WARNING | ANOMALOUS."
    )
    fidelity_classification: FidelityClass = Field(
        description="State fidelity classification: HIGH | DEGRADED | CRITICAL."
    )
    recommended_action: RecommendedAction = Field(
        description="Protocol directive: NONE | ALERT | ABORT."
    )


class SimulationResponse(BaseModel):
    """Full response payload for POST /api/v1/simulate.

    Attributes
    ----------
    is_malicious : bool
        True if the confidence score exceeds 0.5 (COMPROMISED channel verdict).
    confidence_score : float
        Continuous threat certainty ∈ [0.0, 1.0] derived from QBER, χ², and fidelity.
    fidelity : float
        Quantum state fidelity of the teleported state ∈ [0.0, 1.0].
    attack_type : AttackType
        The attack mode that was applied in this simulation run.
    num_qubits : int
        Number of EPR pairs simulated.
    shots : int
        Number of Aer shots used.
    seed : int
        RNG seed used.
    statistics : StatisticsDetail
        Detailed per-metric statistics.
    classification : ThreatClassification
        Per-metric classifications and recommended protocol action.
    thresholds : dict[str, float]
        The hardcoded BB84/Holevo threshold constants used for classification.
    """

    is_malicious: bool = Field(
        description="True when threat confidence score > 0.5.",
    )
    confidence_score: float = Field(
        description="Threat certainty ∈ [0.0, 1.0].",
        ge=0.0,
        le=1.0,
    )
    fidelity: float = Field(
        description="Teleported state fidelity ∈ [0.0, 1.0].",
        ge=0.0,
        le=1.0,
    )
    attack_type: AttackType = Field(
        description="Attack mode applied in this simulation.",
    )
    num_qubits: int = Field(
        description="Number of EPR pairs simulated.",
        ge=1,
    )
    shots: int = Field(
        description="Aer simulation shot count used.",
        ge=1,
    )
    seed: int = Field(
        description="RNG seed used for this run.",
        ge=0,
    )
    statistics: StatisticsDetail = Field(
        description="Detailed statistical metrics.",
    )
    classification: ThreatClassification = Field(
        description="Per-metric classifications and protocol recommendation.",
    )
    thresholds: dict[str, float] = Field(
        description="BB84/Holevo threshold constants used for classification.",
    )

    model_config = {"use_enum_values": True}


class HealthResponse(BaseModel):
    """Response payload for GET /api/v1/health."""

    status: str = Field(description="Service liveness status.", examples=["ok"])
    service: str = Field(description="Service name identifier.")
    version: str = Field(description="API version string.")
    engine_status: str = Field(
        description="Quantum detection engine readiness.",
        examples=["operational"],
    )
    thresholds: dict[str, float] = Field(
        description="Active BB84/Holevo detection threshold constants.",
    )


class ErrorDetail(BaseModel):
    """Structured error response body."""

    error: str = Field(description="Short error code or name.")
    detail: str = Field(description="Human-readable error description.")
    status_code: int = Field(description="HTTP status code.", ge=400, le=599)
