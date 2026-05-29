# Scene S5 — Modify an existing trace node

> Read in by SKILL.md for the "S5 modify existing trace" scenario.
>
> **TEMPLATE**: `T-NNN` is a placeholder trace ID; `inventoryUnit.js` / `normalizeEntity.js` are generic file-name examples. Replace the registry path with your project's (the repo ships a [registry template](../../../templates/data-source-registry-template.md)).

---

## Scenario signature

The user declares **editing a file / anchor SSOT on a trace chain**. E.g.:
- "change the anchor of trace T-NNN"
- "change an RPC on a trace node"
- "change the baseline assertion of a trace test"
- "extend T-NNN with a new calculation branch"

Signature: **the trace-lock enforced path** — must run the `trace-lock-modify` skill's 5-step audit.

---

## Dispatch detail

| Always pull | Why (plain) |
|---|---|
| [`trace-lock-modify`](../trace-lock-modify/SKILL.md) (registry grep + list chain + pin via trace test) | "you can't edit trace nodes from memory — first grep the registry to find which trace this file is on, list the full chain, pin current behavior with the trace test, re-run after editing, then update the registry's Last-edited" |

### Pull depending on layer touched

| Condition | Also pull | Why |
|---|---|---|
| the **anchor SSOT itself** changed (not just a node) | `<your cross-layer contract audit skill>` | "the anchor changed — every downstream node reading it must be audited for sync" |
| change touches an **RPC signature** | `<your rpc-shape audit skill>` + DROP FUNCTION first | "an RPC signature change needs the old signature dropped + the normalizer whitelist synced" |
| change touches a **derived field / reactivity** | reactive-derived check | "a derived field must be reactive — don't change the input but leave the derived value stale" |
| change touches **multiple entry points** | `<your multi-entry parity skill>` | "multiple entry points read the same SSOT — after changing the anchor, all of them must sync" |

---

## trace-lock-modify 5-step flow (mandatory)

> Full flow lives in [`../trace-lock-modify/SKILL.md`](../trace-lock-modify/SKILL.md); summarized here.

### Step 1: confirm which trace the file belongs to
```
grep -B 2 -A 20 "{file path}" {registry path}
```
If it's in **no trace** but you judge it "should" be on a cross-layer chain → the registry is missing an entry; register it first, then edit.

### Step 2: list the full chain for the user
```
"This change affects trace T-NNN. Full chain:
1. {node 1}
2. {node 2}
...
SSOT anchor: {anchor path}
Trace test: {test path}"
```

### Step 3: run the current trace test (baseline)
```
{your test runner} {trace test for T-NNN}
```
If it's **already red** → stop and ask the user: "the trace test was red before my change — that's a separate bug. Fix it first, or accept a known-broken edit?"

### Step 4: re-run after editing
- ✅ all green → continue
- ❌ red → diagnose: (a) test is stale, needs updating (rare, confirm intent) / (b) you broke it → fix / (c) test doesn't cover the new behavior → add a case

### Step 5: update the registry "Last edited"
If the change altered the trace contract (added a node, changed the anchor) → also sync the Trace-nodes / Anchor-SSOT fields.

---

## 5 required-layer grep templates

### L1 write side (are the trace's write points synced?)
```
grep -rn "{anchor function name}|{anchor file basename}" {src dir} {migrations dir}
```
- ✅ every write site imports the anchor SSOT, none self-rolls
- 🚨 a write site bypasses the anchor and computes itself → trace-lock violation

### L2 middleware (normalizer / RPC jsonb synced?)
```
grep -n "{field affected}" {path to normalizeEntity.js}
```

### L3 boundary (does the trace test still import the anchor?)
```
grep -n "import.*{anchor module}" {trace test for T-NNN}
```
- ✅ the trace test really imports the anchor SSOT (not a copy)
- 🚨 not imported → a defensive guard should block it

### L4 backend gate (DB trigger / RPC synced?)
```
grep -rn "{trigger_name}" {migrations dir}
```

### L5 render side synced?
```
grep -rn "{field affected}" {src dir}
```

---

## Placement hint (S5-specific)

Editing a trace usually **needs no new group / route**, but check:
- ❓ does editing the anchor affect **multiple entry points**? → multi-entry parity
- ❓ does the change need a **new admin setting**? → jump to S4
- ❓ does the change extend schema (a trace node carries a new field)? → jump to S2

---

## Golden sample

> Use your own project's best trace as the model.

### A complete cross-layer trace (good model)
- Anchor SSOT: a single business-rules module (e.g. `inventoryUnit.js`)
- Trace nodes: a migration / a synced column / a composable / a modal / a point-of-sale page
- Editing any node requires all 5 steps

---

## Red-flag quick table (common in S5)

| Symptom | Red flag |
|---|---|
| edited a trace node without listing the chain | Step 2 skipped |
| edited a trace node without a baseline trace test | Step 3 skipped |
| didn't re-run the trace test after editing | Step 4 skipped |
| forgot to update the registry Last-edited | Step 5 skipped |
| trace test doesn't import the anchor SSOT | defensive guard blocks it |
| changed the anchor but downstream nodes didn't sync | cross-layer contract gap |
| changed an RPC signature without dropping the old overload | overload-zombie |
