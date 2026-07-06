#!/usr/bin/env node
/**
 * skill-orthogonality-audit.mjs
 * ---------------------------------------------------------------------------
 * Model-native skill-library orthogonality audit.
 *
 * Translates the AUTOSKILL / "model-native skills" thesis (Kang et al., 2026,
 * arXiv:2604.17614 — characterize a system by its OWN representation, recover a
 * COMPACT ORTHOGONAL basis, kill redundant/collinear directions) into skill-library
 * governance: a skill library should be an approximately orthogonal, compact basis
 * of your capability space. Two skills are COLLINEAR (redundant) when they fire on
 * the same triggers and do overlapping work — two poles of one axis masquerading as
 * two skills. This tool surfaces collinear candidates for a human post-hoc verdict.
 *
 * IMPORTANT — this is a PROXY, on purpose:
 *   - It measures collinearity in TRIGGER-VOCABULARY space (TF-IDF over each skill's
 *     name + description/triggers). Cheap, offline, always runs — the analogue of the
 *     paper's "lightweight proxy interventions" used to screen directions before the
 *     expensive real thing.
 *   - The TRUE model-native version measures collinearity in EMBEDDING space (the
 *     embedding model's own representation of each SKILL.md). See --represent embed
 *     hook below + the playbook for the upgrade path. Both feed the same human
 *     post-hoc "are these two poles of one axis, or genuinely distinct?" judgment
 *     (the paper confirms axis semantics post hoc too — via GPT-5).
 *
 * Advisory by design: redundancy needs human confirmation, so this exits 0 even when
 * it flags pairs (like a step-back sentinel — "有話才響", but the finding is earned,
 * not a blocker). Pass --strict to exit 1 when any pair >= threshold (for CI gating).
 *
 * Usage:
 *   node skill-orthogonality-audit.mjs [skillsDir] [options]
 *
 *   skillsDir            directory containing <name>/SKILL.md (default: .claude/skills)
 *   --top N              show the N most-collinear pairs (default: 20)
 *   --threshold T        flag pairs with cosine >= T (default: 0.35)
 *   --neighbors          also print each skill's single nearest neighbor
 *   --json               emit machine-readable JSON instead of the text report
 *   --strict             exit 1 if any pair >= threshold (default: advisory, exit 0)
 *
 * Zero dependencies. Node >= 16. Works on zh/en-mixed skill descriptions.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--')))
const positional = argv.filter((a) => !a.startsWith('--'))
function opt(name, fallback) {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const SKILLS_DIR = positional[0] || '.claude/skills'
const TOP = parseInt(opt('--top', '20'), 10)
const THRESHOLD = parseFloat(opt('--threshold', '0.30'))
const AS_JSON = flags.has('--json')
const STRICT = flags.has('--strict')
const SHOW_NEIGHBORS = flags.has('--neighbors')

if (!existsSync(SKILLS_DIR)) {
  console.error(`skill dir not found: ${SKILLS_DIR}`)
  process.exit(2)
}

// ---------------------------------------------------------------------------
// 1. collect SKILL.md files (recursive — some skills live in nested folders)
// ---------------------------------------------------------------------------
function findSkillFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      findSkillFiles(p, acc)
    } else if (entry === 'SKILL.md') {
      acc.push(p)
    }
  }
  return acc
}

// ---------------------------------------------------------------------------
// 2. parse frontmatter -> { name, description } == the skill's behavioral surface
// ---------------------------------------------------------------------------
function parseSkill(file) {
  const raw = readFileSync(file, 'utf8')
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const block = fm ? fm[1] : ''
  const nameM = block.match(/^name:\s*(.+)$/m)
  // description may be a quoted single line or run until the next top-level key
  let desc = ''
  const descM = block.match(/^description:\s*([\s\S]*?)(?:\r?\n[A-Za-z_][\w-]*:|$)/m)
  if (descM) desc = descM[1]
  desc = desc.trim().replace(/^["']/, '').replace(/["']$/, '')
  const name = (nameM ? nameM[1].trim() : basename(dirname(file))).replace(/^["']|["']$/g, '')
  // fall back to leading body text if the description is empty
  if (!desc) {
    const body = raw.slice(fm ? fm[0].length : 0).replace(/^#.*$/gm, '').trim()
    desc = body.slice(0, 500)
  }
  return { name, desc, file }
}

// ---------------------------------------------------------------------------
// 3. tokenize (latin words + CJK char bigrams so Chinese triggers are comparable)
// ---------------------------------------------------------------------------
const STOP = new Set([
  'the', 'and', 'for', 'use', 'when', 'with', 'that', 'this', 'not', 'are', 'you',
  'your', 'from', 'via', 'into', 'per', 'any', 'all', 'its', 'has', 'have', 'a', 'an',
  'to', 'of', 'in', 'on', 'or', 'is', 'it', 'as', 'by', 'be', 'at', 'skill', 'skills',
  'trigger', 'triggers', 'skip', 'used', 'using', 'e.g', 'eg', 'etc', 'i.e',
  // description-template noise (survives IDF because it clusters in a subset of skills)
  'how', 'what', 'does', 'want', 'wants', 'user', 'users', 'example', 'examples',
  'asks', 'ask', 'create', 'creating', 'need', 'needs', 'src', 'modifying',
  // pervasive zh boilerplate bigrams (appear in nearly every CS skill description)
  '觸發', '時觸', '走進', 'skill', '不觸', '讓位',
])
function tokenize(text) {
  const t = String(text).toLowerCase()
  const out = []
  for (const m of t.matchAll(/[a-z][a-z0-9]{1,}/g)) {
    if (!STOP.has(m[0])) out.push(m[0])
  }
  for (const run of t.match(/[一-鿿]+/g) || []) {
    if (run.length === 1) { if (!STOP.has(run)) out.push(run); continue }
    for (let i = 0; i < run.length - 1; i++) {
      const bg = run.slice(i, i + 2)
      if (!STOP.has(bg)) out.push(bg)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// 4. TF-IDF vectors (IDF downweights the boilerplate every skill shares, so what
//    survives is the domain vocabulary that actually distinguishes an axis)
// ---------------------------------------------------------------------------
function buildVectors(skills) {
  const docs = skills.map((s) => tokenize(`${s.name} ${s.desc}`)) // behavior-driven; name counted once
  const N = docs.length
  const df = new Map()
  for (const toks of docs) {
    for (const tk of new Set(toks)) df.set(tk, (df.get(tk) || 0) + 1)
  }
  const idf = (tk) => Math.log((N + 1) / ((df.get(tk) || 0) + 1)) + 1
  const vectors = docs.map((toks) => {
    const tf = new Map()
    for (const tk of toks) tf.set(tk, (tf.get(tk) || 0) + 1)
    const vec = new Map()
    let norm = 0
    for (const [tk, c] of tf) {
      const w = (1 + Math.log(c)) * idf(tk)
      vec.set(tk, w)
      norm += w * w
    }
    norm = Math.sqrt(norm) || 1
    for (const tk of vec.keys()) vec.set(tk, vec.get(tk) / norm)
    return vec
  })
  return vectors
}

function cosineWithShared(a, b) {
  const [small, large] = a.size < b.size ? [a, b] : [b, a]
  let dot = 0
  const contrib = []
  for (const [tk, wa] of small) {
    const wb = large.get(tk)
    if (wb) { const c = wa * wb; dot += c; contrib.push([tk, c]) }
  }
  contrib.sort((x, y) => y[1] - x[1])
  return { cos: dot, shared: contrib.slice(0, 6).map((x) => x[0]) }
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
const files = findSkillFiles(SKILLS_DIR)
const skills = files.map(parseSkill)
const vectors = buildVectors(skills)

const pairs = []
for (let i = 0; i < skills.length; i++) {
  for (let j = i + 1; j < skills.length; j++) {
    const { cos, shared } = cosineWithShared(vectors[i], vectors[j])
    pairs.push({ i, j, cos, shared })
  }
}
pairs.sort((x, y) => y.cos - x.cos)

const flagged = pairs.filter((p) => p.cos >= THRESHOLD)

// nearest neighbor per skill
const nn = skills.map(() => ({ j: -1, cos: -1 }))
for (const p of pairs) {
  if (p.cos > nn[p.i].cos) nn[p.i] = { j: p.j, cos: p.cos }
  if (p.cos > nn[p.j].cos) nn[p.j] = { j: p.i, cos: p.cos }
}

if (AS_JSON) {
  console.log(JSON.stringify({
    skillsDir: SKILLS_DIR,
    count: skills.length,
    threshold: THRESHOLD,
    flaggedPairs: flagged.length,
    pairs: pairs.slice(0, TOP).map((p) => ({
      a: skills[p.i].name, b: skills[p.j].name,
      cosine: +p.cos.toFixed(3), sharedAxisTerms: p.shared,
    })),
  }, null, 2))
} else {
  const bar = (c) => '█'.repeat(Math.round(c * 20)).padEnd(20, '·')
  console.log(`\n  Skill-Library Orthogonality Audit  (model-native / trigger-vocabulary proxy)`)
  console.log(`  ${'─'.repeat(72)}`)
  console.log(`  dir: ${SKILLS_DIR}`)
  console.log(`  ${skills.length} skills · ${pairs.length} pairs · threshold ${THRESHOLD} · ${flagged.length} collinear candidate(s)\n`)
  console.log(`  Most-collinear pairs (candidate = two poles of one axis? confirm post hoc):\n`)
  for (const p of pairs.slice(0, TOP)) {
    const mark = p.cos >= THRESHOLD ? '⚠️ ' : '   '
    console.log(`  ${mark}${bar(p.cos)} ${p.cos.toFixed(3)}  ${skills[p.i].name}  ✕  ${skills[p.j].name}`)
    console.log(`       shared axis vocab: ${p.shared.join(', ')}`)
  }
  if (SHOW_NEIGHBORS) {
    console.log(`\n  Each skill's nearest neighbor:\n`)
    skills.map((s, idx) => ({ s, n: nn[idx] }))
      .sort((x, y) => y.n.cos - x.n.cos)
      .forEach(({ s, n }) => {
        if (n.j >= 0) console.log(`  ${n.cos.toFixed(3)}  ${s.name}  →  ${skills[n.j].name}`)
      })
  }
  console.log(`\n  Verdict is human + post hoc. For each ⚠️ pair pick one:`)
  console.log(`    merge · make explicit opposite poles (cross-ref) · delete the weaker · genuinely distinct (false positive — raise threshold or refine triggers)`)
  console.log(`  Proxy caveat: this is trigger-vocabulary collinearity. See the playbook for the embedding (true model-native) upgrade.\n`)
}

process.exit(STRICT && flagged.length > 0 ? 1 : 0)
