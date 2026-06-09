#!/usr/bin/env node
/**
 * step-back-sentinel-template.mjs — the asymmetry sentinel (Part 2 of the reverse organ)
 *
 * See: scaffold/concepts/forward-bias-and-the-reverse-organ.md
 *      scaffold/claude-md-rule-templates/rule-34-step-back-cadence.md
 *      scaffold/skills/step-back-review/SKILL.md
 *
 * WHAT IT IS
 *   A cadence trigger that runs a cheap pre-check and STAYS SILENT unless it trips.
 *   It is NOT a timer — it's a "half-finished symmetry" detector. Most incidents in
 *   a maturing codebase are asymmetries ("changed A, forgot B"): wrote the upstream
 *   but didn't register the downstream; changed the write side but not the serializer.
 *   No half-finished symmetry → it says nothing.
 *
 * WHY SILENCE-UNLESS-TRIPPED MATTERS
 *   A blind periodic interrupt gets muted like an "are you sure?" dialog. An interrupt
 *   that fires only on a real asymmetry — and names the past-incident class it maps to —
 *   is "earned", so it survives. Clean → exit 0 (silent). Tripped → exit 1 + print.
 *   ALWAYS advisory: wire it as non-blocking in CI. You cannot `exit 1` on a judgment call.
 *
 * HOW TO ADOPT
 *   1. Replace the HARD tripwires in `analyze()` with YOUR OWN incident classes.
 *      The generic ones below are examples — seed yours from your real "changed A,
 *      forgot B" history. Each tripwire = "asset added, mirror missing".
 *   2. Tune THRESHOLDS to your commit cadence.
 *   3. Wire `node step-back-sentinel.mjs` into your audit runner (advisory) + session open.
 *   4. After a review, `node step-back-sentinel.mjs --ack` resets the baseline.
 *
 * USAGE
 *   node step-back-sentinel.mjs            # scan last-review marker..HEAD, print advisory
 *   node step-back-sentinel.mjs --ack      # mark current HEAD as "reviewed", reset baseline
 *   node step-back-sentinel.mjs --since 30 # force-scan the last 30 commits (ignore marker)
 *   node step-back-sentinel.mjs --json     # machine-readable output
 *   node step-back-sentinel.mjs --self-test
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.')
const STATE_FILE = path.join(repoRoot, '.step-back-state.json')

// ---- Thresholds (conservative starting points — raise if too noisy) ---------
export const THRESHOLDS = {
  DRIFT_COMMITS: 6,     // S1: ≥ N commits since last review
  DRIFT_MODULES: 3,     // S1: AND spanning ≥ M code modules (both must hold)
  THRASH_COMMITS: 4,    // S2: same file touched in ≥ K commits = design not converging
  FIX_SERIES: 5,        // S3: a fix(scope) series ≥ J commits = treating symptoms
  GOD_FILE_LINES: 300,  // S4: single file net +L lines = a god-file forming
  DEFAULT_LOOKBACK: 20, // when no marker exists
}

// ---- Pure analysis core (no git/fs — easy to test) --------------------------

/** Bucket a path into a module. Docs/config don't count as code drift. */
export function moduleOf(file) {
  // CUSTOMIZE these prefixes to your repo layout.
  if (file.startsWith('migrations/') || /\/migrations\//.test(file)) return { bucket: 'db:migrations', isCode: true }
  if (file.startsWith('functions/') || /\/functions\//.test(file)) return { bucket: 'edge:fn', isCode: true }
  if (file.startsWith('scripts/')) return { bucket: 'scripts', isCode: true }
  const src = file.match(/^src\/([^/]+)/)
  if (src) return { bucket: 'src:' + src[1], isCode: true }
  if (/\.(md|txt)$/i.test(file) || file.startsWith('docs/')) return { bucket: 'docs', isCode: false }
  return { bucket: 'other', isCode: false }
}

/** Extract added lines (+ prefix, not +++ header) from a diff. */
export function addedLines(diffText) {
  return (diffText || '').split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1))
}

/**
 * Turn collected git facts into findings. Pure function.
 *
 * @param {object} facts
 *   changedFiles[], fileStatuses[{status,file}], commitSubjects[],
 *   fileCommitCounts{file:n}, fileNetLines{file:n}, commitCount,
 *   addedDiffByFile{file:addedText}
 */
export function analyze(facts) {
  const findings = []
  const {
    changedFiles = [], fileStatuses = [], commitSubjects = [],
    fileCommitCounts = {}, fileNetLines = {}, commitCount = 0, addedDiffByFile = {},
  } = facts
  const changedSet = new Set(changedFiles)
  const has = (pred) => changedFiles.some(pred)

  // ====================================================================
  // HARD tripwires — REPLACE THESE WITH YOUR OWN INCIDENT CLASSES.
  // Each one = "an asset was added, its required mirror is missing".
  // The four below are common-enough examples to start from.
  // ====================================================================

  // H1 (example): a serializer/DTO whitelist that must mirror API return shape.
  //   "changed the API return, forgot the whitelist → consumer gets null"
  const apiShapeChanged = Object.entries(addedDiffByFile)
    .some(([f, t]) => /\.(sql|ts|js)$/.test(f) && /(jsonb_build_object|res\.json|return\s*\{)/.test(t))
  const touchesSerializer = has(f => /(serializer|normalize|dto|mapper)/i.test(f))
  if (apiShapeChanged && !touchesSerializer) {
    findings.push({
      id: 'H1', severity: '🚨',
      title: 'API return shape may have changed, but the serializer/whitelist did not',
      detail: 'If a whitelist serializer sits between this API and the consumer, new fields get stripped → null on the other side.',
      maps: 'incident class: write-side changed, middle-layer contract not updated',
    })
  }

  // H2 (example): a new config row with no admin UI to edit it (orphan config).
  const addsConfigRow = Object.values(addedDiffByFile).some(t => /INSERT\s+INTO\s+\w*config/i.test(t))
  if (addsConfigRow && !has(f => /(admin|settings).*\.(vue|tsx|jsx)$/i.test(f))) {
    findings.push({
      id: 'H2', severity: '🚨',
      title: 'New config row added, but no admin UI path in the same change',
      detail: 'Six months on, no one remembers this value is editable. Add a UI path, or mark it intentionally SQL-only.',
      maps: 'incident class: orphan config',
    })
  }

  // H3 (example): a new public serverless function without its auth-bypass config.
  const newFns = fileStatuses.filter(s => s.status === 'A' && /functions\/[^/]+\/(index|handler)\.(ts|js)$/.test(s.file))
  if (newFns.length > 0 && !has(f => /(config\.toml|wrangler|serverless\.yml)$/.test(f))) {
    findings.push({
      id: 'H3', severity: '🚨',
      title: 'New serverless function but no platform auth/config file touched',
      detail: 'If it must be public, the auth-bypass/route config can silently reset on redeploy → 401/404.',
      maps: 'incident class: function added, deploy config not mirrored',
    })
  }

  // H4 (example): new env var read without an .env.example entry.
  const envKeys = new Set()
  for (const t of Object.values(addedDiffByFile)) {
    const re = /(?:process\.env|Deno\.env\.get\(['"])([A-Z_][A-Z0-9_]*)/g
    let m; while ((m = re.exec(t)) !== null) envKeys.add(m[1])
  }
  if (envKeys.size > 0 && !changedSet.has('.env.example')) {
    findings.push({
      id: 'H4', severity: '🟡',
      title: 'New env var(s) read but .env.example not updated',
      detail: `New keys: ${[...envKeys].join(', ')}. Next machine / new contributor breaks silently.`,
      maps: 'incident class: env added, example not mirrored',
    })
  }

  // ====================================================================
  // SOFT tripwires — generic, accumulation-based. Usually keep as-is.
  // ====================================================================

  // S1: cross-module drift — commit count AND module spread both must trip
  const codeModules = new Set()
  for (const f of changedFiles) {
    const { bucket, isCode } = moduleOf(f)
    if (isCode && !/test/i.test(bucket)) codeModules.add(bucket)
  }
  if (commitCount >= THRESHOLDS.DRIFT_COMMITS && codeModules.size >= THRESHOLDS.DRIFT_MODULES) {
    findings.push({
      id: 'S1', severity: '🟡',
      title: `Scattered changes — ${commitCount} commits across ${codeModules.size} modules`,
      detail: `Modules: ${[...codeModules].join(', ')}. Possible tunnel vision. Step back: is this one thing, or a snowball?`,
      maps: 'sentinel S1 — drift',
    })
  }

  // S2: thrashing — same code file touched repeatedly (docs excluded)
  const thrashed = Object.entries(fileCommitCounts)
    .filter(([f, n]) => n >= THRESHOLDS.THRASH_COMMITS && moduleOf(f).isCode && !/\.md$/i.test(f))
    .sort((a, b) => b[1] - a[1])
  if (thrashed.length) {
    findings.push({
      id: 'S2', severity: '🟡',
      title: 'Same file changed repeatedly — design may not be converging',
      detail: thrashed.map(([f, n]) => `${f} (${n} commits)`).join('; ') + '. Is the root cause actually found, or are you reskinning?',
      maps: 'sentinel S2 — thrashing',
    })
  }

  // S3: long fix series — one bug that won't close
  const fixScopes = {}
  for (const s of commitSubjects) { const m = s.match(/^fix\(([^)]+)\)/); if (m) fixScopes[m[1]] = (fixScopes[m[1]] || 0) + 1 }
  const longFix = Object.entries(fixScopes).filter(([, n]) => n >= THRESHOLDS.FIX_SERIES)
  if (longFix.length) {
    findings.push({
      id: 'S3', severity: '🟡',
      title: 'Long fix series — possibly treating symptoms',
      detail: longFix.map(([s, n]) => `fix(${s}): ${n} commits`).join('; ') + '. Step back and do a root-cause pass instead of whack-a-mole.',
      maps: 'sentinel S3 — symptom-treating',
    })
  }

  // S4: god-file forming — only MODIFIED (pre-existing) files; a brand-new file's
  // initial size isn't "accumulation". (migrations/docs/locks excluded — long is normal.)
  const addedFiles = new Set(fileStatuses.filter(s => s.status === 'A').map(s => s.file))
  const bigFiles = Object.entries(fileNetLines)
    .filter(([f, n]) => n >= THRESHOLDS.GOD_FILE_LINES && !addedFiles.has(f) && !/\.(sql|md|lock|json|snap|svg)$/i.test(f) && !/test/i.test(f))
    .sort((a, b) => b[1] - a[1])
  if (bigFiles.length) {
    findings.push({
      id: 'S4', severity: '🟡',
      title: 'God-file forming — single file grew a lot',
      detail: bigFiles.map(([f, n]) => `${f} (+${n})`).join('; ') + '. Should it be split? Too many responsibilities?',
      maps: 'sentinel S4 — god-file',
    })
  }

  return findings
}

// ---- git IO layer -----------------------------------------------------------
function git(args) {
  try {
    return execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  } catch { return '' }
}
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) } catch { return {} } }
const writeState = (s) => { fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2) + '\n') }

function resolveBase(sinceArg) {
  const headCount = parseInt(git(['rev-list', '--count', 'HEAD']).trim() || '0', 10)
  if (sinceArg) return git(['rev-parse', `HEAD~${Math.min(sinceArg, Math.max(headCount - 1, 0))}`]).trim() || null
  const state = readState()
  if (state.lastReviewSha && git(['rev-parse', '--verify', state.lastReviewSha]).trim()) return state.lastReviewSha
  const n = Math.min(THRESHOLDS.DEFAULT_LOOKBACK, Math.max(headCount - 1, 0))
  return n > 0 ? git(['rev-parse', `HEAD~${n}`]).trim() : null
}

function collectFacts(base) {
  const range = base ? `${base}..HEAD` : 'HEAD'
  const head = git(['rev-parse', 'HEAD']).trim()
  const statusOut = base ? git(['diff', '--name-status', base, 'HEAD']) : git(['show', '--name-status', '--format=', 'HEAD'])
  const fileStatuses = [], changedFiles = []
  for (const line of statusOut.split('\n')) {
    const m = line.match(/^([AMDRT])\d*\t(.+)$/)
    if (m) { const file = m[2].split('\t').pop(); fileStatuses.push({ status: m[1], file }); changedFiles.push(file) }
  }
  const commitSubjects = (base ? git(['log', '--format=%s', range]) : git(['log', '--format=%s', '-1'])).split('\n').filter(Boolean)
  const fileCommitCounts = {}
  if (base) for (const block of git(['log', '--format=>>>%H', '--name-only', range]).split('>>>')) {
    if (!block.trim()) continue
    const lines = block.split('\n'); lines.shift()
    for (const f of new Set(lines.map(s => s.trim()).filter(Boolean))) fileCommitCounts[f] = (fileCommitCounts[f] || 0) + 1
  }
  const fileNetLines = {}
  for (const line of (base ? git(['diff', '--numstat', base, 'HEAD']) : git(['show', '--numstat', '--format=', 'HEAD'])).split('\n')) {
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
    if (m) fileNetLines[m[3]] = (m[1] === '-' ? 0 : +m[1]) - (m[2] === '-' ? 0 : +m[2])
  }
  const addedDiffByFile = {}
  for (const f of changedFiles) if (/\.(sql|ts|js|vue|tsx|jsx)$/.test(f)) {
    addedDiffByFile[f] = addedLines(base ? git(['diff', base, 'HEAD', '--', f]) : git(['show', 'HEAD', '--', f])).join('\n')
  }
  return { head, base, changedFiles, fileStatuses, commitSubjects, fileCommitCounts, fileNetLines, commitCount: commitSubjects.length, addedDiffByFile }
}

// ---- main -------------------------------------------------------------------
function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--ack')) {
    const head = git(['rev-parse', 'HEAD']).trim()
    writeState({ ...readState(), lastReviewSha: head, lastReviewAt: git(['log', '-1', '--format=%cI']).trim() })
    console.log(`✅ step-back sentinel: marked ${head.slice(0, 8)} as the reviewed baseline.`)
    process.exit(0)
  }
  const sinceIdx = argv.indexOf('--since')
  const base = resolveBase(sinceIdx >= 0 ? parseInt(argv[sinceIdx + 1], 10) : null)
  const facts = collectFacts(base)
  const findings = analyze(facts)

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ base: facts.base, head: facts.head, commitCount: facts.commitCount, findings }, null, 2))
    process.exit(findings.length ? 1 : 0)
  }
  if (!findings.length) {
    console.log(`🟢 step-back sentinel: scanned ${facts.commitCount} commits, no asymmetric footprints.`)
    process.exit(0)
  }
  const hard = findings.filter(f => f.severity === '🚨')
  console.log(`\n🛑 Step-back sentinel (${findings.length} item${findings.length > 1 ? 's' : ''}${hard.length ? `, ${hard.length} hard` : ''})`)
  console.log(`   range: ${facts.commitCount} commits (${(facts.base || 'root').slice(0, 8)}..${facts.head.slice(0, 8)})\n`)
  findings.forEach((f, i) => {
    console.log(`${i + 1}. ${f.severity} [${f.id}] ${f.title}`)
    console.log(`      ${f.detail}`)
    console.log(`      ↳ ${f.maps}\n`)
  })
  console.log('   Review now, or note it and finish this chunk first?')
  console.log('   (after reviewing: `node step-back-sentinel.mjs --ack` to reset the baseline)\n')
  process.exit(1) // advisory: lets an audit runner flag it without blocking push
}

if (process.argv.includes('--self-test')) {
  const a = analyze({ changedFiles: ['migrations/x.sql'], addedDiffByFile: { 'migrations/x.sql': 'SELECT jsonb_build_object(\'a\',1)' }, commitSubjects: ['feat'], commitCount: 1 })
  const b = analyze({ changedFiles: ['src/a.js'], fileCommitCounts: { 'src/a.js': 5 }, commitCount: 5 })
  const ok = a.some(f => f.id === 'H1') && b.some(f => f.id === 'S2')
  console.log(`self-test ${ok ? 'PASS' : 'FAIL'}`); process.exit(ok ? 0 : 1)
} else { main() }
