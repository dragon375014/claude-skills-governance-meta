# Forcing-Function Asymmetry (Inward vs Outward)

**A governance system harvested from incident scars grows forcing functions only for the family of failures it has been *burned* by — almost always the "inward" family (correctness, safety, integrity, completeness). The "outward" family (reach users, convert, deliver value, get revenue) rarely burns you with a *visible incident*, so it never gets a forcing function — even when your stated intent explicitly wants those outcomes. Outward deliverables then lag systematically: not from laziness or missing intent, but because no upstream grammar forces them to be born the way inward ones are.**

This is a *design-time* pattern (see [defensive-vs-offensive-governance](./defensive-vs-offensive-governance.md)). It is about the shape of the rule/check set you accumulate — and the whole class of outcome it is structurally blind to.

> **Sibling axis.** [forward-bias-and-the-reverse-organ](./scaffold/concepts/forward-bias-and-the-reverse-organ.md) names the *temporal* blindness: all governance triggers fire *forward* ("before you ship X, check X"), none fire *backward* ("step back and look at the whole"). This doc names the *value-direction* blindness: all forcing functions guard the *inward* family, none guard the *outward* one. Same meta-shape — governance grows only along the axis its incidents happen to lie on — measured on two orthogonal axes (time vs direction-of-value). If you have built the reverse organ, you have proof the pattern generalizes; this is the second organ.

---

## The mechanism: why the asymmetry is self-reinforcing

Forcing functions (blocking CI checks, sentinels, hard rules) are **harvested from incidents**. That harvesting step has a bias baked in:

| | Inward failure | Outward failure |
|---|---|---|
| Example | a bug, a 403, a data leak, a broken invariant | nobody converted; traffic you can't see; a front door with no revenue path |
| Incident shape | **sharp, local, reproducible** | **diffuse non-event** |
| Harvestable? | yes → easy to write a blocking check at the site | no → there is no crash to trace back from |
| Result | gets a rule + audit + sentinel | gets nothing forcing |

The very mechanism that *builds* governance — *scar → rule* — is **blind to the outward family**, because outward failures don't produce scars. So a maturing codebase accumulates an ever-richer inward forcing set while the outward set stays empty, and the gap widens precisely as the team gets more disciplined.

The trap: the team reads their rich inward forcing set as "we have strong governance" and concludes their outward lag is an execution/motivation problem. It isn't. It's structural.

---

## The differential-atom test (detect it in your own repo)

Find a place where the two families sit side by side on the same machine:

> Look for a **read-only status panel** that reports an *outward* metric (publish queue empty, zero conversions, no signups). Check its exit code. If it `exit 0`s (a **silent gauge**) while your inward checks `exit 1` and block the build (a **red gate**) — that contrast *is* the asymmetry, made concrete. Same repo, same author, two postures: one family gets a gate, the other gets a gauge.

A second, finer tell: when an outward instrumentation task *finally* gets attention, does it grow only the **free/passive half** (drop in a base analytics tag → page-views appear) while the **per-surface deliberate half** (a conversion event on each call-to-action) still doesn't get born? That micro-fractal — passive half ships, deliberate half doesn't — is the same absence replaying inside a single deliverable, for the same reason: no forcing function enumerates the surfaces.

---

## The check (the reusable lens)

1. **Read your declared intent.** Your north-star / project charter / top-level goals — the layer that *states* what must exist. Note every outward outcome it names (users, conversion, revenue, distribution, adoption).
2. **Enumerate your forcing set.** List every blocking CI check, every sentinel, every hard rule. (In one setup this was the aggregator that runs pre-push.)
3. **Tag each inward vs outward.** Inward = "is the thing built correctly / safe / consistent / complete." Outward = "did the built thing reach anyone / convert / earn."
4. **Compare.** If intent declares outward outcomes but the forcing set is ~100% inward, you have a structural asymmetry — and your outward lag is explained by it, not by your team.

The finding is *mechanically verifiable*, not a vibe: it is a grep/inventory of your own checks, tagged.

---

## The fix: quantifier-height matching, not N tasks

The outward category is usually **unenumerable at spec time** — you cannot list every future call-to-action, channel, or front door. So **do not hand-add N outward tasks**; that is exactly what keeps leaking. Instead, build an outward forcing organ **symmetric to the inward ones**:

- **A universal rule** (a single all-quantifier law): *every outward surface must either (A) wire its value/conversion path + instrument it, (B) register an explicit "deliberately deferred" debt with a reason, or (C) prove it is not an outward surface.* Mirror the three-choice shape your inward rules already use.
- **Materialize the check where the material lives** (quantifier-height matching): conversion events live in the UI call-to-action layer → audit *that* layer; time-bound outward commitments live in the calendar/deadline machine → register them *there*. Exactly how a "new tables need permission grants" rule puts its check in the migrations layer, where tables are born.
- **Give it a gate, not a gauge:** the new check must be able to `exit 1` (and, before promotion to blocking, ship with a self-test proving it *can* go red — an outward check that has never failed is probably a false-green).

Root-cause layer ≠ fix point: the *disease* is "the governance grammar has no outward organ"; the *knife* goes in at the material layers, under one universal rule. Report them separately.

---

## Guardrail: the fix is itself an inward/build move

Building a governance organ to force outward delivery is, ironically, another *inward* action. Keep it minimal, and lead execution with the point-fixes that directly cash out (instrument the few real surfaces, wire the one revenue path) so the outward result appears early — then add the thin forcing layer to stop regression. Don't let "build the organ" become one more way to build instead of ship.

---

## When this applies / when it doesn't

- **Applies** when: intent explicitly names outward outcomes; your forcing set is inventoried as ~all-inward; the lag spans *every* outward channel and stays flat even after you re-prioritize toward it (a flat *whole category* points at grammar, not tasks).
- **Doesn't apply** when: the lag is a handful of independent tasks already burning down one by one; or the "missing" outward work is a *recorded, deliberate* deferral (a real business call, e.g. don't build the payment flow before your first paying customer). Distinguish "no decision was recorded" (a gap) from "a decision to defer was recorded" (not a gap).

---

*Harvested from a solo-developer production codebase whose inward forcing set (blocking permission-grant checks, RLS coverage, SSOT-drift sentinels, trace-locks) was mature while its outward set was empty — despite an intent layer that explicitly, repeatedly named revenue as the goal. The gap was found by counterfactual-climb root-cause diagnosis, not by listing undone tasks. Business specifics stripped; the asymmetry is domain-neutral.*
