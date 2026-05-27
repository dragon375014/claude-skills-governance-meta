# Defensive vs. Offensive Governance

Two complementary modes of automated governance for software projects. Most teams have one. Few teams have both. The asymmetry is where bugs slip.

---

## TL;DR

| | Defensive | Offensive |
|---|---|---|
| Goal | Stop known anti-patterns from entering | Surface latent problems that already exist |
| Mechanism | Static grep / AST scan, CI `exit 1`, pre-commit hooks | Live DB queries, simulated user perspectives, scheduled audits |
| Speed | Milliseconds | Seconds to minutes |
| Tolerance | False positives are catastrophic (developers disable the check) | False positives are acceptable (treated as advisory) |
| Integration | `pre-commit` / `pre-push` / `prebuild` | `cron` / weekly / pre-release manual |
| Failure mode | Lets new violations through | Cannot prevent — only detect |

**You need both.** Defensive without offensive: known bugs blocked, but latent ones rot for months. Offensive without defensive: you find the same class of bug every quarter because nothing stops it from being reintroduced.

---

## Defensive Governance

Goal: a developer cannot commit / push / merge code that contains a known anti-pattern.

### Properties

- **Zero latency**: runs in the commit hook or CI in under 5 seconds
- **Zero tolerance for false positives**: a single false positive teaches developers to bypass the check (`--no-verify`), which then teaches them to bypass *all* checks
- **Static only**: pattern matching on source text, no DB or network calls
- **Local-first**: must run identically on developer machine and CI

### Typical implementations

- `governance-guard.mjs` — single-file rule registry with grep-style regex patterns (see `governance-guard-template.mjs` in this repo)
- `check-migration-grants.mjs` — SQL migration linter (see `check-migration-grants.mjs` template)
- Pre-commit hooks via Husky / lefthook / native git hooks
- ESLint custom rules (when the violation is AST-shaped, not text-shaped)

### Example rules

```
no-spread-overwrites-ssot-field   # blocks { ...obj, ssot_field: localVar }
no-raw-role-string-compare        # blocks role === 'admin' outside the helper
require-grant-on-new-table        # blocks CREATE TABLE without GRANT clause
no-todo-marker-in-production      # blocks // TODO: in src/ but allows in tests/
import-target-untracked           # blocks import './foo' when foo isn't git-tracked
```

### When defensive rules go wrong

1. **Rule too loose** → false positives → developers disable
2. **Rule too tight** → real bugs slip through → false confidence
3. **Rule scope creep** — one rule trying to cover three patterns → unreadable, unmaintainable
4. **Rule for a single past incident** — written reactively for one bug, never triggers again, becomes noise

The hardest part of defensive governance is not writing the rule; it's keeping the rule registry honest.

---

## Offensive Governance

Goal: surface problems that **already exist** but no one has noticed.

### Properties

- **Tolerant of false positives**: output is advisory, reviewed by a human
- **Live data access**: queries production / staging DB, calls APIs, simulates real user views
- **Slow OK**: runs in seconds to minutes — not on every commit
- **Multi-perspective**: explicitly runs from different role / tenant / permission viewpoints

### Typical implementations

- Anon-perspective smoke tests (logged-out user can still see the homepage / catalog correctly)
- Orphan config audits (DB rows that no UI can edit anymore)
- Cross-table consistency checks (parent row deleted but children still reference it)
- Scheduled storefront crawlers that diff HTML output against baseline
- pg_proc overload smoke checks (verify each critical RPC has exactly 1 overload)

### Example audits

```
audit-anon-stock-availability   # log out, scrape the catalog, check stock_available > 0
audit-orphan-config             # find system_config rows with no admin UI write path
audit-foreign-key-coherence     # find FK rows pointing at deleted parents
audit-rpc-overload-count        # check pg_proc, fail if any critical RPC has > 1 overload
```

### When offensive audits go wrong

1. **Treated as defensive** — wired into CI as `exit 1` → false positives block deployments → audit gets disabled
2. **No owner** — output goes to a dashboard nobody reads
3. **Output too noisy** — 200 findings dump → reader gives up
4. **Stale baseline** — diff-style audits without baseline refresh discipline → eventually all findings are noise

The hardest part of offensive governance is **calibrating cadence and audience** — too frequent and it's ignored, too rare and the problems compound.

---

## Why You Need Both

Consider a typical class of bug: a frontend component overwrites a database field that the backend treats as the source of truth.

| | Defensive only | Offensive only | Both |
|---|---|---|---|
| New code introducing the pattern | Blocked at commit | Allowed in, found in next audit | Blocked at commit |
| Existing violations in legacy code | Invisible | Surfaced by audit | Surfaced by audit, then fixed and locked by rule |
| Same pattern in a different shape | Slips through | Slips through | Audit surfaces, then a new rule is added |
| Rule erodes over time | No counter-check | Audit catches the erosion | Audit catches the erosion |

The two modes form a loop:

```
1. Offensive audit finds a latent pattern
2. Pattern is fixed (one-time)
3. A defensive rule is written to block reintroduction
4. Periodically, offensive audit re-runs to verify the rule is still effective
   (rules can rot — function signatures change, regex no longer matches)
```

---

## Onboarding Sequence for a New Project

1. **Day 1**: add the smallest defensive guard — `import-integrity` rule + an empty `governance-guard.mjs` skeleton. Cost: 30 minutes. Catches: import paths that exist locally but not in git.

2. **First sprint**: add 5–10 defensive rules harvested from the team's recent post-mortems. Cost: 2–4 hours. Catches: the bugs the team just spent a week fixing.

3. **Month 3**: write the first offensive audit. Pick one that simulates a real-world failure mode (e.g., "anon user opens the homepage — does anything look broken?"). Cost: 1 day. Catches: latent drift accumulated since launch.

4. **Month 6**: establish a weekly / monthly offensive audit cadence. Cost: ongoing 1 hour / week. Catches: slow drift that no commit-level check could detect.

Trying to skip step 1 and jump to step 3 is the most common failure — offensive audits with no defensive backstop just surface the same problems again every month.

---

## Anti-Patterns to Avoid

- **Treating defensive and offensive as the same thing** — they have opposite tolerance for false positives, opposite cadences, opposite audiences
- **Wiring offensive audits into CI as blockers** — first false positive will get the whole audit disabled
- **Writing defensive rules without a failing test** — the rule's job is to fail on bad code; if you've never seen it fail, you don't know it works
- **No registry / index file** — defensive rules scattered across 6 files become unmaintainable; centralize in one `governance-guard.mjs` or one ESLint config
- **Offensive audits that never get read** — establish a routing rule (which channel / which person / what cadence) before writing the audit

---

## Related Documents

- `breakpoint-taxonomy.md` — classify bugs by structural type before deciding which mode catches them
- `governance-guard-template.mjs` — minimal defensive scaffold to copy into a new project
- `check-migration-grants.mjs` — example of a single-purpose defensive rule
- `playbooks/ssot-consolidation.md` — playbook for harvesting governance rules out of consolidation work
