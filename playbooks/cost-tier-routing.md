# Playbook — Cost-Tier Routing (who runs it next time)

**Companion to [harvest-routing](./harvest-routing.md).** Harvest-routing answers *where a lesson lives* (which repo / doc / registry). This one answers the orthogonal question: **which compute tier should execute it next time** — so the expensive reasoning you paid for once becomes cheap or free to repeat.

## The principle

After any token-heavy session, each repeatable piece of what you did should be routed to **the cheapest tier that still produces a correct result**. The test is one question:

> **How much irreducible *new* reasoning does this piece need each time it runs?**

The closer to zero, the cheaper the tier it drops to. Frontier-model tokens are for the irreducible novel core only — everything mechanical around it is waste if it stays there.

## The ladder

| Tier | Cost | Routes here when… | Mechanism |
|---|---|---|---|
| **Script / linter** | ~0 (deterministic) | there's a checkable rule — compare, assert, fingerprint, count | `.mjs`/shell in `scripts/`, wired to a build/commit step |
| **Hook** | ~0 (triggers a script) | a "don't forget" that must fire without being remembered | Claude Code `PostToolUse` / `Stop` hook wrapping a script |
| **Skill** | cheap (structured prompt, no re-derivation) | a *recurring judgment with a stable shape* that still needs language understanding | `.claude/skills/<name>/SKILL.md` |
| **Small / specialized model** | cheap tokens | mechanical operation or bounded transform (browser puppetry, routine diff, extract/classify) | delegate sub-task to a cheaper model; reserve frontier for synthesis |
| **Frontier model** | expensive | genuinely novel synthesis / adversarial judgment / architecture decision | the main agent — and *harvest the repeatable shell out* afterward |

## Routing procedure

1. **List** the discrete pieces of the session (each tool-loop or judgment is a candidate).
2. **Score** each with the one question (new-reasoning-per-run: none / stable-shape / novel).
3. **Drop** each to its cheapest correct tier (table above).
4. **Name the leftover** — the irreducible frontier core is what's *worth* paying for; everything else is a harvest target.
5. **Route the artifact home** via [harvest-routing](./harvest-routing.md) (where), now annotated with its tier (who runs it).

## Smell tests

- A check that re-runs the frontier model to verify a deterministic fact → should be a **script**. (e.g. "did the agent's claimed gap actually disappear from source?" = `grep`, not a re-read.)
- A judgment you've made the same shape of three times → should be a **skill**.
- A frontier model driving a browser and describing screenshots → the driving is **small-model** work; only the cross-check is frontier.
- "We'll just remember to run it" → it won't fire; make it a **hook**.

## Relation to the rest of the repo

- [harvest-routing](./harvest-routing.md) — the *where* axis. Run both together: every harvested lesson gets a home **and** a tier.
- [rule-35 closing-triage](../scaffold/claude-md-rule-templates/rule-35-closing-triage.md) — the cadence that makes this happen at every session close, not just when remembered.
- [crystallize skill](../scaffold/skills/crystallize/SKILL.md) — runs this procedure as a post-session step and emits the routing table.
