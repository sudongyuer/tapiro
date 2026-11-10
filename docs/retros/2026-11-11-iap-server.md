---
branch: feat/iap-server
---

# Retro: coin purchase server (IAP Task 3 and the `iap-notify` receiver)

Built the ledger reasons, packs, transactions and notification tables, `iap-verify` and `iap-notify`, tested by pgTAP
(54), handler tests in Bun and Deno, a Deno oracle suite against Apple's library, and stack tests with unsigned `Xcode`
transactions. No Simulator, no hosted project, no account.

- **Apple's library does not run where the functions run (runtime-gap).** It passed in Deno 2.9.8, which is where the
  first spike ran, but `supabase functions serve` (edge-runtime 1.68.4 and 1.77.8) lacks
  `X509Certificate.prototype.toString` and `.raw`, so every signed transaction would have been rejected while all Deno
  tests passed. The unsigned `Xcode` stack tests could not see it either, because the library skips the chain for
  `Xcode`. Found by a throwaway function probing the signed path inside the runtime; fixed by a port on `jsrsasign` and
  `jose`, held to the library's verdicts on 17 fixtures. Lesson: a library check for an Edge Function runs inside
  `supabase functions serve`, not only in the Deno CLI. Kept as a line in the plan and the Supabase README rather than
  a rule; a second case would make it an AGENTS.md rule.
- **Stalled shell (tool-misuse).** A stray `cat >> /dev/null` waited on stdin for the 120 s timeout. No lasting cost.
- **Pinned `jose` 6.2.17 failed to resolve in the Deno CLI** two days after release while the Edge Runtime fetched it;
  pinned 6.2.16.
- **Proof the checks fail.** Removing the local-host guard failed 4 config and handler tests; removing the leaf marker
  and leaf date checks failed 2 oracle cases.
- Choices for veto are ★ S1–S12 in the plan. Skipped: `verify:smoke` (another agent owns the Simulator; no UI or app
  code changed).
