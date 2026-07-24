---
name: crystallize
description: Post-session harvester. After a token-heavy piece of work, classify what you did into the cost-tier ladder (script / hook / skill / small-model / frontier) and route each repeatable piece to the cheapest tier that still does it correctly — so the reasoning you paid for once becomes cheap or free to repeat. Trigger after finishing a heavy analysis/build/review session, or on the words "crystallize", "harvest this", "how do we not pay for this again".
---

# Crystallize — turn a token-burn into reusable, cheaper mechanisms

This skill runs the [cost-tier-routing playbook](../../../playbooks/cost-tier-routing.md) as a deliberate post-session step. It is the *offensive* twin of harvest-routing: harvest-routing decides **where a lesson lives**; this decides **which compute tier runs it next time**.

## When to run

- A session just spent real tokens doing something that will recur (a review, an audit, a migration, a multi-step build).
- You catch yourself about to re-derive something you already worked out.
- Explicit: "crystallize this", "how do we not pay for this again", "make this 0-token next time".

Skip for genuinely one-off work with no repeatable shell.

## The one question

For each discrete piece of what was just done, ask:

> **How much irreducible *new* reasoning does this need each time it runs?**

Route to the cheapest tier that still produces a correct result:

| New-reasoning-per-run | Tier | Form |
|---|---|---|
| None (deterministic check) | **Script / linter** | `.mjs`/shell, wired to build or commit |
| None, but must auto-fire | **Hook** | `Stop` / `PostToolUse` wrapping the script |
| Stable judgment shape, needs language | **Skill** | `.claude/skills/<name>/` |
| Mechanical op / bounded transform | **Small / specialized model** | delegate the sub-task |
| Genuinely novel synthesis/judgment | **Frontier model** | keep here — and harvest the shell around it |

## Procedure

1. **Enumerate** the session's discrete pieces (each tool-loop or judgment).
2. **Score** each with the one question.
3. **Route** each to its cheapest correct tier.
4. **Name the irreducible core** — the frontier work that was genuinely worth paying for. Everything else is a harvest target.
5. **Emit a routing table**: `piece | tier | home`. The `home` column hands off to [harvest-routing](../../../playbooks/harvest-routing.md).
6. **Offer to build the top 1–3** cheapest-tier wins now (the script/hook usually pays for itself immediately).

## Output format

```
## Crystallization of <session>
| Piece | New-reasoning/run | Tier | Home | Build now? |
|---|---|---|---|---|
| ... | none | script | scripts/x.mjs | yes |
| ... | stable-shape | skill | .claude/skills/y | later |
| ... | novel | frontier | — (irreducible) | n/a |

Irreducible core (worth the frontier spend): <one line>
Cheapest wins to build now: <1–3 items>
```

## Restraint

Don't over-crystallize. A script that's written once and never re-run is waste too. Only harvest pieces that will *actually recur*; for the rest, naming the irreducible core (so you don't re-pay for the shell) is enough. The smallest useful crystallization is the one that gets reused.

## Closing gate: demand a consumer

Crystallization is not done until the artifact has a consumer *at the right point in time*. Turn the consumer-witness question back on the crystallization itself: the rule / checklist row / guard / skill / script you just harvested — if nothing actually consumes it at the moment it's supposed to fire, it's decoration. You paid the harvest tokens once and nothing will ever call it. Before closing, clear three checks:

1. **Name the consumer + its fire-point.** *Who* consumes this artifact, at *which* stage — design-time, commit-time, runtime, delivery-time? If you can't answer, it's decoration. Classic mismatch: a human-readable checklist row whose intended consumer is a design-time planner/decomposer, but it was only written to the prose list and never to the machine-readable mirror the planner actually reads — so at design-time it doesn't exist.
2. **Sync the machine-readable twin.** If the artifact has a human-readable *and* a machine-readable form (checklist ↔ machine profile, rule ↔ lint/audit, skill ↔ trigger description), wire *both*. A human-only artifact is invisible to any automated/design-time consumer.
3. **Forcing function.** Is there an audit / lint / test that lights up when this artifact becomes an orphan? If not, add the smallest one — and prove it fires (a `--selftest` that manufactures a violation and asserts red) before trusting it.

> Do this *before* routing to a cheaper tier: dropping work to a cheap tier is worthless if nothing at that tier will ever invoke it.

## Related

- [playbooks/cost-tier-routing.md](../../../playbooks/cost-tier-routing.md) — the full ladder + smell tests (this skill executes it)
- [playbooks/harvest-routing.md](../../../playbooks/harvest-routing.md) — the *where* axis; the `home` column routes through it
- [rule-35 closing-triage](../../claude-md-rule-templates/rule-35-closing-triage.md) — the cadence that triggers this at every session close
