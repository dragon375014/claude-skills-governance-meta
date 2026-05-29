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

## Anti-patterns (avoid)

❌ "I've changed it a few times, I know the blast radius" → **skipping the trace test**
→ No. The trace test exists to pin current behavior; **human memory is unreliable**, and next time you'll have forgotten.

❌ "the test failed but I've verified the logic is right" → **changing the test instead of the logic**
→ High-risk. Changing the test breaks the old contract. **Get the user's explicit consent**, and note in the commit message "recalibrated the T-NNN contract; old behavior at commit XXX".

❌ "this is a pure refactor, it won't change behavior" → **so skip the trace test**
→ Refactors break traces most easily (rename, extract helper, change import path). **Refactors need it more.**

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
