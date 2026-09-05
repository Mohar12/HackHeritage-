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
- **MCP server**: `mcp-server.cjs` (registered in `~/.gemini/config/mcp_config.json`)
- **Hooks**: 7 lifecycle hooks in `~/.gemini/settings.json` (SessionStart, BeforeAgent, AfterAgent, BeforeTool, AfterTool, Notification, PreCompress)
- **Context injection**: `~/.gemini/GEMINI.md` contains `<claude-mem-context>` block
