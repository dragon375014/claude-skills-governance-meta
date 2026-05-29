# Case study: a read-only reader that "didn't apply" to trace-lock

> One of three incidents that shaped the `trace-lock-modify` skill and the trace-surface-spirit concept. The pattern: a trace-lock rule read literally ("before modifying a node") misses a new read-only reader of the anchor.

---

## Context

A project had a stock-availability trace, `T-stock-availability`, whose anchor computed an orderable count from a raw quantity. The trace-lock rule read: *"before modifying any node on a critical trace, run the trace-lock audit."* A separate architecture review then ran on a new feature.

## The declaration

> "Figure out the stock chain + maybe add a low-stock alert." (the same request as the [decision-vs-build case](./decision-vs-build-priority.md))

The new alert was implemented as a **read-only** RPC, `fn_get_low_stock`, that reads the same raw quantity the trace's anchor depends on.

## What happened

The architecture review actually ran well — it classified the scenario correctly and produced a near-perfect report. Its **one miss**: the dispatch step *explicitly declined* to pull the trace-lock skill, writing the reason:

> "the new RPC is read-only, doesn't change trace nodes, so it doesn't apply."

That reasoning is the **literal** rule talking. "Modify a node" = "write to a node" — and a read-only RPC writes nothing, so by the letter it's out of scope.

## Root cause: letter vs. spirit

The rule's letter is "before modifying a node." Its **spirit** is "treat a cross-layer dependency as an asset" — and that spirit covers *adding a reader*, not just modifying a writer:

- A new reader depends on the anchor's contract (units, rounding, field names).
- When the anchor changes later, the new reader breaks — exactly like an existing node would.
- So a read-only reader **expands the trace surface** (the set of things that break if the anchor changes), even though it can't corrupt the chain.

The alert RPC reads the quantity the anchor owns → it's a new reader of a downstream node of `T-stock-availability`. The literal rule didn't catch it; the spirit should have.

## The correct response (graded, not heavy)

The fix is **not** to run the full 5-step audit on a read-only RPC. It's a one-line registry note:

> Pull `trace-lock-modify` (registry note only).
> Why: the alert RPC is read-only and writes no stock, but it **reads** the quantity the anchor owns. New reader → new trace surface. Register it as a Known reader of `T-stock-availability`. When the anchor changes later (e.g. the alert expands to read the *processed* stock the anchor actually computes from), this reader gets re-evaluated.

The expensive part (the test run) is reserved for writes. The cheap part (the registry note) converts an invisible dependency into a visible one — which is the entire point of a trace registry.

## The fixes that went into the skills

- `trace-lock-modify`'s trigger gained an explicit "also triggers when adding a reader that depends on a trace anchor, even read-only — at minimum a registry note."
- The architecture gate's dispatch table added: "if the data source of a new feature/field/setting is downstream of a trace, dispatch trace-lock-modify for a registry note."
- The registry template gained a **Known readers** field, distinct from Trace nodes, so reads have somewhere to be recorded.

## Regression guard

A future agent sees: **a new reader of a trace anchor — even read-only — expands the trace surface and must at least be registered.** "Read-only, so it doesn't apply" is the exact wrong call this case exists to prevent.

## Generalize to your project

- Write the spirit clause into your trace-lock rule from the start; it costs a paragraph and prevents the most subtle trace gap.
- Give every trace block a **Known readers** field. A registry that lists only writes silently undercounts who depends on the anchor.
- Make the response graded: full audit for writes, one-line registry note for read-only readers. Otherwise the rule feels too heavy and gets ignored.
- Full concept: [`trace-surface-spirit.md`](../../scaffold/concepts/trace-surface-spirit.md).
