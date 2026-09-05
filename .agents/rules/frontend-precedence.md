
## Frontend Task Precedence

This ordering is MANDATORY for every frontend task. No step may be skipped or reordered.

### Step 1 — Design System (ui-ux-pro-max)

Decide the design direction first: palette, typography, layout system, component patterns. This sets the visual language everything else builds on. Read the ui-ux-pro-max SKILL.md before making any visual decisions.

### Step 2 — Interaction & Motion (scroll-craft)

If the task involves a scroll-driven or immersive page, apply scroll-craft's act-sequence planning (pin/flow/pan states, depth planes, signature move) on top of the design system from Step 1. Check EXAMPLES.md and the uniqueness gate before finalizing structure — a new build must differ from prior scroll-craft builds on at least 4 of 6 dimensions (grammar, nav treatment, hero device, act-sequence shape, close pattern, signature move).

**Skip this step entirely** for non-scroll-driven UI (forms, dashboards, standard app screens).

### Step 3 — Build

Implement using the choices locked in Steps 1–2. Don't second-guess design or motion decisions mid-build — those were already decided upstream.

### Step 4 — Anti-slop Review Pass (MANDATORY, runs last, every time)

Before considering any frontend output done, run it through antislop's rules (**all six skills**, not just core): reject generic AI-UI patterns, AI-sounding copy, accessibility failures, and AI-style code comments.

**This step overrides Steps 1–3 where they conflict.** If ui-ux-pro-max suggests a pattern antislop flags as slop, antislop wins and the design choice gets revised, not shipped as-is.

### Conflict Resolution

- antislop > ui-ux-pro-max
- antislop > scroll-craft
- antislop > any upstream skill that produced the output
- Never skip Step 4
- Never let Step 1 or Step 2's suggestions bypass the antislop filter
