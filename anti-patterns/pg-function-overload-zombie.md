# Anti-Pattern: PG Function Overload Zombie

> Example function and parameter names below are illustrative — substitute the names your project actually uses.

## The Day the Signed Link Stopped Working

A signed-token feature has been working in production for months. One Tuesday morning, every user who clicks the link sees the same error: `400 Bad Request`. The link generation looks correct in logs. Other features touching the same table work fine. The deploy from the previous day didn't change the function this feature calls — or so the team thinks.

Looking at the database: there are now **two** definitions of `fn_issue_action_token` registered in `pg_proc`. One takes 3 arguments. One takes 4 arguments (the new one, with a `jsonb` payload added two months ago). The frontend calls it with named arguments, supplying 3 values.

PostgreSQL's function resolution finds two functions that match. PostgREST translates the `42725 function ... is not unique` error into a generic HTTP 400. The frontend code is correct. The new migration is correct. Both correct things collide.

The fix is 30 seconds: drop the old 3-argument overload. The diagnosis takes 3 hours.

---

## Symptom

A signed RPC / function that worked yesterday returns `400` or `404` today, after a migration was applied. The migration itself looks like an additive change — it added a function with a new parameter, didn't touch the old one.

Common signatures:

- `function <name> is not unique` in Postgres logs
- HTTP 400 with terse "Bad Request" body in browser network tab
- `42725` SQLSTATE in detailed logs
- Works when called with positional arguments, fails with named arguments (or vice versa)
- Behavior diverges between local dev DB and staging / production

Sometimes the failure isn't `is not unique` but **silent wrong-overload-picked**: the new function and the old function have the same name and same parameter types, but different bodies. Postgres picks one (the resolution rules are deterministic but non-obvious to most developers). The wrong one runs. No error. Just incorrect behavior.

---

## Root Cause

`CREATE OR REPLACE FUNCTION` does **not** replace overloads. It only replaces the exact same signature.

```sql
-- Migration N: original function
CREATE OR REPLACE FUNCTION public.fn_issue_action_token(
  p_entity_id text,
  p_action text,
  p_ttl integer
) RETURNS text AS $$ ... $$ LANGUAGE plpgsql;

-- Migration N+1: "added optional jsonb metadata"
CREATE OR REPLACE FUNCTION public.fn_issue_action_token(
  p_entity_id text,
  p_action text,
  p_ttl integer,
  p_metadata jsonb DEFAULT NULL  -- ← signature change!
) RETURNS text AS $$ ... $$ LANGUAGE plpgsql;
```

After migration N+1, `pg_proc` has **both** definitions registered:

- `fn_issue_action_token(text, text, integer)` — the original
- `fn_issue_action_token(text, text, integer, jsonb)` — the new one

The author intended migration N+1 to *replace* the original. It didn't. Postgres treats them as separate overloads.

Frontend code calling with three positional arguments:

```js
supabase.rpc('fn_issue_action_token', {
  p_entity_id: id,
  p_action: 'sign',
  p_ttl: 3600,
})
```

Postgres function resolution: both overloads have a matching prefix. The 4-argument version's 4th parameter has a `DEFAULT NULL`, so it's a candidate. The 3-argument version is also a candidate. **Both match**. Resolution is ambiguous. Postgres raises `42725 function ... is not unique`.

---

## Why "CREATE OR REPLACE" Doesn't Solve It

Most developers learn: `CREATE TABLE` overwrites with `CREATE OR REPLACE TABLE` (or `DROP TABLE` + `CREATE`). They expect the same for functions. But the analogy breaks: PostgreSQL **deliberately allows function overloading** — multiple functions with the same name and different parameter lists, like in C++ or Java. `CREATE OR REPLACE FUNCTION foo(int)` only touches the `foo(int)` overload, not `foo(text)` or `foo(int, int)`.

Adding a parameter with `DEFAULT NULL` is **always** a signature change. It does not silently extend the old function. It creates a new overload that coexists with the old one until you explicitly drop the old one.

---

## Anti-Pattern Code

```sql
-- migrations/0042_add_metadata_param.sql

-- ❌ This does NOT remove the old overload
CREATE OR REPLACE FUNCTION public.fn_issue_action_token(
  p_entity_id text,
  p_action text,
  p_ttl integer,
  p_metadata jsonb DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- ... new body
END $$;
```

Variants of the same mistake:

- Adding an optional parameter "for backwards compatibility" (no such thing for PG functions)
- Renaming a parameter (PG treats renamed parameters as a different signature for named-argument calls)
- Changing a parameter type (e.g., `text → varchar`) — PG treats this as a different overload
- Splitting one function into two (the original wasn't dropped)

---

## Correct Code

Always drop the old overload **explicitly** before creating the new one. Use the full signature, including the schema prefix:

```sql
-- migrations/0042_add_metadata_param.sql

-- ✅ Drop the old signature first
DROP FUNCTION IF EXISTS public.fn_issue_action_token(text, text, integer);

CREATE OR REPLACE FUNCTION public.fn_issue_action_token(
  p_entity_id text,
  p_action text,
  p_ttl integer,
  p_metadata jsonb DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- ... new body
END $$;

-- Self-verification: assert exactly 1 overload exists
DO $$
DECLARE
  overload_count integer;
BEGIN
  SELECT count(*) INTO overload_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'fn_issue_action_token';

  IF overload_count <> 1 THEN
    RAISE EXCEPTION 'fn_issue_action_token: expected 1 overload, got %', overload_count;
  END IF;
END $$;

-- Reload PostgREST schema cache so the new signature is visible immediately
NOTIFY pgrst, 'reload schema';
```

Three things this template enforces:

1. **Explicit drop** — removes the old overload regardless of whether `CREATE OR REPLACE` would have hit it
2. **Self-verification block** — if the drop didn't succeed (e.g., the developer typed the wrong old signature), the migration fails immediately rather than silently leaving two overloads
3. **PostgREST notify** — so the API gateway picks up the new signature without waiting for cache expiry

---

## Detection Rule

Two layers of detection — one defensive (catches the pattern at commit), one offensive (catches existing live drift).

### Defensive: lint new migrations for missing DROP

```js
// In check-migration-overload-safety.mjs
import fs from 'node:fs'
import path from 'node:path'

const migrationDir = path.join(repoRoot, 'migrations')
const newMigrations = fs.readdirSync(migrationDir)
  .filter(f => f.endsWith('.sql'))
  .filter(f => extractNumber(f) > BASELINE_VERSION)

for (const file of newMigrations) {
  const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8')

  // Find all CREATE OR REPLACE FUNCTION names
  const creates = [...sql.matchAll(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?(\w+)/gi)]

  for (const match of creates) {
    const funcName = match[1]
    // Require a corresponding DROP FUNCTION earlier in the file
    const dropRegex = new RegExp(`DROP\\s+FUNCTION\\s+(?:IF\\s+EXISTS\\s+)?(?:public\\.)?${funcName}\\s*\\(`, 'i')
    if (!dropRegex.test(sql)) {
      console.error(`${file}: CREATE OR REPLACE FUNCTION ${funcName} without preceding DROP FUNCTION`)
      process.exit(1)
    }
  }
}
```

This is naive — it doesn't validate that the dropped signature matches the old one. Tightening it requires knowing the migration history, which is more involved. The naive version catches 80% of the issue: developers who forget to write `DROP` at all.

### Offensive: live overload count audit

```sql
-- Run periodically against your DB
SELECT
  p.proname AS function_name,
  count(*) AS overload_count,
  array_agg(pg_get_function_arguments(p.oid)) AS signatures
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    -- list your project's critical functions here
    'fn_issue_action_token',
    'fn_create_order',
    -- ...
  )
GROUP BY p.proname
HAVING count(*) > 1;
```

Any row returned means a zombie overload exists. If you maintain a list of "critical functions that must be exactly-1 overload," this query becomes a one-shot smoke test you can wire into a pre-release audit or a daily cron job.

---

## Why This Pattern Is Especially Bad

Three reasons it deserves a dedicated anti-pattern entry rather than being a footnote:

1. **The failure is silent until invocation** — `pg_proc` happily holds two overloads. The bug doesn't manifest until a client actually calls the function. Tests that exercise the new signature work fine. Tests that exercise the old call signature also work fine — until they hit a path where Postgres can't decide.

2. **The error message routes through three systems before reaching the developer** — Postgres logs `42725 function ... is not unique`, PostgREST translates to HTTP 400 with a generic message, the frontend shows a UI error that says "Something went wrong." By the time a developer sees the symptom, the root cause is three layers away.

3. **Reverting the migration doesn't fix it** — even if you revert the SQL in version control, the zombie overload persists in the DB until you actually `DROP` it. "Roll back the migration" requires writing a *new* migration that drops the bad overload.

---

## Related Documents

- `breakpoint-taxonomy.md` — this is a Type A (DB Schema Drift) bug, specifically the "tool is correct but its assumptions are violated" sub-case
- `defensive-vs-offensive-governance.md` — this anti-pattern requires both modes to catch
- `templates/check-migration-grants.mjs` — sibling defensive rule for a different Postgres / Supabase pitfall (missing GRANT clause)
