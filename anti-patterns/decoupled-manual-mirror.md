# Anti-Pattern: Decoupled Manual Mirror（便利貼反模式）

> Example names below (work-board, claim row, `npm run board`) are illustrative;
> the pattern applies to any hand-maintained restatement of a machine-readable truth.

## The Board That Said "Nobody Is Here"

A solo developer running multiple AI coding sessions kept a hand-written
"who's working on what" board to stop sessions from colliding. The protocol:
before touching anything, scan the board, add a claim row, push it.

Six months later, an audit ran `npm run board` (a script that reads git directly)
and found a feature branch **+3 commits ahead of master, last touched 3 days ago —
never registered on the board**. The board's "in progress" section said:
*"nobody has claimed anything."* The hand-written mirror had silently decoupled
from git. Worse: anyone reading the board trusted "nobody is here" as **safe**,
when git said otherwise. The mirror wasn't just useless — it was actively lying.

The two real collisions that year were both caught by git itself (push rejection,
branch divergence), never by the board.

## Symptom

- A hand-maintained artifact that restates a machine-readable truth (a claim board
  vs git branches; a progress column vs CI state; a status comment vs the code)
  drifts out of sync, and nobody notices because nothing forces the sync.
- The drift is **silent and dangerous**: the stale mirror reads as authoritative
  ("nobody claimed this" / "all green" / "handled elsewhere"), giving false safety.
- The thing that actually catches the problem turns out to be the truth source
  itself (git, the DB, the test runner), not the mirror.

## Root Cause

The mirror requires **human discipline** to stay synced with its truth source.
Discipline-based defenses have a short half-life — especially for a solo developer,
who has no second person whose job is to keep the mirror honest (see
`scaffold/concepts/forward-bias-and-the-reverse-organ.md`: a solo dev has no
structural "other").

Once the sync lapses (it will), the mirror is decoupled. A decoupled mirror is
**worse than no mirror**: absence of information makes you check the source; a
confident-but-wrong mirror makes you skip the check.

## Anti-Pattern

```
truth source (git / DB / CI)  ──╮
                                │  (sync requires a human to remember, every time)
hand-written mirror ────────────╯
  └─ consumers trust the mirror, not the source
  └─ when discipline lapses → mirror lies → false safety
```

A rule that mandates the sync ("always claim before you work") doesn't fix this —
**a rule nobody is reminded to apply decays into a slogan** (see
`playbooks/harvest-routing.md`). The mandate and the mirror decay together.

## Correct

**Option 1 — Derive the view from the truth source (preferred).**
Replace the hand-written mirror with a generated view: a script that reads git/DB
and shows the live state. No human sync step → no decoupling. (The `npm run board`
git-truth table above is the working layer; the hand-written claim board is the
failed one.)

**Option 2 — Mechanize the sync.**
If a human-authored artifact is unavoidable, put the sync on a hook/audit so the
machine, not memory, enforces it. "Auto-raise, human-ratify."

**Option 3 — Retire it honestly.**
If the mirror adds **no information the truth-source lacks** and isn't maintained,
delete the mirror and the mandate. Demote to "the source is canonical; check it
directly." A removed dead defense beats a decaying live one — seeding rules with
no incident behind them is itself an anti-pattern (the "dead rule" / 死規 trap).
**But** if the artifact encodes information the source genuinely cannot hold (see
the exception below), the answer is Option 1/2 — mechanize — **not** retire.

## Detection Rule — The Two-Question Retirement Test

This is a process audit, not a code lint. Run it on any governance defense
periodically, or whenever you suspect one is decorative:

1. **Does it add information the truth-source lacks — and can it structurally catch
   its target?** Note this is *not* "has it ever fired." A defense that backstops a
   faster machine check will rarely fire first, and that redundancy is legitimate —
   "never fired" alone does not condemn it. Ask instead: is it wired in, would it
   catch the event it exists for, and does it surface anything the source-of-truth
   doesn't already show? If it adds unique information, it is **not** decorative.
2. **Does it fire when it should?** Manufacture the situation it must catch (or use
   a live one). Wired-but-silent-when-it-should-fire ⇒ broken. Relied-on-by-readers
   but drifted from the source ⇒ giving false safety.

**Retire only when BOTH hold:** it adds no information the truth-source lacks, AND
it's silent/drifted. If it adds unique information but isn't maintained, the verdict
is **mechanize (Option 1/2), not retire.**

> **Legitimate-mirror exception.** A manual artifact whose truth has *no machine
> source yet* is not derivable and not condemned by this pattern: future intent
> ("I'm about to touch subsystem X, haven't branched"), soft locks, and design
> rationale ("why we chose this") have no git/DB/CI to read from. Git only knows
> what already happened. Such artifacts pass Question 1 — keep them, and mechanize
> their sync if you can.

> Corollary: **discipline-based defenses are presumed-failed for solo dev.** If a
> defense's enforcement is "the developer remembers to do X every time," budget for
> it decaying to ~0 adherence and either mechanize it or don't count it as a net.

## Why Tests Don't Catch This

The mirror is a process/governance artifact with no test surface. Unit tests,
CI, and even most audits check *code state*, not *whether a human-maintained
coordination doc still matches reality*. The decoupling is invisible until
someone independently consults the truth source — which is exactly the step the
mirror was supposed to make unnecessary.

## Generalized Pattern

Any hand-maintained restatement of a machine-readable truth is a candidate:

- claim board / "in progress" list  ↔  git branches
- progress column / status field     ↔  CI / build state
- "handled in X" code comment        ↔  the actual call site
- doc that restates a config/schema  ↔  the config/schema itself

This is the discipline-cost twin of the **delayed-mirror** data bug (the 延遲鏡像
gotcha: a reactive ref is only a delayed mirror of its canonical source) — same
shape, but the decoupling force here is *human attention* rather than async timing.
And it's the **letter-vs-spirit** failure (`scaffold/concepts/trace-surface-spirit.md`)
applied to a rule whose letter ("always claim") is obeyed 0% while its spirit
("don't collide") is served by git all along.

## Related Documents

- `playbooks/harvest-routing.md` — "a rule nobody is reminded to apply decays into a slogan"
- `scaffold/concepts/forward-bias-and-the-reverse-organ.md` — solo dev has no structural reviewer
- `scaffold/concepts/trace-surface-spirit.md` — letter vs spirit of a rule
- The "dead rule" (死規) trap — seeding rules with no corresponding incident (cross-project GOTCHAS log)
- The "delayed mirror" (延遲鏡像) gotcha — the data-layer twin, where the decoupling force is async timing rather than human attention (cross-project GOTCHAS log)

> Harvested from retiring a hand-maintained multi-session claim board after an audit
> found git already tracked the truth the board had silently drifted from. The
> retirement was correct *for that board* — it added no information git lacked and
> was unmaintained. This entry deliberately generalizes the test so it does **not**
> license deleting defenses that add unique information; those should be mechanized.
