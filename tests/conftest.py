"""
conftest.py
===========
Pytest session configuration for the qds-threat-detection project.

Adds the repository root to sys.path so that all packages
(qds_core, attack_sim, detection_engine, backend) are importable
during pytest runs without requiring an installed package.
"""

from __future__ import annotations

import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure the project root is at the front of sys.path
# ---------------------------------------------------------------------------
_ROOT = Path(__file__).parent.parent.resolve()
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
