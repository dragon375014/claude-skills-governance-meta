# Forward Bias and the Reverse Organ

Both defensive and offensive governance are **forward-triggered**: they fire on a code event — a commit, a changed file, a new migration. Neither fires on the *absence* of forward motion. That gap is the forward bias, and most solo-dev governance systems have it without noticing.

This doc names the bias, explains why governance-as-code grows into it by default, and describes the pattern that closes it: a **reverse organ** — a small, deliberate, periodic counterweight that triggers *stepping back* instead of *moving forward*.

---

## TL;DR

| | Defensive | Offensive | **Reverse (this doc)** |
|---|---|---|---|
| Fires on | a code change entering | a scheduled / event scan | **a cadence, or an adversarial ask** |
| Asks | "is this a known anti-pattern?" | "does a latent bug already exist?" | **"should we even be doing this? where will it bite? what's over-built?"** |
| Persona | gatekeeper | auditor | **adversary** |
| Direction | forward (blocks the next step) | forward (scans what was built) | **backward (stops and looks at the whole)** |
| Tolerance | zero false positives | advisory | advisory, but must *earn* each interruption |

Defensive + offensive together still leave you only ever looking **forward**. The reverse organ is the third axis.

---

## Why governance-as-code grows forward-biased

Four structural reasons. None is a mistake; they're what the medium does by default.

### 1. Governance is scar tissue

Almost every rule is born from one incident. Scar tissue only forms where there was a wound, and a wound only happens when you *did something*. You never grow a rule from "a thing I should have noticed but didn't" — nothing broke, nothing hurt, no rule. So the rule set densifies around **doing the wrong thing** and stays blank around **not seeing**. Stepping back is about the things that don't hurt *yet* — there is no pain signal there, so no rule grows there.

### 2. A solo developer has no structural "other"

On a team, "step back and poke holes" is **other people**: the PR reviewer, QA, the PM who asks "do we even need this?" Their value is precisely that they don't stand where you stand. A solo developer has no structural other. You can't internalize the reviewer because *you are the builder*, and at the moment of building your head is in build mode. This is a **role gap, not a knowledge gap** — you know how to review; you have no moment where you're wearing the reviewer's hat instead of the builder's.

### 3. The coding agent amplifies the bias instead of cancelling it

A coding agent is trained to be helpful — to *do the thing*. Say "I want to build X" and every fiber pulls toward "great, let's build X". It does not naturally say "should we?". So a forward-biased solo dev paired with a forward-biased agent **compounds** the bias rather than balancing it. Rules you write to brake this are brakes you have to remember to press.

### 4. The system's own quality bar excludes the fix

Mature governance has a rule like *"a rule without an automated, greppable check is just a slogan."* That bar is correct for defensive rules. But "is this over-engineered?", "would a new person get stuck here?", "where's the single point of failure?" are **judgment calls you can't grep**. So step-back review structurally fails the system's own definition of "a real rule" — and therefore never gets built as one. The governance system has an immune response that rejects exactly the soft, qualitative mechanism that stepping back requires.

---

## The reverse organ: three parts

The fix is **not** to rebalance the whole system. Forward bias is mostly correct — a developer who runs full gap-analysis on everything never ships. Add a *small* counterweight, three parts:

### Part 1 — An adversarial review skill (the missing "other")

A skill that, when invoked, makes the agent **stop being a collaborator and become an adversary**. Its job is not to help finish the design — it's to find where the design will break, what's redundant, and where it will trap whoever inherits it. The agent is the one place a solo dev can get a genuine "other", *because it has no ego investment in the design and can actually attack it.* Iron rules: don't soften, don't end with reassurance, don't slip back into "want me to build it?". (See [`../skills/step-back-review/SKILL.md`](../skills/step-back-review/SKILL.md).)

### Part 2 — An asymmetry sentinel (the "speak only when it has something to say")

A cadence trigger that runs a cheap pre-check and stays silent unless it trips. The insight that makes "silent unless it trips" tractable: **most incidents in a maturing codebase are asymmetries** — "changed A, forgot B":

- changed an RPC's return shape, forgot the serializer whitelist → frontend gets null
- added a config row, forgot the admin UI → orphan setting no one can edit
- added a public function, forgot the auth-bypass config → 401 after redeploy
- added an env var, forgot the example file → next machine breaks

So the sentinel is **not a timer** — it's a *half-finished-symmetry detector*. No half-finished symmetry → it says nothing. When it does speak, every finding maps to a past incident class, so the interruption is **pre-justified** ("earned interrupt") and the developer won't mute it. Crucially, a blind timer ("review every 30 min") gets muted like every "are you sure?" dialog; an earned interrupt does not. (See [`../../step-back-sentinel-template.mjs`](../../step-back-sentinel-template.mjs).)

### Part 3 — A cadence rule (the first non-forward trigger)

A CLAUDE.md rule that wires Parts 1–2 into two clocks:

- **Cross-session clock**: run the sentinel at session open + in CI/pre-push (advisory, never blocking), comparing a "last reviewed" marker to HEAD. Catches drift accumulated over days. Doesn't rely on memory.
- **In-session clock**: every N commits within one conversation, run the sentinel and report once. Catches tunnel vision forming inside a long session. This is the **first trigger in the whole system that fires on cadence rather than on a forward action.**

(See [`../claude-md-rule-templates/rule-34-step-back-cadence.md`](../claude-md-rule-templates/rule-34-step-back-cadence.md).)

---

## Design constraints (learned the hard way)

- **Earn every interruption.** Silent when clean. When it speaks, attach the evidence (file:line) and the incident class it maps to. An advisory that cries wolf gets `--no-verify`'d into oblivion, same as a bad defensive rule.
- **Advisory, never blocking.** Stepping back is a judgment call. A blocking step-back rule is a contradiction — you can't `exit 1` on "this might be over-engineered."
- **Adversary, not checklist.** Part 1's value is the persona switch. A polite checklist that ends with "overall looks great 👍" has not switched personas and is useless. The whole point is a voice that *isn't on your side*.
- **Don't over-correct.** The reverse organ is a *counterweight*, not a new center of gravity. If stepping back starts blocking shipping, you've rebuilt the thing forward bias was protecting you from.

---

## When you need this

Run the [adoption fitness check](../../adoption-fitness-check.md). The reverse organ earns its keep when **all** of these hold:

- **Solo or near-solo** — no human reviewer / QA structurally present. (On a team, people *are* the reverse organ; this is premature.)
- **A coding agent does substantial building** — the amplification in reason #3 is real for you.
- **The codebase is past its first incidents** — you have an incident history to seed the sentinel's asymmetry list. Below that, you're guessing at what to watch.

Premature below that bar. The smallest useful version is Part 1 alone (the adversarial skill, invoked manually); add Parts 2–3 once you have incidents to detect.

---

## Related

- [`../../defensive-vs-offensive-governance.md`](../../defensive-vs-offensive-governance.md) — the two forward-triggered modes this doc adds a third axis to
- [`../skills/step-back-review/SKILL.md`](../skills/step-back-review/SKILL.md) — Part 1, the adversarial review skill
- [`../../step-back-sentinel-template.mjs`](../../step-back-sentinel-template.mjs) — Part 2, the asymmetry sentinel (runnable template)
- [`../claude-md-rule-templates/rule-34-step-back-cadence.md`](../claude-md-rule-templates/rule-34-step-back-cadence.md) — Part 3, the cadence rule
- [`../concepts/governance-hierarchy.md`](./governance-hierarchy.md) — where the reverse organ sits relative to L0/L1/L2
