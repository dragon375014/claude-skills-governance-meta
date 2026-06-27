# Supabase / Web-App Security Gate — portable P0~P2 ruleset

> A severity-tagged security ruleset for **Supabase + web-app** projects, extracted from a production app's many rounds of real vulnerability fixes. Use it two ways: **(a) brownfield scan** — run it against an existing project and report P0~P2 findings; **(b) design-time checklist** — follow it so the vuln never exists.
>
> **The point of this file is the GOLD** — the classes that Supabase's own advisor and standard linters **never catch**, because the table's RLS is on, the policy is valid, and the lint is green while the hole is wide open. The commodity classes (which the advisor *does* lint) are listed at the end for completeness; don't reinvent those — just run the advisor.

## How to use

- **Gate semantics**: P0 / P1 = **fail-closed** (block until fixed or explicitly acknowledged in an allowlist). P2 = warn.
- **Intentional exceptions**: every project has surfaces it *deliberately* exposes (e.g. an anon-safe public view). Those go in a project-local **allowlist** so the gate doesn't cry wolf — the allowlist is the project owner's call, never auto-inferred.
- **Detection cost**: ⚙️ = mechanically detectable (SQL on a live `--linked` DB / grep / advisor). 👁️ = semantic review only (no low-false-positive mechanical check).
- **Don't ship CADENCE without context**: many fixes here are environment-specific (custom JWT, specific deploy lifecycle). Read the *why*, don't blind-copy the *how*.

---

## 🥇 GOLD — what the advisor can't catch (the real value)

### P0

**G-01｜RLS locks the row, not the column → self-escalation** ⚙️
A `FOR UPDATE` policy whose `USING` clause checks row ownership (`id = requesting_user_id()` / `auth.uid()`) on a table that has a **privilege column** (role / tier / plan / `is_admin`). The row owner can `PATCH {role:'admin'}` on their *own* row and self-escalate — RLS policies **cannot reference OLD**, so they can't forbid changing a specific column.
- **Why lint is green**: RLS is enabled, row ownership is correct. Standard RLS linters pass.
- **Detect**: find tables with a privilege column + a self-update policy (`USING(owner = current_user_id)`) + **no `BEFORE UPDATE` trigger / no column-level `REVOKE`**.
- **Fix**: column-level `REVOKE UPDATE (priv_cols) FROM anon, authenticated`, **or** a `BEFORE UPDATE` trigger comparing `OLD.priv = NEW.priv`. **Never** rely on an `AFTER`/audit trigger as the guard — by then the write already happened. ⚠️ If the table has a *legitimate* privileged promotion path (a `SECURITY DEFINER` upgrade RPC), a naive BEFORE trigger will kill it — prefer column-level revoke so the definer path still works.

**G-02｜anon can call an unguarded `SECURITY DEFINER` RPC** ⚙️
Postgres grants new functions `EXECUTE TO PUBLIC` by default, and `anon` is a member of `PUBLIC`. A `SECURITY DEFINER` mutator with **no in-body authorization check** (`is_admin()` / `requesting_user_id()` / capability check) is directly callable by anyone with the anon key.
- **Why lint is green**: the function works; advisors don't cross "secdef + PUBLIC grant + no body guard".
- **Detect**: `pg_proc` where `prosecdef = true` AND `has_function_privilege('anon', oid, 'EXECUTE')` AND the body lacks an auth helper.
- **Fix**: `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated;` then `GRANT EXECUTE` back to the roles that should have it. ⚠️ **Reality gotcha**: on some projects `REVOKE FROM PUBLIC` alone is **not enough** — an `ALTER DEFAULT PRIVILEGES` (or a platform default) re-grants new functions to `anon`/`authenticated` directly. You must revoke from `anon` and `authenticated` explicitly, then re-grant. Verify with `has_function_privilege`, not by assuming.

### P1

| id | class | detect | fix |
|---|---|---|---|
| **G-03** | **Payment callback trusts client-sent amount** ⚙️/👁️ | initiate/confirm/notify uses a client-supplied `amount` instead of re-reading authoritative total | always re-query amount from the DB server-side; build the payment package on the server; ignore client amount |
| **G-04** | **Signature check is fail-open** ⚙️ | `if (sig && sig !== expected) reject` — an empty/missing sig *skips* verification | fail-closed: `if (!sig \|\| sig !== expected) reject` |
| **G-05** | **supabase-js write fails silently** ⚙️/👁️ | `.insert/.update/.upsert` returns `{error}` instead of throwing; callers don't check → "payment never marked paid, money taken, nobody knows" | check `{error}` on every mutation and log loudly; never swallow on money/state paths |
| **G-06** | **`SECURITY DEFINER` write trusts client resource id** 👁️ | a definer write RPC uses a client-passed `owner_id` / `slot_id` without re-verifying against the authoritative read model (a row lock stops collisions, not out-of-bounds writes) | re-fetch the resource from the authoritative source (`FOR UPDATE`), ignore client-passed ids for authorization |
| **G-07** | **Public Edge Function `verify_jwt=false` not persisted in config** ⚙️ | a public callback/widget endpoint is fetched raw (no auth header), but `verify_jwt=false` is only set via a one-off CLI flag — a redeploy washes it back to `true` → gateway 401 | write `[functions.X] verify_jwt = false` into the deploy config file, not just the CLI flag |
| **G-08** | **Frontend recomputes & overwrites a DB SSOT field using admin-only data** ⚙️/👁️ | anon can't read an RLS-gated source table → recomputes a derived field as 0 → overwrites the DB's correct value → consumers see it broken, while the admin view (which *can* read the source) stays green for months | prefer the DB value when present, only fall back when null; smoke-test from the **anon** viewpoint, not just admin |
| **G-09** | **RLS uses `auth.uid()` under a custom JWT** ⚙️ | project signs its own JWT (not Supabase Auth) → `auth.uid()` resolves to nothing → policy silently fails-open or fails-everyone | use a helper that reads the JWT `sub` (`requesting_user_id()`), not `auth.uid()` |
| **G-10** | **JWT-signing secret missing → fail-open token** 👁️ | the auth function, when its signing secret is unset, returns a placeholder token regardless of environment → fail-open in prod | fail-closed: only a mock/dev mode may issue a fake token; production throws if the secret is absent |

---

## 🪙 Commodity — the advisor already lints these (run it, don't reinvent)

- **C-01 RLS disabled on a public table** → advisor `rls_disabled_in_public`. (Note: a migration-grant linter that only scans the `migrations/` folder and only checks "too-few grants" will **miss** tables created outside migrations and miss "RLS off / anon too broad" — know where your existing guard *doesn't* look.)
- **C-02 `SECURITY DEFINER` view bypasses RLS** → advisor `security_definer_view`; fix with `WITH (security_invoker = true)`.
- **C-03 PII table granted `SELECT` to anon** → advisor `policy_exists_rls_disabled` / `auth_users_exposed` family.
- **C-04 plaintext secret in a DB jsonb column** → grep-detectable; move secrets to function/edge secrets, store an `env:KEY` reference in the DB.

## P2 (hardening)

- **H-01** public storage bucket with a `SELECT` policy → lets anyone `list()` and enumerate every filename (advisor `0025`); a public bucket already serves object URLs without a SELECT policy, so **don't add one**.
- **H-02** orphan cron: a cleanup/expiry function written but never wired to a scheduler → never runs, fails silently (DoS-by-omission). Wire the schedule in the same migration.
- **H-03** legacy API-key deprecation: migrate legacy JWT anon/service keys to the publishable/secret format before the deprecation date (publishable keys also hide the OpenAPI schema, reducing enumeration).
- **H-04** migration drift / non-idempotent DDL: applies not tracked in `schema_migrations` + non-idempotent DDL → `db push` collides (42710). Wrap DDL in `if [not] exists` / `drop ... if exists`.

---

## Severity → gate action

| severity | gate |
|---|---|
| P0 (G-01, G-02, C-01…C-03 confirmed live) | **fail-closed** — block until fixed or allowlisted with owner sign-off |
| P1 (G-03…G-10) | **fail-closed** for money/auth paths; warn elsewhere |
| P2 / hardening | warn + track |

---

*Provenance: extracted 2026-06 from a production Supabase + Vue commerce app's accumulated security-fix history. The gold classes are the ones that cost a real incident to learn — they survive every standard linter green. Generalize freely; the project-specific bindings (which tables, which allowlisted exceptions) live in the consumer's private config, not here.*
