# claude-skills-governance-meta

Defensive and offensive governance patterns harvested from a working production codebase. Five concept docs and two runnable templates. Copy what helps, fork the rest.

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

**繁體中文讀者**：請看 [getting-started.zh-TW.md](./getting-started.zh-TW.md) — 含「症狀 → 檔案對照表」、名詞翻譯、給程式小白的最低門檻試用流程。

---

## Contents

### Concept docs

| File | What it covers |
|---|---|
| [defensive-vs-offensive-governance.md](./defensive-vs-offensive-governance.md) | The two modes of automated governance. Most teams have one. Few have both. |
| [breakpoint-taxonomy.md](./breakpoint-taxonomy.md) | Types A–E. Classify a bug structurally before deciding how to fix it. |
| [anti-patterns/spread-overwrites-ssot.md](./anti-patterns/spread-overwrites-ssot.md) | `{ ...obj, ssot_field: localVar }` and why your admin sees correct data while anon users don't. |
| [anti-patterns/pg-function-overload-zombie.md](./anti-patterns/pg-function-overload-zombie.md) | `CREATE OR REPLACE FUNCTION` doesn't replace overloads. Why the signed link broke on Tuesday. |
| [playbooks/ssot-consolidation.md](./playbooks/ssot-consolidation.md) | 5-step procedure for collapsing a scattered concept into one source of truth. |

### Runnable templates

| File | What it does |
|---|---|
| [governance-guard-template.mjs](./governance-guard-template.mjs) | Minimal defensive scaffold. File scanner engine + import-integrity rule + commented example rules. Drop into `scripts/`, customize. |
| [templates/check-migration-grants.mjs](./templates/check-migration-grants.mjs) | Supabase migration linter. Catches `CREATE TABLE` without matching `GRANT` (a hard requirement from 2026-10-30 onward). |

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

- New project, need a CI governance scaffold from zero → start with [defensive-vs-offensive-governance.md](./defensive-vs-offensive-governance.md), then copy [governance-guard-template.mjs](./governance-guard-template.mjs)
- Diagnosing a specific bug → walk the decision tree at the top of [breakpoint-taxonomy.md](./breakpoint-taxonomy.md)
- Refactoring scattered logic into one place → use [playbooks/ssot-consolidation.md](./playbooks/ssot-consolidation.md)
- A specific anti-pattern keeps reappearing → read the matching file in `anti-patterns/` for the Symptom → Root cause → Detection rule chain
- Supabase project, migration freshly applied, ready for 2026-10-30 → copy [templates/check-migration-grants.mjs](./templates/check-migration-grants.mjs)

---

## What's intentionally missing

- **Trace lock methodology** — depends on infrastructure that doesn't exist in projects below ~500 source files. Including it here would teach cargo-cult adoption.
- **Config-debt classification** — same reason. Useful in a 12+ month codebase; premature in a new one.
- **Data-contract propagation audit** — depends on a normalizer middleware layer. Most stacks don't have one.
- **Cross-tenant role helpers** — too tied to a specific auth model. Roll your own.

These may move in once a second non-toy project has validated them. Until then, they live in the source codebase they came from.

## Related repos (planned)

A sibling repo focused on a different vertical is on the roadmap:

- `claude-skills-goal-design` — designing precise `/goal` prompts with rubric + five-element framework, plus session-handoff patterns for long-running AI collaboration

The two repos are kept separate on purpose: governance and meta-prompt-design are different verticals, and one focused repo is easier to navigate than one mixed bag.

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
