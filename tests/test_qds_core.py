"""
test_qds_core.py
================
Unit and integration tests for the qds_core package.

Covers
------
- pauli_ops  : Pauli matrices, fidelity, Bell states, basis generation
- key_distribution : EPR pair circuit, key-material structure, QBER baseline
- teleportation    : 3-qubit circuit construction, Aer execution, correction bits

All tests are deterministic — seeded RNG, fixed shot count.
No network calls, no ML libraries, no pytest.mark.skip.
"""

from __future__ import annotations

import math

import numpy as np
import pytest
from qiskit import QuantumCircuit

# ---------------------------------------------------------------------------
# Imports under test
# ---------------------------------------------------------------------------
from qds_core.pauli_ops import (
    PAULI_I, PAULI_X, PAULI_Y, PAULI_Z,
    get_pauli_matrix,
    prepare_bell_state,
    calculate_state_fidelity,
    generate_random_bases,
    density_matrix_from_statevector,
    bell_measure,
    apply_pauli_gate,
)
from qds_core.key_distribution import (
    create_bell_pair_circuit,
    distribute_public_keys,
    HARDWARE_BASELINE_QBER,
    DEFAULT_SHOTS,
)
from qds_core.teleportation import (
    build_teleportation_circuit,
    run_teleportation,
    extract_correction_bits,
    compute_teleportation_fidelity,
)


# ===========================================================================
# pauli_ops — Pauli matrices
# ===========================================================================

class TestPauliMatrices:
    """Pauli matrix shape, dtype, and algebraic identities."""

    def test_identity_shape_and_dtype(self):
        assert PAULI_I.shape == (2, 2)
        assert PAULI_I.dtype == np.complex128

    def test_pauli_x_shape_and_dtype(self):
        assert PAULI_X.shape == (2, 2)
        assert PAULI_X.dtype == np.complex128

    def test_pauli_y_shape_and_dtype(self):
        assert PAULI_Y.shape == (2, 2)
        assert PAULI_Y.dtype == np.complex128

    def test_pauli_z_shape_and_dtype(self):
        assert PAULI_Z.shape == (2, 2)
        assert PAULI_Z.dtype == np.complex128

    def test_pauli_x_squared_is_identity(self):
        """X² = I"""
        assert np.allclose(PAULI_X @ PAULI_X, PAULI_I)

    def test_pauli_y_squared_is_identity(self):
        """Y² = I"""
        assert np.allclose(PAULI_Y @ PAULI_Y, PAULI_I)

    def test_pauli_z_squared_is_identity(self):
        """Z² = I"""
        assert np.allclose(PAULI_Z @ PAULI_Z, PAULI_I)

    def test_xy_anticommutator(self):
        """XY = iZ"""
        assert np.allclose(PAULI_X @ PAULI_Y, 1j * PAULI_Z)

    def test_get_pauli_matrix_x(self):
        assert np.allclose(get_pauli_matrix("X"), PAULI_X)

    def test_get_pauli_matrix_case_insensitive(self):
        assert np.allclose(get_pauli_matrix("z"), PAULI_Z)

    def test_get_pauli_matrix_invalid_raises(self):
        with pytest.raises(ValueError, match="Unknown Pauli basis"):
            get_pauli_matrix("W")

    def test_get_pauli_matrix_returns_copy(self):
        """Mutation of returned matrix must not affect the module-level constant."""
        m = get_pauli_matrix("X")
        m[0, 0] = 99.0
        assert PAULI_X[0, 0] == 0.0


# ===========================================================================
# pauli_ops — Bell states
# ===========================================================================

class TestBellStatePreparation:

    def test_phi_plus_circuit_has_two_qubits(self):
        qc = prepare_bell_state(0)
        assert qc.num_qubits == 2

    def test_all_four_bell_states_build_without_error(self):
        for idx in range(4):
            qc = prepare_bell_state(idx)
            assert isinstance(qc, QuantumCircuit)

    def test_invalid_bell_index_raises(self):
        with pytest.raises(ValueError):
            prepare_bell_state(4)

    def test_bell_measure_appends_gates(self):
        qc = QuantumCircuit(2, 2)
        before = len(qc)
        bell_measure(qc, 0, 1, 0, 1)
        assert len(qc) > before


# ===========================================================================
# pauli_ops — fidelity
# ===========================================================================

class TestCalculateStateFidelity:

    def _pure_rho(self, state: list) -> np.ndarray:
        psi = np.array(state, dtype=np.complex128)
        psi /= np.linalg.norm(psi)
        return np.outer(psi, psi.conj())

    def test_fidelity_state_with_itself_is_one(self):
        rho = self._pure_rho([1, 0])
        assert abs(calculate_state_fidelity(rho, rho) - 1.0) < 1e-9

    def test_fidelity_orthogonal_states_is_zero(self):
        rho   = self._pure_rho([1, 0])
        sigma = self._pure_rho([0, 1])
        assert abs(calculate_state_fidelity(rho, sigma)) < 1e-9

    def test_fidelity_clamped_to_unit_interval(self):
        rho = self._pure_rho([1, 1])
        sigma = self._pure_rho([1, 0])
        f = calculate_state_fidelity(rho, sigma)
        assert 0.0 <= f <= 1.0

    def test_fidelity_symmetry(self):
        rho   = self._pure_rho([1, 0.5])
        sigma = self._pure_rho([0.5, 1])
        assert abs(calculate_state_fidelity(rho, sigma) -
                   calculate_state_fidelity(sigma, rho)) < 1e-9

    def test_fidelity_shape_mismatch_raises(self):
        rho2 = np.eye(2, dtype=np.complex128) / 2
        rho4 = np.eye(4, dtype=np.complex128) / 4
        with pytest.raises(ValueError, match="shape"):
            calculate_state_fidelity(rho2, rho4)

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
        # With 16 bits there is a negligible chance they are identical
        assert b1 != b2

    def test_invalid_num_qubits_raises(self):
        with pytest.raises(ValueError):
            generate_random_bases(0, seed=0)


# ===========================================================================
# key_distribution
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

    def test_distribute_public_keys_invalid_num_keys_raises(self):
        with pytest.raises(ValueError):
            distribute_public_keys(num_keys=0)


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
        # seed parameter accepted by run_teleportation via message_state default
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
        # Qiskit convention: "10" → c[1]=1, c[0]=0
        assert c1 == 1
        assert c0 == 0

    def test_extract_correction_bits_empty_raises(self):
        with pytest.raises(ValueError, match="empty"):
            extract_correction_bits({})

    def test_teleportation_fidelity_pure_state_near_one(self):
        """Noise-free Aer run should yield fidelity ≥ 0.95 for |+⟩ state."""
        psi = np.array([1.0 / math.sqrt(2), 1.0 / math.sqrt(2)], dtype=np.complex128)
        result = run_teleportation(message_state=psi, shots=1024)
        fidelity = compute_teleportation_fidelity(psi, result["counts"])
        assert fidelity >= 0.95
