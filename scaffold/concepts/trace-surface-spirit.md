# Trace Surface Spirit

A trace-lock rule usually reads: *"before modifying any node on a critical trace, run the trace-lock audit."* Taken literally, "modify" means "write" — so when you add a piece of code that only **reads** from the trace, the rule seems not to apply. That literal reading has a hole, and this document is about the hole.

---

## The letter

A "trace" is a cross-layer dependency chain: a value is written somewhere, transformed in the middle, and rendered at the end, and the three ends silently drift apart if you change one without the others. The **anchor SSOT** is the source of the chain. A trace-lock rule pins the chain with a test and forces an audit before edits.

The literal trigger: *modify a node → run the audit.* A node is a file that participates in the chain. Modifying it means changing what it writes or how it transforms.

---

## The spirit

The *reason* the rule exists is broader than "writes are dangerous." The reason is: **a cross-layer dependency is an asset, and the cost of maintaining it scales with how many things depend on the anchor.**

Every reader of the anchor — even a read-only one — is a thing that depends on the anchor's contract. The moment you add a reader, you have:

- increased the **trace surface area** (the set of code that breaks if the anchor changes)
- created a future obligation: when someone edits the anchor, they must now also evaluate *your* reader

A read-only reader doesn't write the chain, so it can't *corrupt* the chain. But it absolutely *inherits the chain's fragility.* If the anchor's semantics change — a unit, a rounding rule, a field rename — the new reader breaks exactly like an existing node would.

So the spirit covers both:

| Action | Literal rule | Spirit |
|---|---|---|
| change what a node writes | ✅ triggers | ✅ triggers |
| change how a node transforms | ✅ triggers | ✅ triggers |
| **add a new read-only reader of the anchor** | ❌ misses | ✅ triggers (at least a registry note) |
| add a file that imports nothing from the chain | ❌ | ❌ (correctly out of scope) |

---

## The case that taught this

A team had a stock-availability trace `T-NNN` whose anchor computed an orderable count from a raw quantity. Someone added a new read-only RPC — a low-stock alert — that read the same raw quantity the trace depends on.

A strong architecture review ran, classified the scenario correctly, and produced a near-perfect report. Its one miss: the dispatch step **explicitly declined** to pull the trace-lock skill, with the reasoning *"the new RPC is read-only, doesn't change trace nodes, so it doesn't apply."*

That reasoning is the literal rule talking. The correct call:

> Pull `trace-lock-modify` (registry note only).
> Why: the new alert RPC is read-only and writes no stock, but it **reads** the quantity the trace's anchor owns. It's a new reader → a new trace surface. When the anchor changes later (e.g. the alert expands to read the *processed* stock the anchor actually lives on), this reader must be re-evaluated. For now, just register it as a known reader of `T-NNN` — not the full audit.

The fix wasn't to run the heavy 5-step audit on a read-only RPC. The fix was the **registry note**: write the new reader into the trace block's "Known readers" field, so the next person editing the anchor sees it.

---

## The graded response

The spirit doesn't mean "run the full audit on every read." It means **match the response to the surface change**:

| What you did | Response |
|---|---|
| modified a write-side node | full 5-step audit (list chain → baseline test → edit → re-run → update registry) |
| added a reader of a downstream node | registry note: add it to "Known readers", note why it depends on the anchor |
| added a reader of the anchor itself | registry note + a one-line note on which anchor semantics it relies on |
| imported nothing from the chain | nothing — out of scope |

The registry note is cheap (one line) and it's the entire payoff: it converts an invisible dependency into a visible one. The expensive part — the test run — is reserved for actual writes.

---

## Why "Known readers" is the key artifact

A trace registry that only lists *nodes* (the write/transform/render chain) silently undercounts who depends on the anchor. Reads are dependencies too, and they're the easy ones to forget because they don't show up when you grep for writes.

Add a **Known readers** field to every trace block. Every time the trace-surface spirit fires on a read-only addition, the response is: append one line to Known readers. Over time this field becomes the honest answer to *"if I change this anchor, who do I have to check?"* — which is the question the whole trace-lock pattern exists to answer.

This repo's [registry template](../../templates/data-source-registry-template.md) includes the Known-readers field for exactly this reason.

---

## Applying this to your project

1. In your trace registry, ensure every trace block has a **Known readers** field, not just Trace nodes.
2. In your trace-lock skill's trigger, add the spirit clause explicitly: *"also triggers when adding a reader that depends on a trace anchor, even read-only — at minimum a registry note."* (The shipped [`trace-lock-modify`](../skills/trace-lock-modify/SKILL.md) already has this.)
3. In your architecture-gate dispatch table, add: *"if the data source of a new feature/field/setting is downstream of a trace, dispatch trace-lock-modify for a registry note."*

---

## Related documents

- [`../skills/trace-lock-modify/SKILL.md`](../skills/trace-lock-modify/SKILL.md) — the skill that implements both letter and spirit
- [`../../templates/data-source-registry-template.md`](../../templates/data-source-registry-template.md) — the registry shape, including Known readers
- [`governance-hierarchy.md`](./governance-hierarchy.md) — trace-lock is an L1 specialist the L0 gate dispatches
