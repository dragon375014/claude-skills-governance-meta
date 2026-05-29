# Adoption Fitness Check

> Run this **before** copying anything from this repo. It tells you which parts fit your project *today*, which are premature, and which to skip outright — so you don't cargo-cult a governance layer you can't actually use.
>
> 繁體中文讀者：先看 [getting-started.zh-TW.md](./getting-started.zh-TW.md) 的「你現在需不需要這份 repo？」。本檔是那段判斷的**可執行、逐檔分級**版本（給 AI 跑、會吐一份採用 handoff）。

**The point: more is not better.** This repo is deliberately small, and [its README](./README.md#whats-intentionally-missing) already says *why* some patterns are withheld (they need infrastructure a young project doesn't have — including them teaches cargo-cult adoption). This document turns that prose into an actionable, per-artifact decision so an adopter installs exactly what their project can use and nothing it can't.

A pattern adopted without its precondition is not "extra safety" — it is dead config, confusing the next person who reads your repo and assuming coverage that isn't there.

---

## How to run it

### AI-assisted (recommended)

Paste this into your project's coding-agent session (Claude Code, etc.), **from inside your project directory**:

```
Read https://raw.githubusercontent.com/dragon375014/claude-skills-governance-meta/main/adoption-fitness-check.md

Then assess THIS project against it:
1. Gather the §1 signals by inspecting my repo (run the detection commands).
2. Fill in the §2 fitness matrix for my project.
3. Output the §3 report and the §4 adoption handoff.
Do NOT copy any files yet — just produce the assessment so I can decide.
```

The agent inspects your actual codebase, so the verdict is grounded in your project — not a generic checklist.

### Manual

Answer the §1 signal questions yourself, read the matching §2 rows, and decide. Takes ~10 minutes.

---

## §1 — Signals to gather

The assessor inspects the candidate project for these. Detection commands assume a git repo at the project root.

| # | Signal | How to detect | Gates |
|---|---|---|---|
| S1 | **Source file count** | `git ls-files | grep -vE 'node_modules|dist|vendor' | wc -l` | size-dependent patterns |
| S2 | **Project age** | `git log --reverse --format=%ci | head -1` | maturity-dependent patterns |
| S3 | **Has a CI / pre-commit trigger surface** | look for `.github/workflows/`, `.husky/`, `.pre-commit-config`, `package.json` scripts | whether the guard has anywhere to *fire* |
| S4 | **Postgres / Supabase** | `supabase/` dir, `migrations/` with `.sql`, a Postgres connection | migration + function patterns |
| S5 | **RLS + explicit GRANT model** | RLS policies in migrations; tables that need `GRANT ... TO anon/authenticated` | `check-migration-grants` |
| S6 | **Postgres functions with overloads** | `grep -rl 'CREATE OR REPLACE FUNCTION' migrations/` and any function with multiple signatures | `pg-function-overload-zombie` |
| S7 | **Frontend recomputes server-owned fields** | UI that recalculates a value the DB/RPC already owns (stock, balance, price, status) and displays *its own* number | `spread-overwrites-ssot` |
| S8 | **Repeat-bug evidence** | have you fixed the *same class* of bug 2+ times? (check your own memory / issue history) | whether **any** governance is worth it yet |
| S9 | **Normalizer / contract middleware** | a whitelist transform layer between API responses and UI (e.g. a `normalize*.js`) | (future) data-contract audit |
| S10 | **A settings / config table** | a `system_config`-like single-row or key-value config store | (future) config-debt taxonomy |
| S11 | **Cross-layer flows worth locking** | write → middleware → render chains where one end silently breaks the other | (future) trace-lock |

---

## §2 — Per-artifact fitness matrix

For each artifact: when to adopt now, when it's premature, when to skip. Tie every verdict to a signal — don't adopt on vibes.

| Artifact | ✅ Adopt now if | ⚠️ Premature until | 🚫 Skip if |
|---|---|---|---|
| [`governance-guard-template.mjs`](./governance-guard-template.mjs) | `S8` true **or** `S1 ≥ 50` **or** `S3` true | — | (never fully skip — works at any size; just thinner value on a toy) |
| [`templates/check-migration-grants.mjs`](./templates/check-migration-grants.mjs) | `S4` **and** `S5` true | — | no Postgres/Supabase, or no GRANT model |
| [`breakpoint-taxonomy.md`](./breakpoint-taxonomy.md) | always — it's a mental model, free to read | — | never (reading costs nothing) |
| [`defensive-vs-offensive-governance.md`](./defensive-vs-offensive-governance.md) | always — read once before building any guard | — | never |
| [`anti-patterns/spread-overwrites-ssot.md`](./anti-patterns/spread-overwrites-ssot.md) | `S7` true | — | backend renders everything, client never recomputes server fields |
| [`anti-patterns/pg-function-overload-zombie.md`](./anti-patterns/pg-function-overload-zombie.md) | `S6` true | — | no Postgres functions at all |
| [`playbooks/ssot-consolidation.md`](./playbooks/ssot-consolidation.md) | you actually have duplicated logic (usually `S1 ≥ 100`) | ⚠️ until duplication exists — don't pre-consolidate | — |
| **(future) trace-lock methodology** | — | ⚠️ until `S1 ≥ 500` **and** `S11` true | toy / pre-launch project |
| **(future) config-debt taxonomy** | — | ⚠️ until `S2 ≥ 12 months` **and** `S10` true | no config store |
| **(future) data-contract propagation audit** | — | ⚠️ until `S9` true | no normalizer/contract layer |

> The three "(future)" rows mirror the README's *What's intentionally missing*. They are listed here so the assessor can tell an adopter **"not yet, and here's the exact threshold that would change the answer"** instead of silently omitting them.

---

## §3 — Report format

Output a tiered list. One line per artifact: verdict emoji + name + the signal that decided it.

```
Adoption Fitness — <project name>
Signals: S1=<n> files · S2=<age> · S4=<yes/no> · S7=<yes/no> · S8=<yes/no> ...

✅ Adopt now
  - governance-guard-template.mjs   — S3 (you have CI); wire it into prebuild
  - breakpoint-taxonomy.md          — universal mental model
  - anti-patterns/spread-overwrites-ssot.md — S7 (your useProducts recomputes stock)

⚠️ Premature (revisit when …)
  - playbooks/ssot-consolidation.md — no real duplication yet; revisit at first "3 places compute the same number"
  - config-debt taxonomy (future)   — project is 4 months old; revisit at ~12 months

🚫 Skip (precondition absent)
  - check-migration-grants.mjs      — no Postgres/Supabase in this stack
  - pg-function-overload-zombie.md  — no DB functions

Overall tier: STANDARD  (3 adopt-now items; you have CI + a real SSOT-overwrite risk)
```

**Overall tier** is a one-word summary:

- **MINIMAL** — 0–2 ✅ items. Read the two concept docs; copy the guard only if you have CI.
- **STANDARD** — 3–4 ✅ items. Guard + the anti-patterns your signals matched + migration grants if Supabase.
- **FULL** — 5+ ✅ items. Mature codebase: adopt all now-tier items and put the ⚠️ ones on a quarterly revisit.

---

## §4 — Adoption handoff (for a fresh session to execute)

After the report, the assessor emits a **copy-paste handoff** so a new, clean session can execute the adoption without re-deciding anything. Fill the template with only the ✅ items:

```
# Adoption Handoff — <project name>

Adopt these (decided by adoption-fitness-check §3): <list of ✅ artifacts>

## 1. Copy files
- cp <repo>/governance-guard-template.mjs scripts/governance-guard.mjs
- cp <repo>/templates/check-migration-grants.mjs scripts/check-migration-grants.mjs   # only if Supabase
- (concept docs / anti-patterns: read in place, nothing to copy)

## 2. Customize
- governance-guard.mjs: set ALIAS_MAP to your import aliases, SCAN_SRC_DIR to your source dir
- check-migration-grants.mjs: point it at your migrations dir, set your ALLOWLIST

## 3. Activation — make it actually FIRE (this is the step people forget)
- npm pkg set scripts.guard="node scripts/governance-guard.mjs"
- npm pkg set scripts.prebuild="npm run guard"      # fires on every build
  (or add to .husky/pre-commit so it fires on every commit)
- Verify: `node scripts/governance-guard.mjs` exits 0 and prints its summary.
  A tool that is copied but never wired into a hook does nothing — copying ≠ triggering.

## 4. Verify it works
- Run the guard once; confirm it reports (the first run usually flags untracked imports — that's the free value).
- Commit, and confirm the hook fired.
```

### ⚠️ Placement rule for skills (forward-looking)

This repo **currently ships copy-paste docs + `.mjs` templates only — there are no Claude skills in it**, so there is nothing to "auto-trigger" today; the templates fire because you wire them into a hook (step 3 above), not because of any skill registry.

**If a future release of this repo ever ships an actual Claude skill**, it must be placed at the **first level**:

```
.claude/skills/<name>/SKILL.md        ✅ correct — registry sees it, auto-triggers
.claude/skills/<group>/<name>/SKILL.md ❌ wrong — silently invisible
```

Claude Code's skill registry reads only the first level of `.claude/skills/` and does **not** recurse into category subfolders. A skill nested one level deeper disappears from the available-skills list and `/`-invocation returns *Unknown skill* — with no error to tell you why. (Source: a real incident — 68 skills grouped into 9 category folders all vanished from the registry until they were flattened back.) The only subfolder a skill should contain is its own `references/` (progressive disclosure), which is internal and fine.

So: **never nest skills in category folders. One skill = one first-level folder.**

---

## Scoring shortcut

If you just want a number: count the ✅ rows your signals produced in §2.

| ✅ count | Tier | Do this |
|---|---|---|
| 0–2 | MINIMAL | Read `breakpoint-taxonomy.md` + `defensive-vs-offensive-governance.md`. Copy the guard only if you have CI. |
| 3–4 | STANDARD | Guard + matched anti-patterns + migration grants (if Supabase). Wire into prebuild. |
| 5+ | FULL | Adopt all now-tier items; put ⚠️ items on a 90-day revisit. |

---

## Why a fitness check at all

The failure mode this prevents: an enthusiastic adopter clones the repo, copies everything, and ends up with a trace-lock methodology referencing infrastructure they don't have, a config-debt audit for a config table that doesn't exist, and three concept docs they'll never need — concluding the repo is "too heavy" and abandoning even the one `.mjs` that would have helped them.

Adopting fewer, correctly-placed, actually-wired pieces beats adopting everything. This check exists so "copy what helps, fork the rest" has a method, not just a slogan.
