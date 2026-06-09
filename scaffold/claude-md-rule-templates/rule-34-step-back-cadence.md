# CLAUDE.md Rule Template — Step-Back Cadence (the reverse organ)

**What this rule does**: gives your governance system its first **non-forward** trigger. Every other rule fires when you *do* something (commit, change a file, declare a build). This one fires on a *cadence* and on *adversarial asks*, so that "step back and look at the whole" happens without you having to remember to ask for it.

**Why it's a rule and not just a skill**: the adversarial review skill (Part 1) only fires when invoked. Left at that, you're back to "it only happens when I proactively ask" — which is exactly the forward bias this is meant to cure. The rule adds the two clocks that make stepping back *automatic*: a cross-session clock (sentinel in CI + at session open) and an in-session clock (every N commits). See [`../concepts/forward-bias-and-the-reverse-organ.md`](../concepts/forward-bias-and-the-reverse-organ.md) for why the bias exists.

**Prerequisite**: this rule assumes you've installed the [step-back-review skill](../skills/step-back-review/SKILL.md) (Part 1) and the [step-back sentinel](../../step-back-sentinel-template.mjs) (Part 2). The rule is Part 3 — the wiring.

---

## Copy this into your CLAUDE.md

> Renumber `Rule N`. Replace `<sentinel>` with your sentinel path and `<step-back skill>` with the skill path. Tune `N=3` (commits) to your commit cadence.

```markdown
N. **Step-back cadence — the reverse organ**: every rule here is forward-triggered
   ("I want to build X", "change this file"). NONE fires on "step back and look at
   the whole." A solo developer has no structural reviewer / QA / devil's-advocate
   PM, and the coding agent's default eagerness amplifies the forward pull. This
   rule is the counterweight.

   **Two clocks**:
   - **Cross-session (script, not memory)**: `node <sentinel>` runs at session open
     and in `audit:all` (advisory, never blocks push). It compares a last-review
     marker to HEAD and detects *asymmetric footprints* (half-finished symmetry:
     wrote the upstream, didn't register the downstream; changed the write side,
     didn't update the serializer). After a review, run `<sentinel> --ack` to reset
     the baseline.
   - **In-session (this rule binds the agent)**: every N=3 commits in one
     conversation, proactively run `node <sentinel> --since 3` and report once
     — clean → one line; findings → give the user a "review now / review later"
     choice, never force-interrupt. This is the system's first cadence trigger.

   **"Speak only when it has something to say"**: the sentinel is a detector, not a
   timer. Clean → silent (exit 0). Asymmetry found → exit 1 and print an *earned
   interrupt* (each finding maps to a past incident class, so the interruption is
   self-justifying and won't get muted).

   **Deep review goes through the skill**: the sentinel only detects + nudges. For
   actual end-to-end tracing / gap analysis / devil's-advocate / handoff-test /
   scope-creep checks, dispatch `<step-back skill>` (a deliberate ADVERSARY persona,
   not a helpful gatekeeper). Trigger words: step back, end-to-end, data flow, manual
   seam, single point of failure, gap analysis, handoff test, devil's advocate,
   scope creep, over-engineering.

   **Restraint**: forward bias is mostly correct (without it you never ship). This
   rule adds a small periodic counterweight; it does NOT rebalance the whole system
   and it never blocks.
```

---

## Customize

- **`N` (commits)** — start at 3. If your commits are tiny, raise it; the clock should fire roughly once per "chunk of work", not per keystroke-sized commit.
- **The sentinel's tripwires** — these are project-specific. Seed them from *your* incident history (your "changed A, forgot B" classes). The template ships with generic ones; replace them. See the template's header.
- **The trigger words** — translate to your working language so semantic matching works.
- **Marker storage** — commit the last-review marker file (it's shared coordination state, like a work board). Conflicts on a 2-line JSON are trivial; the value of a shared cross-session baseline outweighs the churn.

---

## Why the wording matters

- **"never blocks"** is stated twice on purpose. The instant a step-back check can fail CI, someone will try to make "is this over-engineered?" a binary — and either game it or disable it. Stepping back is advisory by nature.
- **"give the user a review-now / review-later choice"** is the anti-mute clause. Cadence interruptions that can't be deferred get silenced wholesale (the "are you sure?" dialog death). Always offer defer.
- **"ADVERSARY persona, not a helpful gatekeeper"** is the load-bearing phrase for Part 1. Without it the agent stays in collaborator mode and produces a polite checklist that ends in praise — which defeats the purpose.

---

## Related

- [`../concepts/forward-bias-and-the-reverse-organ.md`](../concepts/forward-bias-and-the-reverse-organ.md) — why the bias exists and the three-part fix
- [`../skills/step-back-review/SKILL.md`](../skills/step-back-review/SKILL.md) — Part 1, the adversarial skill this rule dispatches
- [`../../step-back-sentinel-template.mjs`](../../step-back-sentinel-template.mjs) — Part 2, the sentinel this rule schedules
- [`../../defensive-vs-offensive-governance.md`](../../defensive-vs-offensive-governance.md) — the two forward modes this rule adds a reverse axis to
