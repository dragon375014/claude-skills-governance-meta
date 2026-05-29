# Scene S1 — New feature declaration

> Read in by SKILL.md for the "S1 new feature" scenario. Provides dispatch detail + 5-layer grep templates + golden-sample comparison.
>
> **TEMPLATE**: replace `<your ... skill>` placeholders with your project's real skills. The grep templates use `{table}` / `{feature}` / `{feature path}` placeholders.

---

## Scenario signature

The user declares a feature idea **not yet in the codebase**. E.g.:
- "I want to add a quantity-edit feature"
- "add a button to let users export their orders"
- "I want to build user favorites"
- "give orders a cancel-and-reorder action"

Signature: UI + DB write + state flow + multi-entry-point considerations all in play.

---

## Dispatch detail (scenario → skill)

| Always pull | Why (plain) |
|---|---|
| `<your prior-art / dedup-check skill>` | "Before you build, I scan for anything similar already done — to avoid reinventing the wheel" |
| `<your multi-entry parity skill>` (if the feature has admin / mobile / consumer entry points) | "If this runs in both admin and the consumer front-end, both sides must read the same SSOT so they don't drift" |
| this skill's **CRUD completeness audit** (5-layer codebase gaps) | "I scan the real files and tell you which layers you already have and which are missing" |

### Pull depending on layer touched

| Condition | Also pull | Why |
|---|---|---|
| feature spans **cross-layer fields** (write → middleware → render) | `<your cross-layer contract audit skill>` | "this touches cross-layer fields — the middleware mustn't strip them and the read side must show them" |
| feature touches **stock / balance** | `<your double-deduction audit skill>` | "stock-touching features tend to get deducted twice by two paths" |
| feature is an **admin CRUD page** | `<your admin-CRUD audit skill>` | "admin pages often pass tests but fail on a real manual save" |
| feature is a **workstation operation** page | `<your operator-capability gate skill>` | "workstation pages can't call the DB directly — they must go through a gated RPC" |
| feature **touches files on a trace node** | [`trace-lock-modify`](../trace-lock-modify/SKILL.md) | "the file you're editing is on trace T-NNN — list the chain + pin current behavior with a trace test first" |

---

## 5 required-layer grep templates (for spawn Explore)

### L1 write side
```
grep -rn "from\(['\"]{table}['\"]\)\.(insert|update|upsert)" {src dir}
grep -rn "fn_{feature}_create_|fn_{feature}_update_" {migrations dir}
```
- ✅ write point exists and **goes through an RPC** → good (gated)
- ⚠️ write point exists but **calls the DB directly** → check the route (admin OK, workstation/public not)
- 🚨 write point on the frontend but RLS/GRANT missing → a grant violation

### L2 state sync
```
grep -rn "computed|watch\b|invalidateQueries" {src dir}
grep -rn "CREATE TRIGGER.*{table}" {migrations dir}
```
- ✅ frontend reactive + DB trigger syncs derived fields → complete
- ⚠️ frontend reactive only, no DB trigger → derived fields go stale

### L3 boundary & guards
```
grep -rn "GRANT.*ON.*{table}.*TO\b" {migrations dir}
grep -rn "validate|schema|rules" {feature path}
```
- ⚠️ no GRANT lines → anon gets 403 after the policy cutover
- 🚨 no input validation → out-of-bound values reach the DB

### L4 backend gate (RLS)
```
grep -rn "has_operator_capability|is_admin|requesting_user_id" {migrations dir}
```
- ✅ workstation RPC goes through a capability gate → good
- 🚨 workstation feature bypasses the RPC and calls the DB directly → gate violation

### L5 user feedback
```
grep -rn "loading|isLoading|toast|notify" {feature path}
grep -rn "leave-active|transition" {feature path}
```
- 🚨 a closing overlay/transition that doesn't disable pointer events → buttons "don't respond" (a UI-drift trap)

---

## Placement hint (S1-specific)

New feature goes where → run the placement decision tree (see main SKILL.md Part 4). Replace the rows below with **your project's** domain groups.

| New feature type | Usually lands in |
|---|---|
| quantity edit / cancel / reorder | operations > order management (action on an existing page) |
| export orders | operations > order management (button) |
| user favorites | consumer-facing > item page (new field) + member area (display) |
| new workstation QA flow | production (admin setting) + `/workstation/qc` (operation page) |

---

## Golden-sample comparison

> Use your own project's best trace as the reference. The two below are abstract shapes to aim for.

### A trace whose full chain is implemented (good model for a stock-touching feature)
- Anchor SSOT: a single business-rules module (e.g. `inventoryUnit.js`)
- Chain shape: DB trigger → derived field → aggregation → frontend merge → orderable count
- Lesson: a complete SSOT-init + propagation + render chain has all 5 layers implemented

### A trace for a value-calculation feature
- RPC sync contract + client fallback + config read + UI preview
- Lesson: source → middleware algorithm → client mirror → render, 4 layers complete

---

## Red-flag quick table (common in S1)

| Symptom | Red flag | Layer |
|---|---|---|
| UI shows it but "doesn't write back to DB" | L1 write side missing | L1 |
| frontend reactive moves but DB derived field doesn't update | L2 sync missing trigger | L2 |
| feature returns 403 for anon | L3 GRANT lines missing | L3 |
| workstation feature bypasses the RPC | L4 backend gate missing | L4 |
| button "doesn't respond" (overlay swallows the click) | L5 transition pointer-events | L5 |
