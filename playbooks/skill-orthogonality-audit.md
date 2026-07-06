# Playbook: Skill-Library Orthogonality Audit

A procedure for keeping a growing skill / rule / prompt library **compact and non-redundant** — treating the library as an approximately orthogonal basis of your capability space, and periodically hunting for two skills that are really two poles of the same axis.

Use when a skill library has grown past ~30 entries, when routing between skills starts to feel ambiguous ("which one fires here?"), or as a standing dimension of a quarterly rule-lifecycle audit.

> **Where this comes from.** This is the "model-native skills" thesis (Kang et al., 2026, *Characterizing Model-Native Skills*, arXiv:2604.17614) applied to your own tooling. That paper argues you should characterize a model by **its own representations**, recover a **compact orthogonal basis** of behavioral directions, and treat redundancy as something to eliminate by construction rather than curate away by hand. A skill library is a hand-built basis of *your* capabilities. The same three desiderata apply: **compositional** (skills combine), **grounded in behavior** (not in category labels), and **compact** (no two directions are the same). This playbook operationalizes the third.

---

## The Criterion

Think of your skill library as a **basis**. Each skill is a direction (an axis). A good basis has two properties:

1. **Coverage** — the axes span the space. Every real task lands near some skill. Gaps mean tasks fall through with no skill to catch them.
2. **Orthogonality** — the axes are independent. No two skills point the same way. Two skills that fire on the same triggers and do overlapping work are **collinear**: they are two poles of one axis wearing two hats.

Coverage and orthogonality are the two failure directions of the same "compact basis" idea, and they have *separate* audits:

| Failure | Symptom | Audit |
|---|---|---|
| **Under-coverage** (a gap in the basis) | a common task has no skill; work falls through | the **fidelity-to-source lens** — "did every stated capability get an owner?" |
| **Redundancy** (collinear axes) | two skills overlap; routing is ambiguous; both need maintaining | **this playbook** |

They are complements, not the same rule. Don't collapse them.

### Why collinearity specifically costs you

In an ordinary codebase, duplication costs *double maintenance*. In a **skill library** there's a second, sharper cost:

- **Trigger ambiguity.** Skills are dispatched by matching a task against their trigger descriptions. When two skills fire on the same vocabulary, the router picks between them ambiguously — sometimes the weaker one wins, sometimes neither loads cleanly. **Collinearity degrades routing accuracy, not just maintenance load.** A library can be individually all-effective and still route badly because two effective skills compete for the same triggers.

This is why "is this skill *used*?" (the usual rule-lifecycle question) is not enough. A skill can be used *and* redundant. You need a second axis in the audit: **is this skill collinear with another?**

### Model-native, not taxonomy-native

Judge redundancy from how skills **behave** — their triggers and their outputs — not from the human categories you filed them under. Two traps the category view creates:

- *"They're in different folders / different top-level categories, so they must be distinct."* Wrong: folders are an imposed taxonomy; the behavioral surface is what routes.
- *"They're both 'governance' skills, so they must overlap."* Also wrong: same category, orthogonal behavior.

Let the representation surface the overlap; **confirm the semantics post hoc** (exactly as the paper labels each recovered axis post hoc by inspecting its extreme examples). The detector proposes; a human disposes.

---

## When to Run This Playbook

Trigger signals:

- Quarterly rule/skill lifecycle audit (add this as its second axis, alongside "is it still used?").
- **Before adding a new skill** — ask "is this a new axis, or a new *pole of an existing axis*?" If the latter, extend the existing skill instead of minting a twin.
- Routing feels ambiguous: you (or the model) reach for two skills for the same task.
- The library crossed ~30–40 entries and no one has ever checked for twins.

If the library is small (< ~15 skills) you can eyeball this — skip the tooling.

---

## Step 1 — Represent each skill by its behavioral surface

For each skill, take the text that actually determines when it fires and what it does — in a `SKILL.md` world that's the frontmatter `name` + `description` (the description carries the `TRIGGER` / `SKIP` clauses). **Not** the folder it lives in, **not** the category you'd assign it.

This is the "grounded in behavior" requirement made concrete: the trigger vocabulary *is* the skill's behavioral surface.

---

## Step 2 — Compute collinearity

Run the detector (below). It builds a TF-IDF vector over each skill's trigger vocabulary and reports the most-collinear pairs, each with the **shared axis vocabulary** that makes them look alike.

```bash
node skill-orthogonality-audit.mjs .claude/skills
```

Two honesty notes, both inherited from the paper:

- **This is a proxy.** It measures collinearity in *trigger-vocabulary* space. The paper's true model-native version would measure it in *embedding* space (an embedding model's own representation of each `SKILL.md`). Trigger-vocabulary overlap is a cheap, offline, always-runs proxy — the analogue of the paper's "lightweight proxy interventions" that screen directions before the expensive step. It is good enough to *nominate* candidates. For the embedding upgrade, swap the representation function to call an embedding endpoint and keep the rest; see the detector header.
- **IDF matters.** Every skill's description shares boilerplate ("use when", "trigger", "skip"). Inverse-document-frequency weighting downweights what everything shares, so what survives is the *distinguishing* vocabulary — the actual axis.

---

## Step 3 — Human post-hoc verdict, per flagged pair

For each flagged pair, decide — this is the judgment the tool cannot make for you. Four outcomes:

| Verdict | When | Action |
|---|---|---|
| **Merge** | genuinely the same job, artificially split | fold into one skill; delete the other; redirect its triggers |
| **Make explicit opposite poles** | truly two ends of one axis (e.g. "build the impure edge shell" vs "extract the pure core") | keep both, but **cross-reference** them so the boundary is documented and routing is unambiguous |
| **Delete the weaker** | one dominates; the other is a stale/worse duplicate | delete the weaker; keep the survivor |
| **Genuinely distinct (false positive)** | shared vocab is coincidental; behavior diverges | no change — optionally sharpen the two descriptions so they stop colliding, or note it so the next audit doesn't re-flag it |

The most valuable outcome is often the **second** — the pair was fine, but the audit forced you to *state the boundary* between them, which is what makes routing crisp. A "0 merges" audit is not a wasted audit if it converted vague worries into documented distinctions.

---

## Step 4 — Lock the decision

Whatever you decide, make it durable so the next audit (and the router) sees it:

- **Merged / deleted** → remove the file, redirect its triggers into the survivor, leave a one-line note in the survivor ("absorbed `<old-skill>` on `<date>`").
- **Explicit poles** → add a reciprocal cross-reference in each skill's description ("SKIP: for the *other* pole → `<sibling>`"). This is the same move as a defensive governance rule: it stops the drift from coming back.
- **False positive** → optionally record it, so a recurring flag isn't re-litigated every quarter.

---

## The Detector

`skill-orthogonality-audit.mjs` (repo root). Zero dependencies, offline, zh/en-mixed aware.

```
node skill-orthogonality-audit.mjs [skillsDir] [options]

  skillsDir         dir containing <name>/SKILL.md   (default: .claude/skills)
  --top N           show the N most-collinear pairs  (default: 20)
  --threshold T     flag pairs with cosine >= T      (default: 0.30)
  --neighbors       also print each skill's nearest neighbor
  --json            machine-readable output
  --strict          exit 1 if any pair >= threshold  (default: advisory, exit 0)
```

**Advisory by design.** Because the verdict is human and post hoc, the default exit code is 0 even when it flags pairs — it earns an interrupt, it doesn't force one (the step-back-sentinel convention: *"有話才響"*). Use `--strict` only if you want a CI gate, and even then treat a failure as "a human owes this library a look", not "the build is broken".

**Threshold is corpus-relative.** 0.30 is a reasonable default for a mature, already-fairly-orthogonal library (it surfaces a handful of adjacent pairs). A library full of copy-paste twins will show much higher cosines; a tiny library, much lower. Read the *ranking* first, the absolute number second.

---

## Checklist

After running the playbook you should have:

- [ ] A ranked list of the most-collinear skill pairs, each with its shared axis vocabulary
- [ ] A verdict on every flagged pair (merge / explicit poles / delete weaker / distinct)
- [ ] Every "merge" and "delete" actually applied — file removed, triggers redirected
- [ ] Every "explicit poles" pair cross-referenced in both descriptions
- [ ] (Optional) recorded false positives so they aren't re-litigated next quarter

If flagged pairs are left with no verdict, the audit is partial — and partial audits let twins accumulate exactly the way partial SSOT consolidations let drift accumulate.

---

## Anti-Patterns

1. **Treating a high cosine as an automatic "merge".** The tool nominates; it does not decide. Adjacent poles of one axis (build-vs-verify, shell-vs-core, create-vs-migrate) *should* stay two skills — cross-referenced, not merged. Merging them collapses a real distinction.

2. **Auditing coverage and redundancy with the same pass.** Under-coverage (a missing axis) and redundancy (a doubled axis) are opposite failures. The fidelity-to-source lens finds the first; this playbook finds the second. One pass cannot do both — it will optimize one and blind you to the other.

3. **Judging by category instead of behavior.** "Same folder → redundant" and "different folder → distinct" are both wrong. Route on the trigger surface, which is what the detector reads.

4. **Tuning the threshold until it says what you want.** If you raise the threshold until nothing flags, you've disabled the audit, not passed it. Read the ranked list; the top pairs are worth a look regardless of where the arbitrary line falls.

5. **Trusting the proxy as if it were the real thing.** Trigger-vocabulary overlap misses two skills that are semantically identical but worded differently, and over-flags two skills that share jargon but diverge in behavior. It's a screen, not a verdict. When it matters, upgrade the representation to embeddings.

---

## Worked Example (Sanitized)

Run against a real, mature 86-skill library. The library turned out to be **already quite orthogonal** — the single highest pair-cosine was ~0.34, with no copy-paste twins. At threshold 0.30 the detector flagged **two** pairs:

- Two skills in the pricing area — one about the form/schema layer, one about the catalog CRUD layer. Verdict: **explicit poles.** They share pricing vocabulary but own different layers; the fix was a reciprocal cross-reference, not a merge.
- Two skills in the stored-value area — one about the top-up mechanics, one about the bonus-calculation architecture. Verdict: **explicit poles**, same treatment.

Net result: **0 merges, 2 documented distinctions.** That is a *healthy* outcome — the value wasn't in deleting anything, it was in (a) confirming the library has no hidden twins and (b) turning two "aren't these kind of the same?" hunches into stated boundaries. The naming-convention families that a naïve pass over-flags (e.g. six single-tool skills sharing the tool's name, or several `*-dev` helpers) were correctly *demoted* once name tokens stopped being over-weighted and template words were stopword-filtered — a reminder that the representation choices in Step 1 are load-bearing.

---

## Related Documents

- `../scaffold/concepts/forward-bias-and-the-reverse-organ.md` — this audit is a "reverse organ": it looks back across an accreting library instead of forward at the next skill.
- `ssot-consolidation.md` — the same shape one level down (data that scattered, rather than skills that doubled). Step 4's "lock it" is the sibling of that playbook's "defensive governance rule".
- `harvest-routing.md` — where a *new* lesson should live. This playbook is the opposite end: whether two things that already live somewhere are the same thing.
- The **fidelity-to-source lens** (coverage audit) — the complement. Together the two audits keep the basis both complete and non-redundant.
