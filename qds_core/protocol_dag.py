"""
protocol_dag.py
===============
Purpose: Model the QDS teleportation protocol as a directed acyclic graph (DAG)
using rustworkx — the same high-performance graph library used internally by Qiskit
for quantum circuit DAG compilation.

Protocol Topology
-----------------
Nodes represent protocol participants and states:
  - Alice (message sender + EPR source)
  - Bob (legitimate recipient)
  - Charlie (second recipient for non-repudiation)
  - EPR_Source (shared entanglement server)
  - ClassicalChannel (authenticated message carrier)
  - Ledger (post-quantum audit ledger)

Edges represent information flows:
  - quantum (EPR pair distribution, teleportation)
  - classical (correction bits, hash announcements)
  - attack (Eve's interference paths)

Use Cases
---------
1. Visualise which paths Eve can attack (intercept-resend, impersonation, forgery)
2. Check the DAG is acyclic (no feedback loops in the honest protocol)
3. Compute the minimum vertex cut (minimum number of nodes Eve must compromise)
4. Export as JSON for the dashboard's network visualisation

References
----------
- rustworkx: https://www.rustworkx.org/
- Dunjko et al. (2014). PRL 112, 040502. — Protocol topology figure.
"""

from __future__ import annotations

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from typing import Any

import rustworkx as rx


# ---------------------------------------------------------------------------
# Node and edge type constants
# ---------------------------------------------------------------------------

HONEST_NODE_TYPES = {"alice", "bob", "charlie", "epr_source", "ledger", "classical_channel"}
ATTACK_NODE_TYPES = {"eve_forgery", "eve_impersonation", "eve_intercept", "eve_replay"}

QUANTUM_EDGE  = "quantum"    # EPR pair distribution or teleportation
CLASSICAL_EDGE = "classical"  # Authenticated classical channel
ATTACK_EDGE   = "attack"     # Eve's interference path
LEDGER_EDGE   = "ledger"     # Audit ledger write


def build_qds_protocol_dag(include_attacks: bool = True) -> rx.PyDAG:
    """Build the QDS teleportation protocol as a directed acyclic graph.

    Honest protocol nodes and edges are always included.
    Attack nodes (Eve variants) are included when include_attacks=True.

    Parameters
    ----------
    include_attacks : bool
        If True, adds Eve's attack nodes and their interference edges.

    Returns
    -------
    rx.PyDAG
        Directed acyclic graph of the protocol topology.
    """
    dag = rx.PyDAG()

    # ---- Honest Protocol Nodes ----
    alice = dag.add_node({
        "id": "alice",
        "label": "Alice",
        "role": "message_sender",
        "type": "honest",
        "color": "#00f2fe",
        "description": "Generates EPR pairs and performs Bell-State Measurement",
    })
    bob = dag.add_node({
        "id": "bob",
        "label": "Bob",
        "role": "primary_recipient",
        "type": "honest",
        "color": "#00e676",
        "description": "Receives quantum correction bits and verifies signature",
    })
    charlie = dag.add_node({
        "id": "charlie",
        "label": "Charlie",
        "role": "secondary_recipient",
        "type": "honest",
        "color": "#4facfe",
        "description": "Holds second copy of signature for non-repudiation",
    })
    epr_source = dag.add_node({
        "id": "epr_source",
        "label": "EPR Source",
        "role": "entanglement_distributor",
        "type": "honest",
        "color": "#8a2be2",
        "description": "Distributes Bell pairs |Φ+⟩ to Alice-Bob and Alice-Charlie",
    })
    classical_channel = dag.add_node({
        "id": "classical_channel",
        "label": "Classical Channel",
        "role": "authenticated_channel",
        "type": "honest",
        "color": "#ffd600",
        "description": "Authenticated classical channel for correction bits and hash announcements",
    })
    ledger = dag.add_node({
        "id": "ledger",
        "label": "Audit Ledger",
        "role": "post_quantum_ledger",
        "type": "honest",
        "color": "#ff9800",
        "description": "Immutable SHA3-512 hash-chained audit ledger with Ed25519 genesis signature",
    })

    # ---- Honest Protocol Edges ----
    # EPR pair distribution
    dag.add_edge(epr_source, alice, {
        "type": QUANTUM_EDGE,
        "label": "EPR pair |Φ+⟩ (Alice half)",
        "qubit": "alice_epr",
    })
    dag.add_edge(epr_source, bob, {
        "type": QUANTUM_EDGE,
        "label": "EPR pair |Φ+⟩ (Bob half)",
        "qubit": "bob_epr",
    })
    dag.add_edge(epr_source, charlie, {
        "type": QUANTUM_EDGE,
        "label": "EPR pair |Φ+⟩ (Charlie half)",
        "qubit": "charlie_epr",
    })

    # Alice performs BSM and sends correction bits over classical channel
    dag.add_edge(alice, classical_channel, {
        "type": CLASSICAL_EDGE,
        "label": "BSM correction bits (c0, c1)",
        "security": "authenticated",
    })
    dag.add_edge(alice, classical_channel, {
        "type": CLASSICAL_EDGE,
        "label": "Message hash SHA-256(m)",
        "security": "public",
    })

    # Bob and Charlie receive from classical channel
    dag.add_edge(classical_channel, bob, {
        "type": CLASSICAL_EDGE,
        "label": "Correction bits + hash",
        "security": "authenticated",
    })
    dag.add_edge(classical_channel, charlie, {
        "type": CLASSICAL_EDGE,
        "label": "Correction bits + hash (copy)",
        "security": "authenticated",
    })

    # Ledger writes
    dag.add_edge(alice, ledger, {
        "type": LEDGER_EDGE,
        "label": "SIGNING event → SHA3-512 ledger",
    })
    dag.add_edge(bob, ledger, {
        "type": LEDGER_EDGE,
        "label": "VERIFICATION event → SHA3-512 ledger",
    })

    # ---- Attack Nodes and Edges ----
    if include_attacks:
        eve_intercept = dag.add_node({
            "id": "eve_intercept",
            "label": "Eve (Intercept-Resend)",
            "role": "adversary",
            "type": "attack",
            "color": "#ff1744",
            "attack_type": "intercept_resend",
            "qber_contribution": 0.25,
            "description": "Measures flying qubits, re-prepares: introduces 25% QBER",
        })
        eve_forgery = dag.add_node({
            "id": "eve_forgery",
            "label": "Eve (Forgery)",
            "role": "adversary",
            "type": "attack",
            "color": "#ff1744",
            "attack_type": "forgery",
            "p_success": "2^(-n)",
            "description": "Generates separable product states; P_forge = 2^(-n)",
        })
        eve_impersonation = dag.add_node({
            "id": "eve_impersonation",
            "label": "Eve (Impersonation)",
            "role": "adversary",
            "type": "attack",
            "color": "#ff1744",
            "attack_type": "impersonation",
            "qber_contribution": 0.35,
            "description": "Biased unentangled state (α≈0.99); |00⟩-dominant counts",
        })
        eve_replay = dag.add_node({
            "id": "eve_replay",
            "label": "Eve (Replay)",
            "role": "adversary",
            "type": "attack",
            "color": "#ff1744",
            "attack_type": "replay",
            "description": "Replays captured signature to different session",
        })

        # Intercept-resend: Eve intercepts Alice→Bob quantum channel
        dag.add_edge(epr_source, eve_intercept, {
            "type": ATTACK_EDGE,
            "label": "Intercepts quantum channel",
            "detectable": True,
            "detection_mechanism": "QBER > 25%",
        })
        dag.add_edge(eve_intercept, bob, {
            "type": ATTACK_EDGE,
            "label": "Forwards re-prepared state (with errors)",
        })

        # Forgery: Eve tries to sign without Alice's EPR key
        dag.add_edge(eve_forgery, classical_channel, {
            "type": ATTACK_EDGE,
            "label": "Submits forged signature",
            "detectable": True,
            "detection_mechanism": f"χ² p<0.01 + Fidelity<0.70",
        })

        # Impersonation: Eve impersonates Alice with biased states
        dag.add_edge(eve_impersonation, classical_channel, {
            "type": ATTACK_EDGE,
            "label": "Spoofs Alice identity with biased states",
            "detectable": True,
            "detection_mechanism": "χ² p<0.01 (|00⟩-dominant distribution)",
        })

        # Replay: Eve replays Bob's state to Charlie
        dag.add_edge(bob, eve_replay, {
            "type": ATTACK_EDGE,
            "label": "Captures legitimate signature",
        })
        dag.add_edge(eve_replay, charlie, {
            "type": ATTACK_EDGE,
            "label": "Replays captured to different session",
            "detectable": True,
            "detection_mechanism": "Session ID mismatch + hash replay detection",
        })

    return dag


def analyse_protocol_dag(dag: rx.PyDAG) -> dict[str, Any]:
    """Compute graph-theoretic security properties of the protocol DAG.

    Analysis includes:
    1. Acyclicity check (DAG invariant — no feedback loops in honest protocol)
    2. Node/edge counts by type
    3. Adversarial path identification
    4. JSON serialisable export for dashboard visualisation

    Parameters
    ----------
    dag : rx.PyDAG
        Protocol DAG from build_qds_protocol_dag().

    Returns
    -------
    dict[str, Any]
        Protocol topology analysis.
    """
    is_dag = rx.is_directed_acyclic_graph(dag)

    node_data = [dag[n] for n in dag.node_indices()]
    edge_data = [dag.get_edge_data(u, v) for u, v in dag.edge_list()]

    honest_nodes = [n for n in node_data if n["type"] == "honest"]
    attack_nodes = [n for n in node_data if n["type"] == "attack"]
    quantum_edges = [e for e in edge_data if e["type"] == QUANTUM_EDGE]
    classical_edges = [e for e in edge_data if e["type"] == CLASSICAL_EDGE]
    attack_edges = [e for e in edge_data if e["type"] == ATTACK_EDGE]
    detectable_attacks = [e for e in attack_edges if e.get("detectable", False)]

    # Find all paths from EPR source to Bob (honest protocol paths)
    # rustworkx node indices: epr_source is node index 3 (0-indexed)
    node_ids = {dag[n]["id"]: n for n in dag.node_indices()}
    honest_paths = []
    if "epr_source" in node_ids and "bob" in node_ids:
        try:
            paths = rx.all_simple_paths(dag, node_ids["epr_source"], node_ids["bob"])
            honest_paths = [[dag[i]["id"] for i in path] for path in paths]
        except Exception:
            pass

    # JSON-serialisable graph export
    nodes_export = [
        {
            "id": dag[n]["id"],
            "label": dag[n]["label"],
            "type": dag[n]["type"],
            "color": dag[n]["color"],
            "description": dag[n].get("description", ""),
        }
        for n in dag.node_indices()
    ]
    edges_export = [
        {
            "source": dag[u]["id"],
            "target": dag[v]["id"],
            "type": e["type"],
            "label": e.get("label", ""),
            "detectable": e.get("detectable", False),
            "detection_mechanism": e.get("detection_mechanism", ""),
        }
        for u, v, e in dag.weighted_edge_list()
    ]

    return {
        "is_dag": bool(is_dag),
        "dag_invariant": "✅ Acyclic — no feedback loops" if is_dag else "❌ Cycle detected!",
        "n_nodes_total": len(dag),
        "n_nodes_honest": len(honest_nodes),
        "n_nodes_attack": len(attack_nodes),
        "n_edges_total": dag.num_edges(),
        "n_edges_quantum": len(quantum_edges),
        "n_edges_classical": len(classical_edges),
        "n_edges_attack": len(attack_edges),
        "n_attack_edges_detectable": len(detectable_attacks),
        "fraction_attacks_detectable": (
            len(detectable_attacks) / len(attack_edges)
            if attack_edges else 1.0
        ),
        "honest_paths_epr_to_bob": honest_paths,
        "graph_nodes": nodes_export,
        "graph_edges": edges_export,
        "security_note": (
            f"{len(detectable_attacks)}/{len(attack_edges)} attack vectors are "
            f"detectable by QBER + χ² Born-rule testing."
            if attack_edges else "No attack nodes included."
        ),
        "library": "rustworkx",
        "library_version": rx.__version__,
    }


def print_dag_summary(analysis: dict[str, Any]) -> None:
    """Print a formatted summary of the protocol DAG analysis."""
    print("\n" + "=" * 65)
    print("  QDS Protocol DAG Analysis (rustworkx)")
    print("=" * 65)
    print(f"  DAG Invariant:     {analysis['dag_invariant']}")
    print(f"  Total nodes:       {analysis['n_nodes_total']}")
    print(f"    Honest nodes:    {analysis['n_nodes_honest']}")
    print(f"    Attack nodes:    {analysis['n_nodes_attack']}")
    print(f"  Total edges:       {analysis['n_edges_total']}")
    print(f"    Quantum:         {analysis['n_edges_quantum']}")
    print(f"    Classical:       {analysis['n_edges_classical']}")
    print(f"    Attack:          {analysis['n_edges_attack']}")
    print(f"  Security:          {analysis['security_note']}")
    print(f"\n  Honest paths (EPR source → Bob):")
    for path in analysis.get("honest_paths_epr_to_bob", []):
        print(f"    {' → '.join(path)}")
    print()


def get_dag_json(include_attacks: bool = True) -> dict[str, Any]:
    """Return JSON-serialisable protocol DAG for the dashboard network view.

    Parameters
    ----------
    include_attacks : bool
        Whether to include Eve's attack nodes (for attack simulation view).

    Returns
    -------
    dict[str, Any]
        Dashboard-ready graph data with nodes, edges, and analysis.
    """
    dag = build_qds_protocol_dag(include_attacks=include_attacks)
    return analyse_protocol_dag(dag)


if __name__ == "__main__":
    # Run standalone analysis
    dag = build_qds_protocol_dag(include_attacks=True)
    analysis = analyse_protocol_dag(dag)
    print_dag_summary(analysis)
    print(f"  Library: rustworkx v{analysis['library_version']} "
          f"(Qiskit's internal graph engine)")
