# CLAUDE.md Rule Template — Config Debt Governance

**What this rule does**: forces a self-check against the config-debt taxonomy (orphan / shotgun / tribal / god-row / secrets-in-store) whenever code adds or modifies a config-store row or an env var — so new config debt is caught at write time instead of discovered eighteen months later.

**When you need this rule**: when your project has a config store (a settings table, a config JSON, env vars) that's grown past a handful of values, or is at least 12 months old. Premature for a brand-new project with three env vars. See the fitness check.

**Prerequisite reading**: [`../concepts/config-debt-taxonomy.md`](../concepts/config-debt-taxonomy.md) for the five classes.

---

## Copy this into your CLAUDE.md

> Renumber `Rule N`. Replace `<your config store>` with your actual store (e.g. `system_config` table, `config.json`, env).

```markdown
N. **Config Debt — classify before you add**:
   Any code that adds or modifies `<your config store>` rows / keys or an env
   var MUST self-check against the 4 config-debt classes (+ 1 security class):
   - **Orphan**: a value code reads with no UI / interface to change it
   - **Shotgun**: the same concept living in env + store + code at once
   - **Tribal knowledge**: only one person knows it exists / how to change it
   - **God-row**: one blob holding every unrelated setting
   - **Secrets in store** (P0 SECURITY): plaintext credentials in the blob

   **Three enforced mechanisms**:
   ① Before adding a config row / key, read the registry's Orphan / Shotgun /
      God-row section; a new domain opens a NEW row, never extends the god-row.
   ② A new backend env key is mirrored into `.env.example` in the same change.
   ③ Changing a deprecated row / key requires checking the remediation plan
      first.

   **Same-PR rule for a new config value**: do one of three things — (A) ship a
   UI write path, (B) explicitly mark it intentionally orphan, or (C) log it in
   the registry's "UI to-do" list. Never let a config value ship with no path
   to change it and no record that it's adjustable.

   **The one hard blocker**: a defensive guard rule MUST block any commit that
   writes a secret-shaped value (`*_key` / `*_secret` / `private_key` / token)
   into `<your config store>`. The other four classes are advisory audits, not
   commit blockers (false positives on "is this an orphan?" shouldn't block a
   deploy).
```

---

## Customize

- **`N`** — a free rule number.
- **`<your config store>`** — name your actual store(s). If you have more than one (env + DB), say so — that's the shotgun risk the rule guards.
- **`.env.example`** — adjust if your env-template file is named differently.
- **The secret-shaped patterns** — extend the regex list to your provider's key formats.

---

## Why only one hard blocker

This rule deliberately makes **only** the secrets class a CI blocker. The other four are real debt, but they're judgment calls — "is this value really an orphan, or does it have a write path I didn't grep?" A blocker on a judgment call produces false positives, and a defensive rule with false positives gets bypassed (and then *all* the rules get bypassed). So orphan / shotgun / tribal / god-row are handled as **offensive audits** (advisory, periodic) plus the same-PR prevention rule above; only the unambiguous, high-severity secrets case earns `exit 1`. This split is the defensive-vs-offensive distinction applied to config debt — see [`../../defensive-vs-offensive-governance.md`](../../defensive-vs-offensive-governance.md).

---

## Related

- [`../concepts/config-debt-taxonomy.md`](../concepts/config-debt-taxonomy.md) — the five classes, detection commands, prevention rules
- [`../skills/architecture-completeness-guardian/references/scene-new-setting.md`](../skills/architecture-completeness-guardian/references/scene-new-setting.md) — the per-scenario handbook that runs this self-check when a new setting is declared
- [`../../defensive-vs-offensive-governance.md`](../../defensive-vs-offensive-governance.md) — why one class is a blocker and four are audits
