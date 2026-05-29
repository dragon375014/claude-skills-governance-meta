# Known Limitations

The skill layer in this repo is useful, but it is not magic and it is not production-hardened. This document is the honest disclosure: what these skills do *not* guarantee, so you adopt them with the right expectations instead of assuming a coverage that isn't there.

If you read only one thing: **a skill is a prompt that nudges an agent, not a mechanism that enforces anything.** Enforcement is the `.mjs` templates' job (a CI `exit 1`). The skills depend on the agent choosing to follow them.

---

## 1. Auto-trigger from a cold session is not guaranteed

The whole premise — "the user declares an architecture change and the guardian fires" — relies on the agent **recalling** to invoke the skill. Two ways that fails:

- **Placement**: a skill in a category subfolder (`.claude/skills/<group>/<name>/`) is invisible to the registry, which reads only the first level. It won't auto-trigger at all, and `/`-invoking it returns *Unknown skill* with no error. (This is why the install is flat — but it's a footgun worth restating.)
- **Recall**: even flat and registered, on a fresh session with cold context the model may simply not connect "I want to build X" to this skill.

**Mitigation, not a fix**: the [Rule 33 CLAUDE.md hard rule](../scaffold/claude-md-rule-templates/rule-33-architecture-gate.md). CLAUDE.md is read at session start, so the rule gives a second, more reliable path. With both (registry + CLAUDE.md rule) the trigger is *dependable*, not *certain*. There is no mechanism that makes it certain.

---

## 2. Trigger quality depends on the model's judgment

Whether a borderline declaration counts as "an architecture change" is a semantic judgment the model makes. It will sometimes:

- **over-trigger** — run the 4-part report on a near-trivial change (the Part-0 triage threshold limits the waste, but doesn't eliminate it)
- **under-trigger** — miss a declaration phrased in a way the description's examples didn't anticipate

The description is written pushy and example-rich to bias toward triggering, because a missed audit costs more than a wasted one. But it's a bias, not a boundary.

---

## 3. The dispatch table requires manual customization

Out of the box the guardian's scenario→skill table is full of `<your … skill>` placeholders. Until you fill them with your project's real skills, the gate **classifies and reports but routes to nothing**. It is a template, not a turnkey product. A guardian installed but not customized is a checklist with no teeth — see the [onboarding checklist](./onboarding-checklist.md) Step 2.

---

## 4. trace-lock is inert without a registry and tests

trace-lock-modify greps a data-source registry to decide its scope. With no registry, it triggers on nothing. With a registry but no trace tests, the 5-step audit has no baseline to pin. The two defensive guard rules (trace-test-exists, test-imports-anchor) are what keep it honest — and those are *your* responsibility to wire in. The skill ships the procedure; it can't ship your traces.

---

## 5. These patterns come from one codebase, one stack

Everything here was validated on a single solo-developer project. That means:

- The patterns are **real** (they came from real incidents) but **narrowly validated** (one stack, one developer's judgment).
- A pattern that was load-bearing there may be irrelevant or even harmful in your context.
- There may be side effects nobody has noticed yet.

The [fitness check](../adoption-fitness-check.md) exists precisely because "adopt everything" is the wrong default. Adopt the pieces your project's signals justify, and test before relying on any of them.

---

## 6. No versioning / stability guarantee

This repo is snapshot-mode (see the README's Stability section). The skills can change shape when the source codebase produces a better pattern. There's no semver. If you depend on a specific version, pin to a commit hash or fork.

---

## 7. What would make these "production-ready" (and isn't here)

To be clear about the ceiling:

- a test harness that *verifies* the trigger fires across many declaration phrasings (not just a manual Step-5 check)
- multi-project validation (the patterns proven on stacks other than the origin)
- a mechanism to detect a skill silently failing to trigger (today, a missed trigger is invisible)

None of these exist. The honest status is: **a working, dogfooded, single-project pattern set, shared as-is.** Useful as a starting seed; not a guarantee of coverage.

---

## Related

- [`../scaffold/claude-md-rule-templates/rule-33-architecture-gate.md`](../scaffold/claude-md-rule-templates/rule-33-architecture-gate.md) — the mitigation for limitation #1
- [`./onboarding-checklist.md`](./onboarding-checklist.md) — Step 5 (verify the trigger) and Step 2 (customize, for limitation #3)
- [`../adoption-fitness-check.md`](../adoption-fitness-check.md) — the answer to limitation #5: adopt only what fits
- [`../defensive-vs-offensive-governance.md`](../defensive-vs-offensive-governance.md) — what enforcement (vs. nudging) actually looks like
