"""
detection_engine package
========================
Physics-based, deterministic threat detection engine that analyses
quantum measurement outcomes from the QDS protocol and flags anomalies.

Modules
-------
statistics - Measurement-outcome statistical analysis (QBER, chi-squared, etc.)
thresholds - Threshold-based decision rules
detector   - detect_threat(measurement_data) -> (is_malicious, confidence_score)
"""
