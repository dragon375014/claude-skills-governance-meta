# Anti-Pattern: Spread-Overwrites-SSOT

> Example field, table, and helper names below are illustrative — substitute the names your project actually uses.

## The Day Everything Was Sold Out

One afternoon a user reports that the entire homepage shows "out of stock" — every single item in a freshly-launched batch of 13 products is unavailable. The admin opens the back office and sees the inventory: 59.2 kg of upstream material, downstream `available_qty = 229`. Everything looks fine.

The admin signs out, opens the public homepage in an incognito tab. Out of stock.

The bug had been live for over a year.

---

## Symptom

A field that the database treats as the single source of truth (computed by a trigger or RPC) appears correct when queried directly, but appears wrong on certain pages or for certain user roles.

Symptoms cluster around perspective:

- Admin view: correct
- Public / anonymous view: incorrect (or zero, or missing)
- Authenticated user view: sometimes correct, sometimes not, depending on which role-scoped query the page used

The bug is invisible to the developer because the developer is always logged in as admin. Tests pass. Linter passes. Type checker passes. The only thing that fails is the real-world end-user view, which no one in the team routinely loads.

---

## Root Cause

The frontend has a "helper" that takes a record returned from the DB, recomputes a derived field, and **overwrites the DB's value with the recomputed value**:

```js
// products.map((p) => ({ ...p, available_qty: estimate(p) }))
//                              ^^^^^^^^^^^^^^
//                              this clobbers whatever the DB sent
```

The recomputation works by joining auxiliary tables — say, `upstream_stock` and `processed_batches`. But under Row-Level Security (RLS), the anonymous role can read `products` but **cannot read `upstream_stock` or `processed_batches`**. So:

- Admin perspective: aux tables return correct values → recomputed `available_qty = 229` → overwrites DB's `229` with `229` → looks correct
- Anon perspective: aux tables return `[]` → recomputed `available_qty = 0` → overwrites DB's `229` with `0` → public catalog shows "out of stock"

The bug is **invisible from the admin's chair** because the overwrite happens to produce the correct value. Every test, every staging check, every dogfood session is done while logged in. The anon-perspective failure mode is structurally hidden from the development team.

This is a Type B (Code SSOT Violation) of breakpoint taxonomy, combined with a permission-boundary blind spot.

---

## Anti-Pattern Code

```js
// frontend/useProducts.js
export function useProducts() {
  const products = ref([])

  async function load() {
    const { data } = await supabase.from('products').select('*')
    const upstream = await supabase.from('upstream_stock').select('*')
    const processed = await supabase.from('processed_batches').select('*')

    products.value = data.map((p) => {
      const estimate = computeAvailableQty(p, upstream.data, processed.data)
      return { ...p, available_qty: estimate } // ← THIS LINE
    })
  }

  return { products, load }
}
```

The fatal pattern is the spread:

```js
{ ...p, available_qty: estimate }
```

This says: "take every field from `p`, then overwrite `available_qty` with `estimate`." When `estimate` is computed from data the current role can't read, the SSOT field gets clobbered with `0` or `null`.

---

## Correct Code

The database is the source of truth. The frontend may **suggest** a value, but never overwrite. Two correct shapes:

### Option 1 — Trust the DB unconditionally

```js
products.value = data // no transformation, no spread, no recompute
```

If the DB has a trigger or computed column maintaining `available_qty`, you don't need to recompute. Just display the value.

### Option 2 — Suggest, don't overwrite

If you do need a frontend-side estimate (e.g., for previewing the result of a draft form change before saving), keep it in a separate field with a separate name:

```js
products.value = data.map((p) => ({
  ...p,
  estimated_available_qty: estimateFromForm(p),
}))
```

`p.available_qty` is the DB's truth. `p.estimated_available_qty` is the frontend's preview. They have different names; you cannot accidentally display the wrong one.

### Option 3 — SSOT-aware merge helper

When you do legitimately need to combine a server value with a computed fallback (e.g., during a migration window when not all rows have been backfilled yet), use an explicit helper that documents the precedence:

```js
function mergeServerComputedField(serverValue, fallback) {
  if (serverValue !== null && serverValue !== undefined && serverValue !== 0) {
    return serverValue // trust DB if DB has a positive value
  }
  return fallback
}

products.value = data.map((p) => ({
  ...p,
  available_qty: mergeServerComputedField(p.available_qty, estimateFromAux(p, aux)),
}))
```

The helper makes the precedence explicit and grep-able. Reviewers can audit it. Tests can target it.

---

## Detection Rule

A defensive rule that catches the spread-overwrite pattern at commit time:

```js
// In governance-guard.mjs
{
  name: 'no-spread-overwrites-ssot-field',
  description: 'Frontend must not overwrite fields the DB treats as SSOT',
  rootDir: 'frontend/src',
  include: /\.(js|ts|vue|jsx|tsx)$/,
  exclude: /__tests__|\.spec\./,
  patterns: [
    // Match { ...something, ssot_field: ... }
    // Maintain a project-specific list of SSOT field names
    {
      regex: /\{\s*\.\.\.\w+\s*,\s*(?:available_qty|balance|annual_total|stock_count|tier|status)\s*:/g,
      message: 'Spread followed by SSOT field overwrite. The DB maintains these via trigger / RPC. Use a different field name for frontend computation, or use mergeServerComputedField().',
    },
  ],
  // Allow the helper itself to use the pattern
  skipIfContains: /mergeServerComputedField/,
}
```

This rule fails the commit if any frontend source file contains `{ ...obj, <SSOT_field>:` unless the file also imports the explicit merge helper.

### Bootstrapping the SSOT field list

Generate the list once by querying your DB:

```sql
SELECT
  event_object_table AS table_name,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_manipulation IN ('INSERT', 'UPDATE');
```

Any column referenced in a trigger's `action_statement` is a strong candidate for the SSOT list. Add columns maintained by RPCs by grepping your RPC source for `UPDATE <table> SET <column> = `.

---

## Why Tests Don't Catch This

The bug is invisible because:

1. **Tests run with elevated permissions** — most test setups use a service-role key or seed users with admin access, so RLS doesn't apply
2. **Manual QA is done by developers** — developers are always logged in
3. **Unit tests of the helper pass** — the helper itself computes correctly, given correct aux data
4. **Integration tests don't simulate anon perspective** — there's no incognito-tab equivalent in the test runner unless explicitly added

The fix to detection is multi-pronged:

- **Add an offensive audit** that runs an anon-role query against the homepage and flags fields with suspicious zero / null clusters
- **Add the defensive rule above** to prevent reintroduction
- **Add an integration test** that explicitly uses an anon-role Supabase client and asserts the homepage renders products with `available_qty > 0`

---

## Generalized Pattern

This anti-pattern isn't specific to inventory or to Supabase. The generalized form:

> Frontend recomputes a derived field using data sources that have different visibility from the original record's visibility, then overwrites the original field.

Variants you'll find in the wild:

- Recomputing user `tier` / `level` from `total_purchases` joined to a `purchase_history` table that's admin-only
- Recomputing `balance` from a `transactions` table that anon can't see, overwriting the DB's `balance` field
- Recomputing `is_published` based on joining a `permissions` table that's role-scoped, overwriting the boolean

In each case, the structural issue is identical: the frontend has visibility V1, the recomputation requires visibility V2, V2 ⊄ V1 for at least one role, and the recomputed value clobbers the authoritative value.

---

## Related Documents

- `breakpoint-taxonomy.md` — this pattern produces Type B (Code SSOT Violation) bugs
- `defensive-vs-offensive-governance.md` — why both defensive (rule) and offensive (anon audit) are needed
- `playbooks/ssot-consolidation.md` — how to refactor a codebase that has accumulated many such overwrites
