---
branch: fix/iap-review
---

# Retro: fixes from the independent review of #112 (IAP server)

Review findings 1, 2, 4 and 5 fixed; 3 (Sandbox on hosted) recorded as a launch item, not changed (272 A). No
Simulator, no hosted project, no account.

- **The signed path had never run in the Edge Runtime (runtime-gap, second time).** The #112 retro found Apple's
  library failing only under `functions serve` and kept the lesson as a plan line, "a second case would make it a
  rule". The port that replaced it was then itself tested only in plain Deno and with unsigned `Xcode` stack tests.
  Now `tests/iap.integration.ts` signs Sandbox data through a committed local test root and posts it to
  `functions serve` (CI). Proof: served without `IAP_TEST_ROOT`, the 2 signed cases fail with `unverified`. Second
  case, so it becomes an AGENTS.md line under Checks.
- **Notification order lost a paid purchase (order-gap).** pgTAP covered two orders by hand; the reviewer found a
  third. A table of all six orders of credit, `REFUND` and `REFUND_REVERSED` (`iap_order.test.sql`) failed 3 of 6
  before the fix (8 of 18 assertions), including two the review had not named (refund, credit, reversal; reversal,
  credit, refund). Lesson: for commutative events, test the permutations, not the ones that come to mind.
- **The local gate trusted one signal (single-signal-gate).** Added two independent ones, checked against the
  Supabase docs and a throwaway probe of the local runtime's environment. The probe showed `SB_EXECUTION_ID`, which
  reads like a hosted marker, is set locally too; using it from memory would have broken every local `Xcode` test.
  Proof: the new config tests fail 5 of 10 on the old gate.
- **Oracle additions found no disagreement.** 9 new cases (dates, `alg`, `signedDate`, unsigned outer) agree with
  Apple's library; no fix needed.
- **Size limit (check-failed).** The oracle file reached 502 lines; the PKI helpers moved to `test-pki.ts`, which
  `tsconfig.json` excludes like the other `npm:` imports.
- Skipped: `verify:smoke` and UI cases (another agent owns the Simulator; no app code or UI changed).
