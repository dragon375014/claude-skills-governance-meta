# Why the skill layer exists

This repo started as copy-paste docs and two `.mjs` linters. The skills — `architecture-completeness-guardian` and `trace-lock-modify` — are a later addition, and they solve a different problem than the templates do. This explains the gap they fill, so you can tell whether you have that gap.

---

## The templates catch bad code. The skills catch missing thought.

A `governance-guard.mjs` rule fires when bad code already exists — `{ ...obj, ssot_field: x }` is in the diff, block it. That's necessary but late: the design decision that produced the bad line was made minutes or hours earlier, when someone decided *how* to build the feature.

The skill layer moves upstream of the code. It fires on the **declaration** — "I want to build X" — before any line is written, and asks: which layers does this touch, which existing checks should run, where should it live? It's the difference between a spell-checker (catches the typo) and an outline (catches the missing section).

| | Templates (`.mjs`) | Skills |
|---|---|---|
| Fires on | a diff containing a known anti-pattern | a natural-language intent declaration |
| Timing | at commit / build (code exists) | before implementation (no code yet) |
| Catches | a specific wrong line | a missing layer / wrong placement / un-dispatched check |
| Failure if absent | the anti-pattern slips through | the feature ships half-built and you find out in production |

---

## The specific gap: new-feature declarations have no home

Most governance skills people write trigger on *"before modifying field X"* / *"when editing the checkout RPC"* — an **action** on an existing artifact. That leaves a hole exactly where the most expensive mistakes start: a **new** feature.

"I want to add user favorites" has no field to modify, no file open, no diff. No action-shaped skill matches. So nothing fires until the developer has already chosen an architecture — often the wrong one (writes directly to the DB instead of through an RPC, hardcodes a value the frontend should read, lands the page in the wrong permission group). The guardian exists to catch the intent sentence and run a completeness pass *before* that choice hardens.

This is the **L0 entry gate** in the [governance hierarchy](../scaffold/concepts/governance-hierarchy.md): the one skill whose job is to catch declarations and route them to the action-shaped skills.

---

## Why trace-lock is its own skill

A cross-layer chain (a value written here, transformed there, rendered somewhere else) is the most fragile structure in a growing codebase, because each end can be edited in isolation by someone who doesn't know the other ends exist. The trace-lock skill makes the chain a registered, tested asset and forces an audit before any node — or any new reader — touches it.

It's separate from the guardian because it triggers on a narrower, action-shaped event (editing a registered node) and has its own 5-step procedure. The guardian *dispatches* to it; it doesn't contain it. See [trace-surface-spirit.md](../scaffold/concepts/trace-surface-spirit.md) for the subtle part — why a read-only reader still counts.

---

## What earned these (not designed up front)

Both skills carry clauses that look over-specified until you know they're scar tissue:

- The guardian's *"don't skip under an audit-first justification"* line exists because an agent once used a planning rule as license to skip the gate.
- The guardian's R0 reverse-cleanup trigger went from "must name the skill explicitly" to "match on intent" because a *"let's clean up the modal mess"* declaration was missed.
- The trace-lock spirit clause (read-only readers count) exists because a strong review explicitly declined to register a read-only reader, reasoning "it doesn't write, so it doesn't apply."

These are documented as [case studies](../examples/case-studies/). They're the reason the skill descriptions are pushy and defensive rather than polite — each clause blocks a specific failure that actually happened.

---

## When you do NOT have this gap

Be honest about it. You don't need the skill layer if:

- your project is small enough that you hold the whole architecture in your head (the gate routes to nothing)
- you have no other governance skills for the gate to dispatch to (it becomes a checklist with no teeth)
- you have no cross-layer chains where one end silently breaks another (trace-lock guards nothing)

In those cases the `.mjs` templates are the right amount of governance, and the skills are premature. The [fitness check](../adoption-fitness-check.md) draws that line per-project.

---

## Related

- [`../scaffold/concepts/governance-hierarchy.md`](../scaffold/concepts/governance-hierarchy.md) — where the skills sit relative to each other
- [`known-limitations.md`](./known-limitations.md) — what the skill layer does NOT guarantee
- [`../examples/case-studies/`](../examples/case-studies/) — the incidents that shaped the skill clauses
