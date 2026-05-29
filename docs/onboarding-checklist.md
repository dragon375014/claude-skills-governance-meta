# Onboarding Checklist — install the guardian skills into your project

This installs the two **skills** in this repo — `architecture-completeness-guardian` and `trace-lock-modify` — into a target project so they auto-trigger when someone declares an architecture change. Budget ~30 minutes. It's written so a coding agent (Claude Code, etc.) can execute it end-to-end, stopping to ask you only at the points marked **🔶 ASK**.

> This is the **skill-layer** install. It's distinct from this repo's `.mjs` templates (which you wire into a hook, not the skill registry). If you haven't decided *what* to adopt yet, run the [adoption fitness check](../adoption-fitness-check.md) first — it tells you whether the skill layer fits your project today, or whether you only need the templates.

---

## Paste-this entry prompt (for the target project's AI)

From inside your project directory, paste this into your coding-agent session:

```
Read https://raw.githubusercontent.com/dragon375014/claude-skills-governance-meta/main/docs/onboarding-checklist.md

Then install the architecture-completeness-guardian skill into THIS project by following it:
1. Copy scaffold/skills/architecture-completeness-guardian (and trace-lock-modify if I have cross-layer chains) into .claude/skills/ — FLAT, one folder per skill, never a category subfolder.
2. Inspect my codebase and fill the SKILL.md dispatch table with MY real governance skills; replace the scene-*.md code-path placeholders with mine. Stop and ask me only where a choice is genuinely project-specific.
3. Add the Rule 33 architecture-gate hard rule to my CLAUDE.md (renumbered to fit).
4. Verify: in a fresh session, declare a fake feature and confirm the 4-part report fires.
Show me a diff of every file before writing, and a summary of what you customized vs. left as TODO.
```

The agent then works through the steps below against your actual repo.

---

## Pre-flight (5 min)

- [ ] Confirm the project has a `.claude/` directory. If not: `mkdir -p .claude/skills`
- [ ] Confirm a `CLAUDE.md` exists at the project root. If not, create a minimal one (a heading + a "Rules" section is enough — Rule 33 needs somewhere to live).
- [ ] Have this repo available locally (clone it, or read raw files over HTTP).
- [ ] Decide scope: **guardian only** (most projects) or **guardian + trace-lock** (projects with real cross-layer chains — see the fitness check S11 signal).

---

## Step 1 — Copy the skill(s), FLAT (5 min)

```sh
# from your project root, with the repo cloned at ../claude-skills-governance-meta
cp -r ../claude-skills-governance-meta/scaffold/skills/architecture-completeness-guardian .claude/skills/
# only if adopting trace-lock:
cp -r ../claude-skills-governance-meta/scaffold/skills/trace-lock-modify .claude/skills/
```

**The placement rule is not optional:**

```
.claude/skills/architecture-completeness-guardian/SKILL.md        ✅ correct
.claude/skills/governance/architecture-completeness-guardian/...  ❌ silently invisible
```

The skill registry reads **only the first level** of `.claude/skills/` and does not recurse into category subfolders. A skill nested one level deeper vanishes from the available-skills list and `/`-invocation returns *Unknown skill* — with no error explaining why. (This comes from a real incident: dozens of skills grouped into category folders all disappeared from the registry until they were flattened back.) The only subfolder a skill may contain is its own `references/`.

- [ ] Skills copied to the **first level** of `.claude/skills/`
- [ ] Each skill's `references/` folder came along intact (the guardian has 9 reference files)

---

## Step 2 — Customize the dispatch table + scene placeholders (10 min)

This is where the template becomes *your* skill. Open `.claude/skills/architecture-completeness-guardian/SKILL.md`.

### 2a. The dispatch table (the "scenario → skill" table)

Every cell has either a `<your … skill>` placeholder or a link to a repo artifact. For each row:

- Replace `<your … skill>` with **your project's** real governance skill name. The agent should inspect your `.claude/skills/` to find candidates.
- If you **don't have** a matching skill, delete that cell (don't pull a skill that doesn't exist). Add it back later when you write one.
- Cells already pointing at a repo artifact (`trace-lock-modify`, `check-migration-grants.mjs`, `pg-function-overload-zombie.md`) can stay if you adopted those.

> 🔶 **ASK** the user: "Which of your existing skills handle (a) cross-layer field audits, (b) prior-art / dedup checks, (c) multi-entry-point parity, (d) admin-CRUD audits? I'll wire those into the dispatch table; the rest I'll leave as TODO."

### 2b. The placement decision tree (Part 4)

The SKILL.md Part 4 references a backend-placement guideline and a Q1/Q2/Q3 decision tree with example domain groups.

- Replace the example groups (operations / production / etc.) in `references/scene-new-route.md` and `references/scene-new-setting.md` with **your project's** domain groups.
- If you have a placement-guideline doc, point Part 4 at it. If not, you can skip it for now — but the red lines (no hardcoded business values, no Settings-tab dumping, route-naming consistency) still apply.

> 🔶 **ASK** the user: "What are your project's main backend areas / sidebar groups? I'll put them in the placement decision tree." (Don't guess — these are project-specific.)

### 2c. The scene code-path placeholders

`references/scene-*.md` use `{table}` / `{feature path}` / `{migrations dir}` placeholders in their grep templates.

- Customize **at least one** scene file (e.g. `scene-new-feature.md`) with your real source dir / migrations dir as a worked demonstration.
- The others can keep placeholders + a `<!-- TODO -->` marker — they'll be filled the first time that scenario comes up.

- [ ] Dispatch table: every kept cell points at a real skill; absent ones deleted
- [ ] Placement groups replaced with yours (or Part 4 deferred with red lines kept)
- [ ] At least one scene file customized as a demo

---

## Step 3 — Add the CLAUDE.md hard rule (5 min)

Auto-trigger from a cold session is not guaranteed (see [known-limitations.md](./known-limitations.md)). The CLAUDE.md rule is the reliable second path.

- [ ] Open [`../scaffold/claude-md-rule-templates/rule-33-architecture-gate.md`](../scaffold/claude-md-rule-templates/rule-33-architecture-gate.md), copy its rule block into your `CLAUDE.md`, renumber to a free rule number, and set the skill path.
- [ ] (If you adopted trace-lock) also copy [`rule-29-trace-lock.md`](../scaffold/claude-md-rule-templates/rule-29-trace-lock.md).
- [ ] (If you have a config store) also copy [`rule-30-config-debt.md`](../scaffold/claude-md-rule-templates/rule-30-config-debt.md).

---

## Step 4 — Trace-lock prerequisites (10 min, only if adopting trace-lock)

trace-lock-modify is useless without a registry to grep.

- [ ] Copy [`../templates/data-source-registry-template.md`](../templates/data-source-registry-template.md) to your project (e.g. `docs/data-source-registry.md`).
- [ ] Register **one real** cross-layer chain in it (use the block template) — even one is enough to make the skill functional.
- [ ] Update the registry path inside `.claude/skills/trace-lock-modify/SKILL.md` ("When to trigger" section).
- [ ] (Recommended) add the two defensive guard rules to your `governance-guard.mjs` (trace-test-exists, test-imports-anchor) — see the registry template's last section.

---

## Step 5 — Verify the trigger (5 min)

This is the real acceptance test. **Open a fresh session** (cold context — not the one that just did the install).

- [ ] Declare a fake feature in natural language, e.g. *"I want to add a feature that lets users export their data."*
- [ ] Confirm the agent runs the guardian's **4-part report**: scenario classification → dispatch plan → 5-layer codebase gaps → placement check.
- [ ] If it doesn't fire: check (1) the skill is flat (Step 1), (2) the `description` frontmatter is intact, (3) Rule 33 is in CLAUDE.md (Step 3). The CLAUDE.md rule is what makes a cold session reliable.

---

## Acceptance criteria

- [ ] At least one real "I want to build X" declaration produced a 4-part report
- [ ] The dispatch table pulls ≥3 of your real skills for a relevant scenario
- [ ] The placement decision tree reflects your domains (or Part 4 is deferred with red lines kept)
- [ ] Rule 33 is in CLAUDE.md
- [ ] (If trace-lock) the registry has ≥1 real trace and the skill points at it

---

## How this connects to the fitness check

The [adoption fitness check](../adoption-fitness-check.md) and this checklist are a two-stage pipeline:

1. **Fitness check** answers *"should I install this at all, and which pieces?"* — it scans your project and emits a tiered verdict (the skill layer is gated on size + having domain skills to dispatch to).
2. **This checklist** answers *"how do I install the skill layer?"* — run it for the pieces the fitness check marked ✅.

If the fitness check says the skill layer is ⚠️ premature for your project (too few files, no domain skills to dispatch to), stop here and adopt only the `.mjs` templates — the guardian has nothing to route to yet.
