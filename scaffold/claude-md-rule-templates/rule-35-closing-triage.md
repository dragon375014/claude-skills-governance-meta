# CLAUDE.md Rule Template — Closing Triage (the forward seam)

**What this rule does**: removes the *seam between chunks of work*. Every other rule governs a chunk while you're in it. This one fires when a chunk **ends** — an analysis, a review, a plan, an audit produces findings — and forces the agent to *sort and continue* instead of stopping at the report and waiting for you. It is the counterweight to the "stops and waits for me to dispatch the next step" failure, the way [rule-34 step-back](./rule-34-step-back-cadence.md) is the counterweight to "never steps back."

**Why it's a rule and not just a skill**: a solo operator running many projects is the bottleneck precisely *between* chunks — they have to remember what's pending, know where it stands, and be present to approve. Left to a skill, "sort and continue" only happens when invoked, so you're back to being the human dispatcher. The rule makes the agent self-continue by default and reserve you for the one thing only you can do: the irreversible call.

**The load-bearing idea — decisions go to the front, not the middle**: a mid-flight "should I proceed?" is the expensive stop (it re-bills the whole context and needs you present, doubly so when the cache is cold because you walked away). So the rule's first move is: *anything foreseeable, ask once up front as a menu*; only the genuinely unforeseeable gets queued — never a live block.

**Prerequisite**: pairs with the [crystallize skill](../skills/crystallize/SKILL.md) (what to do with the harvested pieces) and an optional `Stop` hook that fires the triage automatically (see Customize).

---

## Copy this into your CLAUDE.md

> Renumber `Rule N`. Point `<work board>` at your per-project status file.

```markdown
N. **Closing triage — don't stop at the report**: when a stage produces findings
   (analysis / review / plan / audit), do NOT stop and wait. Sort each item and
   continue; reserve the operator for irreversible calls only.

   **Decisions to the front**: anything foreseeable, ask once up front as a single
   menu (the operator picks the direction before work starts). Only genuinely
   unforeseeable decisions surface later — and they QUEUE, never live-block.

   **Tag each finding (one of four)**:
   - NOW — reversible, verifiable, no sign-off needed → just do it, verify, include.
     This is the default lean.
   - GOAL — clear but larger / iterative → package as a goal prompt under the
     project's goals dir.
   - HANDOFF — needs different context / parallel / cross-project → write a task
     packet for another session.
   - ASK — irreversible / outward-facing / operator's call (pricing, design
     trade-off, credentials, delete data, push to production, send externally,
     spend money) → but NEVER live-block: foreseeable ones go to the front menu;
     the rest queue (a line in the goal/work board) and the agent finishes
     everything else first.

   **Work board is per-project, write-only on close**: append one line to <work
   board> (what got done / what each bucket got / what's blocked on which ASK).
   Do NOT load a shared cross-project board into every session — that re-reads 80%
   irrelevant context every open. The board is for *writing* state, not *reading* it.

   **Close with one summary**: did (NOW) / packaged (GOAL+path) / handed off
   (HANDOFF+path) / your call (ASK). The operator only handles ASK.

   **Restraint**: pure Q&A / read-only lookups skip this. The goal is to compress
   the operator's load down to "approve" — and move even that approval to before
   the work (cheap) rather than during it (expensive).
```

---

## Customize

- **`<work board>`** — a per-project `WORK-BOARD.md` (or the [agent-work-board](https://github.com/dragon375014/agent-work-board) if you coordinate parallel sessions). Per-project, not shared — see the rule's own warning.
- **Auto-fire it (optional, the 0-token version)** — a `Stop` hook that injects the triage reminder once when *this session* left uncommitted work. Naive "fire whenever the tree is dirty" is a trap: it nags about pre-existing foreign WIP, about its own marker file, and re-fires on every commit as the dirty-set shifts. Four gates make it correct *and* quiet: (1) honor `stop_hook_active` — block at most once, never loop; (2) **baseline** the already-dirty set at the session's first stop (key the marker by `session_id`) and stay silent — that dirt isn't this session's; (3) nag only on `current-dirty − baseline` (the files *this* session added), and at most once per session; (4) filter the hook's own marker files out of the dirty set (don't depend on gitignore being right). Any error → exit 0 (never obstruct stop). Gates 2–4 were learned the hard way — the naive version's first live run nagged on its own marker.
- **The four tags** — translate to your working language so semantic matching fires.

---

## Why the wording matters

- **"NEVER live-block"** is the whole point. The instant ASK can pause the agent mid-run waiting for a human who's away, you've recreated the seam this rule exists to remove. Foreseeable → front menu; unforeseeable → queue. Never a held breath.
- **"default lean is NOW"** — without it the agent over-escalates to ASK to be safe, and you're the dispatcher again. Reversible + verifiable = just do it.
- **"per-project, write-only"** — a shared board read on every session open is a silent token tax; stated explicitly so nobody "centralizes" it into one mega-file.

---

## Related

- [../skills/crystallize/SKILL.md](../skills/crystallize/SKILL.md) — what to do with NOW/GOAL leftovers that recur: route them down the cost-tier ladder
- [../../playbooks/cost-tier-routing.md](../../playbooks/cost-tier-routing.md) — the ladder (script / hook / skill / small-model / frontier)
- [./rule-34-step-back-cadence.md](./rule-34-step-back-cadence.md) — the reverse-axis sibling: this fires on *chunk end*, that fires on *cadence + look-back*
