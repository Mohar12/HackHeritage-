"""
qiskit_compat.py
================
Purpose: Backend compatibility adapter for Qiskit 2.x environments.
Provides backward compatibility for quantum circuit instruction sets that use
InstructionSet.c_if() by translating them into Qiskit 2.x if_test control flow blocks.
"""

from __future__ import annotations

import os
import logging
from typing import Any

# Stabilize OpenMP runtime initialization on Windows Python 3.14 environments
os.environ.setdefault("OMP_NUM_THREADS", "1")

logger = logging.getLogger(__name__)

_COMPAT_APPLIED = False


def apply_qiskit_compat() -> bool:
    """Apply compatibility patches to Qiskit if necessary.

    In Qiskit 2.x, `InstructionSet.c_if()` was removed in favor of `qc.if_test()`.
    This adapter polyfills `InstructionSet.c_if()` so that existing teleportation
    circuits in `qds_core` can run seamlessly on Qiskit AerSimulator without
    modifying any files outside `backend/`.
    """
    global _COMPAT_APPLIED
    if _COMPAT_APPLIED:
        return True

    try:
        from qiskit.circuit.instructionset import InstructionSet

        if hasattr(InstructionSet, "c_if"):
            _COMPAT_APPLIED = True
            return True

        def c_if_adapter(self: InstructionSet, classical: Any, val: int) -> InstructionSet:
            circuit_scope = getattr(self._requester, "__self__", None)
            if circuit_scope is not None and hasattr(circuit_scope, "circuit"):
                qc = circuit_scope.circuit
            elif hasattr(self, "_circuit"):
                qc = self._circuit
            else:
                qc = None

            if qc is not None and len(self.instructions) > 0:
                num_inst = len(self.instructions)
                popped = [qc.data.pop() for _ in range(num_inst)][::-1]
                with qc.if_test((classical, val)):
                    for ci in popped:
                        qc.append(ci.operation, ci.qubits, ci.clbits)
                if hasattr(self, "_instructions") and isinstance(self._instructions, list):
                    self._instructions.clear()

            return self

        InstructionSet.c_if = c_if_adapter
        _COMPAT_APPLIED = True
        logger.info("Successfully applied Qiskit 2.x c_if compatibility adapter.")
        return True
    except Exception as exc:
        logger.warning("Could not apply Qiskit 2.x compatibility adapter: %s", exc)
        return False


# Apply on module import
apply_qiskit_compat()
