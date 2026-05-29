# Design-Pattern Industry Mapping

The patterns in this repo were named from the inside of one codebase, so they carry homegrown labels. Almost all of them map to a recognized industry concept. This table is the bridge — useful for two reasons: it tells you these ideas aren't invented here (you can read the canonical sources), and it gives you vocabulary to explain the patterns to people who haven't read this repo.

The mapping is grouped by how close the correspondence is.

---

## ✅ Established industry concept (this repo just applies it)

| This repo's label | Industry concept | Canonical reference |
|---|---|---|
| Defensive governance | Shift-left / policy-as-code / pre-commit linting | "Continuous Delivery"; pre-commit/lefthook ecosystems |
| Offensive governance | **Fitness functions** | "Building Evolutionary Architectures" (Ford, Parsons, Kua) |
| Trace lock / trace test | **Characterization tests** / golden-master tests | Michael Feathers, "Working Effectively with Legacy Code" |
| Why trace lock matters | **Hyrum's Law** (every observable behavior gets depended on) | hyrumslaw.com |
| SSOT (single source of truth) | Single source of truth / don't-repeat-yourself for *data* | well-established |
| Breakpoint taxonomy | Fault / defect taxonomy | IEEE defect classification; orthogonal defect classification |
| Anti-pattern docs (Symptom→Root cause→Detection) | Postmortem / known-error database | SRE postmortem culture; ITIL known-error DB |
| L0/L1/L2 dispatch | Chain of responsibility / dispatcher / front controller | GoF patterns; "Patterns of Enterprise Application Architecture" |

If you want to defend any of these to a skeptical reviewer, cite the right-hand column — the patterns predate this repo by decades.

---

## ⚠️ Partial correspondence (related, but with a twist)

| This repo's label | Closest industry concept | The twist |
|---|---|---|
| Architecture-completeness gate | Definition of Done / architecture decision gate | applied to a coding *agent* at declaration time, not a human at sprint review; output is an automated 4-part report |
| Config-debt taxonomy | Configuration drift / technical debt quadrant | the four named classes (orphan / shotgun / tribal / god-row) are a finer breakdown than "drift"; the secrets class is a security overlay |
| Trace-surface spirit (read-only readers count) | Coupling / afferent coupling (fan-in) | reframes fan-in as a *governance* obligation (register the reader), not just a metric to measure |
| Orphan config | Dead code, applied to configuration | config can't be "called", so liveness is "is there a write path", not "is it referenced" |
| Audit-first vs. gate boundary | Separation of concerns between planning and execution gates | specific to agent-rule collisions, where two cautious rules misgeneralize into each other |

These are recognizable to someone who knows the left-hand neighbor, but the twist is what makes the pattern worth its own name.

---

## 🆕 Mostly internal framing (low industry coverage)

| This repo's label | Why there's no clean industry term |
|---|---|
| Defensive **vs.** offensive as a *paired* discipline | each half is well-known; the explicit pairing (and the loop between them) is rarely stated as one framework |
| Skill dispatch table as an SSOT | "registry of governance rules" exists; treating the *routing* itself as a single-source-of-truth artifact is uncommon |
| Reverse-cleanup (R0) as a first-class skill trigger | "tech-debt sprint" is the human version; making it a routable agent trigger alongside forward scenarios is unusual |

These are the parts most likely to be genuinely novel framing — or, just as likely, parts where a better-known term exists that the author hasn't encountered. If you know one, the [CONTRIBUTING](../CONTRIBUTING.md) issue policy accepts "factual errors in the markdown", and a missing industry-term mapping qualifies.

---

## How to use this table

- **Adopting a pattern**: read the canonical reference in the ✅ section first. The repo's version is a condensed, agent-oriented application; the book has the depth.
- **Explaining it to a team**: lead with the industry term ("these are fitness functions"), then show the repo's concrete template. People trust a named pattern faster than a homegrown one.
- **Evaluating whether it's worth adopting**: if the ✅ concept is already standard in your stack (you already have pre-commit linting), you have the defensive half — the repo's value to you is the *offensive* half and the *pairing*.

---

## Related

- [`../defensive-vs-offensive-governance.md`](../defensive-vs-offensive-governance.md) — the paired discipline that has the least industry coverage as a unit
- [`../scaffold/concepts/`](../scaffold/concepts/) — the concept docs whose terms this table maps
- [`../breakpoint-taxonomy.md`](../breakpoint-taxonomy.md) — the fault-taxonomy application
