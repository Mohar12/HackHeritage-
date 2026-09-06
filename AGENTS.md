# Antigravity Stack Configuration & Operating Rules

## Installed Stack Components

| Component | Purpose | Status | Verification |
|---|---|---|---|
| **Ponytail** | Lean-coding ruleset (token-efficient, YAGNI, root cause fixes) | Active | `.agents/rules/ponytail.md` |
| **RTK** | Rust Token Killer command proxy | Active | `.agents/rules/antigravity-rtk-rules.md`, `rtk` binary on PATH |
| **claude-mem** | Persistent session memory & observations | Active | 8 lifecycle hooks in `~/.gemini/settings.json`, MCP registered in both `mcp_config.json` locations, worker running at `http://127.0.0.1:37777` |
| **ui-ux-pro-max** | Design system intelligence (palettes, typography, stacks) | Active | CLI installed, `.agents/skills/ui-ux-pro-max/SKILL.md` |
| **scroll-craft** | Scroll-driven website design & motion skill | Active | `.agent/skills/scrollcraft/` & `.agents/skills/scrollcraft/` |
| **anti-slop** | 6 anti-genericness filters (core filter, UI, copy, human, mobile, code) | Active | `.agents/rules/antislop.md` + all 6 skills in `.agents/skills/` |

---

## Stack Operating Rules

### MEMORY & SESSION START
- At the start of every session, check claude-mem's injected context before asking me to re-explain project state. If I ask "what were we doing last time," check claude-mem's context/dashboard before ever saying "I don't know."
- When you make a significant decision, fix a bug, or discover something important, let claude-mem capture it naturally — don't wait for me to ask, don't announce "saving this."

### CODE STYLE
- Ponytail governs all code you write: favor the smallest, simplest solution that works. If a plan feels bloated, re-answer it under ponytail explicitly.
- RTK runs silently in the background rewriting shell commands for token efficiency — no action needed from you, just don't bypass it by calling raw commands when rtk equivalents exist.

### FRONTEND WORK — PRECEDENCE ORDER (mandatory, in this sequence)
1. **Design system first (ui-ux-pro-max)**: lock palette, typography, layout, component patterns before building anything.
2. **Interaction/motion (scroll-craft)**: only for scroll-driven/immersive pages, applied on top of step 1's design choices. Check the uniqueness gate — new builds must differ from prior scroll-craft builds on 4+ of 6 dimensions (grammar, nav, hero device, act-sequence, close pattern, signature move). Skip for standard app UI (forms, dashboards).
3. **Build using the locked decisions from steps 1-2**. Don't re-litigate design or motion mid-build.
4. **Anti-slop review — MANDATORY, runs last, every time, no exceptions**. Checks generic AI-UI patterns, AI-sounding copy, accessibility failures, and AI-style code comments across all six antislop skills. Anti-slop has veto power over steps 1-3 — if a design or motion choice gets flagged, it gets revised, not shipped.

Never skip step 4. Never let a "design" skill's suggestion bypass the antislop filter just because it came from a different upstream skill.
