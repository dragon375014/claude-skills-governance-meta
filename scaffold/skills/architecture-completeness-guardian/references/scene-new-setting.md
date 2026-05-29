# Scene S4 — New setting declaration

> Read in by SKILL.md for the "S4 new setting" scenario.
>
> **TEMPLATE**: `system_config` / `tier_config` are example config-store table names — replace with your project's. The config-debt 4-class taxonomy is detailed in [`../../concepts/config-debt-taxonomy.md`](../../concepts/config-debt-taxonomy.md).

---

## Scenario signature

The user declares **making a hardcoded value configurable** or **adding an admin control**. E.g.:
- "add an admin setting to adjust the default loss rate"
- "make the free-shipping threshold configurable instead of hardcoded"
- "add an admin control for the bonus rate"
- "add a business-type toggle"

Signature: **anti-sprawl is the core** (no hardcoded business values in the frontend, no Settings-tab dumping).

---

## Dispatch detail

| Always pull | Why (plain) |
|---|---|
| placement-guideline decision tree + the "setting placement rule" | "decide where this setting goes — with its module or in system settings" |
| hardcoding red-line check | "hardcoded business values in the frontend are forbidden; so is cramming a module setting into a Settings tab" |
| orphan-config defense | "a new config row must ship a UI write path in the same PR, or in six months no one remembers it's adjustable" |
| config-debt 4-class self-check | "avoid the new setting becoming orphan / shotgun / tribal-knowledge / god-row debt" → [`config-debt-taxonomy.md`](../../concepts/config-debt-taxonomy.md) |

### Pull depending on layer touched

| Condition | Also pull | Why |
|---|---|---|
| setting is a **jsonb key** (not its own row) | `<your whitelist/pattern-validation skill>` | "jsonb is loose; it needs whitelist/blacklist governance to avoid junk keys" |
| setting **affects stock / balance** | `<your double-deduction audit skill>` | "stock-touching settings risk double deduction" |
| setting **affects money flow** (shipping / bonus / loss) | `<your money-flow integrity skill>` | "money-flow settings must compute in an RPC, not in frontend JS" |

---

## 5 required-layer grep templates

### L1 write side (does the admin UI have a write path?)
```
grep -rn "system_config|tier_config" {src dir}
grep -rn "{setting_key}" {migrations dir} | grep -i "insert into system_config"
```
- ✅ migration has `INSERT INTO system_config (...) VALUES ('{key}', ...)` + admin UI has a write path
- 🚨 migration has the INSERT but **no UI write path** → an orphan config (ship a UI or mark it orphan)

### L2 state sync (does the read side go through the SSOT?)
```
grep -rn "{setting_key}" {src dir}
```
- ✅ read side goes through one composable / helper
- 🚨 many places each `select` from the config table → shotgun config

### L3 boundary & guards (value range / default)
```
grep -rn "CHECK|DEFAULT" {migrations dir} | grep -B 2 -A 2 "{setting_key}"
```
- ✅ migration has a DEFAULT + a sane CHECK range
- ⚠️ no DEFAULT → reads NULL before the admin sets it (check the read side has a fallback)

### L4 backend gate (RLS)
```
grep -rn "system_config|tier_config" {migrations dir} | grep -i "policy|grant"
```
- ✅ config write limited to admin, read limited to the right role
- 🚨 anon write permission too broad → a security hole

### L5 user feedback (immediate feedback in the admin UI)
```
grep -rn "{setting_key}" {admin pages dir}
```
- ✅ a "saved" toast + a preview of the effect
- ⚠️ no feedback after saving → unclear whether it took effect

---

## Placement hint (S4-specific) — the "setting placement rule"

```
"Is this setting tied to only one module?"
├─ Yes → put it inside that module's page (a sub-tab or a gear-icon panel)
│        ✅ process loss rate → production > processing settings
│        ✅ bonus rate → user management > tier settings
│        ✅ packing compensation formula → production > packing settings
│
└─ No (cross-module / system-wide) → put it in [system settings]
         ✅ shipping threshold (affects checkout + POS) → system settings
         ✅ notification channels (affects all events) → system settings
         ✅ feature-module toggles → system settings
         ✅ business type → system settings
```

### Three red lines

| Red flag | Action |
|---|---|
| business value / dynamic copy / flow config **hardcoded in the frontend** | 🚨 move to the config store or a dedicated table |
| module-specific setting **dumped into a Settings tab** | 🚨 move to the module's sub-page |
| new config row with **no UI write path** | 🚨 pick one: (A) ship the UI same-PR / (B) explicitly mark it orphan / (C) log it in a registry "UI to-do" list |

### Config-debt 4-class self-check

| Class | Symptom | Defense |
|---|---|---|
| Orphan | DB has the field / code reads it, no UI entry | an orphan-config audit |
| Shotgun | same concept scattered across env + DB + code | a defensive guard rule |
| Tribal knowledge | only a veteran knows how to change it — no doc / trace / rule | log it in the registry |
| God-row | one jsonb holds all settings | open a new row for a new domain, don't extend the god-row |
| **Secrets in DB** (P0) | plaintext keys stored in jsonb | a defensive blocker |

Full taxonomy → [`../../concepts/config-debt-taxonomy.md`](../../concepts/config-debt-taxonomy.md).

---

## Red-flag quick table (common in S4)

| Symptom | Red flag |
|---|---|
| business value hardcoded in the frontend | structural red line |
| module-specific setting in a Settings tab | structural red line |
| new config row with no UI entry | orphan config |
| same concept scattered across env + DB + code | shotgun config |
| plaintext secret stored in a config jsonb | secrets-in-DB (P0) |
| new domain still extending the god-row | god-row |
