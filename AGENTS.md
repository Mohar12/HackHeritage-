# HackHeritage4 — Agent Configuration

## Installed Extensions

| Extension | Purpose | Status |
|-----------|---------|--------|
| **Ponytail** | Lean-coding ruleset (token-efficient code generation) | ✅ Active |
| **RTK** | Token-saving command proxy | ✅ Active |
| **claude-mem** | Persistent memory across sessions (MCP + hooks) | ✅ Active |
| **antislop** | Anti-slop filter plugin (6 skills, always-on core) | ✅ Active |
| **scroll-craft** | Scroll-driven landing page skill | ✅ Active |
| **ui-ux-pro-max** | UI/UX design intelligence | ✅ Active |

## Session Protocol

Every session MUST follow the Standing Session Protocol defined in `.agents/rules/session-protocol.md`.

**Quick reference:**
1. Start → Check claude-mem context (don't ask the user what happened last time)
2. Work → Capture decisions/bugs/discoveries into claude-mem as you go
3. End → Summarize changes into claude-mem

## Frontend Precedence

All frontend tasks follow the 4-step order in `.agents/rules/frontend-precedence.md`:
1. Design system (ui-ux-pro-max)
2. Interaction & motion (scroll-craft) — only for scroll-driven pages
3. Build
4. Anti-slop review pass (mandatory, overrides Steps 1–3 on conflict)

## Rules

Rules are loaded from `.agents/rules/`:
- `session-protocol.md` — Memory workflow for every session
- `frontend-precedence.md` — 4-step frontend build order
- `ponytail.md` — Lean-coding generation rules
- `antigravity-rtk-rules.md` — RTK command proxy rules

## Memory Infrastructure

- **Worker daemon**: `bun` process on `localhost:37777`
- **MCP server**: `mcp-server.cjs` (registered in `~/.gemini/config/mcp_config.json` and `~/.gemini/antigravity/mcp_config.json`)
- **Hooks**: 8 lifecycle hooks in `~/.gemini/settings.json` (SessionStart, BeforeAgent, AfterAgent, BeforeTool, AfterTool, Notification, PreCompress, SessionEnd)
- **Context injection**: `~/.gemini/GEMINI.md` contains `<claude-mem-context>` block

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

