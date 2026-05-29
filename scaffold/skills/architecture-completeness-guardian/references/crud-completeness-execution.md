# CRUD Completeness Audit (spawn Explore) — execution handbook

> Split out of the main SKILL.md. Scenarios S1 (new feature), S2 (new field), and S3 (new route) all use this file's 5-layer required-checks + Explore-subagent spawn template in Part 3.
>
> **TEMPLATE**: the grep patterns use `{table}` / `{feature}` placeholders. Adapt them to your stack's naming. The example commands assume a JS/SQL stack; translate to yours.

---

## The 5 required layers

| Layer | Check question | grep / glob template |
|---|---|---|
| **L1 write side** | Which file writes new data to the DB? Is it an `insert`/`update`/`upsert`, an RPC, or a mock? | `from\(['"]{table}['"]\)\.(insert\|update\|upsert)`, `fn_{feature}_create_*` |
| **L2 state sync** | After writing, is the frontend reactive? Does the DB have a matching trigger / derived field? | `computed\|watch\|invalidateQueries` / `CREATE TRIGGER.*{table}` |
| **L3 boundary & guards** | Are required fields validated? Is RLS on the right table? Are the GRANT lines present? | `GRANT.*ON.*{table}.*TO (anon\|authenticated\|service_role)` / validation schema |
| **L4 backend gate (RLS)** | Does the RPC go through a capability / admin / current-user gate? Is direct DB write forbidden? | `has_operator_capability\|is_admin\|requesting_user_id` |
| **L5 user feedback** | Is there a loading state / error toast / success message? Does a closing overlay swallow clicks? | `loading\|isLoading\|toast\|notify\|\.error\b` |

> The L4 helper names (`has_operator_capability` / `is_admin` / `requesting_user_id`) are example RLS-helper conventions. Replace with your project's auth-gate function names.

---

## Explore subagent spawn template

```
Agent({
  description: "CRUD completeness audit",
  subagent_type: "Explore",
  prompt: "I'm auditing the codebase completeness of the user-declared task '{scenario summary}'. Compare against these 5 layers:

  L1 write side: grep `{template-1}` for write points, report actual file paths + line numbers
  L2 state sync: grep `{template-2}` for reactive updates and DB triggers
  L3 boundary & guards: grep `{template-3}` for validation + GRANT lines
  L4 backend gate: grep `{template-4}` for the RPC capability gate
  L5 user feedback: grep `{template-5}` for loading / error handling

  For each layer report: ✅ what exists (path + line) / ⚠️ what's missing / 🚨 red flag (the concrete gap).

  Task description: {user's original words}
  Hints: {if S5, paste the trace registry T-NNN block content}

  Report in <300 words, ≤60 words per layer."
})
```

**Why spawn a subagent instead of grepping in the main conversation**: it protects the main conversation's context. A pure static checklist is not enough (it never touches the real code), and grepping inline floods the main context — the right answer is "compare against the static map + verify the real codebase via a subagent".

---

## Three-part report is mandatory

Every layer must emit three parts:

- `✅ what you have`: [path + line], this layer is implemented
- `⚠️ what you intend but are missing`: this layer is needed for your task but absent from the codebase
- `🚨 red flag`: the concrete gap (e.g. "the +/- UI doesn't write back to the DB — `ItemCart.vue:42` is missing an `update()` call")
