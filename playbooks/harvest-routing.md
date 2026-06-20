# Playbook: Harvest Routing

A procedure for taking a one-off fix or insight and routing its reusable lesson to a durable home — automatically raised, ratified by you before it is written.

Use when a fix recurs, a structural bug finally closes, or a session produces a named insight — and the lesson would otherwise rot in one project's commit history while another project hits the same thing.

---

## The single point of failure this removes

In a solo / small-team setup, "pull the reusable lesson back to its source" almost always depends on a human **remembering to do it**. Remembering is the single point of failure — so reusable pitfalls, patterns, and pure logic stay stuck where they were first learned.

This is the same trap as a governance rule with no automated enforcement: *a rule nobody is reminded to apply decays into a slogan.* A harvest skill you must remember to invoke decays the same way. So the value here is **not the classification — it's that the hand-raise is automatic.**

Principle: **auto-raise, human-ratify.**
- **Raise (trigger) must be automatic** — the system raises its hand without being asked. This is what removes the SPOF.
- **Write must stay manual** — propose the home and draft the entry; only write after a human says yes. Auto-filing a half-baked lesson is worse than not filing it (fail-closed).

---

## Two trigger layers (so the hand-raise doesn't depend on memory)

| Layer | Signal | How it fires | Catches / misses |
|---|---|---|---|
| **Mechanical** | git churn | the step-back sentinel's recurrence / thrash / hard tripwires print a 🌾 harvestable signal, wired into your audit runner + per-N-commit cadence | ✅ recurring pain (fixed a 3rd time = strongest signal) / ❌ first-time-obvious reuse |
| **Semantic** | judgment | a skill whose trigger description matches "finished a structural fix", "named insight", "worth a blog", "this will hit another project" | ✅ first-time-obvious reuse, blog-worthy insight / ❌ what no one noticed |

> ⚠️ Don't trigger blog/harvest capture on context size. Context size is the right signal for *handoff* (you're running out of room), but harvest-worthiness is a *semantic* signal (a nameable lesson appeared), unrelated to conversation length.

---

## Step 1 — Worth-it gate (most things should be dropped)

Run before routing anything. **Any one fails → drop, leave no trace:**

1. **Not rare** — will this class of problem recur (Rule of Three: a 3rd occurrence, or one you can already foresee repeating)?
2. **Spills over** — will another project, or future-you, hit it — not a one-off quirk of this project?
3. **Cheap to capture** — can a copied contract / a logged pitfall / one rule carry it, without rewriting a whole subsystem?

All three hold → route. Otherwise drop. Most recurring fixes are project noise.

---

## Step 2 — Route by type (lesson type × scope)

The homes already exist; this step only sorts. Map each surviving lesson to its durable home:

| Lesson type | Durable home | Scope |
|---|---|---|
| Reusable pure logic / capability | your reusable-code index (manifest / capabilities doc) | 🌐 global |
| Cross-stack pitfall (negative knowledge) | a cross-project GOTCHAS doc | 🌐 global |
| Reusable method / SOP | a skill or playbook | 🌐 global |
| Reusable insight / narrative | a content/blog draft (defer the *batch* pass to your retrospective session-miner; don't build a parallel pipeline) | 🌐 global |
| Invariant that must never regress | a governance-guard rule / lint | 🔒 project (pattern can generalize) |
| Why you did / didn't do X | a decision record (ADR) | 🔒 project |
| Project-specific durable fact | project memory | 🔒 project |
| Failed the gate / noise | **drop** | — |

One lesson can hit several rows (a recurring bug → a governance rule to pin it + a GOTCHAS entry for other projects + a blog draft). Propose each separately.

---

## Step 3 — Propose, then write only on ratification

For each home, emit a proposal:

```
🌾 Harvest proposal #N
  Lesson:   <one line>
  Type:     <which row>   |   Scope: <🌐 / 🔒>
  Home:     <repo + path>
  Worth-it: not-rare ✅ / spills ✅ / cheap ✅
  Dedupe:   <parts already harvested elsewhere — exclude them>
  Draft:    <paste-ready content, grounded in the actual diff — don't fabricate from commit subjects>
  Pointer:  <which index / README line to add>
```

On "yes" → write the file, add the pointer, commit. On "no / route elsewhere" → comply. **Never auto-write.**

---

## Relationship to retrospective mining (don't reinvent)

This playbook is the **real-time, per-event** front end. A **retrospective batch miner** (scan months of session history for aggregate patterns → turn into rules / skills / blog material) is the back end. They feed the *same* homes — so when a lesson is content/blog-shaped, route it to the miner's output directory rather than standing up a second pipeline.

Before creating a new home, grep for an existing one. The most common harvest mistake is reinventing a warehouse you already built.
