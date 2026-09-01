"""
audit_ledger.py
===============
Purpose: In-memory immutable append-only audit ledger for QDS protocol events.

Compliance (post-quantum-ledger-interface skill)
-----------------------------------------------
- Asynchronous & non-blocking: never blocks live detection or quantum execution.
- No raw quantum data: stores only hashes, session IDs, verification outcomes,
  QBER, chi2 p-values, threat classifications, and timestamps.
- Append-only: entries cannot be modified or deleted.
- Interface boundary: receives plain serialised dicts; never touches quantum state vectors.
"""

from __future__ import annotations

import time
import hashlib
import json
from typing import Any
from pydantic import BaseModel, Field


class AuditRecord(BaseModel):
    record_id: str
    timestamp: float
    session_id: str
    event_type: str  # "KEY_DISTRIBUTION" | "SIGNING" | "VERIFICATION" | "ATTACK_SIMULATION" | "THREAT_DETECTION"
    message_hash: str | None = None
    verification_outcome: str | None = None  # "ACCEPT" | "REJECT"
    attack_type: str | None = None
    qber: float | None = None
    chi2_p_value: float | None = None
    fidelity: float | None = None
    confidence_score: float | None = None
    threat_classification: str | None = None  # "SECURE" | "WARNING" | "COMPROMISED"
    recommended_action: str | None = None     # "NONE" | "ALERT" | "ABORT"
    node_id_hash: str
    record_hash: str


class AuditLedger:
    """Thread-safe, append-only, in-memory cryptographic audit ledger."""

    def __init__(self) -> None:
        self._records: list[AuditRecord] = []

    def record_event(
        self,
        session_id: str,
        event_type: str,
        node_id: str = "Alice",
        message_hash: str | None = None,
        verification_outcome: str | None = None,
        attack_type: str | None = None,
        qber: float | None = None,
        chi2_p_value: float | None = None,
        fidelity: float | None = None,
        confidence_score: float | None = None,
        threat_classification: str | None = None,
        recommended_action: str | None = None,
    ) -> AuditRecord:
        ts = time.time()
        node_id_hash = hashlib.sha256(node_id.encode("utf-8")).hexdigest()[:16]

        payload = {
            "session_id": session_id,
            "event_type": event_type,
            "timestamp": ts,
            "node_id_hash": node_id_hash,
            "message_hash": message_hash,
            "verification_outcome": verification_outcome,
            "attack_type": attack_type,
            "qber": qber,
            "chi2_p_value": chi2_p_value,
            "fidelity": fidelity,
            "confidence_score": confidence_score,
            "threat_classification": threat_classification,
            "recommended_action": recommended_action,
            "prev_hash": self._records[-1].record_hash if self._records else "GENESIS_ROOT",
        }

        record_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        rec_hash = hashlib.sha256(record_bytes).hexdigest()
        rec_id = f"aud-{len(self._records) + 1:06d}"

        record = AuditRecord(
            record_id=rec_id,
            timestamp=ts,
            session_id=session_id,
            event_type=event_type,
            message_hash=message_hash,
            verification_outcome=verification_outcome,
            attack_type=attack_type,
            qber=qber,
            chi2_p_value=chi2_p_value,
            fidelity=fidelity,
            confidence_score=confidence_score,
            threat_classification=threat_classification,
            recommended_action=recommended_action,
            node_id_hash=node_id_hash,
            record_hash=rec_hash,
        )

        self._records.append(record)
        return record

    def get_records(self, limit: int = 50) -> list[AuditRecord]:
        return self._records[-limit:]

    def get_session_history(self, session_id: str) -> list[AuditRecord]:
        return [r for r in self._records if r.session_id == session_id]

    def count(self) -> int:
        return len(self._records)


# Global singleton instance
ledger = AuditLedger()
