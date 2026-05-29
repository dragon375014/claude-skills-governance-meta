# Config Debt Taxonomy

Configuration is where a codebase quietly rots. A value starts as a hardcoded constant, gets "made adjustable" under deadline, lands in three places at once, and eighteen months later nobody remembers it exists or how to change it. Unlike a logic bug, config debt doesn't crash — it just slowly makes the system unknowable.

This is a four-class taxonomy (plus one security class) for naming config debt so you can detect and prevent it. It's stack-agnostic: "config store" below means whatever you have — a `system_config` table, a settings JSON, env vars, a key-value store.

---

## TL;DR

| Class | One-line symptom | Severity |
|---|---|---|
| **Orphan** | the value exists and code reads it, but no UI / interface can change it | medium |
| **Shotgun** | the same concept lives in env + DB + code at once | medium |
| **Tribal knowledge** | only one person knows the value exists and how to change it | high (bus-factor) |
| **God-row** | one giant blob holds every unrelated setting | medium (grows worse over time) |
| **Secrets in store** | plaintext credentials stored in the config blob | **P0 security** |

---

## Orphan config

**Symptom**: a setting that code reads on every run, but which has no write path — no admin UI, no documented command, no API. To change it you'd have to hand-edit the database.

**How it happens**: a migration inserts a config row "to make this adjustable later," but the UI to adjust it never ships. The PR that needed the value is done; the affordance to change it is forgotten.

**Why it's debt**: six months on, a real business need ("can we change the threshold?") hits a wall — the value is technically adjustable but there's no door. The developer rediscovers it's "SQL-only," which feels like a missing feature even though the data has been there all along.

**Detection**: for each config key, grep for a *write* path in the UI/admin layer. A key with reads but no writes is an orphan.

**Prevention rule**: when you add a config row, do one of three things in the *same* PR:
- (A) ship a UI write path, or
- (B) explicitly mark it as intentionally orphan (e.g. a secret that's meant to be edited only via a console), or
- (C) log it in a registry's "UI to-do" list so it's tracked, not forgotten.

---

## Shotgun config

**Symptom**: the same concept is configured in multiple stores — an env var *and* a DB row *and* a hardcoded fallback in code — and you can't tell which one actually wins at runtime.

**How it happens**: someone adds an env var. Later someone wants it adjustable without redeploy, so they add a DB row. The old env read is never removed. Now there are two sources and a precedence nobody documented.

**Why it's debt**: changing the value in the "obvious" place has no effect because a different source overrides it. Debugging this burns hours because the effective value isn't where you'd look.

**Detection**: grep one config concept across env files, the config store, and source. More than one source for the same concept = shotgun.

**Prevention rule**: one concept, one source of truth. If you migrate a value from env to DB, *delete the env read in the same change*. Document the precedence if a fallback genuinely must exist.

---

## Tribal knowledge config

**Symptom**: a value that matters, that has to be changed occasionally, but whose existence and edit procedure live only in one person's head. No doc, no comment, no rule, no trace.

**How it happens**: the original author knows "oh, to change the cutoff you edit row X column Y and then run the reload." They never wrote it down because they always remembered. Then they got busy / left / forgot.

**Why it's debt**: this is the highest bus-factor class. When the one person who knows is unavailable, the value becomes effectively unchangeable, and the next person may not even know it exists.

**Detection**: this is the hardest to detect mechanically — it's an *absence* of documentation. Proxy signals: a config key referenced in code but appearing in no doc, README, or registry.

**Prevention rule**: every config value that a human ever changes gets a registry entry: what it is, where it lives, how to change it, what it affects. The registry is the cure for tribal knowledge.

---

## God-row config

**Symptom**: one row / one JSON blob / one object holds every setting in the system — shipping, notifications, feature flags, pricing, print formats — all crammed into a single `settings.config` blob.

**How it happens**: the first setting went into a `config` JSON. It was easy, so the second went there too. Now everything does. The blob has no schema, no validation, and editing one key risks the whole row.

**Why it's debt**: no per-setting access control, no per-setting validation, no per-setting history. A typo in one key can break unrelated features. The blob grows monotonically and is never split.

**Detection**: count the distinct domains of keys in your largest config object. If shipping settings and notification settings and feature flags all share one blob, that's a god-row.

**Prevention rule**: a new domain opens a new row / table, not a new key in the god-row. Existing god-rows are split lazily — when you touch a domain's settings, extract that domain out.

---

## Secrets in store (P0 security)

**Symptom**: plaintext credentials — a service key, a private key, an API secret — stored in a config table or JSON blob that's queryable by the app's normal data path.

**Why it's a different severity**: the other four classes are maintainability debt. This one is an exfiltration risk. A config store readable by the application (or worse, by a broad role) is the wrong place for a secret — secrets belong in a secrets manager / encrypted env / vault with separate access control.

**Detection**: grep the config store for anything matching `*_key`, `*_secret`, `private_key`, `token`, `password` with a long opaque value.

**Prevention rule**: a defensive guard that blocks any commit writing a secret-shaped value into the config store. This is the one config-debt class worth a hard CI blocker (see [`../../defensive-vs-offensive-governance.md`](../../defensive-vs-offensive-governance.md)).

---

## Using this taxonomy

Two modes, matching the defensive/offensive split:

- **Offensive (find existing debt)**: run a one-time audit classifying every config key into one of these five classes. Output a tiered list. Most projects find a handful of orphans and at least one god-row.
- **Defensive (block new debt)**: when an architecture-gate skill hits a "new setting" scenario, it runs this taxonomy as a self-check before the setting ships. The shipped [`scene-new-setting.md`](../skills/architecture-completeness-guardian/references/scene-new-setting.md) does exactly this.

The secrets-in-store class is the only one that warrants a zero-tolerance CI blocker; the other four are best handled as advisory audits plus a same-PR prevention rule, because a false positive on "is this an orphan?" is common and shouldn't block a deploy.

---

## Related documents

- [`../skills/architecture-completeness-guardian/references/scene-new-setting.md`](../skills/architecture-completeness-guardian/references/scene-new-setting.md) — the per-scenario handbook that runs this self-check
- [`../../defensive-vs-offensive-governance.md`](../../defensive-vs-offensive-governance.md) — which classes warrant a blocker vs. an advisory audit
- [`../claude-md-rule-templates/rule-30-config-debt.md`](../claude-md-rule-templates/rule-30-config-debt.md) — a copy-paste CLAUDE.md rule enforcing the self-check
