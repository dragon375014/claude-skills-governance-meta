---
name: architecture-completeness-guardian
description: |
  TRIGGER when the user declares:
    (A) a forward architecture change [new feature / new field / new route / new setting / modifying an existing trace node], or
    (B) a reverse cleanup of legacy mess [clean up the X mess / consolidate N scattered X / figure out what N existing X are missing / extract a shared component to unify N existing X].
  SKIP only when it is pure copy / pure styling (CSS / class names / string edits, with no data / route / setting / trace node involved).
  Do NOT skip under an "audit-first" justification — that rule's scope is a /goal-style planning entry point, not this skill. This skill IS an "audit before you build" design.
  This skill is the gate at the entrance to any architecture change. It catches natural-language declarations like "I want to build X" / "let's clean up the X mess" and does two jobs:
    (A) classify the scenario, then dispatch the project's existing domain governance skills (it does not rewrite them — it routes to them);
    (B) spawn an Explore subagent to compare against the real codebase and emit a three-part report: "you already have / you intend to add but are missing / red-flag warning",
        plus a placement check against the project's backend-placement guideline.
  Forward trigger phrases (match on intent, not literal wording):
    "I want to add a quantity-edit feature" / "add an admin setting to adjust the default loss rate" /
    "add an origin_lot column to the items table" / "add a /workstation/qc route for QC" /
    "change the anchor of trace T-NNN" / "extend the order schema" /
    "add a button to let users export orders" / "I want to build user favorites".
  Reverse trigger phrases (match on intent, no need to name this skill):
    "let's clean up the CRUD and modal mess" / "N existing modals should be extracted into a shared component" /
    "tidy up the scattered admin CRUD" / "audit the historical debt in the order flow" /
    "figure out what N existing settings are missing" / "unify the N existing X" / "clean up the old X".
---

# Skill: Architecture Completeness Guardian

> **This skill is the entrance gate to any architecture change + the router for your project's existing domain governance skills.**
>
> Conceptual background: it implements the **L0 entry-gate** role in a three-tier governance hierarchy. See [`../../concepts/governance-hierarchy.md`](../../concepts/governance-hierarchy.md).
>
> When the user declares "I want to build X" — any **new feature / new field / new route / new setting / change to an existing trace node** — this skill catches it and plays two roles:
>
> 1. **Dispatcher (router)**: after classifying the scenario, it proactively dispatches the project's existing domain governance skills. It does not rewrite them.
> 2. **Completeness auditor**: it spawns an `Explore` subagent to compare against the real codebase and produce a three-part report.
>
> After "stopping the bleeding" on the new work, it also offers a **reverse legacy-cleanup** entry point (triggered only when the user uses the explicit reverse-trigger language).

**Origin pain point**: domain governance skills almost always trigger on "*before modifying* an existing field / node" — an **action sentence**. A **new-feature declaration** (there is no field to modify yet) has no skill to catch it → a hole in the middle of the skill map. This gate fills that hole.

> ⚠️ **This is a TEMPLATE.** Every `<!-- TODO -->` marker and placeholder skill name below must be replaced with your project's real skills before this skill is useful. See [`../../../docs/onboarding-checklist.md`](../../../docs/onboarding-checklist.md) Step 2.

---

## Governance positioning (read first)

**This skill is the L0 entry gate — it fires ahead of other memory rules / governance rules.**

- **L0 entry gate (this skill)**: catches **intent sentences** — "I want to build X", "let's clean up X".
- **L1 domain specialists** (your project's governance skills): catch **action sentences** — "I'm editing file Y".
- **L2 agents**: spawned by L0/L1, never triggered directly by the user.

⚠️ **No conflict with an "audit-first" planning rule** — that rule's scope is a `/goal`-style planning entry, not this skill. This skill *is* an audit-before-build design, so when the user declares an architecture change, trigger this skill directly.

Full L0/L1/L2 roles + the audit-first boundary + real missed-trigger cases → [`references/governance-meta-context.md`](references/governance-meta-context.md).

---

## Plain-language glossary (read on first encounter)

> This skill assumes the operator may be a non-programmer. Every term gets a plain-language gloss on first use.

| Term | Plain language |
|---|---|
| **SSOT (Single Source of Truth)** | One place owns a value; everywhere else reads it instead of recomputing |
| **RLS (Row-Level Security)** | The DB itself decides "can this identity see / edit this row" |
| **RPC** | A pre-packaged DB function the frontend calls once to do several DB operations atomically |
| **trigger** | A DB hook that runs automatically when a table is inserted/updated |
| **trace (node / test)** | A cross-layer dependency chain; a node = one file on it; a trace test = a test pinning current behavior |
| **dispatch** | Hand a task to the right handler; here, route a scenario to the matching governance skill |
| **CRUD** | Create / Read / Update / Delete — the four data operations |
| **Explore subagent** | A built-in sub-agent that greps/globs the codebase without polluting the main conversation |
| **anchor SSOT** | The source file of a trace chain; downstream nodes must read it, not recompute |
| **canonical** | The official value of a field, vs. an alias (`medium_dark` is canonical; "med-dark" is an alias) |
| **CI blocker** | A check that, if it fails, blocks the commit |

---

## When to trigger (strict)

### 5 forward scenarios

| # | Scenario | Natural-language declaration (match many variants) |
|---|---|---|
| **S1** | New feature | "I want to build / add / implement an X feature" / "add a button that lets users X" / "I want to do X" |
| **S2** | New field | "add a Y column to table X" / "I want to record Y of X" / "extend the X schema" |
| **S3** | New route | "add a /admin/X page" / "add a /workstation/X route" / "give X its own page" |
| **S4** | New setting | "add a setting to adjust X" / "add an admin control for X" / "make X configurable instead of hardcoded" |
| **S5** | Modify existing trace | "change the anchor of trace T-NNN" / "change the anchor SSOT" / "edit a file on a trace node" |

### Reverse trigger R0 (match on intent — no need to name this skill)

| Natural-language declaration | Reverse-cleanup scope |
|---|---|
| "let's clean up the X UI mess" | UI component layer (modal / form / table) — sweep N existing instances |
| "N existing modals should become a shared component" | shared-component extraction + unify existing callers |
| "tidy up the scattered admin CRUD" | every CRUD flow under the admin routes — what's missing |
| "audit the historical debt in the X flow" | a business-flow chain (e.g. order lifecycle) — reverse sweep |
| "figure out what N existing settings are missing" | config-store technical debt (4 classes: orphan / shotgun / tribal / god-row) |
| "unify the N existing X" | SSOT-consolidation candidate audit |
| "clean up the old X" | same, vaguest form — the skill must ask back to scope X |

⚠️ **Mixed scenarios**: a declaration is often S1–S5 (build new) **plus** R0 (sweep old) — e.g. "extract a shared BaseModal + unify the 10+ existing modals" is both S1 (new component) and R0 (10+ existing instances). Run both paths in the report: **R0 first (what's missing), then S1 (plan the new component)**.

### SKIP only when

- Pure copy change (string edits in one file, no data / route / setting / trace involved)
- Pure styling (CSS / class names, no behavior change)
- Fixing an existing bug that **does not** extend schema, add a route, add a setting, or touch a trace node
- A one-line typo fix

> ⚠️ When in doubt, trigger. The cost of skipping (a missed audit) far exceeds the cost of triggering (two extra minutes of scanning).

---

## The 4-part report (outline)

### Part 0: Triage threshold (don't waste tokens on trivial tasks)

First step after triggering — a lightweight classification (no reading references, no spawning Explore):

- Pure copy / styling → **exit immediately**, state "judged as trivial"
- Single-file logic change, no cross-layer → emit only Part 1 (scenario), skip Parts 2–4
- Clearly cross-layer / reverse sweep / user said "run the full thing" → **run Parts 1–4**

### Part 0.5: Priority vs. a requirements-review rule

⚠️ When a declaration contains "should we build X?" decision language, it's tempting to skip this skill and run only a requirements-review SOP. Don't. This skill **takes priority**; the requirements-review checklist becomes a **sub-task inside Part 2 dispatch**, not a replacement.

| Sentence shape | Action |
|---|---|
| **Pure decision**: "should we build X?" (no build intent, no data change) | requirements-review SOP / Part 0 exit |
| **Pure build**: "I want to build X" / "clean up the X mess" | run the 4 parts |
| **Mixed** (most common): "figure out X + also decide whether to add Y" | **this skill first**; Part 2 dispatches the requirements-review SOP as a sub-task; Parts 3/4 still run |

**Rule of thumb**: if the declaration contains *any* concrete build intent ("want to build / add / extract / unify / figure out / clean up") → this skill fires first.

### Part 1: Scenario classification

```
Scenario: S{1-5} {new feature / new field / new route / new setting / modify existing trace}
Basis: {one sentence, e.g. "you said 'add a quantity-edit feature' which spans UI + DB write + state flow → S1"}
```

⚠️ When ambiguous, ask back before dispatching (don't skip the clarification step):
- "By 'change the item' do you mean its **table structure** (S2 new field) or its **behavior** (S1 new feature)?"

### Part 2: Dispatch plan

```
I'm pulling in these existing skills for this task:
1. [skill-name-1] — why (one plain sentence: "this touches cross-layer fields, so I pull in the data-contract audit")
2. [skill-name-2] — why (one plain sentence)
...
```

Use the "scenario → skill" table below. Every pulled-in skill gets a one-sentence "why" in plain language — never assume the operator knows the skill's full name.

> ⚠️ When intent is ambiguous, list a **guessed** dispatch for the user to confirm before running Parts 3/4. Better to ask once than to pull the wrong skills and waste context.

### Part 3: Required layers + codebase gaps (spawn Explore)

Spawn an Explore subagent to scan the codebase and emit a three-part status per layer (✅ have / ⚠️ missing / 🚨 red flag + file path + line):

- **L1 write side**: who writes? via RPC or direct DB call?
- **L2 state sync**: is the frontend reactive? is there a DB trigger / derived field?
- **L3 boundary & guards**: validation + RLS + GRANT in place?
- **L4 backend gate**: does the RPC go through a capability / admin / current-user gate?
- **L5 user feedback**: loading / error / success state? Does a closing overlay swallow clicks (a UI-drift trap)?

Full grep templates + Explore spawn prompt → [`references/crud-completeness-execution.md`](references/crud-completeness-execution.md).

### Part 4: Placement check (anti-sprawl)

🏠 **First read your project's backend-placement guideline** (`<!-- TODO: docs/placement-guideline.md -->`) and run its decision tree:

- **Q1 who uses it?** consumer → consumer-facing / operator → workstation / admin → Q2
- **Q2 business domain?** map to your project's domain groups → if none fits → Q3
- **Q3 system-wide?** yes → system settings / no → a new group (never default to a Settings tab)

**Red lines**: hardcoding business values in the frontend / cramming a module setting into a Settings tab / mismatching `/admin` vs `/workstation` routes → immediate 🚨 + relocation proposal.

Execution detail → [`references/scene-new-setting.md`](references/scene-new-setting.md) and [`references/scene-new-route.md`](references/scene-new-route.md).

---

## Scenario → skill table (explicit dispatch)

> ⚠️ Fuzzy keyword matching = unstable dispatch. This table is an explicit mapping, not a guess.
>
> **TEMPLATE**: replace every `<your ...>` placeholder with your project's real skill name. Cells linking to a repo artifact mean this repo ships a starting point.

| Scenario | Always pull | Pull depending on layer touched |
|---|---|---|
| **S1 new feature** | `<your prior-art / dedup-check skill>` (find existing impl first) / this skill's CRUD completeness audit | cross-layer fields → `<your cross-layer contract audit skill>`; stock / balance → `<your double-deduction audit skill>`; multiple entry points → `<your multi-entry parity skill>`; **a new reader of a `T-NNN` trace anchor → [`trace-lock-modify`](../trace-lock-modify/SKILL.md) (registry note)** |
| **S2 new field** | `<your cross-layer contract audit skill>` / `<your default-value SSOT skill>` / migration GRANT check (this repo: [`check-migration-grants.mjs`](../../../templates/check-migration-grants.mjs)) | field backfilled from a related table → default-value Layer 2; field in RPC return shape → `<your rpc-shape audit skill>`; PG function signature change → `DROP FUNCTION` first (this repo: [`pg-function-overload-zombie`](../../../anti-patterns/pg-function-overload-zombie.md)); **field read by a `T-NNN` trace downstream → [`trace-lock-modify`](../trace-lock-modify/SKILL.md)** |
| **S3 new route** | placement-guideline decision tree / route-naming check / `<your admin-CRUD audit skill>` (if admin CRUD page) | workstation route → `<your operator-capability gate skill>`; public route → token-based-RPC check; multiple entry points → `<your multi-entry parity skill>` |
| **S4 new setting** | placement-guideline decision tree / hardcoding red-line check / orphan-config defense (ship a UI write path in the same PR) | jsonb key → `<your whitelist/pattern-validation skill>`; affects stock / balance → `<your double-deduction audit skill>`; **value read by a `T-NNN` trace downstream → [`trace-lock-modify`](../trace-lock-modify/SKILL.md)** |
| **S5 modify existing trace** | [`trace-lock-modify`](../trace-lock-modify/SKILL.md) (registry grep + list chain + pin via trace test) | anchor SSOT itself changed → `<your cross-layer contract audit skill>`; trace touches RPC signature → `<your rpc-shape audit skill>` |

**Three dispatch musts**:
1. **Explicit mapping** — the scenario→skill mapping lives in the table, not in a keyword guess.
2. **Pull multiple, ordered** — real scenarios cross layers; the "always pull + depending-on-layer" structure expects more than one.
3. **One plain-language "why" per skill** — no jargon-only skill names; the operator may have no programming background.

⚠️ **Trace surface spirit**: a trace-lock rule literally reads "before modifying an existing node", but its **spirit** ("treat cross-layer dependency as an asset") extends to **adding a new reader** — a new reader depends on the anchor's contract, so the anchor's future changes will break it. **If the data source of a new feature / field / setting is downstream of a `T-NNN` trace**, even read-only, dispatch [`trace-lock-modify`](../trace-lock-modify/SKILL.md) (at minimum a registry note registering the new reader). See [`../../concepts/trace-surface-spirit.md`](../../concepts/trace-surface-spirit.md).

---

## Reverse legacy-cleanup trigger (R0)

> The first version reserves the entry point but does not sweep proactively; it activates on explicit reverse-trigger language.

5-step flow (parse region → spawn Explore → compare against governance rules → three-part list → do not auto-fix) + why this entry point must exist → [`references/scene-reverse-audit.md`](references/scene-reverse-audit.md).

---

## Per-scenario execution handbooks (read on demand)

> Keep this SKILL.md ≤300 lines; each scenario's dispatch detail + grep templates + golden-sample comparison lives in `references/`, read on demand.

| Scenario | Reference file |
|---|---|
| S1 new feature | [`references/scene-new-feature.md`](references/scene-new-feature.md) |
| S2 new field | [`references/scene-new-field.md`](references/scene-new-field.md) |
| S3 new route | [`references/scene-new-route.md`](references/scene-new-route.md) |
| S4 new setting | [`references/scene-new-setting.md`](references/scene-new-setting.md) |
| S5 modify existing trace | [`references/scene-modify-trace.md`](references/scene-modify-trace.md) |

---

## Anti-Rationalization

> The left column is the thought you're most likely to generate to **skip this L0 gate**; the right column is the rebuttal.

| The thought you'll have | Rebuttal |
|---|---|
| "This is just fixing an existing bug / cleaning up some mess — no new schema, no new route, so I can skip the L0 gate." | "Clean up / tidy the existing X" *is* the R0 reverse trigger, not a trivial edit. SKIP is only for pure copy / pure styling / a one-line typo. |
| "The user mentioned audit-first, so I'll run that rule and not trigger this gate." | An audit-first planning rule's scope is a `/goal`-style entry — this skill *is* audit-before-build. Treating them as mutually exclusive is a classic missed-trigger root cause. |
| "The user asked 'should we build X' (a decision), so I'll only run the requirements-review checklist." | Any concrete build intent ("want to build / add / extract / unify / figure out / clean up") → this gate fires first; the requirements-review becomes a Part-2 sub-task. Only a pure decision (no build intent) runs requirements-review alone. |
| "It's a single-file change, no cross-layer — the 4-part report is overkill." | Part 0's triage threshold is exactly for this — but a lightweight exit still emits Part 1 (scenario classification); it does not mean "no classification at all." |
| "Dispatching the one most-relevant skill is enough." | Real scenarios cross layers (anti-pattern D). The "always pull + pull-depending-on-layer" structure expects ≥1; pulling only one misses the other layers. |
| "The new feature only reads stock / price (read-only) — no need to dispatch trace-lock." | Trace-surface spirit: a new reader also expands the trace surface, and the anchor's future changes will break it. See [`trace-surface-spirit.md`](../../concepts/trace-surface-spirit.md). |

---

## Anti-patterns (summary)

> Full list + the reasoning behind each → [`references/anti-patterns.md`](references/anti-patterns.md).

**A Trigger logic**: `description` written as literal "Use when X" ❌ / only catching "modify existing" scenarios ❌
**B Report structure**: a static checklist that never scans the codebase ❌ / listing "should have" without "currently missing" ❌ / forgetting the reverse-cleanup entry ❌
**C Placement / red lines**: ignoring the placement guideline ❌ / tolerating hardcoded business values ❌ / `/admin` ⇄ `/workstation` confusion ❌
**D Dispatch logic**: fuzzy keyword matching ❌ / pulling only one skill ❌ / using full skill names with no plain "why" ❌ / assuming the operator knows governance jargon ❌

---

## Handoff + meta-rule

**Three steps after trigger**: ① classify S1–S5 or R0 → ② read the matching `references/scene-{scenario}.md` → ③ emit the 4-part report (classification / dispatch / 5-layer gaps / placement). R0 follows the reverse-cleanup section.

**Maintenance meta-rule**: keep this file ≤300 lines; scenario detail lives in `references/`; adding a governance skill updates only one row in the scenario→skill table; never rewrite the L1 domain skills.
