
## Standing Session Protocol

This protocol is MANDATORY for every session in this project. Follow it without exception.

### Session Start

1. **Check claude-mem context first.** Use the `session_start_context` MCP tool or read the injected `<claude-mem-context>` block in GEMINI.md. Do NOT ask the user to re-explain project state, prior decisions, or what was being worked on. If the user asks "what were we doing last time?", check claude-mem before ever answering "I don't know."

### During the Session

2. **Capture decisions naturally.** When you make a significant decision, fix a bug, or discover something important about this codebase, use claude-mem's MCP tools to record it. Don't wait for the user to ask — let memory capture happen proactively.

### Session End

3. **Summarize what changed.** Before the session closes, ensure any architectural decisions, patterns discovered, or gotchas found are captured in claude-mem observations so the next session has full context.
