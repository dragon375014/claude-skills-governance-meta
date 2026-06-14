---
name: trace-lock-modify
description: "Use when modifying any file listed in your project's data-source registry under 'Critical Traces' (the Anchor SSOT / trace nodes / entry points), OR when adding a new reader that depends on a trace anchor (even read-only). Cross-layer trace protection: before touching anything, list the full chain, pin current behavior with the trace test, re-run after editing, and update the registry's Last-edited. Locks out the 'changed A, forgot B' class of bug."
---

# Skill: Trace-Lock Pre-Modification Audit Checklist

> **This skill is the execution handbook for the "Trace Lock" pattern.**
>
> Conceptual background: [`../../concepts/trace-surface-spirit.md`](../../concepts/trace-surface-spirit.md) (why a read-only new reader still counts).
>
> Registry: your project's data-source registry > "Critical Traces" section. This repo ships a starting template: [`../../../templates/data-source-registry-template.md`](../../../templates/data-source-registry-template.md).
>
> Companion CLAUDE.md rule template: [`../../claude-md-rule-templates/rule-29-trace-lock.md`](../../claude-md-rule-templates/rule-29-trace-lock.md).

**What a "trace" is**: a cross-layer dependency chain — a value flows from a write side, through middleware, to a render side, and one end silently breaks the other if they drift. The **anchor SSOT** is the source file of the chain; downstream **nodes** must read it rather than recompute. A **trace test** pins the current behavior so a future edit can't silently change it.

---

## When to trigger (strict)

Trigger this skill before the user modifies one of the files registered under Critical Traces (or an equivalent file found by grepping the registry).

### Registered Critical Traces and their affected files

> **TEMPLATE**: this section is filled from your project's registry. The block below is a placeholder shape. Replace with your real traces.

**T-NNN: {trace title — e.g. "upstream stock quantity → orderable count"}**
- Anchor SSOT: `{path to the single business-rules module, e.g. inventoryUnit.js}`
- Trace nodes:
  - `{a migration that syncs a derived column}`
  - `{the derived column, e.g. items.stock_available}`
  - `{a composable that reads it, e.g. useItems.js}`
  - `{a modal that renders it, e.g. ItemVariantModal.vue}`
  - `{a point-of-sale / entry page, e.g. PointOfSale.vue}`

**New traces added later automatically join this trigger scope (the skill greps the registry).**

### ⚠️ Also triggers (trace-surface spirit)

A trace-lock rule literally reads "before modifying any node on a critical trace" — a write-side reading. But its **spirit** ("treat cross-layer dependency as an asset") **also covers adding a new reader**:

- **Adding a reader that depends on the anchor (even read-only)** = a new downstream node = the trace surface area expands
- When the anchor changes later, the new reader breaks too — same risk as modifying an existing node
- Even read-only, dispatch this skill: at minimum run a registry note (Step 5 — register the new reader as a "Known reader" of the trace block), not the full 5 steps

**Real case**: a new read-only RPC `fn_get_low_stock` reads `upstream_stock.quantity` — a downstream node of a `T-NNN` stock-availability trace. The original judgment "read-only = doesn't apply" was the only miss in an otherwise strong report. Full case: [`../architecture-completeness-guardian/references/governance-meta-context.md`](../architecture-completeness-guardian/references/governance-meta-context.md) §3.

### Does NOT trigger

- pure UI changes (CSS / copy, no logic)
- a general bug fix unrelated to trace nodes (editing some other component)
- adding a comment / log line
- test changes that aren't trace tests
- **a new file that imports no anchor SSOT** (no trace-surface expansion)

---

## The 5 steps before editing a trace node

### Step 1: confirm which trace the file belongs to
- open your data-source registry
- find the `## Critical Traces` section
- grep the file path to find its `### T-NNN` block

```
grep -B 2 -A 20 "{anchor file basename}" {registry path}
```

If the file is **in no trace** but you judge it "should" belong to a cross-layer chain → **the registry is missing an entry**; tell the user and register it before editing.

### Step 2: list the full chain for the user
Don't skip this. Even if you (the AI) already know, **the user may not remember at the start of a session**. Explicit format:

> "This change affects trace T-NNN. Full chain:
> 1. {node 1}
> 2. {node 2}
> ...
> SSOT anchor: {anchor path}
> Trace test: {test path}"

### Step 3: run the current trace test (baseline)
**Run it before editing**, record the baseline:

```
{your test runner} {trace test glob for T-NNN}
```

Confirm every assertion passes. If it's **already broken**, stop and tell the user: "the trace test was red before my change — that's a separate bug. Fix it first, or accept a known-broken edit?"

### Step 4: re-run the trace test after editing
- ✅ all green → continue
- ❌ red → **do not continue**; diagnose:
  - (a) test is stale, needs updating (rare, confirm intent)
  - (b) you really broke it → fix
  - (c) the change affects trace behavior the test doesn't cover → add a case, re-run

### Step 5: update the registry "Last edited"
After the edit is done and the trace test is green:
- open the registry's T-NNN block
- update `**Last edited**: YYYY-MM-DD`
- if the change altered the trace contract (added a node, changed the anchor) → also sync the Trace-nodes / Anchor-SSOT fields

---

## Common scenario mappings

### Scenario A: "change an RPC signature / migration trigger"
- Step 1 grep the registry for which trace uses that DB object
- edit DB → run the trace test → check it's still green (the trace test only tests pure functions; DB behavior is verified separately)
- if it's a DB-behavior change, add a SQL smoke test, list it under the trace block's Trace-nodes

### Scenario B: "add a new entry point" (e.g. a mobile entry also uses the same chain)
- open the registry T-NNN
- add `**Entry C (mobile)**: ...` under Trace nodes
- add a cross-entry consistency case to the trace test (confirm the new entry takes the same path)
- update Last edited

### Scenario C: "add a new SSOT field / new variant spec"
- e.g. add a new variant
- add the mapping in the anchor module
- add the matching test case to the trace test
- update the registry's spec-mapping section
- update Last edited

### Scenario D: "add a new trace" (the most important scenario — building a new module)
- add `### T-{next_id}: title` to the registry, filling the fields per the template
- create a trace test (at least 3 describe blocks: contract / pinning case / edge cases)
- run your defensive guard to confirm the two trace rules pass
- this skill auto-includes the new trace (it greps the registry dynamically)

---

## Anti-Rationalization

> The left column is the in-the-moment **thought** you (the AI) are most likely to
> generate to skip this audit; the right column is the rebuttal. The moment you catch
> yourself thinking a left-column line, stop and run the 5 steps.

| The thought you'll have | Rebuttal |
|---|---|
| "It's read-only — I only read, I don't write, so I'm not modifying a trace node." | Wrong. Adding a reader that depends on the anchor expands the trace surface; when the anchor changes later, your read-only reader breaks too. See [`trace-surface-spirit.md`](../../concepts/trace-surface-spirit.md). Read-only still runs Step 5 (register yourself as a Known reader). |
| "I've edited this trace a few times this session, I know the blast radius — no need to run the test." | The trace test exists precisely so you don't rely on memory. Model memory is as unreliable as human memory. The more familiar it feels, the more that familiarity is the precursor to a miss. |
| "This is a pure refactor / rename, behavior doesn't change, so skip the trace test." | Refactors break traces most easily: changing an import path, extracting a helper, reordering params — any of them can make the render side silently receive null. A refactor isn't an exemption; it needs the test more. |
| "The user only asked me to fix this bug, not to run trace-lock — doing it unprompted is out of scope." | Trace-lock is an unconditional pre-gate, not an à-la-carte item the user orders each time. Scope discipline means "don't touch unrelated things", not "don't run the verification you're supposed to run." |
| "The test went red, but I'm sure my change is right — the test is stale, I'll just change the test." | Highest-risk move. Changing the test unilaterally breaks the old contract (Chesterton's Fence). Get the user's explicit consent, and note in the commit "recalibrated T-NNN; old behavior at commit XXX". |
| "I'll finish the feature first and update the registry Last-edited / add the test at the end." | "At the end" is the load-bearing phrase — there is no end. The registry note goes in the same commit as the change, or the next session sees "registry says untouched, but the code changed." |

## Anti-patterns (structural — a defensive guard blocks these)

❌ declaring a trace in the registry **but writing no trace test**
→ A defensive guard should block this. Registry and test must come in pairs.

❌ a trace test that **doesn't import the anchor SSOT**
→ A defensive guard should block this. If the test doesn't import the anchor, it tests a *copy*, not the SSOT, and won't see future anchor changes.

---

## Handoff for the next AI (including yourself)

If you're seeing this conversation from the start: you've already read CLAUDE.md, where the trace-lock rule pointed you here.

If you're picking up mid-stream, do three things first:
1. read [`../../concepts/trace-surface-spirit.md`](../../concepts/trace-surface-spirit.md) (the *why*)
2. read your data-source registry > Critical Traces section (the *what*)
3. read this skill (the *how*)

Then start any modification.

---

## Meta-rule: maintaining this skill

- This skill should **not** hardcode per-trace logic. Its trigger scope is decided by "grep the registry" dynamically.
- When adding a trace, **only update the registry**; this skill auto-includes the new trace (unless the new trace needs a special audit step, in which case update this skill).
- If one trace is special enough to need custom audit steps → open a dedicated sub-skill (e.g. `trace-lock-T-NNN-payment-audit`); the main skill cross-links it on trigger.
