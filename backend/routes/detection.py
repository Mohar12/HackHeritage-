"""
detection.py
============
Purpose: API route for /detect.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any

from detection_engine.detector import full_threat_assessment

router = APIRouter()


class DetectRequest(BaseModel):
    measurement_data: dict[str, Any] = Field(
        ...,
        description="Measurement counts, fidelity, and bit data from protocol or attack run.",
    )


class DetectResponse(BaseModel):
    is_malicious: bool
    confidence_score: float
    qber: float
    chi2_p_value: float
    fidelity: float
    excess_qber: float
    qber_classification: str
    chi2_classification: str
    fidelity_classification: str
    recommended_action: str
    thresholds: dict[str, float]
    statistics_summary: dict[str, Any]


@router.post("/", response_model=DetectResponse, tags=["Detection"])
async def detect_threat_endpoint(request: DetectRequest) -> DetectResponse:
    """Analyze measurement statistics and return full threat assessment."""
    assessment = full_threat_assessment(request.measurement_data)
    return DetectResponse(
        is_malicious=assessment["is_malicious"],
        confidence_score=assessment["confidence_score"],
        qber=assessment["qber"],
        chi2_p_value=assessment["chi2_p_value"],
        fidelity=assessment["fidelity"],
        excess_qber=assessment["excess_qber"],
        qber_classification=assessment["qber_classification"],
        chi2_classification=assessment["chi2_classification"],
        fidelity_classification=assessment["fidelity_classification"],
        recommended_action=assessment["recommended_action"],
        thresholds=assessment["thresholds"],
        statistics_summary=assessment.get("statistics_summary", {}),
    )
