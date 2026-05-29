# Case study: a reverse-cleanup declaration that didn't trigger the gate

> One of three incidents that shaped the `architecture-completeness-guardian` skill. The pattern: a request to clean up existing mess is an architecture change too, but a forward-only trigger misses it.

---

## Context

A project had an architecture-completeness gate skill and a separate "audit-first" rule (scoped to a planning command). The gate's reverse-cleanup trigger (R0) was written to require the user to *name the skill explicitly* — e.g. "run architecture-gate cleanup on the modals."

## The declaration

> "Let's clean up the CRUD and modals — for example, a modal should close when you double-click outside it."

A plain-language request to tidy up a sprawl of existing UI components.

## The wrong response

The agent reasoned: *"There's a rule that says audit before jumping into a skill — so I shouldn't jump into the gate. I'll plan my own audit first."* It self-sequenced an ad-hoc audit and **never invoked the gate.**

## Root cause (three at once)

1. **The R0 trigger was too picky.** It only matched an explicit skill-name invocation. "Let's clean up the modals" didn't name the skill, so it didn't match.
2. **The description listed no reverse-cleanup phrases.** The frontmatter examples were all *forward* ("I want to build X"). Nothing told the model that "clean up X" was in scope.
3. **The audit-first rule's scope wasn't pinned.** Written without an explicit "applies to the planning command only", it got generalized into "audit before any skill" — and used as a reason to skip the gate.

## The correct response

The gate should have fired, classifying this as a **mixed scenario**: S1 (a new shared component) + R0 (sweep the N existing modals).

- Part 0: not trivial (cross-layer + many existing instances) → run the full report.
- Part 1: S1 + R0 mixed.
- Part 2: dispatch prior-art (is there a shared modal base already?), multi-entry parity (unify the existing modals), the CRUD completeness audit.
- Part 3: spawn Explore over every existing modal; check click-outside / Esc / focus-trap / accessibility coverage.
- Part 4: a shared modal is a **cross-group base component** → it belongs in a shared `components/base/` or `components/ui/`, not under admin or workstation.

## The fixes that went into the skill

- R0 trigger rewritten to **match on intent**, not skill-name — with a table of natural-language reverse phrases ("clean up the X mess", "N existing X should be unified", "tidy up the scattered X").
- The frontmatter `description` now lists reverse phrases alongside forward ones.
- The description carries the line: *"Do not skip under an audit-first justification — that rule's scope is the planning command, not this skill."*

## Regression guard

A future agent reading the skill sees this case and learns: **"clean up / tidy / consolidate existing X" is a reverse-cleanup (R0) trigger.** It's not a reason to skip the gate; it's a reason to run it in reverse.

## Generalize to your project

- If your gate has a reverse-cleanup mode, make sure its trigger matches **intent**, not a magic phrase. Users describe cleanup in their own words.
- List reverse phrases in the trigger description, not just forward ones. The most expensive legacy work starts with "let's tidy up…".
- Pin the scope of any "be cautious first" rule, so it can't be misread as license to skip a different gate. See [`audit-first-vs-architecture-gate-boundary.md`](../../scaffold/concepts/audit-first-vs-architecture-gate-boundary.md).
