---
branch: feat/rep-client-core
date: 2026-11-06
pr: reviews, profile and coins client core (plan Task 2)
title: reputation and coins services, fixtures, stores, review live signals and copy
escaped: pending
rework: 2
interventions: 0
overturned: pending
---

# Retro: reputation and coins client core (Task 2)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                 |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending (no screens yet; Tasks 4–6, 8 and 10 are the first users)                                                                                         |
| Quality   | Vacuous checks          | The in-flight supersede and the draft-before-send guards were mutation-checked (removing each fails its tests); the pgTAP dedupe cases count exact events |
| Quality   | Skipped verifications   | No UI case: no screen changed. `verify:smoke` ran (see the PR)                                                                                            |
| Speed     | Wall-clock              | About 2.5 h, a third of it reading the five migrations and the canvas boards for copy                                                                     |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                         |
| Loop      | Minutes on this retro   | 5                                                                                                                                                         |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                             | Root cause class                                                                                                                   | Change and layer                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The first pgTAP run of `review_signals` failed: a check read `public.events` directly as `authenticated` (tag: pgtap-grant)                                                                                                               | test authoring                                                                                                                     | None beyond the fix: tests read client-hidden tables through a `security definer` `pg_temp` helper, as `chat_read_state.test.sql` does                                                       |
| 2   | A second submit would have sent three signals to the first reviewer (its insert, then one reveal per row)                                                                                                                                 | design slip                                                                                                                        | Code: the trigger skips the insert signal when the counterpart review exists and signals the reveal from one row; pgTAP counts exactly                                                       |
| 3   | A submit that landed while the item had no data would have stored a one-pair list (an organiser with four riders sees one row)                                                                                                            | partial data                                                                                                                       | Code: with no data the store reloads instead of fabricating the list; the general rule is AGENTS.md 「Data integrity」                                                                       |
| 4   | `redeem_invite` answers before `my_invite()` ever ran carry `code: null`; a strict parser would show a stored redeem as failed                                                                                                            | parser too strict                                                                                                                  | Code: `Invite.code` is nullable; unit test                                                                                                                                                   |
| 5   | Local writes dropped reads in flight that also carried other rows (another rider's pair, a new pending row), so the store showed `ready` while missing them; a stale mark did not stop an older read from landing `ready`                 | same class as the chat retro (local write vs read in flight), wider: "drop" is not enough when the read covers more than the write | Code: `src/lib/loadable.ts` tracks reads per request, a write that drops one reads again once, a dirty mark lands older reads as stale; tests per write, mutation-checked                    |
| 6   | Next pages could append to a re-read first page; coin history lost its pages on every return                                                                                                                                              | paging vs head reload                                                                                                              | Code: no page while the head is read, pages drop when the head moved, history keeps pages on focus                                                                                           |
| 7   | CI failed once: `test_records` requires every verify call log the app writes (`uiVerifyRepCalls`, `uiVerifyCoinsCalls`) in `verification/ui/records.py`; the local checks did not include the runner unit tests (tag: verify-record-keys) | missing local check                                                                                                                | Code: keys added. The AGENTS.md checklist names the fast checks but not `python3 -m unittest …` in `verification/ui`; candidate for `lint:changed` or a pre-PR script on the next occurrence |

## Review findings

Round 1: 0 Critical, 6 Important (#5 and #6 above, mascot write dropping a read, coins never reloading on screen and
missing spends and refunds), 6 Minor (stale marks, a landed submit shown failed, deleted profiles, invalid drafts with
no state, out-of-order mascot writes, public surface gaps). All fixed in one round. Re-review: 1 Important (the new
reply sync to the review state had the #5 race) and 5 Minor (in-flight counts across sign-out, head reload started
before a page, history focus reload, refund listeners reaching other people, mascot write failures); all fixed.
Second re-review: nothing Critical or Important; one Minor kept (a next-page request right after a write is refused
once and the list asks again).

Lesson: in a store, "a write supersedes reads in flight" must also re-read when it dropped one; dropping alone trades a
stale overwrite for missing rows. `readInto` and `Requests` in `src/lib/loadable.ts` now carry this for new stores.
