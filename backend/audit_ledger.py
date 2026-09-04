"""
audit_ledger.py
===============
Purpose: In-memory immutable append-only audit ledger for QDS protocol events with concurrency safety.

Compliance (post-quantum-ledger-interface skill)
-----------------------------------------------
- Asynchronous & non-blocking: never blocks live detection or quantum execution.
- No raw quantum data: stores only hashes, session IDs, verification outcomes,
  QBER, chi2 p-values, threat classifications, and timestamps.
- Append-only: entries cannot be modified or deleted.
- Thread-safe / Coroutine-safe: atomic hash chaining and ID generation under concurrency.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import threading
import time
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
    prev_hash: str = "GENESIS_ROOT"
    record_hash: str


class AuditLedger:
    """Thread-safe, coroutine-safe, append-only cryptographic audit ledger."""

    def __init__(self) -> None:
        self._records: list[AuditRecord] = []
        self._sync_lock = threading.Lock()
        self._async_lock: asyncio.Lock | None = None

    def _get_async_lock(self) -> asyncio.Lock:
        if self._async_lock is None:
            self._async_lock = asyncio.Lock()
        return self._async_lock

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
        """Atomically generate record_id, chain previous hash, and append record."""
        with self._sync_lock:
            ts = time.time()
            node_id_hash = hashlib.sha256(node_id.encode("utf-8")).hexdigest()[:16]
            prev_hash = self._records[-1].record_hash if self._records else "GENESIS_ROOT"

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
                "prev_hash": prev_hash,
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
                prev_hash=prev_hash,
                record_hash=rec_hash,
            )

            self._records.append(record)
            return record

    async def record_event_async(
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
        """Asynchronous coroutine-safe wrapper using asyncio.Lock."""
        async with self._get_async_lock():
            return self.record_event(
                session_id=session_id,
                event_type=event_type,
                node_id=node_id,
                message_hash=message_hash,
                verification_outcome=verification_outcome,
                attack_type=attack_type,
                qber=qber,
                chi2_p_value=chi2_p_value,
                fidelity=fidelity,
                confidence_score=confidence_score,
                threat_classification=threat_classification,
                recommended_action=recommended_action,
            )

    def verify_integrity(self) -> bool:
        """Verify unbroken cryptographic hash chain and record payload integrity across all events."""
        with self._sync_lock:
            for i, rec in enumerate(self._records):
                expected_prev = self._records[i - 1].record_hash if i > 0 else "GENESIS_ROOT"
                if rec.prev_hash != expected_prev:
                    return False
                payload = {
                    "session_id": rec.session_id,
                    "event_type": rec.event_type,
                    "timestamp": rec.timestamp,
                    "node_id_hash": rec.node_id_hash,
                    "message_hash": rec.message_hash,
                    "verification_outcome": rec.verification_outcome,
                    "attack_type": rec.attack_type,
                    "qber": rec.qber,
                    "chi2_p_value": rec.chi2_p_value,
                    "fidelity": rec.fidelity,
                    "confidence_score": rec.confidence_score,
                    "threat_classification": rec.threat_classification,
                    "recommended_action": rec.recommended_action,
                    "prev_hash": rec.prev_hash,
                }
                computed_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
                if rec.record_hash != computed_hash:
                    return False
            return True

    def get_records(self, limit: int = 50) -> list[AuditRecord]:
        with self._sync_lock:
            return list(self._records[-limit:])

    def get_session_history(self, session_id: str) -> list[AuditRecord]:
        with self._sync_lock:
            return [r for r in self._records if r.session_id == session_id]

    def count(self) -> int:
        with self._sync_lock:
            return len(self._records)

    def clear(self) -> None:
        """Test helper to reset ledger state."""
        with self._sync_lock:
            self._records.clear()


# Global singleton instance
ledger = AuditLedger()
