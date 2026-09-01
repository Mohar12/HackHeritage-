"""
detection.py
============
Purpose: API route for /detect.

Exposes a POST endpoint that passes raw quantum measurement data from a
completed QDS protocol run (or attack simulation) to the detection engine
and returns a full threat assessment result.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class DetectRequest(BaseModel):
    measurement_data: dict  # Keys: measurement_counts, n_shots, fidelity, session_id


class DetectResponse(BaseModel):
    is_malicious: bool
    confidence_score: float
    qber: float
    chi2_stat: float
    p_value: float
    fidelity: float
    qber_classification: str
    chi2_classification: str
    fidelity_classification: str
    recommended_action: str  # "NONE" | "ALERT" | "ABORT"


@router.post("/", response_model=DetectResponse, tags=["Detection"])
async def detect_threat(request: DetectRequest) -> DetectResponse:
    """
    Analyse quantum measurement data and return a structured threat assessment.

    Internally calls detection_engine.detector.full_threat_assessment().
    """
    # TODO: from detection_engine.detector import full_threat_assessment
    # TODO: assessment = full_threat_assessment(request.measurement_data)
    # TODO: return DetectResponse(**assessment)
    raise NotImplementedError("threat detection not yet implemented")
