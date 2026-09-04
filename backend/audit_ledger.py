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

import asyncio
import hashlib
import json
import threading
import time
from typing import Any
from pydantic import BaseModel


class AuditVerifyResponse(BaseModel):
    valid: bool
    records_checked: int
    error: str | None = None


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
        self._lock = self._sync_lock  # alias for backwards compatibility
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
        ts = time.time()
        node_id_hash = hashlib.sha256(node_id.encode("utf-8")).hexdigest()[:16]

        with self._sync_lock:
            prev_hash = self._records[-1].record_hash if self._records else "GENESIS_ROOT"
            rec_id = f"aud-{len(self._records) + 1:06d}"

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

    def verify_chain(self) -> dict[str, Any]:
        """Verify unbroken cryptographic hash chain and record payload integrity across all events.

        Returns:
            dict: {"valid": bool, "records_checked": int, "error": str | None}
        """
        with self._sync_lock:
            records = list(self._records)

        if not records:
            return {
                "valid": True,
                "records_checked": 0,
                "error": None,
            }

        prev_hash = "GENESIS_ROOT"

        for idx, record in enumerate(records):
            expected_id = f"aud-{idx + 1:06d}"
            if record.record_id != expected_id:
                return {
                    "valid": False,
                    "records_checked": idx + 1,
                    "error": f"Sequential ID error at index {idx}: expected '{expected_id}', got '{record.record_id}'.",
                }

            expected_prev = records[idx - 1].record_hash if idx > 0 else "GENESIS_ROOT"
            if record.prev_hash != expected_prev:
                return {
                    "valid": False,
                    "records_checked": idx + 1,
                    "error": f"Previous hash mismatch at record '{record.record_id}': expected '{expected_prev}', got '{record.prev_hash}'.",
                }

            payload = {
                "session_id": record.session_id,
                "event_type": record.event_type,
                "timestamp": record.timestamp,
                "node_id_hash": record.node_id_hash,
                "message_hash": record.message_hash,
                "verification_outcome": record.verification_outcome,
                "attack_type": record.attack_type,
                "qber": record.qber,
                "chi2_p_value": record.chi2_p_value,
                "fidelity": record.fidelity,
                "confidence_score": record.confidence_score,
                "threat_classification": record.threat_classification,
                "recommended_action": record.recommended_action,
                "prev_hash": prev_hash,
            }

            calculated_hash = hashlib.sha256(
                json.dumps(payload, sort_keys=True).encode("utf-8")
            ).hexdigest()

            if calculated_hash != record.record_hash:
                return {
                    "valid": False,
                    "records_checked": idx + 1,
                    "error": f"Hash mismatch at record '{record.record_id}': stored hash does not match reconstructed payload hash.",
                }

            prev_hash = record.record_hash

        return {
            "valid": True,
            "records_checked": len(records),
            "error": None,
        }

    def verify_integrity(self) -> bool:
        """Verify unbroken cryptographic hash chain and record payload integrity across all events."""
        return self.verify_chain()["valid"]


# Global singleton instance
ledger = AuditLedger()
