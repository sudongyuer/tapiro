---
branch: feat/ask-server-core
---

# Retro: 问小貘 server core and draft contract (plan Tasks 1–2)

Server tables and RPCs, `ai-draft` with a fake provider, `src/lib/drafts`. No UI, no real model call, no account.

- **Check failed (plpgsql-name-clash).** `record_consent(version)`: a parameter named like a column is ambiguous in
  `on conflict (user_id, version)`. Caught by the first pgTAP run; `#variable_conflict use_column` fixes it. The brief named
  the parameter, so it stayed. No escalation; Postgres fails loudly at the first call.
- **Check failed (ledger-fk-truncate).** A foreign key from `ai_pantry` to `coin_ledger` changed the truncate error
  `coins.test.sql` pins from `55000` to `0A000`. Running every pgTAP file found it, not the new file alone. Dropped the key and
  said why in the migration.
- **Check failed (pgtap-shared-data).** After `test:stack` on the shared stack, `live_push` test 35 and two new `ai.test.sql`
  assertions failed on rows the integration tests leave behind. Reset, then all 58 files passed. My assertions now compare
  before and after. `live_push` 35 keeps its absolute count; it is older than this work and only fails after `test:stack`
  without a reset. Listed here, not fixed.
- **Check failed (timing-assertion).** The first concurrency check in the integration test sent six calls at once and expected a
  `busy`; the fake answers too quickly for any to overlap. Replaced with a held lease, which cannot depend on timing.
- **Check failed (test-each-empty-array).** `test.each([..., []])` spreads the empty case into no arguments, and bun read the
  callback as waiting on `done`: a 5 s timeout. Replaced with a plain loop.
- **Check failed (serve-died-with-shell).** `fn:serve` started with `&` died with its shell, so the next integration run got
  503 `name resolution failed`. Run it as a background task.
- **Deno and the repo's tests.** The repo tests functions with `bun:test` and CI has no Deno. An import map points `bun:test`
  at a small shim, so `bun run test:deno` runs the same handler tests in Deno without a second copy.
- **Decisions the plan had left implicit.** The daily limit is the energy check, since a second number would decide 149. A lease
  was added because the overdraw ruling alone leaves parallel requests unbounded. Both are listed as ★ for veto.
- **Review round.** Four Important findings: unbounded cost through replies the function discards (S2's claim was false), a dropped
  reward silently leaving an older one in the form, a stale guessed category surviving a new title, and a consent guard
  that depends on what the client sends. All were reasoned from the code, none reached a check. Common cause for the two form
  ones: `draftFields.test.ts` only tried a blank form. The consent one becomes a Task 3 requirement. CI runs neither pgTAP nor
  `test:deno`, older than this work: the `db:` and `int:` evidence here is manual. Not changed; reported.
- **Re-review.** One Important: a real adapter that throws on a billed response with no tool call would reopen the same bypass.
  Nothing throws that way today, so the rule is stated on `AiProvider` and in S10 for Task 9.
