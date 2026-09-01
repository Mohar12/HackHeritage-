"""
detection.py
============
Purpose: API routes for /detect threat evaluation with audit ledger integration.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any

from detection_engine.detector import full_threat_assessment
from backend.schemas import DetectRequest
from backend.audit_ledger import ledger

router = APIRouter()


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
    """Analyze measurement statistics, log detection event, and return full threat assessment."""
    meas_dict = request.measurement_data.model_dump(exclude_none=True)
    assessment = full_threat_assessment(meas_dict)

    session_id = request.measurement_data.session_id or "detection-session"

    ledger.record_event(
        session_id=session_id,
        event_type="THREAT_DETECTION",
        node_id="Detector",
        qber=assessment["qber"],
        chi2_p_value=assessment["chi2_p_value"],
        fidelity=assessment["fidelity"],
        confidence_score=assessment["confidence_score"],
        threat_classification=assessment["qber_classification"],
        recommended_action=assessment["recommended_action"],
    )

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
