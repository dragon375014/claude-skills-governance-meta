# Scene S3 — New route declaration

> Read in by SKILL.md for the "S3 new route" scenario.
>
> **TEMPLATE**: the route prefixes (`/admin/*`, `/workstation/*`), the route-meta names (`requiresAdmin` / `requiresOperator`), and the group table are example conventions — replace with your project's routing + permission model.

---

## Scenario signature

The user declares **a new frontend route + its page**. E.g.:
- "add a /admin/inventory-reconciliation page"
- "add a /workstation/qc route for QC"
- "give end-users a /order/:id/track page"
- "add a /admin/affiliate-dashboard"

Signature: **route naming = the basis of the permission model**; naming it wrong breaks the whole auth guard.

---

## Dispatch detail

| Always pull | Why (plain) |
|---|---|
| placement-guideline decision tree (Q1→Q2→Q3) | "decide which group this route belongs to and whether it needs a sidebar entry" |
| route-naming check | "/admin/* and /workstation/* map to different permissions; name it wrong and the auth guard won't recognize it" |
| `<your admin-CRUD audit skill>` (if an admin CRUD page) | "admin CRUD pages often pass tests but fail a real manual save" |

### Pull depending on layer touched

| Condition | Also pull | Why |
|---|---|---|
| workstation route `/workstation/*` | `<your operator-capability gate skill>` | "workstation routes can't call the DB directly — they need an RPC behind a capability gate" |
| public route (no login) | token-based-RPC check | "public routes can't read/write business tables directly — they go through a token-verified Edge Function / RPC" |
| multiple entry points (POS / mobile / desktop) | `<your multi-entry parity skill>` | "multiple entry points must read the same SSOT" |

---

## 5 required-layer grep templates

### L1 write side (route registration + the page's write points)
```
grep -rn "'/admin/{route}'|'/workstation/{route}'" {router dir}
grep -rn "from\(" {page folder}
```
- ⚠️ route registered but **no sidebar entry** → a structural red line
- 🚨 workstation route calls the DB directly → gate violation

### L2 state sync (router guard)
```
grep -rn "requiresAdmin|requiresOperator|requiresSuperAdmin|requiresAuth" {router dir}
```
- ✅ `/admin/*` paired with admin guard
- ✅ `/workstation/*` paired with operator guard
- ✅ public route with auth disabled
- 🚨 a self-invented meta (e.g. `requiresStaff`) → naming violation
- 🚨 workstation route paired with admin guard (or vice versa) → permission mismatch

### L3 boundary & guards (page-level guard)
```
grep -rn "useAuthGuard|canAccessAdminPanel|isUserOperator" {page folder}
```
- ✅ page uses the auth SSOT helpers to decide permission
- 🚨 raw string compare `=== 'admin'` → violates the role-helper SSOT (a defensive guard should block this)

### L4 backend gate (RLS)
```
grep -rn "has_operator_capability|is_admin|requesting_user_id" {migrations dir}
```
- workstation page's RPC must go through a capability gate
- admin page's RPC goes through the admin helper / RLS policy

### L5 user feedback
```
grep -rn "loading|isLoading|toast|notify" {page folder}
```
- ✅ loading state / error toast / success message present
- 🚨 missing loading → slow operations look frozen

---

## Placement hint (S3-specific) — placement-guideline decision tree

Run Q1 → Q2 → Q3 to decide the route's group (reference your project's placement guideline).

### Route-prefix vs. group quick map (TEMPLATE — replace with your groups)

| Group | Route prefix | Naming example |
|---|---|---|
| overview | `/admin/dashboard` | `Dashboard.vue` |
| consumer-facing | `/admin/storefront-*` | `StorefrontLanding.vue` |
| operations | `/admin/orders`, `/admin/items` | `OrdersManagement.vue` |
| user management | `/admin/users`, `/admin/topup` | `UsersManagement.vue` |
| production (admin) | `/admin/schedule`, `/admin/inventory` | `ScheduleManagement.vue` |
| workstation (operator) | `/workstation/processor`, `/workstation/packer` | `ProcessorWorkstation.vue` |
| system settings | `/admin/settings` | `Settings.vue` |
| developer tools | `/admin/dev-*` | `DevSchemaCheck.vue` |
| consumer-end | `/order/*`, `/member/*`, `/cart/*` | `OrderConfirm.vue` |

### Three red lines

| Red flag | Action |
|---|---|
| `/admin/*` route holding a workstation (operator) function | 🚨 change to `/workstation/*` + operator guard |
| `/workstation/*` route holding a management (admin) function | 🚨 change to `/admin/*` + admin guard |
| route registered but no sidebar entry | 🚨 add an entry or delete the route |

---

## Red-flag quick table (common in S3)

| Symptom | Red flag |
|---|---|
| route exists but no sidebar entry | structural red line |
| workstation route paired with admin guard | permission mismatch |
| workstation page calls the DB directly | bypasses the RPC |
| public route reads a business table directly | bypasses the token RPC |
| self-invented `requiresStaff` meta | forbidden meta |
| page uses raw string compare `=== 'admin'` | violates the role-helper SSOT |
