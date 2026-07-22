# Anti-Pattern: The Checker Nobody Ever Watched Fail

> Example names below (`payment_trusts_client_amount`, `total_amount`) are illustrative — substitute the ones your project actually uses.
> Sibling of [`guard-that-tests-a-copy.md`](guard-that-tests-a-copy.md): that one is about a *test* that pins a stale copy; this one is about a *checker* that was never proven to detect anything at all.

## The Day the Green Light Meant Nothing

A team runs a heuristic security scanner in CI. One rule is named, in plain words, `payment_trusts_client_amount`: it exists to catch a payment function that marks an order **paid** using a client-supplied amount without cross-checking the authoritative `orders.total_amount` in the database. The rule has been green for months.

Someone red-teams it. They take a real payment callback and **rip out the cross-check** — delete the `SELECT ... total_amount`, set the expected amount to the number the gateway sent. This is exactly the vulnerability the rule was named after. They run the scanner.

**Green. Exit 0.**

Why? The rule decided "does it cross-check?" by asking `"total_amount" in wholeFileText`. And the file still contained two *comments*:

```
// 查找訂單（含金額權威 total_amount）
//   金額 SSOT 永遠在 DB（orders.total_amount），不信回呼帶來的數字。
```

The checker was reading the file's **explanation of the thing it should have been enforcing**, and reporting the world as good. A rule named "payment trusts client amount" stayed green while the code started trusting the client amount — kept alive by two lines of comment describing why that must never happen.

The same batch found the same shape everywhere: a stored-value guard whose presence was checked against whole-file text (so a one-line comment could resurrect a red finding to green — and *extinguish the existing alarm on the way*); trace tests that "protected" a function but only checked that a file *existed* and that an import *string* appeared *anywhere in the file, comments included*; a cross-runtime mirror "drift" blocker that read the other side as **plain text** and grepped for tokens, never once **executing** the function it claimed to keep in sync.

None of these were broken-on-arrival. They were **born this way** and passed every day, because a checker that has never been watched fail is indistinguishable from one that cannot fail.

---

## Symptom

- A rule/gate/scanner/trace-test named after a specific bad thing has **never been observed to go red**. "We have a check for that" is true and useless at the same time.
- The check decides "is X present/correct?" by `grep`-ing whole-file text — including comments, doc-strings, verification blocks, exemption markers, test fixtures.
- The check's green condition is *absence of an observed error* rather than *presence of an observed correct thing* (it goes green when it scans **zero** files).
- The check verifies a **proxy** — a comment, a filename, an import string, a downstream field nobody consumes — instead of the load-bearing artifact.
- Two checks are cited as "cross-validation" but trace back to **one** parser / one data source.
- A finding can **disappear** from one run to the next with nobody able to say whether it was *fixed* or *bypassed*.

---

## Root cause

A checker is a claim: "if the bad thing happens, I turn red." That claim is **untested code** until you have watched it turn red on purpose. Left untested, checkers rot toward the cheapest way to be green — and the cheapest way is to observe something that is *always* present (a comment, a filename, a truthy default) rather than the thing that is *sometimes wrong* (the executed logic).

Three false-green families cause this. **They are already catalogued, more generally, in the `failure-semantics-redteam` skill (招0) — read that for the taxonomy; it is not repeated here** to avoid a collinear second copy:

- **(a) absence-of-error ≠ observed-correct** — green because nothing was seen, including "nothing was seen because nothing was scanned."
- **(b) proxy, not final artifact** — verifying a comment / filename / self-reported flag.
- **(c) non-independent** — "two defenses" sharing one parser.

---

## The fix: mutation-hardening (D1–D7)

You cannot *inspect* your way out of this — a checker that reads its own comments looks correct. You have to **manufacture the exact violation it claims to catch and watch it fire.** This is mutation-testing discipline, pointed at the checker instead of at application code.

- **D1 — Prove it fires, by mutation.** Create the violation this checker is named after (really edit a file). Run it → must `exit ≠ 0` **and the message must name the violation you just created** (some other rule going red doesn't count). Restore → must `exit 0`. Paste all three outputs into the commit.
- **D2 — Prove the mutation actually landed.** Before concluding "the defense failed," prove your break changed the subject's behaviour. (Real miss: declaring a batch of audits fail-open by changing an env var — when those scripts never read that var, so nothing broke and they passed against a live DB the whole time.)
- **D3 — The checker may not read its own documentation.** Any grep-style check: strip comments first, look only at the executed/parsed region. The string you're grepping for will also appear in the comment explaining it, the exemption marker, the verification block, the test fixture. (Watch the **CRLF trap**: `/--.*$/` doesn't strip under CRLF checkout — `.` won't match `\r`, `$` wants string-end — so the check's result depends on `autocrlf`. Use `[^\r\n]`.)
- **D4 — Escape hatches leave an audited trail.** Allowlists/markers require a reason and may not exempt a whole line just because a keyword appears on it.
- **D5 — Distinguish "found a violation" from "I was blind."** `exit 1` = found a violation; `exit 2` = this check observed nothing (scanned zero files / input missing / anchor renamed). A blind check reporting green is the bug you're fixing — don't reproduce it.
- **D6 — Mutate at the file layer, never touch prod.** Manufacture violations in files. When you must confirm DB truth, use a read-only query — never create a violating function / alter RLS / write data in production to build a positive control.
- **D7 — Closing discipline.** Each hardened check gets its mutation evidence in the commit; never promote a check to blocking without the mutation proof first.

The floor case of D1 deserves its own guard: **a check that scanned zero files has information content zero but looks identical to "all passed."** Assert a scan floor.

---

## Prior art — build on it, don't reinvent it

The *mechanism* (mutate → rerun → assert red) is mature. Cite it; the novelty here is the **target domain**, not the mechanism.

- **Mutation testing** (Stryker/PIT/mutmut/Cosmic Ray) mutates *application code* and reruns *unit tests*. Different axis: here we mutate the *violation* and feed it to the *checker*.
- **Synthetic-vulnerability benchmarks** (OWASP Benchmark, NIST/NSA Juliet) are D1 institutionalized — for commercial SAST scanners. Strongest precedent; same instinct ("manufacture the exact bad case a detector claims to catch, verify it fires").
- **Policy-as-code testing** (OPA/Rego test, Conftest, Semgrep `--test`) is the nearest neighbour — but manual fixtures, and no "checker reads its own comment" failure mode (Rego has no comments-in-the-grepped-surface problem).
- **Assertion-free-test linters** (`eslint-plugin-vitest` `expect-expect`) are a ready-made sub-piece of D1/D2 for JS/TS — wire it in, don't rebuild it.

**What is genuinely new and not packaged anywhere**: applying this discipline to **home-grown, grep/regex/file-existence CI & governance checkers** (governance-guard scripts, pre-commit hooks, trace tests) — where **D3 (strip your own comments)** and **D6 (mutate at file layer)** are the stack-specific gotchas that dedicated policy DSLs never have to face.

---

## Reusable code

Portable, zero-dep, each with `--selftest`: **`reuse-hub/kits/mutation-hardened-checkers/`**
(`scan-floor`, `sentinel-blind` three-state exit codes, `strip-comments-before-match` incl. the CRLF fix, `latest-definition-select` for "don't hardcode the filename," `baseline-vanish-detect` for "a finding can't silently disappear").

## Related

- **Taxonomy of green lights** (the (a)/(b)/(c) source): skill `failure-semantics-redteam` 招0.
- **Test pins a stale copy** (adjacent, different root cause): [`guard-that-tests-a-copy.md`](guard-that-tests-a-copy.md).
- **Gate survives being copied elsewhere** (D8, different layer): `knowledge-base/crystals/cross-repo-criteria-D1-D13.md`.
- **Origin memory** (now absorbed here): CS SAAS project memory `feedback_blocker_must_prove_it_fires`.
