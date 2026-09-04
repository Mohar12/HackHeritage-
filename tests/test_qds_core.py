"""
test_qds_core.py
================
Unit tests for the qds_core package:
  - pauli_ops: Pauli matrices, Bell state prep, Uhlmann fidelity, random bases
  - key_distribution: Generic batched distribution circuit, QBER calculation, multi-size scalability (N=1..1000)
  - teleportation: 3-qubit teleportation circuit builder and Aer execution
"""

from __future__ import annotations

import math
import numpy as np
import pytest
from qiskit import QuantumCircuit

from qds_core.pauli_ops import (
    PAULI_I,
    PAULI_X,
    PAULI_Y,
    PAULI_Z,
    get_pauli_matrix,
    prepare_bell_state,
    calculate_state_fidelity,
    density_matrix_from_statevector,
    generate_random_bases,
)
from qds_core.key_distribution import (
    create_bell_pair_circuit,
    distribute_public_keys,
    compute_max_pairs_per_batch,
    get_backend_qubit_capacity,
    HARDWARE_BASELINE_QBER,
)
from qds_core.teleportation import (
    build_teleportation_circuit,
    run_teleportation,
    extract_correction_bits,
    compute_teleportation_fidelity,
)
from qds_core.signing import sign, hash_message
from qds_core.verification import verify, apply_pauli_corrections
import logging
import unittest.mock as mock


# ===========================================================================
# pauli_ops — matrix properties
# ===========================================================================

class TestPauliMatrices:

    def test_identity_shape_and_dtype(self):
        assert PAULI_I.shape == (2, 2)
        assert PAULI_I.dtype == np.complex128
        assert np.allclose(PAULI_I, np.eye(2, dtype=np.complex128))

    def test_pauli_x_shape_and_dtype(self):
        assert PAULI_X.shape == (2, 2)
        assert PAULI_X.dtype == np.complex128
        expected = np.array([[0, 1], [1, 0]], dtype=np.complex128)
        assert np.allclose(PAULI_X, expected)

    def test_pauli_y_shape_and_dtype(self):
        assert PAULI_Y.shape == (2, 2)
        assert PAULI_Y.dtype == np.complex128
        expected = np.array([[0, -1j], [1j, 0]], dtype=np.complex128)
        assert np.allclose(PAULI_Y, expected)

    def test_pauli_z_shape_and_dtype(self):
        assert PAULI_Z.shape == (2, 2)
        assert PAULI_Z.dtype == np.complex128
        expected = np.array([[1, 0], [0, -1]], dtype=np.complex128)
        assert np.allclose(PAULI_Z, expected)

    def test_pauli_x_squared_is_identity(self):
        assert np.allclose(PAULI_X @ PAULI_X, PAULI_I)

    def test_pauli_y_squared_is_identity(self):
        assert np.allclose(PAULI_Y @ PAULI_Y, PAULI_I)

    def test_pauli_z_squared_is_identity(self):
        assert np.allclose(PAULI_Z @ PAULI_Z, PAULI_I)

    def test_xy_anticommutator(self):
        anticomm = PAULI_X @ PAULI_Y + PAULI_Y @ PAULI_X
        assert np.allclose(anticomm, np.zeros((2, 2), dtype=np.complex128))

    def test_get_pauli_matrix_x(self):
        mat = get_pauli_matrix("X")
        assert np.allclose(mat, PAULI_X)

    def test_get_pauli_matrix_case_insensitive(self):
        assert np.allclose(get_pauli_matrix("z"), PAULI_Z)

    def test_get_pauli_matrix_invalid_raises(self):
        with pytest.raises(ValueError):
            get_pauli_matrix("W")

    def test_get_pauli_matrix_returns_copy(self):
        mat = get_pauli_matrix("X")
        mat[0, 0] = 999.0
        assert not np.allclose(PAULI_X, mat)


# ===========================================================================
# pauli_ops — Bell state preparation
# ===========================================================================

class TestBellStatePreparation:

    def test_phi_plus_circuit_has_two_qubits(self):
        qc = prepare_bell_state(0)
        assert qc.num_qubits == 2

    def test_all_four_bell_states_build_without_error(self):
        for idx in range(4):
            qc = prepare_bell_state(idx)
            assert isinstance(qc, QuantumCircuit)
            assert qc.num_qubits == 2

    def test_invalid_bell_index_raises(self):
        with pytest.raises(ValueError):
            prepare_bell_state(4)

    def test_bell_measure_appends_gates(self):
        qc = prepare_bell_state(0, attach_measurement=True)
        assert qc.num_clbits == 2


# ===========================================================================
# pauli_ops — Uhlmann fidelity
# ===========================================================================

class TestCalculateStateFidelity:

    def test_fidelity_state_with_itself_is_one(self):
        psi = np.array([1.0, 0.0], dtype=np.complex128)
        assert calculate_state_fidelity(psi, psi) == pytest.approx(1.0)

    def test_fidelity_orthogonal_states_is_zero(self):
        psi0 = np.array([1.0, 0.0], dtype=np.complex128)
        psi1 = np.array([0.0, 1.0], dtype=np.complex128)
        assert calculate_state_fidelity(psi0, psi1) == pytest.approx(0.0)

    def test_fidelity_clamped_to_unit_interval(self):
        psi0 = np.array([1.0 / math.sqrt(2), 1.0 / math.sqrt(2)], dtype=np.complex128)
        psi1 = np.array([1.0, 0.0], dtype=np.complex128)
        fid = calculate_state_fidelity(psi0, psi1)
        assert 0.0 <= fid <= 1.0

    def test_fidelity_symmetry(self):
        psi0 = np.array([0.6, 0.8], dtype=np.complex128)
        psi1 = np.array([1.0 / math.sqrt(2), 1.0 / math.sqrt(2)], dtype=np.complex128)
        assert calculate_state_fidelity(psi0, psi1) == pytest.approx(
            calculate_state_fidelity(psi1, psi0)
        )

    def test_fidelity_shape_mismatch_raises(self):
        psi2 = np.array([1.0, 0.0], dtype=np.complex128)
        psi4 = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.complex128)
        with pytest.raises(ValueError):
            calculate_state_fidelity(psi2, psi4)

    def test_density_matrix_from_statevector_trace_one(self):
        psi = np.array([1.0, 1.0], dtype=np.complex128)
        rho = density_matrix_from_statevector(psi)
        assert abs(np.trace(rho) - 1.0) < 1e-9


# ===========================================================================
# pauli_ops — basis generation
# ===========================================================================

class TestGenerateRandomBases:

    def test_length_matches_num_qubits(self):
        bases = generate_random_bases(8, seed=0)
        assert len(bases) == 8

    def test_only_x_and_z_in_output(self):
        bases = generate_random_bases(100, seed=7)
        assert set(bases).issubset({"X", "Z"})

    def test_same_seed_produces_identical_output(self):
        b1 = generate_random_bases(16, seed=42)
        b2 = generate_random_bases(16, seed=42)
        assert b1 == b2

    def test_different_seeds_produce_different_output(self):
        b1 = generate_random_bases(16, seed=1)
        b2 = generate_random_bases(16, seed=2)
        assert b1 != b2

    def test_invalid_num_qubits_raises(self):
        with pytest.raises(ValueError):
            generate_random_bases(0, seed=0)


# ===========================================================================
# key_distribution — generic batching & arbitrary N
# ===========================================================================

class TestKeyDistribution:

    def test_create_bell_pair_circuit_two_qubits(self):
        qc = create_bell_pair_circuit()
        assert qc.num_qubits == 2

    def test_create_bell_pair_circuit_returns_quantum_circuit(self):
        qc = create_bell_pair_circuit()
        assert isinstance(qc, QuantumCircuit)

    def test_distribute_public_keys_returns_three_parties(self):
        result = distribute_public_keys(num_keys=4, shots=256, seed=42)
        assert "alice_public_key"      in result
        assert "bob_shared_material"   in result
        assert "charlie_shared_material" in result

    def test_distribute_public_keys_session_id_is_string(self):
        result = distribute_public_keys(num_keys=4, shots=256, seed=0)
        assert isinstance(result["session_id"], str)
        assert len(result["session_id"]) > 0

    def test_distribute_public_keys_qber_in_range(self):
        result = distribute_public_keys(num_keys=8, shots=512, seed=1)
        assert 0.0 <= result["measured_qber"] <= 1.0

    def test_distribute_public_keys_hardware_baseline(self):
        result = distribute_public_keys(num_keys=4, shots=256, seed=5)
        assert result["hardware_baseline_qber"] == pytest.approx(HARDWARE_BASELINE_QBER)

    def test_distribute_public_keys_alice_num_keys_matches(self):
        result = distribute_public_keys(num_keys=6, shots=256, seed=3)
        assert result["alice_public_key"]["num_keys"] == 6

    def test_distribute_public_keys_measurement_counts_nonempty(self):
        result = distribute_public_keys(num_keys=4, shots=256, seed=9)
        assert len(result["measurement_counts"]) > 0

    def test_distribute_public_keys_invalid_inputs_raise(self):
        with pytest.raises(ValueError):
            distribute_public_keys(num_keys=0)
        with pytest.raises(ValueError):
            distribute_public_keys(num_keys=-5)
        with pytest.raises(TypeError):
            distribute_public_keys(num_keys="invalid")  # type: ignore

    def test_deterministic_seeded_execution(self):
        r1 = distribute_public_keys(num_keys=20, shots=256, seed=42)
        r2 = distribute_public_keys(num_keys=20, shots=256, seed=42)
        assert r1["alice_public_key"]["bases"] == r2["alice_public_key"]["bases"]
        assert r1["bob_shared_material"]["bases"] == r2["bob_shared_material"]["bases"]
        assert r1["charlie_shared_material"]["bases"] == r2["charlie_shared_material"]["bases"]

    @pytest.mark.parametrize("size", [
        1,
        13,  # max_batch - 1
        14,  # max_batch
        15,  # max_batch + 1
        28,  # 2 * max_batch
        29,  # 2 * max_batch + 1
        50,
        100,
        1000,
    ])
    def test_generic_batching_boundary_sizes(self, size: int):
        """Verify generic arbitrary integer N key distribution up to N=1000."""
        result = distribute_public_keys(num_keys=size, shots=128, seed=42)
        assert result["num_keys"] == size
        assert len(result["alice_public_key"]["bases"]) == size
        assert len(result["bob_shared_material"]["bases"]) == size
        assert len(result["charlie_shared_material"]["bases"]) == size
        assert len(result["alice_public_key"]["qubit_indices"]) == size
        assert result["measured_qber"] <= 0.05
        assert result["hardware_baseline_qber"] == pytest.approx(HARDWARE_BASELINE_QBER)


# ===========================================================================
# teleportation
# ===========================================================================

class TestTeleportation:

    def test_build_teleportation_circuit_qubit_count(self):
        qc = build_teleportation_circuit()
        assert qc.num_qubits == 3

    def test_build_teleportation_circuit_classical_bit_count(self):
        qc = build_teleportation_circuit()
        assert qc.num_clbits == 2

    def test_build_teleportation_circuit_default_recipient_label(self):
        qc = build_teleportation_circuit()
        assert "bob" in qc.name.lower()

    def test_build_teleportation_circuit_charlie_label(self):
        qc = build_teleportation_circuit(recipient_label="Charlie")
        assert "charlie" in qc.name.lower()

    def test_run_teleportation_returns_counts(self):
        result = run_teleportation(shots=256, seed=42)
        assert isinstance(result["counts"], dict)
        assert len(result["counts"]) > 0

    def test_run_teleportation_correction_bits_binary(self):
        result = run_teleportation(shots=256)
        c0, c1 = result["correction_bits"]
        assert c0 in (0, 1)
        assert c1 in (0, 1)

    def test_run_teleportation_probabilities_sum_to_one(self):
        result = run_teleportation(shots=512)
        total_prob = sum(result["probabilities"].values())
        assert abs(total_prob - 1.0) < 1e-9

    def test_extract_correction_bits_known_bitstring(self):
        counts = {"10": 1024}
        c0, c1 = extract_correction_bits(counts)
        assert c1 == 1
        assert c0 == 0

    def test_extract_correction_bits_empty_raises(self):
        with pytest.raises(ValueError, match="empty"):
            extract_correction_bits({})

    def test_teleportation_fidelity_pure_state_near_one(self):
        psi = np.array([1.0 / math.sqrt(2), 1.0 / math.sqrt(2)], dtype=np.complex128)
        result = run_teleportation(message_state=psi, shots=1024)
        fidelity = compute_teleportation_fidelity(psi, result["counts"])
        assert fidelity >= 0.95


# ===========================================================================
# verification security tests (F-02)
# ===========================================================================

class TestVerificationSecurity:

    def test_forged_low_measured_qber_is_rejected_when_actual_qber_high(self):
        """A signature with injected fake measured_qber=0.001 must be computed from raw bits and rejected."""
        message = "Authorized Wire: $10,000,000"
        sig = sign(message, n_qubits=8, seed=42)
        
        # Invert the measurement outcomes so that actual QBER is 100%
        tampered_sig = dict(sig)
        tampered_sig["measurement_outcomes"] = [1 - b for b in sig["measurement_outcomes"]]
        # Adversary injects a fake low measured_qber to attempt bypass
        tampered_sig["measured_qber"] = 0.001
        
        verdict = verify(tampered_sig, message=message)
        # Must compute actual QBER (1.0), not trust 0.001, and reject
        assert verdict["is_valid"] is False
        assert verdict["qber"] > 0.11
        assert verdict["reason"] == "qber_exceeded"


# ===========================================================================
# signing fidelity calculation tests (F-01)
# ===========================================================================

class TestSigningFidelity:

    def test_sign_computes_high_fidelity_on_clean_channel(self):
        """Clean teleportation signing yields high fidelity >= 0.95."""
        sig = sign("Legitimate Transaction", n_qubits=4, shots=512, seed=42)
        assert 0.95 <= sig["fidelity"] <= 1.0

    def test_compute_teleportation_fidelity_degrades_under_skew_and_noise(self):
        """Fidelity calculation reflects statistical distortion and noise."""
        psi = np.array([1.0, 0.0], dtype=np.complex128)
        
        # 1. Ideal uniform distribution across 4 Bell measurement branches
        clean_counts = {"00": 256, "01": 256, "10": 256, "11": 256}
        fid_clean = compute_teleportation_fidelity(psi, clean_counts)
        assert fid_clean == pytest.approx(1.0)
        
        # 2. Moderately noisy / perturbed distribution
        noisy_counts = {"00": 500, "01": 200, "10": 200, "11": 100}
        fid_noisy = compute_teleportation_fidelity(psi, noisy_counts)
        assert 0.70 < fid_noisy < 0.99
        
        # 3. Heavily skewed unentangled distribution (impersonation/spoofing attack)
        skewed_counts = {"00": 950, "01": 20, "10": 20, "11": 10}
        fid_skewed = compute_teleportation_fidelity(psi, skewed_counts)
        assert fid_skewed < 0.80
        
        # 4. Total collapse to single branch (worst case)
        collapsed_counts = {"00": 1000, "01": 0, "10": 0, "11": 0}
        fid_collapsed = compute_teleportation_fidelity(psi, collapsed_counts)
        assert fid_collapsed == pytest.approx(0.50)
        
        assert fid_clean > fid_noisy > fid_skewed > fid_collapsed


# ===========================================================================
# Pauli corrections input validation tests (F-07)
# ===========================================================================

class TestPauliCorrectionsValidation:

    def test_valid_two_bit_corrections_apply_successfully(self):
        """Valid 2-element bit pairs apply standard Pauli corrections."""
        psi = np.array([1.0, 0.0], dtype=np.complex128)
        # [0, 0] -> Identity
        c00 = apply_pauli_corrections(psi, [0, 0])
        assert np.allclose(c00, np.array([1.0, 0.0]))

        # [0, 1] -> Pauli X (flips |0> to |1>)
        c01 = apply_pauli_corrections(psi, [0, 1])
        assert np.allclose(c01, np.array([0.0, 1.0]))

        # [1, 0] -> Pauli Z (leaves |0> as |0>)
        c10 = apply_pauli_corrections(psi, [1, 0])
        assert np.allclose(c10, np.array([1.0, 0.0]))

        # [1, 1] -> Z @ X (flips |0> to -|1>)
        c11 = apply_pauli_corrections(psi, [1, 1])
        assert np.allclose(np.abs(c11), np.array([0.0, 1.0]))

    def test_empty_correction_bits_raises_value_error(self):
        """Empty list must raise ValueError, not IndexError."""
        psi = np.array([1.0, 0.0], dtype=np.complex128)
        with pytest.raises(ValueError, match="exactly 2 elements"):
            apply_pauli_corrections(psi, [])

    def test_single_element_correction_bits_raises_value_error(self):
        """Single-element list must raise ValueError."""
        psi = np.array([1.0, 0.0], dtype=np.complex128)
        with pytest.raises(ValueError, match="exactly 2 elements"):
            apply_pauli_corrections(psi, [0])

    def test_three_plus_elements_correction_bits_raises_value_error(self):
        """3+ element list must raise ValueError."""
        psi = np.array([1.0, 0.0], dtype=np.complex128)
        with pytest.raises(ValueError, match="exactly 2 elements"):
            apply_pauli_corrections(psi, [0, 1, 0])

    def test_non_binary_integers_raise_value_error(self):
        """Non-binary integers (e.g. 2, -1) must raise ValueError."""
        psi = np.array([1.0, 0.0], dtype=np.complex128)
        with pytest.raises(ValueError, match="binary integer 0 or 1"):
            apply_pauli_corrections(psi, [2, -1])
        with pytest.raises(ValueError, match="binary integer 0 or 1"):
            apply_pauli_corrections(psi, [0, 2])

    def test_boolean_and_type_coercion_rejected(self):
        """Boolean values like [True, False] or strings must be rejected."""
        psi = np.array([1.0, 0.0], dtype=np.complex128)
        with pytest.raises(ValueError, match="binary integer 0 or 1"):
            apply_pauli_corrections(psi, [True, False])  # type: ignore
        with pytest.raises(ValueError):
            apply_pauli_corrections(psi, "01")  # type: ignore


# ===========================================================================
# Backend capacity logging tests (F-14)
# ===========================================================================

class TestBackendCapacityLogging:

    def test_capacity_query_failure_logs_warning(self, caplog):
        """When querying backend configuration raises an exception, it is logged at WARNING level."""
        faulty_backend = mock.MagicMock()
        faulty_backend.configuration.side_effect = RuntimeError("Simulated Aer backend config query failure")

        with caplog.at_level(logging.WARNING):
            cap = get_backend_qubit_capacity(backend=faulty_backend)

        assert cap == 28
        assert "Failed to query backend qubit capacity" in caplog.text
        assert "RuntimeError" in caplog.text


# ===========================================================================
# Constant-time hash comparison tests (F-11)
# ===========================================================================

class TestConstantTimeHashComparison:

    def test_verify_uses_hmac_compare_digest(self):
        """verify() must perform constant-time hash comparison via hmac.compare_digest."""
        import hmac
        sig = sign("Valid Message", n_qubits=4, seed=42)
        with mock.patch("hmac.compare_digest", wraps=hmac.compare_digest) as spy_compare:
            res = verify(sig, message="Valid Message")
            assert res["is_valid"] is True
            assert spy_compare.called
            assert spy_compare.call_count >= 1

    def test_hash_mismatch_returns_structured_rejection_with_received_bits(self):
        """Tampered message hash returns valid schema with received_bits: [] and reason: message_hash_mismatch."""
        sig = sign("Valid Message", n_qubits=4, seed=42)
        tampered = dict(sig)
        tampered["message_hash"] = "0" * 64

        res = verify(tampered, message="Valid Message")
        assert res["is_valid"] is False
        assert res["message_intact"] is False
        assert res["reason"] == "message_hash_mismatch"
        assert res["received_bits"] == []



