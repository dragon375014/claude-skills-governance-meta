# Contributing

This repository is a one-person project. Its purpose is to share governance patterns
extracted from a solo developer's working codebase. It is not a community-driven
toolkit, and the maintainer cannot promise the responsiveness of one.

## Pull Requests

**Accepted**: typo fixes, broken-link fixes, obvious bug fixes in the `.mjs` templates.
Keep the PR small and self-contained.

**Not accepted by default**:

- New rule definitions (these are best maintained in your own fork — your project, your taxonomy)
- New anti-pattern entries (likewise — write them in your own repo, link back if useful)
- Architectural reorganization
- Renaming files / restructuring directories
- Adding npm dependencies (this repo intentionally has none)

If you have a strong case for one of the "not accepted by default" categories,
open an issue first to discuss before writing the PR.

## Issues

**Accepted**: bug reports for the `.mjs` templates (where they fail to detect a real
anti-pattern, or detect false positives in a clearly-defined case), broken links,
factual errors in the markdown.

**Not accepted**: feature requests, design discussions, requests to add support for
your specific tech stack.

The maintainer reads issues in batches, not in real time. Response times are
measured in weeks, not days. If your problem is time-sensitive, fork.

## Forks

**Encouraged.** This is the recommended way to extend the repository. The MIT license
allows you to:

- Fork freely, including for commercial use
- Modify any file
- Republish under any name
- Sell consulting / training built on these patterns

You do not need permission. You do not need to credit (though it's appreciated).

**One thing the license does not give you**: a guarantee that anything in this repo
is correct. The patterns here come from one developer's experience on a specific stack.
They may not apply to yours. They may be wrong. They may have side effects nobody has
noticed yet. Test before adopting.

## Why the policy is restrictive

The author maintains this repo as a snapshot of working patterns, not as a community
hub. Loosening the PR / issue policy would consume time that the author needs for the
day job that generated these patterns in the first place. Fork-first is the explicit
strategy, not a fallback when issues go unanswered.

If you're looking for a more collaborative governance / agent-skills repo,
`anthropics/skills`, `obra/superpowers`, and `awesome-claude-skills` are good
starting points.

## Commit Conventions (if you do contribute)

- One logical change per commit
- Commit messages should describe **why**, not just **what**
- No `wip` / `update` / `fix` / `.` as full commit messages
- If the change touches one of the `.mjs` templates, include a smoke test in the
  commit description (e.g., "tested against repo at `/tmp/test-project/` with X violations expected, Y found")
