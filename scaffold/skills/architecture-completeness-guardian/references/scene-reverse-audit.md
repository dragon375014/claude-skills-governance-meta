# Scene R0 — Reverse legacy-cleanup sweep

> Split out of the main SKILL.md. The first version reserves the entry point but does not sweep proactively; it activates on explicit reverse-trigger language.

---

## Trigger language

The user names a region to sweep, in their own words. Examples (match on intent — no need to name this skill):
- "tidy up the scattered admin settings"
- "audit the historical debt in the order flow"
- "clean up the packing workstation"
- "the N existing modals should be unified"

---

## Reverse sweep flow (after trigger)

1. **Parse the region**: map the user's "region" to a codebase folder / module.
2. **Spawn an Explore subagent** to run the 5-layer required-checks over that region in reverse (templates in [`crud-completeness-execution.md`](crud-completeness-execution.md)).
3. **Compare against the defensive guard's existing rules** — list **holes already guarded by a rule** vs. **holes with no rule guarding them**.
4. **Emit a three-part list**:
   - ✅ layers the region fully implements
   - ⚠️ which layer the region is missing (by L1–L5)
   - 🚨 concrete gaps where the region violates a red line (route naming / placement / SSOT-overwrite / trace lock)
5. **Do not auto-fix**: hand the list to the user to decide whether to dispatch a follow-up "fix" task (a fresh round of the skill).

---

## Why this entry point must exist

The reverse-cleanup promise is the whole reason a completeness gate is worth building: a forward-only gate stops *new* mess but can never be re-used to clean up the *existing* mess it was meant to help with. Reserving an explicit trigger lets the user opt into cleanup mode deliberately, so proactive sweeping doesn't pollute the forward-trigger scenarios.

Detailed execution: the first version lists only "trigger language + flow outline". The real cleanup logic is deferred until the dispatch routing has stabilized over a month or two of real use — premature cleanup automation tends to be wrong.
