# Example: a 30-minute onboarding walkthrough

A narrated run of installing `architecture-completeness-guardian` into a fictional project, "Acme Shop" — a ~600-file Vue + Postgres storefront with a handful of existing governance skills. It shows what the agent does at each step of the [onboarding checklist](../docs/onboarding-checklist.md), what it asks, and what the first triggered report looks like.

This is illustrative, not a transcript. Your project's specifics will differ.

---

## Minute 0–5 — Pre-flight + fitness check

The developer pastes the fitness-check prompt first. The agent inspects the repo and reports:

```
Adoption Fitness — Acme Shop
Signals: S1=614 files · S2=16 months · S4=yes (Supabase) · S7=yes · S8=yes · S11=yes

✅ Adopt now
  - governance-guard-template.mjs        — S3 (has CI)
  - check-migration-grants.mjs           — S4 + S5
  - architecture-completeness-guardian   — S1≥500, has 4 domain skills to dispatch to
  - trace-lock methodology               — S11 (cart-total chain spans 4 files)

Overall tier: FULL
```

Because the skill layer is ✅ (the project is big enough and has skills to route to), the developer proceeds to install it.

---

## Minute 5–10 — Copy the skill, flat

The agent runs:

```sh
cp -r ../claude-skills-governance-meta/scaffold/skills/architecture-completeness-guardian .claude/skills/
cp -r ../claude-skills-governance-meta/scaffold/skills/trace-lock-modify .claude/skills/
```

and verifies the placement:

```
.claude/skills/
├── architecture-completeness-guardian/
│   ├── SKILL.md
│   └── references/   (9 files)
└── trace-lock-modify/
    └── SKILL.md
```

It notes: "Both at the first level — the registry will see them. I did not create a `governance/` category folder; that would make them invisible."

---

## Minute 10–20 — Customize the dispatch table

The agent greps `.claude/skills/` for Acme's existing skills and finds: `contract-audit`, `prior-art-finder`, `pos-mobile-parity`, `admin-form-checklist`. Then it asks:

> 🔶 **ASK**: "I found 4 governance skills. I'll wire them in as: cross-layer audit → `contract-audit`; prior-art → `prior-art-finder`; multi-entry → `pos-mobile-parity`; admin CRUD → `admin-form-checklist`. You have no double-deduction or rpc-shape skill, so I'll leave those cells as TODO. OK?"

Developer confirms. The agent edits the SKILL.md dispatch table: real names in, absent ones removed, `trace-lock-modify` kept (it was adopted), `check-migration-grants.mjs` kept (Supabase). Then:

> 🔶 **ASK**: "What are your sidebar groups for the placement decision tree?" → developer: "Catalog, Orders, Members, Settings." The agent replaces the example groups in `scene-new-route.md` / `scene-new-setting.md` with those four.

It customizes `scene-new-feature.md`'s grep templates with Acme's real `src/` and `supabase/migrations/` paths as the worked demo, leaving the other scenes' placeholders with `<!-- TODO -->`.

---

## Minute 20–25 — CLAUDE.md rule + trace-lock prereqs

The agent copies the Rule 33 block into Acme's `CLAUDE.md` as rule #18 (the next free number) and points it at the install path. It copies Rule 29 too (trace-lock adopted).

It copies the registry template to `docs/data-source-registry.md` and registers Acme's one obvious chain:

```markdown
### T-cart-total: line items → cart subtotal → checkout total
- Anchor SSOT: src/lib/pricing/cartTotal.js
- Trace nodes: cartStore.js / CartDrawer.vue / CheckoutSummary.vue / checkout RPC
- Known readers: (none yet)
- Trace test: src/__tests__/traces/T-cart-total.trace.test.js
- Last edited: 2026-01-01
```

It points `trace-lock-modify`'s trigger section at `docs/data-source-registry.md`.

---

## Minute 25–30 — Verify in a fresh session

The developer opens a **new** session and types:

> "I want to add a feature that lets shoppers save items to a wishlist."

The guardian fires (Rule 33 + registry). Abbreviated output:

```
Scenario: S1 new feature.
Basis: "save items to a wishlist" = UI + a new DB write + a per-user relation → S1.

Dispatch plan:
1. prior-art-finder — checking if a saved-items or favorites pattern already exists, to avoid rebuilding.
2. contract-audit — a wishlist item crosses write → API → render; making sure all three sync.
3. pos-mobile-parity — if the wishlist shows on both web and mobile, both must read one source.
(no trace-lock: a wishlist doesn't read the cart-total anchor.)

5-layer gaps (Explore subagent):
  L1 write — ⚠️ no wishlist table/RPC yet; needs an RPC, not a direct insert (your workstation rule).
  L3 guards — 🚨 new table → must ship GRANT lines (check-migration-grants will catch this).
  L4 gate — needs requesting_user_id() in RLS so a user sees only their own wishlist.
  L5 feedback — plan a saved/removed toast.

Placement: who uses it = shopper → consumer-facing; domain = Catalog (item page) + Members (a "saved" view). Not Settings.
```

The developer has, before writing a line, a complete map of what the feature touches and which checks to run. **Install verified.**

---

## What this demonstrates

- The agent stopped to ask only at genuinely project-specific cells (which skills, which groups) — everything else was automatic.
- The output is a *codebase-grounded* report (it found there's no wishlist table yet), not a generic checklist.
- The cold-session trigger worked because Rule 33 was in CLAUDE.md, not on registry luck alone.

For the failure modes this install protects against — and the incidents that shaped the skill — see [`case-studies/`](./case-studies/).
