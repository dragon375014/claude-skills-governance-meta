# Governance Hierarchy (L0 / L1 / L2)

A coding agent with a dozen governance skills has a routing problem nobody talks about: **which skill catches a request, and in what order?** Without an explicit hierarchy, skills fire on keyword luck, two skills both think they own a request, or — worse — a request falls between all of them and none fires.

This is the three-tier model that solves it. It is stack-agnostic: it describes how *agent skills* relate to each other, not how your app is built.

---

## TL;DR

| Tier | Role | Triggered by | Relationship |
|---|---|---|---|
| **L0 entry gate** | catch the user's *declaration*, classify it, decide who to pull | natural-language **intent sentence** | pulls L1, spawns L2 |
| **L1 domain specialist** | deep checks for one domain | (a) dispatched by L0, or (b) an **action sentence** ("I'm editing file X") | dispatched by L0, spawns L2 |
| **L2 sub-tool / agent** | one specific grep / audit / scan | spawned by L0 or L1 | reports, then vanishes |

The defining test is the **shape of the sentence that triggers each tier.**

---

## The shape-of-sentence test

This is the whole model in one idea. Read the trigger description of any skill and ask what sentence shape it responds to:

- **Intent sentence** → "I want to build X", "let's clean up the X mess", "I'm thinking about adding Y." The user has a goal but no file open yet. **L0.**
- **Action sentence** → "Use when modifying file X", "before adding a column to table Y", "when editing the checkout RPC." There is a concrete artifact in hand. **L1.**
- **No user trigger at all** → the skill is described as an agent role; it's invoked programmatically. **L2.**

Most governance skills people write are L1: they trigger on "before modifying X". That leaves a hole. A brand-new feature ("I want to build user favorites") has **no X to modify yet** — no L1 skill matches, so nothing fires until the user has already written the wrong thing. The L0 gate exists precisely to catch the intent sentence before any file exists.

---

## Why order matters: the dispatcher problem

When a user declares an architecture change, **L0 must fire first** — ahead of other memory rules and governance rules.

The reason is mechanical, not stylistic. Only L0 knows the full map of L1 skills. A real "I want to add a quantity-edit feature" touches the write side, the state-sync layer, the permission gate, the multi-entry-point parity, and possibly a cross-layer trace. That's four or five L1 skills. If L0 doesn't fire first, the user (or the agent acting ad-hoc) has to *remember to pull all five themselves* — which defeats the entire point of having a dispatcher.

```
User: "I want to add a quantity-edit feature"
         │
         ▼
   ┌──────────────┐   classify scenario
   │  L0 gate     │──────────────────────┐
   └──────────────┘                       │
         │ pulls                           │ spawns
         ▼                                 ▼
   ┌──────────────┐                 ┌──────────────┐
   │ L1 prior-art │                 │ L2 Explore   │
   │ L1 contract  │                 │   subagent   │
   │ L1 multi-... │                 │ (5-layer scan)│
   └──────────────┘                 └──────────────┘
```

Skip L0 and you get the **"pull the wrong skills" failure**: the agent grabs one L1 skill that happened to keyword-match and calls the task done, missing the other four layers.

---

## The audit-first trap

There's a specific way this hierarchy gets broken in practice: an "audit-first" or "plan-before-you-act" rule written for one entry point (e.g. a `/goal`-style planning command) gets *generically* applied, and the agent uses it to **skip the L0 gate** under the banner of "I should audit first."

This is backwards. The L0 gate **is** the audit — its whole output is a four-part completeness report. There is no need to add a second audit-first layer on top; doing so just means the agent does a vague audit instead of the structured one.

The fix is to scope the audit-first rule explicitly to its real entry point, and to state in the L0 skill's own description: *"Do not skip under an audit-first justification — that rule's scope is the planning command, not this skill."* Full discussion: [`audit-first-vs-architecture-gate-boundary.md`](./audit-first-vs-architecture-gate-boundary.md).

---

## Classifying a skill you already have

To place an existing skill in the hierarchy, read its trigger description:

| The description says… | Tier | What to check |
|---|---|---|
| "when the user wants to / declares / is thinking about…" | L0 | is it *the only* L0? two L0 gates competing is a smell |
| "Use when modifying / before adding / when editing [specific thing]" | L1 | does an L0 gate know to dispatch it? |
| written as an agent persona, no user-facing trigger | L2 | is it only ever spawned, never user-triggered? |

A healthy governance setup has **exactly one L0 gate**, several L1 specialists it dispatches, and a handful of L2 agents the gate and specialists spawn. Two L0 gates means two things will fight to own every declaration; zero L0 gates means new-feature declarations fall through.

---

## Applying this to your project

1. Inventory your governance skills. Tag each L0 / L1 / L2 by the shape-of-sentence test.
2. If you have **zero** L0 gates, that's the gap to fill first — install [`../skills/architecture-completeness-guardian/SKILL.md`](../skills/architecture-completeness-guardian/SKILL.md) and customize its dispatch table to point at your L1 skills.
3. If you have **two** L0 gates, merge or scope them so exactly one owns architecture-change declarations.
4. Write the dispatch table (scenario → which L1 skills) explicitly. Fuzzy keyword routing is unstable; an explicit table is the SSOT for "what gets pulled when".

---

## Related documents

- [`../skills/architecture-completeness-guardian/SKILL.md`](../skills/architecture-completeness-guardian/SKILL.md) — the reference L0 gate implementation
- [`audit-first-vs-architecture-gate-boundary.md`](./audit-first-vs-architecture-gate-boundary.md) — the audit-first scoping trap in detail
- [`trace-surface-spirit.md`](./trace-surface-spirit.md) — one L1 skill (trace-lock) and the spirit-vs-letter gap in its trigger
- [`../../defensive-vs-offensive-governance.md`](../../defensive-vs-offensive-governance.md) — the orthogonal axis: skills are advisory governance; CI guards are enforcing governance
