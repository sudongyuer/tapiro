---
branch: feat/bounty-flow-races
date: 2026-11-24
pr: Bounty auto-confirm and cancel races on two database sessions
title: Bounty auto-confirm and cancel races
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: bounty auto-confirm and cancel races

## Core (mandatory)

| Dimension | Measure               | This step                                                                                     |
| --------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                             |
| Quality   | Skipped verifications | pgTAP not rerun locally (no migration or SQL test changed; CI's `supabase` job runs it)       |
| Speed     | Wasted time           | ~0; the task read as "build what is missing", but the server, client and one-session tests existed |
| Autonomy  | Interventions         | 0                                                                                             |

## Findings

- Both criteria were fully built in October (migrations `20261026001200`–`20261026001400`, the status screen); only
  the bare `unit` tokens and the two-session gaps were open. Reading the migrations before planning kept the step to one
  test file and doc rows.
- Two concurrent HTTP calls rarely overlap, so a "race" test written that way passes without testing anything. Holding
  the lock from a direct `postgres` session and waiting until the RPC shows as an ungranted lock in `pg_locks` makes
  every run exercise the overlap; a job that stopped skipping locked rows would deadlock against the holder and time
  out.
- The waiver race also closed `rep.no-show.waiver`'s gap. Two criteria still carry `gap: concurrency needs two
  sessions` (`bounty.apply.select`, `coins.ledger.spend`); the same holder pattern closes them.

## Actions

- None in this PR beyond the test: the remaining concurrency gaps are listed for the next bounty or carpool step, and
  the holder helpers (`whileHolding`, `waiters`, `actAs`) live in the new test until a second user needs them.
