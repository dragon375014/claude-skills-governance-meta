# Data-Source Registry (template)

> Copy this to your project (e.g. `docs/data-source-registry.md`) and fill it in. It is the single index of "where does this value live, and who depends on it." The [`trace-lock-modify`](../scaffold/skills/trace-lock-modify/SKILL.md) skill greps this file to decide its trigger scope, so its structure matters: keep the field names below.

This template ships only the **Critical Traces** section, which the trace-lock pattern needs. A full registry usually also lists SSOT fields, orphan configs, etc. — add those sections as your project grows.

---

## Critical Traces

A **trace** is a cross-layer dependency chain: a value written in one place, transformed in the middle, rendered at the end, where changing one node silently breaks another. Each trace gets a block below + a matching trace test.

Trace IDs are `T-` + a sequence number you assign (`T-1`, `T-2`, …) or a short slug (`T-stock-availability`). Avoid reusing IDs. New traces append; nothing is renumbered.

### Block template — copy for each new trace

```markdown
### T-<id>: <one-line title of what flows from where to where>

- **Anchor SSOT**: `<path to the single module/column/RPC that owns the value>`
- **Trace nodes** (the chain, write → middleware → render):
  - `<node 1 — e.g. the migration / trigger that writes a derived column>`
  - `<node 2 — e.g. the derived column itself>`
  - `<node 3 — e.g. the composable / query that reads it>`
  - `<node 4 — e.g. the component that renders it>`
- **Entry points** (every place that initiates this flow):
  - `<Entry A — e.g. the main page>`
  - `<Entry B — e.g. mobile / a second UI>`
- **Known readers** (anything that READS the anchor, including read-only — keep this honest; see trace-surface-spirit):
  - `<reader 1 — what it reads, why it depends on the anchor>`
- **Trace test**: `<path to the test that pins this trace's current behavior>`
- **Last edited**: YYYY-MM-DD
- **Notes**: `<spec mappings, gotchas, the incident that created this trace>`
```

---

## Worked example (sanitized)

### T-stock-availability: upstream stock quantity → orderable variant count

- **Anchor SSOT**: `src/lib/business-rules/inventoryUnit.js` (converts a raw quantity into an orderable count per variant spec)
- **Trace nodes**:
  - `migrations/NNN_sync_stock_available.sql` (trigger that recomputes the derived column)
  - `items.stock_available` (the derived column)
  - `src/composables/useItems.js` (reads + merges the derived value)
  - `src/components/ItemVariantModal.vue` (renders the orderable count)
  - `src/pages/PointOfSale.vue` (cart-side safety check)
- **Entry points**:
  - Entry A — the storefront item page
  - Entry B — the point-of-sale page
- **Known readers**:
  - `fn_get_low_stock` (read-only alert RPC) — reads `upstream_stock.quantity`, which the anchor's computation depends on; registered here per the trace-surface spirit. When the anchor's unit/rounding changes, re-evaluate this reader.
- **Trace test**: `src/__tests__/traces/T-stock-availability.trace.test.js`
- **Last edited**: 2026-01-01
- **Notes**: created after a "shows sold-out to logged-out users while admin sees stock" incident — the frontend was overwriting the DB's computed value. See the spread-overwrites-ssot anti-pattern.

---

## The two governance guards that keep this honest

Without enforcement, a registry rots: traces get declared but never tested, or tested against a stale copy. Two defensive guard rules (implement in your [`governance-guard.mjs`](../governance-guard-template.mjs)) prevent that:

1. **`require-trace-test-for-each-registered-trace`** — every `### T-<id>` block in this file has a matching `*.trace.test.js`. A declared-but-untested trace is a lie.
2. **`require-trace-test-imports-anchor`** — every trace test imports its block's Anchor SSOT. A test that doesn't import the anchor tests a *copy* and won't see future anchor changes.

Both are BLOCKER-severity (they fail the build), because a false positive is impossible — either the test file exists / imports the anchor, or it doesn't.

---

## Related

- [`../scaffold/skills/trace-lock-modify/SKILL.md`](../scaffold/skills/trace-lock-modify/SKILL.md) — the 5-step audit that runs before editing any node here
- [`../scaffold/concepts/trace-surface-spirit.md`](../scaffold/concepts/trace-surface-spirit.md) — why "Known readers" must include read-only readers
- [`../governance-guard-template.mjs`](../governance-guard-template.mjs) — where the two guard rules live
