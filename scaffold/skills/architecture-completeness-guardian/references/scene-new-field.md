# Scene S2 — New field declaration

> Read in by SKILL.md for the "S2 new field" scenario.
>
> **TEMPLATE**: replace `<your ... skill>` placeholders. The grep templates use `{field_name}` / `{table}` placeholders. `normalizeEntity.js` is a generic name for your project's whitelist normalizer middleware (if any).

---

## Scenario signature

The user declares **a new column on an existing table** or **a new field in an RPC return shape**. E.g.:
- "add an origin_lot column to the items table"
- "I want to record a promised_delivery_at on orders"
- "extend the order schema with a source channel"
- "the create-work-order RPC should also return estimated_loss_grams"

Signature: **cross-layer field propagation** is the core risk.

---

## Dispatch detail

| Always pull | Why (plain) |
|---|---|
| `<your cross-layer contract audit skill>` (5-step cross-layer audit) | "a new field most often gets written but never read. This scans write → middleware → render to confirm all three sync up" |
| `<your default-value SSOT skill>` | "if the field has a default, it's most often crammed in too early, defeating a later guard; derived fields must be reactive; multi-alias strings must use a canonical label map" |
| migration GRANT check (this repo: [`check-migration-grants.mjs`](../../../templates/check-migration-grants.mjs)) | "if your migration adds a new table, it needs the GRANT lines, or anon gets 403 after the policy cutover" |

### Pull depending on layer touched

| Condition | Also pull | Why |
|---|---|---|
| field is **derived** (value = f(other fields)) | reactive-derived check | "a derived field must be reactive, not computed once at create time" |
| field is in an **RPC return shape** | `<your rpc-shape audit skill>` | "RPC return changed but the normalizer whitelist didn't → the frontend always gets null" |
| **PG function signature change** (adding a default-NULL param counts) | `DROP FUNCTION` first (this repo: [`pg-function-overload-zombie`](../../../anti-patterns/pg-function-overload-zombie.md)) | "before changing a PG function overload, DROP the old signature, or you get a 400 'not unique'" |
| field is a **multi-alias string** (canonical / alias) | canonical label map | "cross-layer strings need a canonical mapping table; no self-rolled label maps" |

---

## 5 required-layer grep templates

### L1 write side (every place that writes this field)
```
grep -rn "{field_name}" {src dir} {migrations dir}
```
- ✅ every write site writes the **canonical** value (not an alias)
- ⚠️ some site writes an **alias** (e.g. "med-dark" instead of `medium_dark`) → add a canonical label map

### L2 middleware (whitelist normalizer)
```
grep -n "{field_name}" {path to normalizeEntity.js}
grep -rn "{field_name}" {migrations dir} | grep -i "jsonb_build_object|create function"
```
- ✅ the normalizer whitelist **lists** the new field + the RPC's `jsonb_build_object` **returns** it
- 🚨 normalizer doesn't list it → the frontend computed always gets null (a classic breakpoint)

### L3 boundary & guards (trigger / GRANT)
```
grep -rn "GRANT.*ON.*{table}.*TO" {migrations dir}
grep -rn "CREATE TRIGGER|BEFORE INSERT.*{table}" {migrations dir}
```
- ⚠️ no GRANT lines → grant-cutover blocker
- 🚨 a trigger reading the wrong column (e.g. an RPC alias `type` copied into `SELECT type FROM orders`) → a "column does not exist" trap

### L4 backend gate (RLS)
```
grep -rn "auth\.uid\(\)" {migrations dir}
```
- 🚨 RLS uses `auth.uid()` instead of your current-user helper → a policy violation

### L5 render side
```
grep -rn "{field_name}" {src dir}
```
- ✅ at least one render site reads the new field
- 🚨 written but **no render site reads it** → the field may as well not exist
- 🚨 render site **self-rolls a label map** (`{ light: '...', medium: '...' }`) → use the canonical label map

---

## Placement hint (S2-specific)

A new field usually **needs no new group**, but check:
- ❓ does the field need new UI (edit area, list column, detail page)? → which existing page
- ❓ does the field have an admin-adjustable setting (e.g. a default)? → jump to the S4 new-setting flow
- ❓ does the field affect an existing trace? → jump to the S5 modify-trace flow

---

## Red-flag quick table (common in S2)

| Symptom | Red flag | Layer |
|---|---|---|
| DB value correct, frontend computed gets null | L2 normalizer whitelist not synced | L2 |
| RPC throws 400 "not unique" after adding a param | old function signature not dropped | overload |
| derived field stale (computed once at create) | L2 missing reactivity | L2 |
| multi-alias string renders the raw code | L5 self-rolled label map | L4/L5 |
| anon gets 403 after the cutover | L3 GRANT lines | L3 |
| trigger reads the wrong column ("column X does not exist") | L3 trigger-alias trap | L3 |
