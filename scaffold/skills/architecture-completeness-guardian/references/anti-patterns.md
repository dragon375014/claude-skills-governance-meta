# architecture-completeness-guardian — anti-patterns (detail)

> Split out of the main SKILL.md. Each anti-pattern lists "why it's wrong" + the design intent it violates. Read before modifying this skill.

---

## A. Trigger detection

### ❌ `description` written as a literal "Use when X"
→ A natural-language declaration like "I want to add a quantity-edit feature" won't literal-match → the skill is effectively dead.
`[Why]` This is the core pain point. The description must be pushy: "TRIGGER when … ; SKIP only when …" + 5–8 example natural-language phrases.

### ❌ Only catching "modify existing node" scenarios
→ A new-feature declaration (no field to modify yet) has no skill to catch it = a hole in the skill map.
`[Why]` Domain governance skills almost all trigger on "modify existing" scenarios; this gate exists to cover the gap.

---

## B. Report structure

### ❌ A pure static checklist that never scans the codebase
→ That's just handing someone a textbook checklist; it doesn't close the gap between "should have" and "actually has".
`[Why]` The requirement is "compare against the static map + verify the real codebase via a subagent".

### ❌ Listing "what should exist" but not "what's currently missing"
→ Falls back to being a checklist document. Must be three-part (✅ / ⚠️ / 🚨) + concrete path + line.
`[Why]` The point is to flag the places that don't match existing conventions.

### ❌ Forgetting the reverse-cleanup entry point
→ A promise broken. The SKILL.md must end with a "trigger language + flow outline" for reverse cleanup.
`[Why]` Without a reverse entry, the skill can never be re-used to clean up the legacy it was supposed to help with.

---

## C. Placement / red lines

### ❌ Ignoring the backend-placement guideline when deciding "where does this go"
→ The guideline doc exists but no skill references it → the doc dies → new features land in the wrong place with no one stopping it.
`[Why]` Governance docs with no active reference rot.

### ❌ Tolerating hardcoded business values in the frontend / silently allowing a Settings-tab dump
→ A red-line rule forbids it, but nothing guards it at the new-feature declaration stage.
`[Why]` Catching it later in a CI guard is too late — the design is already shaped wrong.

### ❌ `/admin` vs. `/workstation` route confusion
→ Route naming = the basis of the permission model; getting it wrong breaks the whole auth-guard chain.
`[Why]` Routes anchor the permission model.

---

## D. Dispatch logic

### ❌ Dispatch by fuzzy keyword matching
→ The same task phrased differently pulls a different skill set → violates the single-source-of-truth spirit. There must be an explicit "scenario → skill" table.
`[Why]` Fuzzy matching = unstable dispatch.

### ❌ Pulling only one skill and calling it done
→ Real scenarios cross layers (a new feature pulls prior-art + multi-entry + data-contract + RLS gate); pulling one is guaranteed to miss.
`[Why]` Real scenarios span multiple layers.

### ❌ Dispatch with no reason / dropping the full skill name on the user
→ A non-programmer reading `data-contract-propagation-audit` is lost. Each pulled-in skill needs a one-sentence plain "why".
`[Why]` The operator may have no programming / architecture background.

### ❌ Assuming the operator knows governance jargon
→ The first time SSOT / RLS / RPC / trigger / canonical / anchor appears, attach a plain-language gloss.
`[Why]` Consistent with this skill's own "bilingual / plain-language" principle.
