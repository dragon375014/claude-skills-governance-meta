# Governance Meta Context — L0/L1/L2 tiers, audit-first boundary, missed-trigger cases

> Split out of SKILL.md. Linked from the main file when:
> - first understanding why this skill takes priority over an audit-first rule
> - chasing a "missed-trigger case" link to its root cause
> - designing a new governance skill and needing to place its L0/L1/L2 role

> The conceptual versions of §1 and §2 live in the repo's concept docs:
> [`../../concepts/governance-hierarchy.md`](../../concepts/governance-hierarchy.md) and
> [`../../concepts/audit-first-vs-architecture-gate-boundary.md`](../../concepts/audit-first-vs-architecture-gate-boundary.md).
> This file keeps a condensed version + the real cases that taught the rules.

---

## 1. The three-tier hierarchy (condensed)

**This skill is the L0 entry gate.** Understanding the tiers is what tells you why an audit-first rule doesn't apply to it.

| Tier | Role | Trigger source | Relationship |
|---|---|---|---|
| **L0 entry gate (dispatcher)** | catch the user's *declaration*, classify scenario, decide who to pull | natural-language **intent sentence** ("I want to build X", "let's clean up X") | pulls L1, spawns L2 |
| **L1 domain specialist** | deep checks for one domain | (a) dispatched by L0, or (b) user is **editing a specific file** (**action sentence**) | dispatched by L0, spawns L2 as needed |
| **L2 sub-tool / agent** | run a specific grep / audit / migration check | spawned by L0/L1, never user-triggered | spawned, reports, vanishes |

**Why the tiers matter**: when the user declares a new feature / reverse sweep, **L0 must fire first** (ahead of other memory/governance rules) — because only L0 knows which L1 skills to pull. Skipping L0 = the user has to decide which L1 to pull themselves = the dispatcher's job is handed back to the user, defeating the skill.

---

## 2. Boundary with an "audit-first" rule

⚠️ This skill is easily confused with an audit-first planning rule — keep them distinct.

| | audit-first planning rule | this skill (architecture gate) |
|---|---|---|
| **Scope** | only a `/goal`-style planning entry | every architecture-change declaration |
| **Trigger language** | "find the parts of X suited to a goal", "plan a goal" | "I want to build X", "clean up the X mess" |
| **Action** | candidate audit + traffic-light triage → archive → user picks one to turn into a goal | classify → dispatch L1 → spawn Explore → 4-part report |
| **Purpose** | turn a fuzzy "I want to do something" into a precise goal | classify + route + completeness-check a declared "I want to build X" |

**Conclusion**: the audit-first rule's "do an audit, don't jump straight into a skill" line is scoped to `/goal`, not this skill. This skill *is* audit-before-build (the 4-part report is the audit), so trigger it directly on an architecture-change declaration.

---

## 3. Real missed-trigger cases (vaccines / counter-examples / regression guards)

> The full standalone write-ups live in [`../../../examples/case-studies/`](../../../examples/case-studies/). Condensed here so a future AI reading this skill learns "this sentence shape must trigger".

### Case — shared-component cleanup (R0 missed)

**User declared**: "let's clean up the CRUD and modals — e.g. a modal should close when you double-click outside it."

**Wrong response**: applied an audit-first rule and self-sequenced an audit, skipping this skill — mistaking "audit-first, don't jump into a skill" as applying here.

**Root causes (3 at once)**: (1) the R0 trigger language was too picky (only matched an explicit skill-name invocation); (2) the frontmatter `description` listed no R0 natural-language phrases; (3) the audit-first rule's scope wasn't pinned, so it got generically applied.

**Correct response**: Part 0 → not trivial (cross-layer + many existing instances) → run the 4 parts. Part 1 → **S1 (new shared component) + R0 (10+ existing modals), mixed**. Part 2 → pull prior-art + multi-entry parity + this skill's CRUD audit. Part 3 → spawn Explore over all existing modals, check click-outside / Esc / focus-trap / a11y coverage. Part 4 → a shared modal is a cross-group base component → it belongs in a shared `components/base/` or `components/ui/`, not under admin or workstation.

**Regression guard**: "clean up / tidy existing / extract shared component" = an R0 trigger.

### Case — upstream/downstream stock chain + a new alert (requirements-rule priority)

**User declared**: "I want to figure out whether the raw-stock → processed-stock → item chain has problems, and while I'm at it, decide whether to add a low-stock alert email."

**Wrong response**: didn't trigger this skill at all — ran a requirements-review SOP and asked a 4-option clarifying question.

**Root cause**: the declaration mixes "should we add X" decision language (→ requirements review) with "figure out whether the chain has problems" reverse-sweep language (→ should trigger this skill). The priority between them wasn't documented, so the AI caught one and dropped the other.

**Correct response**: Part 0.5 → mixed language → this skill first, requirements-review SOP as a Part-2 sub-task. Part 1 → **R0 (sweep the 3-layer stock chain) + S4 (new setting: alert threshold + email)**.

**Regression guard**: "figure out X + also decide whether to add Y" → this skill fires first; the requirements SOP is a sub-task, not a substitute.

### Case — trace-surface spirit gap (a new reader is also a trace-surface change)

**User declared**: (same as above) "figure out the stock chain + maybe add a low-stock alert."

**Ran Parts 1–4 correctly, but Part 2 dropped one skill**: the dispatch explicitly wrote "**not** pulling trace-lock-modify" with the reason "the new RPC is read-only, doesn't change trace nodes, so it doesn't apply". Overall report scored well; this was the only gap.

**Root cause (trace-surface spirit gap)**: a trace-lock rule literally says "before modifying any node on a critical trace" → "modify = write" reading. But its **spirit** ("treat cross-layer dependency as an asset") covers **adding a new reader** — the new reader depends on the anchor's semantics, so a future anchor change breaks it. The new alert RPC (`fn_get_low_stock`, reading `upstream_stock.quantity`) is a **new reader** of a `T-NNN` stock-availability trace's downstream node.

**Correct dispatch**:
> `trace-lock-modify` (registry note)
> Why: your new low-stock-alert RPC is read-only and doesn't write stock, but it **reads** the upstream stock quantity — a downstream node of the `T-NNN` stock-availability trace. A new reader = a new trace surface; when the anchor changes later, this reader must be re-evaluated. For now, just a registry note (register the new RPC as a new reader of `T-NNN`), not the full 5-step audit.

**Regression guard**: if the data source of a new feature / field / setting is downstream of a `T-NNN` trace, even read-only, dispatch `trace-lock-modify` for at least a registry note. Full discussion: [`../../concepts/trace-surface-spirit.md`](../../concepts/trace-surface-spirit.md).

### Case — trigger test result (same-session, ideal conditions)

**Test prompt**: "I want to build a dashboard that shows each item's live stock-availability + a restock warning." — designed to verify whether the trace-surface-spirit fix above actually changed behavior.

**Key KPI**: does Part 2 dispatch pull `trace-lock-modify` (recognizing "a read-only new reader is still a trace-surface change")?

**Result**: ✅ passed. Part 1 correctly classified S1 (+R0/S4); Part 2 explicitly pulled `trace-lock-modify` with the read-only-reader reasoning; Part 3 flagged the frontend-overwrites-SSOT trap + an anon-perspective incident; Part 4 proposed registering the dashboard as a new trace reader.

**Caveat (test-validity limit)**: this hit under ideal conditions (same session, just read the SKILL.md). The real thing to validate is **a fresh session relying on the hard-rule reminder + the description for auto-trigger** — see [`../../../docs/known-limitations.md`](../../../docs/known-limitations.md) on why auto-trigger of a skill from a clean session is not guaranteed and a CLAUDE.md hard rule is the backstop.
