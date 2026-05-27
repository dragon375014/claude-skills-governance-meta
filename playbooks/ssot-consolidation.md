# Playbook: SSOT Consolidation

A 5-step procedure for collapsing a piece of business data that has scattered across multiple places into a single source of truth — and locking it there.

Use when you discover the same value being computed, queried, or labeled in three or more places, with the computations drifting from each other.

---

## When to Run This Playbook

Trigger signals:

- Same monetary amount displayed differently on two pages
- The same enum / status / role string compared against in many files via `=== 'admin'` / `=== 'paid'`
- Three queries against the same table that aggregate the same field with different `WHERE` clauses
- Duplicated boilerplate at the top of every API handler (CORS headers, auth checks, error wrapping)
- A code review where the reviewer asks "wait, which one of these is the real total?"

If you see one or two scattered queries, just inline-fix them. The playbook is for cases with **three or more drift points** — that's when the consolidation cost is justified.

---

## Step 1 — Inventory

Goal: produce an exhaustive list of every site that touches this concept.

Use grep aggressively:

```bash
# Find all places computing or comparing this value
grep -rn "<field_name>" src/ --include="*.{js,ts,vue,sql}"
grep -rn "<table>\." src/ --include="*.{js,ts,vue,sql}"
grep -rn "=== '<enum_value>'" src/

# Find all RPCs / queries that return this field
grep -rn "select.*<field>" src/
```

Record findings in a table:

| File | Line | What it does | What it assumes |
|---|---|---|---|
| `src/pages/Catalog.vue` | 42 | Sums `qty * price` | Each row has `price` populated |
| `src/composables/useCart.js` | 71 | Sums `unit_price * count` | Each row has `unit_price` (different field name) |
| `api/order.handler.js` | 18 | Reads `total` from DB | DB total is authoritative |

The drift surfaces when columns of the table disagree. In the example above, three call sites disagree on what the "real" field name is.

**Stop here if the table has fewer than three rows.** The playbook overhead isn't justified for two-site drift.

---

## Step 2 — Choose the SSOT Layer

Decide where the truth will live. Four candidates:

| Layer | When to choose | Trade-off |
|---|---|---|
| **Database column** (trigger-maintained or computed) | Value is derivable from DB state alone, must survive bypass of application code | Migration cost is high; once stable, very durable |
| **Stored procedure / RPC** | Computation crosses tables; must run inside a transaction | Couples the computation to one tech stack (Postgres) |
| **Single helper function** in shared code | Computation is pure (no I/O); needs to run identically in frontend, backend, and tests | Requires discipline — easy to bypass with copy-paste |
| **Materialized view / read model** | Aggregation is expensive; read-heavy, write-rare | Needs refresh strategy; eventual consistency |

Don't try to make every concept use the same layer. Different concepts have different shapes. The decision is per-concept.

**Heuristic**: if the value is read by both frontend and backend (e.g., display total + audit log), put it in DB or RPC. If only read by frontend (e.g., a UI label derived from a status enum), put it in a frontend helper.

---

## Step 3 — Migrate One Layer at a Time

Refactor sequentially, not all at once. The order:

### 3a. Define the canonical helper / column / RPC

Write the single source of truth. Add tests for it. Document its contract.

```js
// src/lib/business-rules/computeOrderTotal.js
export function computeOrderTotal(items, { discount = 0 } = {}) {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
  return Math.max(0, subtotal - discount)
}
```

### 3b. Migrate one call site to use the helper

Pick the call site with the highest read traffic first — proving the helper works in the hot path catches contract problems early.

```js
// Before
const total = order.items.reduce((s, i) => s + i.qty * i.price, 0)

// After
import { computeOrderTotal } from '@/lib/business-rules/computeOrderTotal'
const total = computeOrderTotal(order.items)
```

### 3c. Run the existing test suite

If tests break, the old call site had subtly different semantics. Decide which semantics is correct (usually the helper's), then either fix the test or fix the helper.

### 3d. Repeat 3b–3c for each call site

Don't batch. Each call site migration is a separate commit. If anything regresses, you can revert that one commit without losing the others.

### 3e. Last call site migrated → delete the dead code

Search for any remaining inline reduce / map / compare. There should be none. If there is, you missed a call site in step 1.

---

## Step 4 — Contract Test

Write a test that asserts the helper's contract. The test should fail loudly if anyone changes the contract without updating callers.

```js
// __tests__/computeOrderTotal.contract.test.js
import { computeOrderTotal } from '@/lib/business-rules/computeOrderTotal'

describe('computeOrderTotal contract', () => {
  it('sums qty * unit_price across items', () => {
    expect(computeOrderTotal([
      { qty: 2, unit_price: 100 },
      { qty: 3, unit_price: 50 },
    ])).toBe(350)
  })

  it('subtracts discount', () => {
    expect(computeOrderTotal([
      { qty: 1, unit_price: 100 },
    ], { discount: 20 })).toBe(80)
  })

  it('never returns negative', () => {
    expect(computeOrderTotal([
      { qty: 1, unit_price: 10 },
    ], { discount: 999 })).toBe(0)
  })

  it('handles empty array', () => {
    expect(computeOrderTotal([])).toBe(0)
  })
})
```

The contract test serves three purposes:

1. **Living documentation** — anyone reading the helper sees its expected behavior
2. **Refactor safety** — changes to helper internals can be validated against fixed contract
3. **Regression catcher** — if a future PR breaks the contract, CI fails immediately

---

## Step 5 — Add a Defensive Governance Rule

Lock the consolidation in place. Without a rule, the pattern will drift back within months as new features are added by developers who don't know the helper exists.

```js
// In governance-guard.mjs
{
  name: 'use-canonical-order-total-helper',
  description: 'Order total must go through computeOrderTotal — no inline reduce',
  rootDir: 'src',
  include: /\.(js|ts|vue)$/,
  exclude: /computeOrderTotal\.js|__tests__|\.spec\./,
  patterns: [
    {
      // Catch: items.reduce((s, i) => s + i.qty * i.unit_price, 0)
      regex: /\.reduce\([^)]*?\b(?:qty|quantity|count)\s*\*\s*(?:unit_price|price)/g,
      message: 'Inline order total computation. Use computeOrderTotal() from @/lib/business-rules/.',
    },
  ],
}
```

The rule excludes the helper itself (otherwise the helper can't use the pattern) and excludes tests (where the pattern may legitimately appear as fixture data).

---

## Checklist

After running the playbook, you should have:

- [ ] An inventory table listing every old call site
- [ ] A single canonical helper / column / RPC
- [ ] Every old call site migrated to use the canonical one (no exceptions)
- [ ] A contract test covering the helper's intended behavior
- [ ] A defensive governance rule blocking reintroduction
- [ ] A short doc (or commit message) explaining the consolidation, linkable from later code review comments

If any of these is missing, the consolidation isn't done — it's partial, and partial consolidations rot faster than the original drift.

---

## Anti-Patterns While Consolidating

Five mistakes that turn a 1-day refactor into a 1-week rewrite:

1. **Trying to consolidate too many concepts in one PR** — each concept deserves its own playbook run. Bundling them creates a giant PR that nobody reviews carefully.

2. **Changing semantics during migration** — if the helper subtly differs from the old call sites' behavior, hidden bugs land along with the refactor. Match the dominant existing behavior first, refactor semantics later in a separate PR.

3. **Skipping the contract test** — the helper looks right today but no one will remember its rules in six months. Without a contract test, drift creeps in via PRs that "just need a small adjustment to the helper."

4. **Skipping the defensive rule** — without it, new code will reintroduce the inline pattern within months. The whole exercise becomes a slow loop.

5. **Choosing the wrong SSOT layer** — if you put a pure computation in the database (as a trigger), you'll regret it when you need to compute the same thing in a frontend preview. Re-read step 2 if you're unsure.

---

## Worked Examples (Sanitized)

Three real applications of this playbook, generalized:

### Example A — Cross-page Total Mismatch

Three pages displayed an order total. Each used a different fallback chain (`unit_price ?? price ?? single_price`). The total displayed on the receipt was occasionally different from the total displayed in admin. Consolidation: one helper, one canonical field name, one governance rule blocking the fallback chain. Effort: 1 day. Found drift in seven additional places that hadn't yet caused visible bugs.

### Example B — Repeated Report Aggregation

A "monthly revenue" number was computed in five places — admin dashboard, weekly email, CSV export, partner portal, internal analytics. Each had its own SQL. Three of the five produced slightly different numbers due to time zone handling. Consolidation: one materialized view, one shared helper for callers, three places now read the view directly. Found a 6% revenue overstatement in the partner portal that had been there for a year.

### Example C — Edge Function Boilerplate

Every serverless function had 30 lines of identical CORS / auth / error-wrapping boilerplate. Changes to that boilerplate had to be applied 20 times — and routinely weren't. Consolidation: one `withAuth(handler)` wrapper, one shared CORS headers module, one error envelope. Reduced each function from 80 lines to 30. Found three functions with subtly different auth logic, all of which had been accidentally introduced by copy-paste.

---

## Related Documents

- `breakpoint-taxonomy.md` — most consolidation work targets Type B (Code SSOT Violation) bugs
- `defensive-vs-offensive-governance.md` — the closing governance rule in step 5 is defensive; the inventory in step 1 is offensive
- `anti-patterns/spread-overwrites-ssot.md` — a specific anti-pattern that consolidation work often surfaces
