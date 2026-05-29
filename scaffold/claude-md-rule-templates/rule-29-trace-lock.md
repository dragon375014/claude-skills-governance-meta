# CLAUDE.md Rule Template — Trace Lock (cross-layer dependency protection)

**What this rule does**: forces every cross-layer data flow (write → middleware → render) to be registered in a data-source registry and pinned with a trace test, and forces an audit before any node on the chain is edited — or any new reader of the anchor is added.

**When you need this rule**: only when your project has cross-layer chains where one end silently breaks the other. That usually means a project of meaningful size (a normalizer middleware, derived DB columns, multiple entry points reading the same value). For a small project this is premature — see the fitness check before adopting.

**Prerequisites** (install these first):
- the [`trace-lock-modify`](../skills/trace-lock-modify/SKILL.md) skill
- a data-source registry with a "Critical Traces" section ([template](../../templates/data-source-registry-template.md))
- (optional but recommended) two defensive guard rules: one asserting every registry trace has a matching trace test, one asserting every trace test imports its anchor SSOT

---

## Copy this into your CLAUDE.md

> Renumber `Rule N`. Replace the registry path and skill path with yours.

```markdown
N. **Trace Lock — cross-layer dependencies are registered and locked**:
   Every cross-layer chain (a value flowing write side → middleware → render
   side, where one end silently breaks the other) MUST be registered in
   `<your data-source registry>` under "Critical Traces", and pinned by a trace
   test that imports the chain's anchor SSOT.

   **Three enforced mechanisms**:
   ① Before editing any node on a Critical Trace — OR before adding a new
      reader that depends on a trace anchor (even read-only) — run
      `<the trace-lock-modify skill>` (a new read-only reader needs at least a
      registry note registering it as a Known reader).
   ② A new trace is added per the registry template: one registry block + one
      trace test (contract / pinning case / edge cases).
   ③ Two defensive guard rules (BLOCKER): every registry trace has a matching
      trace test; every trace test imports its anchor SSOT (so it tests the
      SSOT, not a copy).

   **Trace surface spirit**: "modify a node" is read literally as a write, but
   the spirit ("treat a cross-layer dependency as an asset") covers ADDING A
   READER too — a new reader depends on the anchor's contract, so a future
   anchor change breaks it. A read-only new reader still expands the trace
   surface → register it. (See trace-surface-spirit.)

   **Does NOT apply**: pure UI copy / CSS / a single-file refactor that crosses
   no layer / a new file that imports no anchor SSOT.
```

---

## Customize

- **`N`** — a free rule number.
- **`<your data-source registry>`** — the path, e.g. `docs/data-source-registry.md`.
- **`<the trace-lock-modify skill>`** — the install path.
- **The two defensive guard rules** — implement them in your `governance-guard.mjs` (start from [`../../governance-guard-template.mjs`](../../governance-guard-template.mjs)). They're what keeps the registry honest — without them, a trace can be declared and never tested, or tested against a stale copy.

---

## The non-obvious part: the spirit clause

Most teams that adopt a trace-lock rule write only the literal version ("before modifying a node"). The spirit clause — that **adding a read-only reader also expands the surface** — is the part that's earned through a near-miss, not designed up front. Include it from the start; it costs one paragraph and prevents the exact gap where a "read-only, doesn't apply" judgment leaves a new dependency unregistered.

The graded response keeps the spirit clause cheap: a full write gets the 5-step audit; a read-only reader gets a one-line registry note. You are not running a heavy audit on every read — you're keeping the "who depends on this anchor" list honest. See [`../concepts/trace-surface-spirit.md`](../concepts/trace-surface-spirit.md).

---

## Related

- [`../skills/trace-lock-modify/SKILL.md`](../skills/trace-lock-modify/SKILL.md) — the skill this rule enforces
- [`../concepts/trace-surface-spirit.md`](../concepts/trace-surface-spirit.md) — letter vs. spirit, the graded response, the Known-readers field
- [`../../templates/data-source-registry-template.md`](../../templates/data-source-registry-template.md) — the registry shape
- [`../../defensive-vs-offensive-governance.md`](../../defensive-vs-offensive-governance.md) — the two trace guard rules are defensive (CI blockers)
