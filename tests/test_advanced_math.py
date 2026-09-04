"""
test_advanced_math.py
=====================
Purpose: Comprehensive unit test suite for advanced mathematical libraries:
  1. mpmath: arbitrary-precision quantum security bounds (no float64 underflow at n > 1024)
  2. statsmodels / scipy: one-sided QBER z-test and Holm-Bonferroni multi-qubit test
  3. rustworkx: QDS protocol DAG topology, acyclicity invariants, and attack vector detection
  4. cryptography: SHA3-512 (FIPS 202) + Ed25519 post-quantum audit ledger verification
"""

from __future__ import annotations

import math
import pytest

from detection_engine.thresholds import (
    forgery_probability_exact,
    dunjko_bounds_exact,
    hoeffding_exact,
    forgery_probability_bound,
    hoeffding_confidence,
)
from detection_engine.statistics import (
    qber_onesided_ztest,
    bonferroni_multiqubit_test,
)
from qds_core.protocol_dag import (
    build_qds_protocol_dag,
    analyse_protocol_dag,
    get_dag_json,
)
from backend.audit_ledger import AuditLedger


# ===========================================================================
# 1. mpmath Arbitrary-Precision Quantum Security Bounds
# ===========================================================================

class TestMpmathExactBounds:

    def test_exact_forgery_small_n_matches_float(self):
        """For small n=8, exact mpmath bound matches standard float64."""
        exact = forgery_probability_exact(8)
        std = forgery_probability_bound(8)
        assert float(exact["exact_decimal"]) == pytest.approx(std, rel=1e-6)
        assert float(exact["exact_decimal"]) == pytest.approx(2 ** (-8))

    def test_exact_forgery_large_n_no_underflow(self):
        """For n=2048, standard float64 underflows to 0.0, but mpmath returns exact mantissa."""
        exact = forgery_probability_exact(2048)
        assert exact["float64_underflows"] is True
        assert "e-" in exact["exact_decimal"]
        assert int(float(exact["log10_p"])) == -616

    def test_dunjko_bounds_exact(self):
        """Dunjko bounds computed with mpmath exact precision."""
        res = dunjko_bounds_exact(32)
        assert "p_forge_tighter_exact" in res
        assert "p_repudiate_exact" in res
        assert float(res["p_forge_tighter_exact"]) > 0

    def test_hoeffding_exact_confidence(self):
        """Hoeffding confidence matches standard for normal shots, handles large N."""
        res = hoeffding_exact(measured_qber=0.15, baseline_qber=0.01, n_samples=1024)
        assert float(res["confidence_exact"]) > 0.99
        assert res["false_positive_bound_exact"] != ""


# ===========================================================================
# 2. Hypothesis Testing: One-Sided Z-Test & Holm-Bonferroni
# ===========================================================================

class TestStatisticalHypothesisTesting:

    def test_onesided_ztest_clean_channel(self):
        """When observed error rate <= baseline, null hypothesis is NOT rejected."""
        # 10 errors out of 1000 bits at 0.01 baseline -> exactly expected
        res = qber_onesided_ztest(observed_errors=10, total_bits=1000, baseline_qber=0.01)
        assert res["reject_null"] is False
        assert res["p_value_onesided"] > 0.05

    def test_onesided_ztest_intercept_resend_attack(self):
        """25% QBER from intercept-resend attack strongly rejects null hypothesis."""
        res = qber_onesided_ztest(observed_errors=250, total_bits=1000, baseline_qber=0.01)
        assert res["reject_null"] is True
        assert res["z_statistic"] > 5.0
        assert res["p_value_onesided"] < 1e-6

    def test_bonferroni_multiqubit_fwer(self):
        """Holm-Bonferroni controls family-wise error rate across 8 qubit channels."""
        # 7 clean channels (p ~ 0.5) and 1 compromised channel (p = 1e-7)
        p_vals = [0.45, 0.72, 0.60, 0.0000001, 0.88, 0.55, 0.62, 0.79]
        res = bonferroni_multiqubit_test(p_vals, alpha_family=0.05)
        assert res["n_tests"] == 8
        assert res["any_rejected"] is True
        assert res["n_rejected"] == 1
        assert res["reject_per_qubit"][3] is True
        assert res["reject_per_qubit"][0] is False


# ===========================================================================
# 3. rustworkx Protocol DAG Topology
# ===========================================================================

class TestProtocolDAG:

    def test_dag_is_acyclic(self):
        """The QDS teleportation protocol DAG must be strictly acyclic."""
        dag = build_qds_protocol_dag(include_attacks=True)
        analysis = analyse_protocol_dag(dag)
        assert analysis["is_dag"] is True
        assert "Acyclic" in analysis["dag_invariant"]

    def test_honest_nodes_and_edges(self):
        """Honest protocol contains Alice, Bob, Charlie, EPR source, Ledger, Channel."""
        dag = build_qds_protocol_dag(include_attacks=False)
        analysis = analyse_protocol_dag(dag)
        assert analysis["n_nodes_honest"] == 6
        assert analysis["n_nodes_attack"] == 0

    def test_attack_nodes_detectable(self):
        """Attacks on quantum channel are detectable by QBER/chi-squared."""
        dag_data = get_dag_json(include_attacks=True)
        assert dag_data["n_attack_edges_detectable"] >= 4
        assert dag_data["fraction_attacks_detectable"] > 0.5


# ===========================================================================
# 4. SHA3-512 & Ed25519 Post-Quantum Audit Ledger
# ===========================================================================

class TestAuditLedgerPostQuantum:

    def test_ledger_sha3_512_hash_chain(self):
        """Audit records are linked by 128-hex-char SHA3-512 hashes."""
        ledger = AuditLedger()
        rec1 = ledger.record_event(
            session_id="sess-001",
            event_type="TEST_EVENT_1",
            qber=0.015,
        )
        assert len(rec1.record_hash) == 128  # 512 bits = 64 bytes = 128 hex chars
        assert rec1.hash_algorithm == "sha3-512"

        rec2 = ledger.record_event(
            session_id="sess-001",
            event_type="TEST_EVENT_2",
            qber=0.25,
        )
        assert rec2.prev_hash == rec1.record_hash
        assert len(rec2.record_hash) == 128

        verification = ledger.verify_chain()
        assert verification["valid"] is True
        assert verification["error"] is None

    def test_ledger_detects_tampering(self):
        """Modifying any ledger payload breaks the SHA3-512 cryptographic chain."""
        ledger = AuditLedger()
        ledger.record_event("sess-1", "EVENT_A")
        rec_b = ledger.record_event("sess-1", "EVENT_B")
        ledger.record_event("sess-1", "EVENT_C")

        # Tamper with record B's previous hash link
        rec_b.prev_hash = "tampered_hash_000000000000000000000000000000000000000000000000000000"

        verification = ledger.verify_chain()
        assert verification["valid"] is False
        assert "Previous hash mismatch" in verification["error"]
