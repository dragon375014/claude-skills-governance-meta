# CLAUDE.md Rule Template — Architecture-Change Gate (hard rule)

**What this rule does**: forces your coding agent to run the architecture-completeness-guardian skill whenever the user *declares* an architecture change ("I want to build X", "let's clean up the X mess"), instead of relying on the skill's auto-trigger alone.

**Why it's a hard rule and not "just a skill"**: a skill's auto-trigger from a fresh session is **not guaranteed**. Two reasons:

1. If the skill is ever placed in a category subfolder (`.claude/skills/<group>/<name>/`), the registry won't see it at all — it reads only the first level. (This is why the skill ships flat. See [`../../docs/onboarding-checklist.md`](../../docs/onboarding-checklist.md) Step 1.)
2. Even when flat and registered, the model still has to *recall* to invoke it on an intent sentence. A new session with a cold context may not.

A CLAUDE.md rule is read at the **start of every session**. Putting the trigger in CLAUDE.md gives you a second, reliable path ("Path 2") to fire the gate — independent of whether the registry auto-trigger happens to catch the request. The two paths together (registry auto-trigger + CLAUDE.md hard rule) make the gate dependable.

---

## Copy this into your CLAUDE.md

> Renumber `Rule N` to fit your existing rules. Replace `<the architecture-completeness-guardian skill>` with the path you installed it at.

```markdown
N. **Architecture-change declarations must go through the architecture gate**:
   When the user declares any "I want to build X / add a field / add a route /
   add a setting / change a trace node / clean up the X mess / consolidate N
   existing X" — any **architecture-change intent** — you MUST run
   `<the architecture-completeness-guardian skill>` and produce its full 4-part
   report (scenario classification / dispatch plan / 5-layer codebase gaps /
   placement check) before starting implementation.

   **SKIP only when**: pure copy / pure styling / a one-line typo / fixing an
   existing bug that does NOT extend schema, add a route, add a setting, or
   touch a trace node.

   **Do not let other rules pre-empt this.** In particular, an "audit-first"
   planning rule is scoped to the planning command, not to this gate — this
   gate IS an audit-before-build design, so trigger it directly. (See
   audit-first-vs-architecture-gate-boundary.)

   **Three enforced behaviors**: ① an intent sentence ("I want to / want to add
   / want to extract / want to unify / want to figure out / want to clean up")
   → trigger the gate; ② the Part-0 triage threshold runs first so trivial
   tasks exit early; ③ when not exited, Parts 1-4 are produced in full.
```

---

## Customize

- **`N`** — pick a free rule number in your CLAUDE.md.
- **`<the architecture-completeness-guardian skill>`** — the install path, e.g. `.claude/skills/architecture-completeness-guardian/SKILL.md`.
- **The intent verbs** — the example list ("build / add / extract / unify / figure out / clean up") is English; if your team works in another language, list that language's equivalents so semantic matching works.
- **The SKIP clause** — keep it tight. The cost of triggering on a borderline case (two wasted minutes) is far less than the cost of skipping a real architecture change (a missed audit).

---

## Why the wording is pushy

The rule is written as "you MUST … before starting implementation", not "consider running …". Soft wording loses to the agent's default eagerness to start coding. The rule's whole job is to insert a gate *before* the first line of implementation, so it has to be imperative.

The "do not let other rules pre-empt this" clause is defensive: it anticipates the specific failure where an agent uses some *other* cautious-sounding rule as license to skip the gate. Naming the collision in the rule text blocks it at read time.

---

## Related

- [`../skills/architecture-completeness-guardian/SKILL.md`](../skills/architecture-completeness-guardian/SKILL.md) — the skill this rule guarantees the firing of
- [`../concepts/governance-hierarchy.md`](../concepts/governance-hierarchy.md) — why the L0 gate must fire first
- [`../concepts/audit-first-vs-architecture-gate-boundary.md`](../concepts/audit-first-vs-architecture-gate-boundary.md) — the collision the "do not pre-empt" clause guards against
- [`../../docs/known-limitations.md`](../../docs/known-limitations.md) — why auto-trigger alone is insufficient (the honest disclosure)
