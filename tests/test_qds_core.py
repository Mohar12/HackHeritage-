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
