# Anti-Pattern: The Guard That Tests a Copy

> Example names below (`classifyRoute`, `/api/...`) are illustrative — substitute the names your project actually uses.

## The Day the Test Suite Lied

A team tightens an access-control middleware. The old behavior was permissive: any request that didn't match a known rule fell through and was allowed. The new behavior is deny-by-default: anything not explicitly classified gets a `401`. This is a strictly-better security posture — *if* every existing endpoint was already classified.

The change ships. The CI test suite is green: there's even a dedicated `auth-middleware.test.ts` with thirty assertions about which routes are public, which need auth, which are admin-only. All pass.

The next morning, an entire category of users can't perform their core action. Every one of their submit requests returns `401`. The page loads fine (the read endpoints were classified); only the write silently fails. There is **no trace in any business table** — the request died in middleware, before identity was even parsed.

The cause: the primary write endpoint was never in the allowlist. The deny-by-default flip turned "always worked" into "always 401" the instant it deployed.

But here's the part that matters for *governance*: **why didn't the thirty-assertion test catch it?**

Because the test didn't import the middleware. It contained its **own copy** of the classification function — pasted in months earlier "so the test is self-contained." The test asserted things about the copy. The copy was never wired to a deny-by-default fallback, and never knew about the missing endpoint either. The real middleware changed; the copy didn't; the test stayed green while production broke.

The test wasn't testing the code. It was testing a fossil.

---

## Symptom

- A change to logic X ships and breaks production, but the test that "covers X" is green.
- The test file contains a function/constant/table that looks suspiciously like a re-implementation of the thing under test (a `classifyRoute` copy, a duplicated config map, a re-declared state machine).
- The test imports `vitest`/`jest`/etc. but **does not import the module it claims to protect** — or imports it only for unrelated helpers.
- "We have tests for that" is true and useless at the same time.

Frequently paired with a **deny-by-default fallback flip**: changing an unmatched-case fallback from *allow* to *deny* (or *open* to *closed*, *default value* to *throw*). The flip is only safe if every existing case was already enumerated; a copy-based test can't verify that enumeration is complete.

---

## Root cause

Two reinforcing mistakes:

1. **The test re-declares the logic instead of importing it.** A test that owns a private copy of the logic under test has zero coupling to the real implementation. It can only ever catch bugs *you also paste into the copy* — i.e. none of the ones that matter. Green means "the copy is self-consistent," not "production is correct."

2. **A default/fallback was flipped without a completeness gate.** Flipping unmatched → deny assumes the match-set is exhaustive. Nothing enforced exhaustiveness, so a forgotten entry became a silent outage. Fail-closed is the right *direction* (the outage is safe, not a breach) but a *silent* fail-closed on a load-bearing path is still an incident.

The deeper principle (trace-surface): **a test pins behavior only if it observes the single source of truth (SSOT).** Observe a copy and you've pinned the copy, which nothing depends on.

---

## Fix

1. **The test imports the SSOT.** Extract the logic into one pure, dependency-free module (`classifyRoute(input)`), and have *both* the production caller and the test import that exact symbol. If importing is hard because the module drags in framework globals, that's a signal to extract the pure core into a plain module — do it; the extraction is the fix, not a workaround.

2. **A guard forbids the copy from coming back.** A cheap CI lint: the protection test for module X must `import` X, and must not re-declare X's signature function/config locally. This locks out the "self-contained copy" regression permanently. Registry-and-test, or SSOT-and-test, come *in pairs*.

3. **When flipping a fallback to deny-by-default, add a coverage gate in the same change.** Enumerate every real case (every route file, every enum variant, every config key), run it through the SSOT classifier, and fail the build on any case that lands in the new deny bucket unexpectedly. Pre-existing, knowingly-unhandled cases go in an explicit baseline (shrink-only) so the gate blocks *new* gaps without bricking the pipeline.

4. **Make fail-closed loud on load-bearing paths.** A deny that returns an indistinguishable generic error and logs nothing is undebuggable from data. Give the unmatched-deny branch a distinct, greppable signal so "which layer rejected this, and why" is one query.

---

## Detection

- Grep your protection tests for a local definition that mirrors the module under test (`function classify`, `const ROUTES =`, a re-declared reducer). Any hit: does the test also `import` the real thing? If not, it's a copy test.
- For the fallback-flip specifically: hit the live surface directly (curl every endpoint, enumerate every enum) and check which layer rejects. A response that fails *before* the normal identity/validation error means the case never reached its handler — it was caught by the deny fallback.
- Build-time: the coverage gate from Fix #3 *is* the regression detector.

---

## Don't

- ❌ Paste the logic into the test "to keep it self-contained." Self-contained-from-the-SSOT is exactly the bug. Import the SSOT.
- ❌ Flip a fallback to deny-by-default in a change that doesn't also enumerate-and-verify the existing cases. "I'm pretty sure they're all handled" is the famous last words of a silent outage.
- ❌ Trust a green suite over a production curl when the two disagree. The suite can be testing a fossil; the curl can't.
- ❌ Let the deny branch return a generic error with no log. Fail-closed is fine; fail-*silent* on a core path is the incident.

---

> Harvested from a production incident: an access-control middleware flipped to deny-by-default with one core write endpoint left unclassified; users' core action returned `401` with zero database trace, and the dedicated middleware test stayed green because it tested an inlined copy of the classifier instead of importing it. Companion: [`pg-function-overload-zombie.md`](./pg-function-overload-zombie.md) (another "correct change + stale assumption = silent break"), and the trace-lock skill (`scaffold/skills/trace-lock-modify`) for the SSOT-and-test pairing.
