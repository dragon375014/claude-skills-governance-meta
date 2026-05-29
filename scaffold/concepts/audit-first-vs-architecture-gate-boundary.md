# Audit-First vs. Architecture-Gate: a scoping boundary

Two governance rules sound almost identical and routinely collide:

- **"Audit first"** — before turning a fuzzy idea into a committed plan, do a candidate audit and let the user pick.
- **"Architecture gate"** — before building any architecture change, classify it, dispatch the right checks, and produce a completeness report.

Both say "don't just dive in." Both involve looking before leaping. So an agent reading them tends to **merge them**, and the merge produces a specific failure: the agent invokes "audit first" as a reason to **skip** the architecture gate. This document is the boundary that keeps them apart.

---

## They have different scopes

| | Audit-first rule | Architecture gate |
|---|---|---|
| **Scope** | a planning entry point only (e.g. a `/goal`-style "help me design a goal" command) | every architecture-change declaration |
| **Trigger language** | "find the parts of X worth turning into a goal", "help me plan", "I want to make a goal out of X" | "I want to build X", "add a field to Y", "let's clean up the X mess" |
| **Input** | a fuzzy wish ("I want to do *something* about X") | a concrete intent ("I want to build *this specific thing*") |
| **Action** | candidate audit → traffic-light triage → archive the options → user picks one to formalize | classify scenario → dispatch domain skills → spawn a codebase scan → 4-part report |
| **Output** | a shortlist of well-scoped goal candidates | a completeness report + a dispatch plan for one declared change |
| **Purpose** | turn "I want to do something" into "I will do *this*" | turn "I will do this" into "here's everything that touches" |

The two are **sequential, not alternative**: audit-first lives upstream (deciding *what* to do), the architecture gate lives downstream (deciding *how completely* to do the chosen thing). Using one to skip the other collapses two stages into a vaguer one.

---

## The collision in practice

A real sequence that went wrong:

> User: "let's clean up the CRUD and modal mess."

The agent had an audit-first rule in memory. It reasoned: *"there's a rule that says audit before jumping into a skill — so I shouldn't jump into the architecture gate, I should do my own audit first."* It then self-sequenced an ad-hoc audit and never invoked the gate.

The mistake is that "clean up the X mess" is a **declared architecture change** (a reverse-cleanup scenario), which is exactly what the architecture gate owns. The audit-first rule was scoped to a *planning command* the user never invoked. The agent generalized a narrowly-scoped rule into a broad one.

The result: a vague self-made audit instead of the structured 4-part report (scenario classification → dispatch plan → 5-layer codebase gaps → placement check). The user got less, not more.

---

## Why the architecture gate is *already* audit-first

The deepest reason the collision is wrong: **the architecture gate is itself an audit-before-build design.** Its entire output is an audit — it classifies, it scans the real codebase, it reports gaps before a line is written. There is no "build" step inside it.

So "I should audit first, therefore skip the gate" is self-defeating: the gate *is* the audit. Skipping it to "audit first" means replacing a structured audit with an unstructured one.

---

## The fix: scope the rule, state the exception

Two concrete moves:

1. **Scope the audit-first rule to its real entry point.** Write it as "Use when [the planning command] is invoked" — not "Use before any skill." A rule with an unstated scope gets applied everywhere.

2. **State the exception in the gate's own description.** The architecture-gate skill should say, in its trigger description:

   > Do NOT skip under an "audit-first" justification — that rule's scope is the planning command, not this skill. This skill IS an audit-before-build design.

This is defensive writing: it anticipates the exact misgeneralization and blocks it at the point where the agent reads the trigger. The shipped [`architecture-completeness-guardian`](../skills/architecture-completeness-guardian/SKILL.md) carries this line.

---

## A rule of thumb for any two "look before you leap" rules

When two governance rules both counsel caution, they will collide unless each one answers:

- **What entry point am I scoped to?** (which command / which sentence shape)
- **What do I produce that the other doesn't?**
- **Am I upstream or downstream of the other?**

If you can't answer all three for both rules, you have a latent collision. Write the scope into each rule's trigger before the agent has to guess.

---

## Related documents

- [`governance-hierarchy.md`](./governance-hierarchy.md) — the L0/L1/L2 model; the architecture gate is the L0, audit-first guards a different entry
- [`../skills/architecture-completeness-guardian/SKILL.md`](../skills/architecture-completeness-guardian/SKILL.md) — see its Part 0.5 (priority vs. a requirements-review rule) for the same boundary applied to decision-vs-build language
