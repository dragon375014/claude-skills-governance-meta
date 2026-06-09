# claude-skills-governance-meta

**Design-time governance for your codebase — not runtime guardrails for autonomous agents.**

Defensive and offensive governance patterns harvested from a working production codebase. Five concept docs and two runnable templates. Copy what helps, fork the rest.

> **The name is broad; the scope is narrow — on purpose.** This is *not* a runtime policy engine that authenticates, sandboxes, or kill-switches autonomous AI agents in production (the niche of Microsoft's [Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit), the OWASP Agentic Top 10, and similar). It governs the **codebase and the act of writing it**: catching the same *class* of structural bug *before it ships*, through CI linters that block (defensive) and pre-build agent skills that steer design (offensive). The "agent" here is the coding assistant you're *steering* — not an autonomous worker you're *policing*.

---

## Why this exists

A solo developer's project will accumulate the same class of bug three or four times before someone (or you, much later) writes down the pattern. Once written down, the pattern is short enough to copy into your next project — but only if it was written down at all.

This repo is the externalised, business-neutral subset of one such codebase: the meta-layer governance that survived contact with real incidents. It's deliberately small (~five concept docs + two `.mjs` templates) because the smallest useful version is the one that gets reused.

What is **not** here:

- Tech-stack-specific helpers (no Vue components, no Supabase business RPC examples)
- Framework opinions ("you should use X")
- A full toolkit / installer / CLI — those are scope creep for this repo

What **is** here: structural patterns and the rules that lock them in place.

---

## TL;DR — 5-line example

```sh
git clone https://github.com/<your-username>/claude-skills-governance-meta.git
cp claude-skills-governance-meta/governance-guard-template.mjs your-project/scripts/governance-guard.mjs
cd your-project && npm pkg set scripts.guard="node scripts/governance-guard.mjs" scripts.prebuild="npm run guard"
node scripts/governance-guard.mjs
```

Then edit `ALIAS_MAP` and `SCAN_SRC_DIR` in your copy and uncomment one or two of the example rule blocks. That's the whole minimum-viable adoption — everything else is iteration.

---

## Before you adopt: run the fitness check

More is not better. Before copying anything, run [adoption-fitness-check.md](./adoption-fitness-check.md) — an AI-runnable assessment that reads *your* project and tells you which parts fit today, which are premature, and which to skip. It exists so you don't install a trace-lock methodology for a 40-file prototype.

```
Read https://raw.githubusercontent.com/dragon375014/claude-skills-governance-meta/main/adoption-fitness-check.md
Then assess THIS project against it and output the report + adoption handoff. Don't copy files yet.
```

---

**繁體中文讀者**：請看 [getting-started.zh-TW.md](./getting-started.zh-TW.md) — 含「症狀 → 檔案對照表」、名詞翻譯、給程式小白的最低門檻試用流程。

---

## Two layers: templates and skills

This repo ships governance at two levels. Adopt either or both.

- **Templates** (`.mjs`) — defensive linters you wire into a build / commit hook. They *enforce* (a CI `exit 1`). Start here; they work at any project size.
- **Skills** (`scaffold/skills/`) — agent skills you copy into `.claude/skills/` so your coding agent runs an architecture-completeness check *before* a feature is built. They *nudge* (no enforcement). They need a project big enough to have domain skills to route to — the fitness check draws that line.

### Install the guardian skill (skill layer)

After the fitness check says the skill layer fits, paste this into your project's agent session (from inside your project):

```
Read https://raw.githubusercontent.com/dragon375014/claude-skills-governance-meta/main/docs/onboarding-checklist.md

Then install the architecture-completeness-guardian skill into THIS project by following it:
1. Copy scaffold/skills/architecture-completeness-guardian (and trace-lock-modify if I have cross-layer chains) into .claude/skills/ — FLAT, one folder per skill, never a category subfolder.
2. Inspect my codebase and fill the SKILL.md dispatch table with MY real governance skills; replace the scene-*.md code-path placeholders with mine. Stop and ask me only where a choice is genuinely project-specific.
3. Add the Rule 33 architecture-gate hard rule to my CLAUDE.md (renumbered to fit).
4. Verify: in a fresh session, declare a fake feature and confirm the 4-part report fires.
Show me a diff of every file before writing, and a summary of what you customized vs. left as TODO.
```

The agent reads [docs/onboarding-checklist.md](./docs/onboarding-checklist.md) and works the 5 steps against your real repo, stopping to ask only at project-specific cells (which skills, which sidebar groups). What it does **not** guarantee — and why a CLAUDE.md hard rule, not registry luck, is what makes the trigger dependable — is in [docs/known-limitations.md](./docs/known-limitations.md).

---

## Contents

### Concept docs

| File | What it covers |
|---|---|
| [defensive-vs-offensive-governance.md](./defensive-vs-offensive-governance.md) | The two modes of automated governance. Most teams have one. Few have both. |
| [scaffold/concepts/forward-bias-and-the-reverse-organ.md](./scaffold/concepts/forward-bias-and-the-reverse-organ.md) | Both defensive *and* offensive governance are forward-triggered. Why solo-dev governance has no "step back" trigger, and the three-part reverse organ that adds one. |
| [breakpoint-taxonomy.md](./breakpoint-taxonomy.md) | Types A–E. Classify a bug structurally before deciding how to fix it. |
| [anti-patterns/spread-overwrites-ssot.md](./anti-patterns/spread-overwrites-ssot.md) | `{ ...obj, ssot_field: localVar }` and why your admin sees correct data while anon users don't. |
| [anti-patterns/pg-function-overload-zombie.md](./anti-patterns/pg-function-overload-zombie.md) | `CREATE OR REPLACE FUNCTION` doesn't replace overloads. Why the signed link broke on Tuesday. |
| [playbooks/ssot-consolidation.md](./playbooks/ssot-consolidation.md) | 5-step procedure for collapsing a scattered concept into one source of truth. |

### Runnable templates

| File | What it does |
|---|---|
| [governance-guard-template.mjs](./governance-guard-template.mjs) | Minimal defensive scaffold. File scanner engine + import-integrity rule + commented example rules. Drop into `scripts/`, customize. |
| [templates/check-migration-grants.mjs](./templates/check-migration-grants.mjs) | Supabase migration linter. Catches `CREATE TABLE` without matching `GRANT` (a hard requirement from 2026-10-30 onward). |
| [templates/data-source-registry-template.md](./templates/data-source-registry-template.md) | The Critical-Traces registry shape the trace-lock skill greps. Per-trace block template incl. a Known-readers field. |
| [step-back-sentinel-template.mjs](./step-back-sentinel-template.mjs) | The asymmetry sentinel (reverse organ, Part 2). Silent unless it detects a "changed A, forgot B" footprint. Replace the example tripwires with your own incident classes; wire advisory (never blocking). |

### Governance skills (copy into `.claude/skills/`)

| Skill | What it does |
|---|---|
| [scaffold/skills/architecture-completeness-guardian/](./scaffold/skills/architecture-completeness-guardian/) | The L0 entry gate. Catches "I want to build X" / "clean up the X mess", classifies the scenario, dispatches your domain skills, and spawns a 5-layer codebase-completeness scan. A template — fill its dispatch table with your skills. |
| [scaffold/skills/trace-lock-modify/](./scaffold/skills/trace-lock-modify/) | Cross-layer trace protection: before editing a registered node (or adding a reader of its anchor), list the chain, pin behavior with the trace test, re-run, update the registry. |
| [scaffold/skills/step-back-review/](./scaffold/skills/step-back-review/) | The reverse organ, Part 1. A deliberate ADVERSARY persona (not a helpful gatekeeper) with six lenses — end-to-end trace / gap analysis / handoff test / boundary check / devil's advocate / panorama. Pairs with the sentinel + rule-34. |

### Concept docs, rule templates & onboarding

| Path | What's there |
|---|---|
| [scaffold/concepts/](./scaffold/concepts/) | The theory: [governance-hierarchy](./scaffold/concepts/governance-hierarchy.md) (L0/L1/L2), [trace-surface-spirit](./scaffold/concepts/trace-surface-spirit.md), [audit-first-vs-architecture-gate-boundary](./scaffold/concepts/audit-first-vs-architecture-gate-boundary.md), [config-debt-taxonomy](./scaffold/concepts/config-debt-taxonomy.md), [forward-bias-and-the-reverse-organ](./scaffold/concepts/forward-bias-and-the-reverse-organ.md) |
| [scaffold/claude-md-rule-templates/](./scaffold/claude-md-rule-templates/) | Copy-paste CLAUDE.md rules: [rule-33 architecture gate](./scaffold/claude-md-rule-templates/rule-33-architecture-gate.md), [rule-29 trace lock](./scaffold/claude-md-rule-templates/rule-29-trace-lock.md), [rule-30 config debt](./scaffold/claude-md-rule-templates/rule-30-config-debt.md), [rule-34 step-back cadence](./scaffold/claude-md-rule-templates/rule-34-step-back-cadence.md) |
| [docs/](./docs/) | [onboarding-checklist](./docs/onboarding-checklist.md) (the AI-executable install), [why-this-exists](./docs/why-this-exists.md), [design-pattern-industry-mapping](./docs/design-pattern-industry-mapping.md), [known-limitations](./docs/known-limitations.md) |
| [examples/](./examples/) | [30-min walkthrough](./examples/30-min-onboarding-walkthrough.md) + 3 [case studies](./examples/case-studies/) that shaped the skill clauses |

---

## How to use

Three integration modes, in increasing order of commitment:

### 1. Copy individual files

```sh
curl -O https://raw.githubusercontent.com/<your-username>/claude-skills-governance-meta/main/governance-guard-template.mjs
```

Best for: a one-off look, or grabbing just one rule definition to embed in your own scanner.

### 2. Git submodule (read-only reference)

```sh
git submodule add https://github.com/<your-username>/claude-skills-governance-meta.git vendor/governance-meta
```

Best for: keeping the concept docs handy in your repo without copying. Update via `git submodule update --remote`.

### 3. Fork and own

```sh
# On GitHub: fork the repo
git clone https://github.com/<your-username-fork>/claude-skills-governance-meta.git
# Add your own rules, your own anti-patterns, your own playbooks
```

Best for: building your own project-specific governance layer with this as the seed.

---

## When to use which doc

- Not sure what (if anything) to adopt → run [adoption-fitness-check.md](./adoption-fitness-check.md) first; it scores your project and emits an adoption handoff
- New project, need a CI governance scaffold from zero → start with [defensive-vs-offensive-governance.md](./defensive-vs-offensive-governance.md), then copy [governance-guard-template.mjs](./governance-guard-template.mjs)
- Diagnosing a specific bug → walk the decision tree at the top of [breakpoint-taxonomy.md](./breakpoint-taxonomy.md)
- Refactoring scattered logic into one place → use [playbooks/ssot-consolidation.md](./playbooks/ssot-consolidation.md)
- A specific anti-pattern keeps reappearing → read the matching file in `anti-patterns/` for the Symptom → Root cause → Detection rule chain
- Supabase project, migration freshly applied, ready for 2026-10-30 → copy [templates/check-migration-grants.mjs](./templates/check-migration-grants.mjs)

---

## What's now opt-in (was withheld)

The skill layer (`scaffold/`) brings in two patterns the first release deliberately withheld. They're here now, but **gated, not default** — the fitness check tells you whether your project is big/mature enough, and the install asks before pulling them:

- **Trace lock methodology** ([skill](./scaffold/skills/trace-lock-modify/SKILL.md) + [concept](./scaffold/concepts/trace-surface-spirit.md)) — still needs a project with real cross-layer chains (~500+ files). Premature below that; the fitness check's S11 signal decides.
- **Config-debt classification** ([concept](./scaffold/concepts/config-debt-taxonomy.md) + [rule](./scaffold/claude-md-rule-templates/rule-30-config-debt.md)) — useful in a 12+ month codebase with a config store; premature in a new one (fitness check S10).

## Still intentionally missing

- **Data-contract propagation audit** — depends on a normalizer middleware layer. Most stacks don't have one. (The guardian's dispatch table leaves a `<placeholder>` for it.)
- **Cross-tenant role helpers** — too tied to a specific auth model. Roll your own.

These may move in once a second non-toy project has validated them. Until then, they live in the source codebase they came from.

## Companion repo — task shaping (姐妹 repo — 任務塑形)

This repo guards **how a thing is built** (structure). Its companion shapes **what to do** (the task spec):

> ### [`goal-workflow-designer`](https://github.com/dragon375014/goal-workflow-designer)
> Two task-shaping skills: **`/goal`** (depth — one agent + a rubric, iterate to a quality bar) and **`workflow-shaper`** (breadth — shape a task into a runnable Dynamic Workflow, with a worth-it gate). A design coach for the prompt/spec, not the engine.

**They combine cleanly:**

- This repo's `architecture-completeness-guardian` (the L0 gate) can **dispatch** that repo's `workflow-shaper` when it classifies a job as "many independent units."
- A `/goal` or workflow designed there is **executed under** this repo's trace-lock + governance guard — so a multi-unit change stays SSOT-locked instead of drifting.
- Mental model: **that repo = the brief; this repo = the guardrails.** Use that one for sharper task specs; add this one when your project is big enough to need structural governance (the fitness check above tells you when).

Kept as separate repos on purpose — governance and task-shaping are different verticals, and one focused repo is easier to navigate than a mixed bag. Each stands alone; install both for full coverage.

---

## Stability

This repo is **snapshot-mode**. Updates land when the source codebase produces a generalizable pattern, not on a calendar. Expect long quiet periods. No semver guarantees — pin to a commit hash if you need stability.

Review cadence: every 90 / 180 days, the maintainer decides "expand / hold / archive." If you're depending on this in any meaningful way, fork.

---

## License

MIT. See [LICENSE](./LICENSE).

You can use, modify, and redistribute everything here, commercially or otherwise, without asking. The license does not grant you any warranty that the patterns are correct for your project — test before adopting.

## Contributing

The PR / issue policy is deliberately restrictive. See [CONTRIBUTING.md](./CONTRIBUTING.md). Short version: typos and obvious bug fixes accepted; feature requests and design discussions belong in your fork.

---

If anything in this repo saved you a debugging session, a ko-fi is appreciated but not expected. The patterns here are MIT and free to use unconditionally.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Z8C420A0VI)
