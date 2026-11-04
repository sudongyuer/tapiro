---
branch: feat/dev-test-accounts
date: 2026-11-04
pr: dev test accounts
title: seeded test accounts and a two-Simulator dev script for local two-phone play
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: dev test accounts

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                              |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                |
| Quality   | Vacuous checks          | 0: the gate tests fail when any of the three conditions is dropped; sign-in was proven by `auth.users.last_sign_in_at` |
| Quality   | Skipped verifications   | No UI case: verify mode never shows the buttons by design; the dev:two run and its screenshots stand in                |
| Speed     | Wall-clock              | About 1.5 h; most of it the first prebuild, pod install and Debug build, plus 15 min on taps that never arrived        |
| Autonomy  | Avoidable interventions | 0                                                                                                                      |
| Loop      | Minutes on this retro   | 4                                                                                                                      |

## Problems and root causes

| #   | What happened                                                                                                                                                                                            | Root cause class | Change and layer                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `supabase db query --file` rejected the seed: it runs one prepared statement, so a multi-statement file fails                                                                                            | tool footgun     | The seed is one `do` block and the summary a second query (`scripts/db-test-accounts.ts`)                                               |
| 2   | AXe taps were dropped (in Tapiro and in Settings) while DeviceHub showed the Simulators; booted headless, the same taps worked                                                                           | tool footgun     | `dev:two --headless` for agents; the README says to drive the phones with AXe only headless. Quitting DeviceHub shuts down every device |
| 3   | The first Debug build used `generic/platform=iOS Simulator` and compiled x86_64 as well                                                                                                                  | slow step        | The build targets the first chosen Simulator by id, so only its architecture is built                                                   |
| 4   | The shared local stack lacked the two chat migrations, so `chat.test.sql` failed                                                                                                                         | stale env        | `supabase migration up --local` (no reset); pgTAP then passed 1615/1615                                                                 |
| 5   | `shell_tabs` fails in smoke (小貘 button 104.7 x 54, expected 62 x 62) with this branch and with main's own verify build from 13:06                                                                      | pre-existing     | Not fixed here; reported for its own look                                                                                               |
| 6   | After `expo start` wrote `.expo/types/router.d.ts` and `expo-env.d.ts`, `tsc` failed in `TermsLine.tsx` (`/legal/undefined`) and `LiveCardStack.tsx`; without those generated files (as in CI) it passes | pre-existing     | Not fixed here; reported. Any checkout that has run Metro sees the same two errors                                                      |
