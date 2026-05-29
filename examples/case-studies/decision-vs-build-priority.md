# Case study: "figure out X + maybe add Y" caught one half, dropped the other

> One of three incidents that shaped the `architecture-completeness-guardian` skill. The pattern: a mixed declaration (a decision question + a build intent) gets caught by the decision-handling rule and dropped by the gate.

---

## Context

A project had both an architecture-completeness gate and a requirements-review SOP (a checklist for "should we build this at all?" decisions). The priority between them when a request contained *both* shapes was never documented.

## The declaration

> "I want to figure out whether the upstream-stock → processed-stock → item chain has problems, and while I'm at it, decide whether to add a low-stock alert email."

Two things at once: a reverse audit of an existing chain, **and** a should-we-build-it question about a new alert.

## The wrong response

The agent caught the decision half. It ran the requirements-review SOP and asked a 4-option clarifying question ("what's prompting the chain question?") — and **never triggered the gate** for the reverse-audit half.

## Root cause

- "decide whether to add a low-stock alert" = a **decision** question → triggers the requirements-review SOP. Correct, but incomplete.
- "figure out whether the chain has problems" = a **reverse-audit** declaration → should trigger the gate. Missed.
- With no documented priority between the two rules, the agent latched onto one and dropped the other. A mixed request was treated as a single-shape request.

## The correct response

The gate takes priority; the requirements SOP becomes a **sub-task inside the gate's dispatch**, not a replacement.

- Part 0.5: the declaration mixes decision + build language → gate fires first; requirements-review SOP is pulled in as a Part-2 sub-task.
- Part 1: **R0 (sweep the 3-layer stock chain) + S4 (a new setting: alert threshold + notification)** — mixed.
- Part 2: dispatch the cross-layer audit + the double-deduction check + the requirements SOP (for the decision layer) + the manual-trigger rule (a user-initiated alert must bypass quiet-hours / rate limits).
- Parts 3–4: still run — the 5-layer scan of the chain, and placement of the new alert setting (production > stock settings, not a Settings tab).

## The fix that went into the skill

A "Part 0.5: priority vs. a requirements-review rule" section, with a rule of thumb:

> If the declaration contains *any* concrete build intent ("want to build / add / extract / unify / figure out / clean up") → the gate fires first; the requirements SOP is a sub-task, not a substitute.

## Regression guard

A future agent reading the skill sees: **"figure out X + also decide whether to add Y" → the gate fires first, the requirements checklist is a sub-task.** Mixed-shape requests must satisfy both rules, not whichever one matched first.

## Generalize to your project

- When two rules can both claim a request, document the priority *and* whether one becomes a sub-task of the other. "They're mutually exclusive" is usually wrong — most real requests are mixed.
- The tell for a build intent hiding inside a decision question is a verb like "figure out / clean up / unify" sitting next to "should we". When you see both, run the gate.
- See [`audit-first-vs-architecture-gate-boundary.md`](../../scaffold/concepts/audit-first-vs-architecture-gate-boundary.md) for the general shape of two-cautious-rules collisions.
