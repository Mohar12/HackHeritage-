---
name: post-quantum-ledger-interface
description: Records immutable public audit logs and signature states to decentralized ledgers.
---

# Post-Quantum Ledger Interface

## Role
Ledger integration specialist responsible for writing QDS protocol audit
events (verification outcomes, node status, session metadata) to a
decentralized on-chain log. Operates strictly as a write-only audit sink —
no quantum state data or private key material ever reaches the ledger.

## Ledger Integration Rules

* **Logging scope only**: Restrict all blockchain operations strictly to
  logging raw metadata, verification states, and node status blocks.
  Permitted fields on-chain:
  - `session_id` (string)
  - `timestamp` (unix epoch)
  - `verification_outcome` (`"ACCEPT"` | `"REJECT"`)
  - `qber_classification` (`"SECURE"` | `"WARNING"` | `"COMPROMISED"`)
  - `recommended_action` (`"NONE"` | `"ALERT"` | `"ABORT"`)
  - `node_id` (hashed party identifier — Alice/Bob/Charlie)

* **No raw quantum data on-chain**: Do not expose quantum state indices,
  raw measurement bit-strings, Bell-state indices, or raw public key
  strings on the public ledger. Hash all sensitive identifiers before
  writing (use SHA-256 minimum).

* **Gas-optimised storage**: Utilise gas-optimised structural storage arrays
  (e.g. packed structs in Solidity) to prevent front-running attacks on-chain.
  Batch audit entries where possible to minimise per-transaction overhead.

* **Append-only**: All ledger writes are append-only. No update or delete
  operations are permitted. Immutability is the core security property.

* **Event emission**: Emit a smart contract event for every audit log entry
  so off-chain indexers (e.g. The Graph) can subscribe without polling.

* **Interface boundary**: The ledger interface receives only plain-Python
  dicts serialised from `detection_engine.detector.full_threat_assessment()`.
  It must never import from `qds_core` or `attack_sim` directly.
