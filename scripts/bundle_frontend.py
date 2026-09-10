"""
bundle_frontend.py
==================
Generates a structured, single-file Markdown bundle of the entire frontend codebase
formatted with XML `<file path="...">` tags optimized for Claude / LLM consumption.
"""

from pathlib import Path

dashboard_dir = Path("dashboard")
exclude_dirs = {"node_modules", "dist", ".git"}
exclude_files = {"package-lock.json"}

files = []
for p in sorted(dashboard_dir.rglob("*")):
    if p.is_file():
        parts = set(p.parts)
        if parts & exclude_dirs:
            continue
        if p.name in exclude_files:
            continue
        files.append(p)

output_file = Path("FRONTEND_CODEBASE.md")
with open(output_file, "w", encoding="utf-8") as out:
    out.write("# QDS Threat Detection Framework — Frontend Codebase Bundle\n\n")
    out.write("This document contains the complete frontend codebase for the React + Vite dashboard.\n")
    out.write("Each file is enclosed within standard `<file path=\"...\">` tags for direct ingestion by Claude.\n\n")
    
    out.write("## Architectural Overview\n")
    out.write("- **Framework**: React 18.3 + Vite 5.4\n")
    out.write("- **3D Graphics & Physics**: Three.js 0.185 (Bloch Sphere, 3D Network Topology, Teleportation Engine, Cluster Visualizer)\n")
    out.write("- **Charts**: Recharts 3.10\n")
    out.write("- **Styling**: Vanilla CSS (glassmorphism, quantum dark theme, custom responsive grid, 3D card tilt)\n")
    out.write("- **API Client**: Fetch wrapper with auto baseURL detection, error resilience, and CORS headers\n\n")

    out.write("## Table of Contents\n\n")
    for f in files:
        rel = f.as_posix()
        size_kb = f.stat().st_size / 1024
        anchor = f"file-{rel.replace('/', '-').replace('.', '-')}"
        out.write(f"- [{rel}](#{anchor}) ({size_kb:.1f} KB)\n")
    out.write("\n---\n\n")
    
    for f in files:
        rel = f.as_posix()
        anchor = f"file-{rel.replace('/', '-').replace('.', '-')}"
        ext = f.suffix.lstrip(".")
        # Markdown language identifier
        lang = "jsx" if ext in {"jsx", "js"} else "css" if ext == "css" else "html" if ext == "html" else "json" if ext == "json" else ""
        
        out.write(f"<div id=\"{anchor}\"></div>\n\n")
        out.write(f"### File: `{rel}`\n\n")
        out.write(f"<file path=\"{rel}\">\n```{lang}\n")
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            content = f.read_text(encoding="latin-1")
        out.write(content)
        if not content.endswith("\n"):
            out.write("\n")
        out.write(f"```\n</file>\n\n---\n\n")

print(f"Successfully bundled {len(files)} files into {output_file.resolve()} (Size: {output_file.stat().st_size / 1024:.1f} KB)")
