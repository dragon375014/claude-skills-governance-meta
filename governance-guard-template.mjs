#!/usr/bin/env node
/**
 * governance-guard-template.mjs
 *
 * A minimal defensive governance scaffold. Copy to your project's
 * `scripts/governance-guard.mjs`, then customize the [PROJECT CONFIG]
 * and rule definition blocks for your codebase.
 *
 * What's included:
 *   - File scanner engine (recursive + targeted modes)
 *   - Comment / template preprocessing helpers (mask without breaking line numbers)
 *   - import-integrity rule (catches "imported file is local-only, not in git")
 *   - Three example rules (spread-overwrites-ssot, raw-role-compare,
 *     create-replace-without-drop) — uncomment and adapt to your domain
 *
 * Wiring:
 *   package.json:
 *     "scripts": {
 *       "guard": "node scripts/governance-guard.mjs",
 *       "prebuild": "npm run guard"
 *     }
 *
 *   Optional pre-commit hook (via Husky / lefthook / native):
 *     #!/bin/sh
 *     node scripts/governance-guard.mjs || exit 1
 *
 * Design principles (see defensive-vs-offensive-governance.md):
 *   - Zero false positives — every reported violation must be a real one
 *   - Sub-5-second execution — no I/O beyond reading source files
 *   - Self-contained — only Node built-ins, no npm deps
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Use fileURLToPath, NOT new URL().pathname — non-ASCII paths get URL-encoded
// and silently break path comparisons. This single fact is responsible for a
// surprising amount of "the rule passes when it shouldn't" debugging.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ═══════════════════════════════════════════════════════════════════════════
// [PROJECT CONFIG] — adapt these to your codebase
// ═══════════════════════════════════════════════════════════════════════════

// Import alias map: e.g., import '@/foo' resolves to which directory?
const ALIAS_MAP = {
  '@/': 'src/', // for monorepo, e.g., 'frontend/src/' or 'apps/web/src/'
}

// Source root for the recursive import-integrity scan
const SCAN_SRC_DIR = 'src'

// ═══════════════════════════════════════════════════════════════════════════
// Rule definitions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * targetedChecks — apply rule only to specific files
 * Use for: rules that are too expensive or too noisy to apply project-wide
 */
const targetedChecks = [
  // Example: only check the legacy API surface for v1 references
  // {
  //   name: 'no-legacy-api-v1',
  //   description: 'Core pages must use api-v2',
  //   files: [
  //     'src/pages/Checkout.vue',
  //     'src/pages/Cart.vue',
  //   ],
  //   patterns: [
  //     {
  //       regex: /\/api\/v1\//g,
  //       message: 'Use /api/v2/ — v1 is deprecated and will be removed.',
  //     },
  //   ],
  // },
]

/**
 * recursiveChecks — apply rule to every file matching `include` under `rootDir`
 * Use for: rules that protect a universal invariant
 */
const recursiveChecks = [
  // ──────────────────────────────────────────────────────────────────────
  // Example rule 1: no-spread-overwrites-ssot-field
  //
  // Anti-pattern: { ...obj, ssot_field: localVar } — frontend clobbers a
  // field the DB maintains via trigger / RPC.
  //
  // See: anti-patterns/spread-overwrites-ssot.md
  //
  // Customize SSOT_FIELDS to your project's trigger-maintained columns.
  // Find them via:
  //   SELECT event_object_table, action_statement
  //   FROM information_schema.triggers
  //   WHERE trigger_schema = 'public';
  // ──────────────────────────────────────────────────────────────────────
  // {
  //   name: 'no-spread-overwrites-ssot-field',
  //   description: 'Frontend must not overwrite DB-maintained SSOT fields',
  //   rootDir: SCAN_SRC_DIR,
  //   include: /\.(js|ts|vue|jsx|tsx)$/,
  //   exclude: /__tests__|\.spec\./,
  //   patterns: [
  //     {
  //       // Adjust this list to your project's SSOT fields
  //       regex: /\{\s*\.\.\.\w+\s*,\s*(?:balance|tier|status|available_qty|total)\s*:/g,
  //       message:
  //         'Spread overwrites SSOT field. The DB maintains this via trigger / RPC. ' +
  //         'Use a different field name (e.g., estimated_<field>) or use mergeServerComputedField().',
  //     },
  //   ],
  //   // Allow the helper itself
  //   skipIfContains: /mergeServerComputedField/,
  // },

  // ──────────────────────────────────────────────────────────────────────
  // Example rule 2: no-raw-role-string-compare
  //
  // Anti-pattern: role === 'admin' scattered across many files. Refactoring
  // role logic requires touching N call sites.
  //
  // Define a helper (e.g., isAdmin(user)) and require its use.
  // ──────────────────────────────────────────────────────────────────────
  // {
  //   name: 'no-raw-role-string-compare',
  //   description: 'Use isAdmin() / isOperator() helpers, not raw string compares',
  //   rootDir: SCAN_SRC_DIR,
  //   include: /\.(js|ts|vue)$/,
  //   exclude: /(?:__tests__|\.spec\.|lib\/auth\/)/,
  //   patterns: [
  //     {
  //       regex: /\b(?:role|system_role)\s*===\s*['"](?:admin|super_admin|operator)['"]/g,
  //       message: 'Raw role string compare. Import isAdmin() / isOperator() from lib/auth/.',
  //     },
  //   ],
  // },

  // ──────────────────────────────────────────────────────────────────────
  // Example rule 3: no-create-replace-function-without-drop
  //
  // Anti-pattern: CREATE OR REPLACE FUNCTION with new parameters but no
  // explicit DROP — leaves zombie overloads in pg_proc.
  //
  // See: anti-patterns/pg-function-overload-zombie.md
  //
  // Scope: migration files only.
  // ──────────────────────────────────────────────────────────────────────
  // {
  //   name: 'no-create-replace-function-without-drop',
  //   description: 'PG functions: explicit DROP required to avoid zombie overloads',
  //   rootDir: 'migrations',  // or supabase/migrations, db/migrations, etc.
  //   include: /\.sql$/,
  //   exclude: /^(?:0|[01]\d|2[01])\d_/,  // skip baseline; adjust BASELINE_PREFIX to your project
  //   patterns: [
  //     {
  //       // Naive: flag CREATE OR REPLACE FUNCTION without a DROP FUNCTION
  //       // anywhere in the same file. False-positive risk: a file that
  //       // creates a new function (never existed before) doesn't need DROP.
  //       // Tighter version requires migration history lookup — see
  //       // anti-patterns/pg-function-overload-zombie.md for the live audit.
  //       regex: /CREATE\s+OR\s+REPLACE\s+FUNCTION/gi,
  //       message:
  //         'CREATE OR REPLACE FUNCTION: add explicit DROP FUNCTION IF EXISTS public.<name>(<old_signature>) ' +
  //         'before the CREATE. CREATE OR REPLACE does NOT remove other overloads.',
  //     },
  //   ],
  //   // Allow if the file already has a DROP for this function
  //   skipIfContains: /DROP\s+FUNCTION\s+IF\s+EXISTS/i,
  // },
]

// ═══════════════════════════════════════════════════════════════════════════
// Engine — generally no need to modify below this line
// ═══════════════════════════════════════════════════════════════════════════

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function getLineNumber(source, index) {
  let line = 1
  for (let i = 0; i < index; i += 1) {
    if (source[i] === '\n') line += 1
  }
  return line
}

function collectFiles(rootDir, include) {
  const absoluteRoot = path.join(repoRoot, rootDir)
  const results = []
  if (!fs.existsSync(absoluteRoot)) return results

  const stack = [absoluteRoot]
  while (stack.length) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        // Skip common no-go directories
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
        stack.push(absolutePath)
        continue
      }
      const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, '/')
      if (include.test(relativePath)) {
        results.push(relativePath)
      }
    }
  }
  return results.sort()
}

// Mask a region but preserve line breaks (so line numbers remain accurate)
function maskRegion(source, regex) {
  return source.replace(regex, (m) => m.replace(/[^\n]/g, ' '))
}

export function preprocessTemplateOnly(source) {
  // Mask <script> blocks in Vue SFC, leaving only <template>
  return maskRegion(source, /<script[^>]*>[\s\S]*?<\/script>/g)
}

export function preprocessStripComments(source) {
  let out = maskRegion(source, /\/\*[\s\S]*?\*\//g)
  out = out.replace(/(^|[^:\\])\/\/[^\n]*/g, (m, prefix) => prefix + ' '.repeat(m.length - prefix.length))
  return out
}

function scanFile(relativePath, patterns, violations, options = {}) {
  const absolutePath = path.join(repoRoot, relativePath)
  if (!fs.existsSync(absolutePath)) return

  const rawSource = readFile(absolutePath)

  if (options.skipIfContains && options.skipIfContains.test(rawSource)) {
    return
  }

  const source = typeof options.preprocess === 'function'
    ? options.preprocess(rawSource)
    : rawSource

  for (const { regex, message } of patterns) {
    regex.lastIndex = 0
    let match = regex.exec(source)
    while (match) {
      violations.push({
        file: relativePath,
        line: getLineNumber(source, match.index),
        message,
        excerpt: match[0],
      })
      match = regex.exec(source)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// import-integrity rule
//
// Universal rule: an import that resolves to a file existing locally but NOT
// tracked by git will pass local builds and fail CI. This rule catches the
// mismatch at commit time.
// ═══════════════════════════════════════════════════════════════════════════

let _gitTrackedCache = null
function getGitTrackedFiles() {
  if (_gitTrackedCache) return _gitTrackedCache
  try {
    const out = execFileSync('git', ['ls-files'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    })
    _gitTrackedCache = new Set(
      out.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.replace(/\\/g, '/'))
    )
  } catch (err) {
    console.warn('[governance-guard] git ls-files failed (skipping import-integrity):', err.message)
    _gitTrackedCache = new Set()
  }
  return _gitTrackedCache
}

const LOCAL_IMPORT_PATTERNS = [
  /(?:^|\s)(?:import|export)\s+(?:[\w*{}\s,]+\s+)?from\s+['"]([^'"]+)['"]/gm,
  /(?:^|\s)import\s+['"]([^'"]+)['"]/gm,
  /import\(\s*['"]([^'"]+)['"]\s*\)/gm,
]

function extractLocalImportSpecs(source) {
  const specs = new Set()
  for (const regex of LOCAL_IMPORT_PATTERNS) {
    regex.lastIndex = 0
    let match = regex.exec(source)
    while (match) {
      const spec = match[1]
      if (spec.startsWith('./') || spec.startsWith('../') || Object.keys(ALIAS_MAP).some(a => spec.startsWith(a))) {
        specs.add(spec)
      }
      match = regex.exec(source)
    }
  }
  return [...specs]
}

function resolveImportSpecToPath(importingRelPath, spec) {
  const importingPosix = importingRelPath.replace(/\\/g, '/')
  for (const [alias, target] of Object.entries(ALIAS_MAP)) {
    if (spec.startsWith(alias)) {
      return path.posix.normalize(path.posix.join(target, spec.slice(alias.length)))
    }
  }
  const importingDir = path.posix.dirname(importingPosix)
  return path.posix.normalize(path.posix.join(importingDir, spec))
}

function findResolvedImportFile(resolvedBase) {
  const candidates = [
    `${resolvedBase}.js`,
    `${resolvedBase}.ts`,
    `${resolvedBase}.mjs`,
    `${resolvedBase}.vue`,
    `${resolvedBase}.jsx`,
    `${resolvedBase}.tsx`,
    `${resolvedBase}.json`,
    resolvedBase,
    `${resolvedBase}/index.js`,
    `${resolvedBase}/index.ts`,
    `${resolvedBase}/index.vue`,
    `${resolvedBase}/index.mjs`,
  ]
  for (const candidate of candidates) {
    const absolutePath = path.join(repoRoot, candidate)
    try {
      const stat = fs.statSync(absolutePath)
      if (stat.isFile()) return candidate
    } catch {
      // try next
    }
  }
  return null
}

function findImportLineNumber(source, spec) {
  const quoted1 = `'${spec}'`
  const quoted2 = `"${spec}"`
  let idx = source.indexOf(quoted1)
  if (idx === -1) idx = source.indexOf(quoted2)
  return idx >= 0 ? getLineNumber(source, idx) : 1
}

function checkImportIntegrity(violations) {
  const tracked = getGitTrackedFiles()
  if (tracked.size === 0) return

  const sourceFiles = collectFiles(SCAN_SRC_DIR, /\.(js|vue|ts|mjs|jsx|tsx)$/)

  for (const relPath of sourceFiles) {
    const absPath = path.join(repoRoot, relPath)
    if (!fs.existsSync(absPath)) continue

    const source = readFile(absPath)
    const specs = extractLocalImportSpecs(source)

    for (const spec of specs) {
      const resolvedBase = resolveImportSpecToPath(relPath, spec)
      const resolved = findResolvedImportFile(resolvedBase)

      if (!resolved) {
        violations.push({
          file: relPath,
          line: findImportLineNumber(source, spec),
          message: `import-target-missing: cannot resolve '${spec}' (tried ${resolvedBase}). Typo? File deleted?`,
          excerpt: `from '${spec}'`,
        })
        continue
      }

      if (!tracked.has(resolved)) {
        violations.push({
          file: relPath,
          line: findImportLineNumber(source, spec),
          message: `import-target-untracked: '${spec}' → ${resolved} exists locally but is NOT tracked by git. CI build will fail. Run: git add ${resolved}`,
          excerpt: `from '${spec}'`,
        })
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

const violations = []

for (const check of targetedChecks) {
  for (const relativePath of check.files) {
    scanFile(relativePath, check.patterns, violations, {
      preprocess: check.preprocess,
      skipIfContains: check.skipIfContains,
    })
  }
}

for (const check of recursiveChecks) {
  const files = collectFiles(check.rootDir, check.include)
  for (const relativePath of files) {
    if (check.exclude && check.exclude.test(relativePath)) continue
    scanFile(relativePath, check.patterns, violations, {
      preprocess: check.preprocess,
      skipIfContains: check.skipIfContains,
    })
  }
}

checkImportIntegrity(violations)

if (violations.length > 0) {
  console.error('Governance guard failed:')
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.message}`)
    console.error(`  matched: ${violation.excerpt}`)
  }
  process.exit(1)
}

console.log('Governance guard passed.')
