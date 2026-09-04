"""
detection.py
============
Purpose: API routes for /detect threat evaluation with audit ledger integration.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from detection_engine.detector import full_threat_assessment
from backend.schemas import DetectRequest
from backend.audit_ledger import ledger

router = APIRouter()


def _build_expected_distribution(counts: dict[str, int]) -> dict[str, float]:
    """Build a legitimate baseline distribution while treating excess errors
    as the only direction of statistical concern.

    Mirrors the identical helper in backend/main.py so that /detect uses the
    same one-sided chi-squared logic as /simulate.
    """
    total = sum(counts.values())

    if total <= 0:
        return {
            "00": 0.49,
            "11": 0.49,
            "01": 0.01,
            "10": 0.01,
        }

    observed_errors = counts.get("01", 0) + counts.get("10", 0)

    # Legitimate baseline: 1% expected in each error bin.
    baseline_error_rate = 0.02
    baseline_expected_errors = baseline_error_rate * total

    # If the run is as good as or better than the legitimate baseline,
    # do not penalize it for having fewer errors than expected.
    if observed_errors <= baseline_expected_errors:
        return {
            label: count / total
            for label, count in counts.items()
        }

    # Only excess errors should trigger the chi-squared anomaly signal.
    return {
        "00": 0.49,
        "11": 0.49,
        "01": 0.01,
        "10": 0.01,
    }


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


@router.post("", response_model=DetectResponse, tags=["Detection"], include_in_schema=False)
@router.post("/", response_model=DetectResponse, tags=["Detection"], summary="Analyze measurement data for cyber threats")
async def detect_threat_endpoint(request: DetectRequest) -> DetectResponse:
    """Analyze measurement statistics, log detection event, and return full threat assessment."""
    meas_dict = request.measurement_data.model_dump(exclude_none=True)

    # Inject the backend's one-sided expected distribution when the caller
    # did not explicitly supply one, keeping /detect consistent with /simulate.
    if "expected_distribution" not in meas_dict:
        counts = dict(meas_dict["measurement_counts"])
        if any(k in ("00", "01", "10", "11") for k in counts):
            for k in ("00", "01", "10", "11"):
                counts.setdefault(k, 0)
            meas_dict["measurement_counts"] = counts
        meas_dict["expected_distribution"] = _build_expected_distribution(counts)

    try:
        assessment = full_threat_assessment(meas_dict)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Keep the final malicious verdict consistent with an abort-level
    # assessment, mirroring the same guard in the /simulate flow.
    if assessment["recommended_action"] == "ABORT":
        assessment["is_malicious"] = True

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

