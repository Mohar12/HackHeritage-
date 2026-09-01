"""
schemas.py
==========
Purpose: Pydantic v2 request/response models for the QDS Threat Detection API.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


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
    num_qubits: int = Field(
        default=8,
        ge=1,
        le=256,
        description="Number of EPR pairs (qubits) to generate.",
    )
    attack_type: AttackType = Field(
        default=AttackType.NONE,
        description="Channel attack mode to simulate.",
    )
    noise_rate: float = Field(
        default=0.05,
        ge=0.0,
        le=1.0,
        description="Depolarizing error probability (active for depolarizing mode).",
    )
    shots: int = Field(
        default=1024,
        ge=64,
        le=8192,
        description="Aer simulation shot count.",
    )
    seed: int = Field(
        default=42,
        ge=0,
        description="RNG seed for deterministic simulation runs.",
    )


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------

class StatisticsDetail(BaseModel):
    qber: float = Field(ge=0.0, le=1.0)
    excess_qber: float = Field(ge=0.0)
    chi2_statistic: float = Field(ge=0.0)
    chi2_p_value: float = Field(ge=0.0, le=1.0)
    shannon_entropy: float = Field(ge=0.0)
    total_shots: int = Field(ge=1)
    measurement_counts: dict[str, int]


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
    shots: int = Field(ge=1)
    seed: int = Field(ge=0)
    statistics: StatisticsDetail
    classification: ThreatClassification
    thresholds: dict[str, float]


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
