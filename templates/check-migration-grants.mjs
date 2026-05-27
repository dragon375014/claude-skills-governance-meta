#!/usr/bin/env node
/**
 * check-migration-grants.mjs
 *
 * Defensive rule: every new Supabase migration that contains
 * `CREATE TABLE public.<name>` must also contain a matching
 * `GRANT ... ON <name> TO (anon|authenticated|service_role)`.
 *
 * Why this matters
 * ────────────────
 * As of 2026-05-30 (new projects) and 2026-10-30 (existing projects),
 * Supabase no longer exposes newly-created tables in the `public` schema
 * via the Data API by default. Without an explicit GRANT, supabase-js /
 * PostgREST / GraphQL return HTTP 403 with SQLSTATE 42501.
 *
 * Existing tables are unaffected — Supabase preserves their current
 * grants. Only NEW tables (migrations created after your BASELINE) need
 * to be checked.
 *
 * The "diff tool gap" — schema-diff tools (supabase db diff, prisma
 * migrate, drizzle-kit) DO NOT add GRANT clauses to their output. They
 * compare schema state and emit DDL for the differences; role-level
 * grants are outside their scope. If you generate migrations via diff,
 * you must hand-edit the GRANT clauses in.
 *
 * Wiring
 * ──────
 *   package.json:
 *     "scripts": {
 *       "audit:migration-grants": "node scripts/check-migration-grants.mjs"
 *     }
 *
 *   Pre-commit hook: run when migration files change:
 *     #!/bin/sh
 *     git diff --cached --name-only | grep -q 'migrations/' && \
 *       node scripts/check-migration-grants.mjs
 *
 * Customization
 * ─────────────
 *   1. Set MIGRATION_DIR to your project's migration path
 *   2. Set BASELINE to the highest migration number that existed when
 *      this rule went live (legacy tables won't be re-checked)
 *   3. Add to ALLOWLIST any migration that intentionally omits GRANT
 *      (e.g., internal-only tables accessed exclusively via RPC)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Use fileURLToPath, NOT new URL().pathname — non-ASCII paths get URL-encoded
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ═══════════════════════════════════════════════════════════════════════════
// [PROJECT CONFIG]
// ═══════════════════════════════════════════════════════════════════════════

const MIGRATION_DIR = path.join(repoRoot, 'supabase', 'migrations')

// BASELINE = the highest migration number that existed when you adopted this
// rule. Migrations with number <= BASELINE are skipped (legacy tables are
// grandfathered in by Supabase's existing-table protection).
//
// First-time setup: set BASELINE to your current highest migration number.
// Going forward, leave BASELINE alone — every new migration is checked.
const BASELINE = 0

// Migrations explicitly exempted from the GRANT requirement.
// Add entries only when the table is intentionally not exposed to Data API
// (e.g., accessed only via SECURITY DEFINER RPC). Each entry should have
// a comment explaining why and when it was added.
const ALLOWLIST = new Set([
  // Example:
  // '0042_internal_audit_log.sql',  // 2026-06-01: RPC-only access by design
])

// ═══════════════════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════════════════

function stripSqlComments(sql) {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
}

function extractMigrationNumber(filename) {
  // Supports: 0042_name.sql, 42_name.sql, 20260601120000_name.sql
  const m = filename.match(/^(\d+)_/)
  return m ? parseInt(m[1], 10) : null
}

function findCreateTables(sql) {
  // Match: CREATE TABLE [IF NOT EXISTS] [public.]<name>
  // Excludes TEMP / TEMPORARY (non-public schema)
  const re = /(\bTEMP(?:ORARY)?\s+)?CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi
  const tables = []
  let m
  while ((m = re.exec(sql)) !== null) {
    if (m[1]) continue // TEMP / TEMPORARY → skip
    tables.push(m[2])
  }
  return [...new Set(tables)]
}

function hasGrantFor(sql, tableName) {
  const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match: GRANT <privs> ON [TABLE] [public.]<table> TO (anon|authenticated|service_role|public)
  const re = new RegExp(
    `GRANT\\s+[^;]+\\bON\\s+(?:TABLE\\s+)?(?:public\\.)?${escaped}\\b[^;]*\\bTO\\s+(?:anon|authenticated|service_role|public)\\b`,
    'i'
  )
  return re.test(sql)
}

if (!fs.existsSync(MIGRATION_DIR)) {
  console.error(`Migration directory not found: ${MIGRATION_DIR}`)
  console.error('Set MIGRATION_DIR in this file to your project\'s migration path.')
  process.exit(1)
}

const files = fs
  .readdirSync(MIGRATION_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => ({ name: f, num: extractMigrationNumber(f) }))
  .filter((f) => f.num !== null && f.num > BASELINE)
  .sort((a, b) => a.num - b.num)

let violations = 0
let checkedTables = 0
let skippedAllowlist = 0

for (const { name } of files) {
  if (ALLOWLIST.has(name)) {
    skippedAllowlist++
    continue
  }
  const fullPath = path.join(MIGRATION_DIR, name)
  const raw = fs.readFileSync(fullPath, 'utf8')
  const sql = stripSqlComments(raw)

  const tables = findCreateTables(sql)
  if (tables.length === 0) continue
  checkedTables += tables.length

  const missing = tables.filter((t) => !hasGrantFor(sql, t))
  if (missing.length > 0) {
    if (violations === 0) {
      console.error('')
      console.error('Migration(s) contain CREATE TABLE but no matching GRANT:')
      console.error('')
    }
    console.error(`  ${name}`)
    for (const t of missing) {
      console.error(`    └─ public.${t}: missing GRANT ... TO (anon|authenticated|service_role)`)
    }
    violations++
  }
}

console.log('')
console.log('═'.repeat(70))
console.log('  Migration GRANT Check')
console.log('═'.repeat(70))
console.log(`  Baseline: > ${BASELINE}`)
console.log(`  Scanned migrations: ${files.length}`)
console.log(`  Tables checked: ${checkedTables}`)
if (skippedAllowlist > 0) {
  console.log(`  Allowlist skipped: ${skippedAllowlist}`)
}

if (violations > 0) {
  console.error('')
  console.error(`${violations} migration(s) violated the GRANT requirement.`)
  console.error('')
  console.error('After 2026-10-30, Supabase does not auto-expose new public tables')
  console.error('to the Data API. supabase-js / PostgREST returns 403 + code 42501')
  console.error('for any table without an explicit GRANT.')
  console.error('')
  console.error('Fix (append to the migration file):')
  console.error('  GRANT SELECT ON public.<table> TO anon;')
  console.error('  GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;')
  console.error('  GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO service_role;')
  console.error('')
  console.error('Adjust privileges per your access model. If anon should not write,')
  console.error('grant SELECT only. If a table is intentionally internal-only')
  console.error('(accessed via RPC), add the filename to ALLOWLIST in this script.')
  console.error('')
  process.exit(1)
}

console.log('  Passed.')
console.log('')
process.exit(0)
