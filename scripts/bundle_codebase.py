"""
bundle_codebase.py
==================
Generates structured Markdown bundles of the HyperQDS codebase optimized for Claude / LLM ingestion.
Produces:
1. BACKEND_AND_CORE_CODEBASE.md (QDS Core, Attack Sim, Detection Engine, Backend, Tests, Docs, Scripts, Configs)
2. FRONTEND_CODEBASE.md (React, Vite, Three.js 3D components, styling, API client)
3. COMPLETE_CODEBASE.md (Unified monolithic bundle of the entire repository)
"""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".agent",
    ".agents",
    ".claude",
    ".gemini",
    "scratch",
    "agent",  # external skills repo
    ".postman",
    "postman",
    "brain",
}

EXCLUDE_FILES = {
    "package-lock.json",
    "audit_ledger.db",
    "skills-lock.json",
    "BACKEND_AND_CORE_CODEBASE.md",
    "FRONTEND_CODEBASE.md",
    "COMPLETE_CODEBASE.md",
    "HYPERQDS_MASTER_CONTEXT.md",
}

def is_allowed_file(p: Path) -> bool:
    if not p.is_file():
        return False
    parts = set(p.parts)
    if parts & EXCLUDE_DIRS:
        return False
    if p.name in EXCLUDE_FILES:
        return False
    # Avoid SQLite binaries or temporary log files
    if p.suffix in {".db", ".sqlite", ".log", ".pyc", ".png", ".jpg", ".webp", ".ico"}:
        return False
    return True

def get_lang(file_path: Path) -> str:
    ext = file_path.suffix.lstrip(".").lower()
    mapping = {
        "py": "python",
        "js": "javascript",
        "jsx": "jsx",
        "ts": "typescript",
        "tsx": "tsx",
        "css": "css",
        "html": "html",
        "json": "json",
        "md": "markdown",
        "yml": "yaml",
        "yaml": "yaml",
        "sh": "bash",
        "bat": "batch",
        "ps1": "powershell",
        "dockerfile": "dockerfile",
    }
    if file_path.name.lower().startswith("dockerfile"):
        return "dockerfile"
    return mapping.get(ext, "")

def write_bundle(output_file: Path, title: str, description: str, files: list[Path]):
    print(f"Bundling {len(files)} files into {output_file.name}...")
    with open(output_file, "w", encoding="utf-8") as out:
        out.write(f"# {title}\n\n")
        out.write(f"{description}\n\n")
        out.write("Each file is enclosed within standard `<file path=\"...\">` tags for direct, unambiguous LLM ingestion.\n\n")
        
        out.write("## Table of Contents\n\n")
        for f in files:
            rel = f.relative_to(REPO_ROOT).as_posix()
            size_kb = f.stat().st_size / 1024
            anchor = f"file-{rel.replace('/', '-').replace('.', '-').replace('_', '-')}"
            out.write(f"- [{rel}](#{anchor}) ({size_kb:.1f} KB)\n")
        out.write("\n---\n\n")
        
        for f in files:
            rel = f.relative_to(REPO_ROOT).as_posix()
            anchor = f"file-{rel.replace('/', '-').replace('.', '-').replace('_', '-')}"
            lang = get_lang(f)
            size_kb = f.stat().st_size / 1024
            
            out.write(f"<div id=\"{anchor}\"></div>\n\n")
            out.write(f"### File: `{rel}` ({size_kb:.1f} KB)\n\n")
            out.write(f"<file path=\"{rel}\">\n```{lang}\n")
            try:
                content = f.read_text(encoding="utf-8")
            except Exception:
                try:
                    content = f.read_text(encoding="latin-1")
                except Exception as e:
                    content = f"# [Error reading file: {e}]"
            
            out.write(content)
            if not content.endswith("\n"):
                out.write("\n")
            out.write(f"```\n</file>\n\n---\n\n")

    size_mb = output_file.stat().st_size / (1024 * 1024)
    print(f"-> Successfully generated {output_file.name}: {len(files)} files, {size_mb:.2f} MB")

def main():
    all_files = []
    for p in REPO_ROOT.rglob("*"):
        if is_allowed_file(p):
            all_files.append(p)
    
    all_files.sort(key=lambda x: x.relative_to(REPO_ROOT).as_posix())

    # Categorize
    frontend_files = [f for f in all_files if "dashboard" in f.parts]
    backend_and_core = [f for f in all_files if "dashboard" not in f.parts]

    # 1. Backend & Core Bundle
    write_bundle(
        output_file=REPO_ROOT / "BACKEND_AND_CORE_CODEBASE.md",
        title="HyperQDS — Quantum Threat Detection: Backend & Core Physics Codebase",
        description=(
            "This bundle contains the complete core implementation of the Quantum Digital Signatures (QDS) "
            "threat detection framework, including: Quantum Teleportation primitives (Qiskit circuits), "
            "Key Distribution, Adversarial Attack Simulations (Forgery, Impersonation, Replay, Channel Noise), "
            "Physics-Based Anomaly Detection (QBER, Chi-Squared Born tests, Holevo bounds), "
            "FastAPI REST API, Tamper-Proof Cryptographic Audit Ledger, Test Suites, Math Specifications, and Docker deployment."
        ),
        files=backend_and_core
    )

    # 2. Frontend Bundle
    write_bundle(
        output_file=REPO_ROOT / "FRONTEND_CODEBASE.md",
        title="HyperQDS — Interactive Dashboard: Frontend Codebase Bundle",
        description=(
            "This bundle contains the complete React 18 + Vite dashboard codebase: "
            "Interactive Three.js 3D Quantum Teleportation Engine, 3D Attack Architecture, "
            "Bloch Sphere state visualizers, Recharts QBER/Confidence analytics, "
            "Audit Ledger viewer, and quantum dark-mode glassmorphic styling."
        ),
        files=frontend_files
    )

    # 3. Complete Monolithic Codebase
    write_bundle(
        output_file=REPO_ROOT / "COMPLETE_CODEBASE.md",
        title="HyperQDS — Complete Monolithic System Codebase (Full Stack)",
        description=(
            "This document contains the entire HyperQDS repository across both frontend and backend layers. "
            "Use this bundle for full-system analysis, end-to-end trace queries, and comprehensive auditing."
        ),
        files=all_files
    )

    print("\nAll codebase bundles generated successfully!")

if __name__ == "__main__":
    main()
