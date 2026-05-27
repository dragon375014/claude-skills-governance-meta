# Breakpoint Taxonomy (Type A–E)

When a bug shows up, classify it before fixing. Misclassification leads to fixing the wrong layer — symptoms move, root cause persists.

```
bug appears
├── data in DB looks correct, but code assumes a different shape?       → Type A (DB Schema Drift)
├── multiple parts of code disagree on the definition of one concept?   → Type B (Code SSOT Violation)
├── UI binds to a field DB doesn't actually have (or has under another name)? → Type C (UI Schema Drift)
├── a form's picker dropdown shows the wrong / no options?              → Type D (Relation Picker Drift)
└── a downstream entity looks "active" but silently fails?              → Type E (Upstream Status Cascade)
```

---

## Type A — DB Schema Drift

**Definition**: code's assumption about data structure ≠ DB's actual structure.

**Symptoms**:

- A column is sometimes `null`, sometimes populated, with no obvious pattern
- Local environment works, CI / production fails
- The same table referenced in different files uses different column sets
- Governance tooling itself has a bug that lets the drift accumulate silently

**Common causes**:

- Migration applied locally, not pushed
- Migration on `--linked` DB, code branch not updated
- Manual `ALTER TABLE` in production via SQL editor, no migration written
- `supabase db diff` / Prisma diff output that doesn't include role grants on new tables

**Fix**:

1. Confirm DB state first via `\d table_name` or `information_schema.columns`
2. Either align code to DB or write a migration to align DB to code
3. Add a verification script or DB VIEW (`v_*_health`) that fails loudly on next drift

**Red flags**:

- Same code path returns different shapes for different users
- "Works on my machine" but breaks in CI
- A test passes locally but the production query returns extra / missing columns

---

## Type B — Code SSOT Violation

**Definition**: one business concept has multiple "sources of truth" in code, drifting independently.

**Symptoms**:

- A price / status / role calculation produces different results on different pages
- Refactoring one rule requires touching 15 files
- Developers don't know which existing example to copy

**Common causes**:

- Optional chaining fallback: `value = a || b || c` — three potential sources, no clear winner
- Copy-pasted helpers in different modules (e.g., `formatPrice` exists 5 times with subtle differences)
- Snapshots vs. live values: cart line snapshots a price, then the product's price changes
- Cross-tier comparisons hardcoded in 10 places: `if (role === 'admin')`

**Fix**:

1. Declare the canonical source explicitly (one field, one helper)
2. Extract to a single helper that all call sites use (e.g., `getNormalizedPrice()`)
3. Add a defensive governance rule that blocks regressions (e.g., `no-raw-role-string-compare`)

**Red flags**:

- Same calculation, different result on different pages
- Onboarding a new developer requires explaining which of 3 fields is "the real one"
- Bug fixes need to be applied in multiple places to fully land

---

## Type C — UI Schema Drift

**Definition**: UI binds to fields / methods that don't match what DB or API actually provides.

**Symptoms**:

- Form submits without error, but data doesn't persist
- `v-model` / `useState` binds but display doesn't update
- A form field validates successfully but DB accepts something else

**Common causes**:

- Field renamed in DB, not in UI binding
- API response shape changed, frontend type definitions stale
- Form schema declared `type: 'phone'` but DB accepts arbitrary `TEXT`

**Fix**:

1. Align schemas in one direction (decide who's authoritative — DB or UI)
2. Add validation at the boundary (form schema, API contract test)
3. Generate types from schema where possible (e.g., supabase-cli type generation)

**Red flags**:

- Form submits silently, no DB row appears
- Bound value doesn't show up in the DOM
- Linter passes, runtime breaks

---

## Type D — Relation Picker Context Drift

**Definition**: a form's foreign-key picker is out of sync with current business context — the user can't select the right option (or can select an invalid one).

Two sub-types:

### D1 — Upstream Orphan

The required upstream entity doesn't exist yet, the form provides no inline creation path, and the user is stuck.

**Example**: creating a downstream entity that requires a parent FK, but the parent has never been created. User must leave the form, create the parent, navigate back, and re-fill all the fields they had typed.

**Fix**:

- **Minimum**: a "⚡ Can't find it? Quick create" button next to the dropdown that opens a modal
- **Better**: link to the create page with `?return_to=<current_url>`, auto-return after submit
- **Avoid**: `window.prompt()` — doesn't support required fields, UX is hostile

### D2 — Availability Drift

The dropdown lists all historical entities including soft-deleted / out-of-stock / archived items, with no filtering. User must scan 100+ options to find the 5 that are actually selectable.

**Example**: a picker lists 100 entries, 80 of them labeled "(out of stock, 0.0kg)" or "(archived)" or "(deleted)" — needle in a haystack.

**Fix**:

- Filter at the query level: `.eq('is_active', true)` / `.gt('stock', 0)`
- UI toggle "Show all (including archived)" defaulting to off
- Visual prefix in label: `✓` for available, `⚠` for archived

---

## Type E — Upstream Status Cascade Drift

**Definition**: a downstream entity's visibility / behavior depends on an upstream entity's status, but the status change doesn't propagate any signal — the downstream "silently fails."

Two sub-types:

### E1 — Silent Invisibility

Upstream entity becomes inactive. Downstream entity stays `active=true` in DB but disappears from end-user views (because the public query joins to upstream and filters by upstream status). Admin opens the downstream record, sees `active=true`, concludes it's a frontend bug.

**Example**: an upstream supply record is archived. All downstream products derived from it disappear from the public catalog, because the public query is `... JOIN upstream ON ... WHERE upstream.active = true`. The admin panel queries downstream directly without the join, so `active=true` shows there.

### E2 — Coherence Gap

Upstream and downstream admin pages don't surface each other's status. The downstream list shows downstream-only fields; the upstream list shows upstream-only fields. The dependency between them is invisible in both UIs.

**Fix (three layers)**:

1. **DB VIEW**: build `v_<entity>_upstream_health` that lists inconsistent combinations (downstream active, upstream inactive)
2. **UI Badge**: on the downstream list card, show "⚠ Upstream X is archived" when applicable
3. **Cascade confirmation**: when archiving an upstream entity, show a count of dependent downstream records and confirm

---

## Type D vs. Type E — Distinguishing

| | Type D | Type E |
|---|---|---|
| When it manifests | While **creating** the downstream entity | After the downstream entity exists, when upstream **later changes** |
| Trigger | Opening a form and seeing the picker | Routine browsing / public-facing display |
| Pain | Can't select the right option (or selects a stale one) | Looks fine in admin, broken in public |
| Mode it's caught by | Defensive (rule on picker query) | Offensive (cross-table coherence audit) |

---

## Classification Workflow

1. Write down the **observed symptom** in plain language — not your hypothesis of the cause
2. Walk the decision tree at the top of this document
3. Read the "Fix" section for the matched Type
4. Record the bug in a backlog (e.g., `TECH-DEBT.md`) with its Type tag — useful for spotting class patterns over time
5. After fixing, ask: "does this Type / sub-type cover a class I haven't formalized yet?" — if yes, add it as Type F / new sub-type and contribute back

### Naming convention for new types

Use a compound noun: **{domain} + {Drift | Cascade | Gap | Collision}**. Keeps consistency with A–E.

Examples of plausible Type F candidates that haven't been added yet:

- **Type F — Permission Boundary Drift**: code that runs with elevated permissions reads / writes fields that the public-facing code path can't see, creating "admin sees X, anon sees Y" coherence bugs
- **Type G — Time Zone Drift**: same UTC timestamp interpreted as local time on server and UTC on client (or vice versa)

These aren't included as canonical types because they're more "domain bugs in specific tech stacks" than "structural classes that apply across stacks." Add to your project's local taxonomy if they're recurring patterns.

---

## Related Documents

- `defensive-vs-offensive-governance.md` — how each Type maps to defensive vs. offensive governance
- `anti-patterns/` — specific patterns that produce these types (e.g., `spread-overwrites-ssot.md` produces Type B)
- `playbooks/ssot-consolidation.md` — playbook for resolving Type B at scale
