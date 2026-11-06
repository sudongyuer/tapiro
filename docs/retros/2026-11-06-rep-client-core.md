---
branch: feat/rep-client-core
date: 2026-11-06
pr: reviews, profile and coins client core (plan Task 2)
title: reputation and coins services, fixtures, stores, review live signals and copy
escaped: pending
rework: 1
interventions: 0
overturned: pending
---

# Retro: reputation and coins client core (Task 2)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                  |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending (no screens yet; Tasks 4–6, 8 and 10 are the first users)                                                                                          |
| Quality   | Vacuous checks          | The in-flight supersede and the draft-before-send guards were mutation-checked (removing each fails its tests); the pgTAP dedupe cases count exact events |
| Quality   | Skipped verifications   | No UI case: no screen changed. `verify:smoke` ran (see the PR)                                                                                             |
| Speed     | Wall-clock              | About 2.5 h, a third of it reading the five migrations and the canvas boards for copy                                                                      |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                          |
| Loop      | Minutes on this retro   | 5                                                                                                                                                          |

## Problems and root causes

| #   | What happened                                                                                                                  | Root cause class | Change and layer                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The first pgTAP run of `review_signals` failed: a check read `public.events` directly as `authenticated` (tag: pgtap-grant)    | test authoring   | None beyond the fix: tests read client-hidden tables through a `security definer` `pg_temp` helper, as `chat_read_state.test.sql` does   |
| 2   | A second submit would have sent three signals to the first reviewer (its insert, then one reveal per row)                      | design slip      | Code: the trigger skips the insert signal when the counterpart review exists and signals the reveal from one row; pgTAP counts exactly   |
| 3   | A submit that landed while the item had no data would have stored a one-pair list (an organiser with four riders sees one row) | partial data     | Code: with no data the store reloads instead of fabricating the list; the general rule is AGENTS.md 「Data integrity」                    |
| 4   | `redeem_invite` answers before `my_invite()` ever ran carry `code: null`; a strict parser would show a stored redeem as failed | parser too strict | Code: `Invite.code` is nullable; unit test                                                                                               |

## Review findings

Pending (one round).
