---
branch: feat/ask-memory
date: 2026-11-15
pr: 问小貘 Task 8, the dizzy error card and 小貘记得 (144–146, 133, 281–284) with consent version 2
title: Privacy points asked before building; review found a strict memory field and long numbers kept; a scripted edit no-op'd silently
escaped: 0
rework: 2
interventions: 1
overturned: 0
---

# Retro: 问小貘 errors and 小貘记得 (Task 8)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                                                              |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 0 known                                                                                                                                                                                                |
| Quality   | Vacuous checks          | 1 found in review and fixed: the stack test named 「consent version 1 no longer lets a call through」 only read `currentVersion`; it now signs in a version-1 consenter and expects `consent_required` |
| Quality   | Skipped verifications   | None of the listed checks; 146's on-device path is not built (M12), so nothing on device                                                                                                               |
| Speed     | Wall-clock              | Two sittings: the board and 144 (about 1.5 h), then the rest after the answers (about 6 h, of which about 1 h waiting for the Simulator lock)                                                          |
| Autonomy  | Avoidable interventions | 0; one required: 281–284 were privacy points the boards left open, asked on the canvas as the brief and AGENTS.md require                                                                              |
| Loop      | Minutes on this retro   | 10                                                                                                                                                                                                     |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                            | Root cause class | Change and layer                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A `str.replace` in a scripted edit ran after Prettier had reflowed the target, matched nothing and left the old fixture callback; `tsc` passed because the parameter just changed meaning (a reply name read as a boolean). The UI run showed an offer under every draft | tooling          | Every later scripted edit asserted its `old` text was present (and two more misses surfaced at once). Lesson for agents: assert each replacement, or use the Edit tool, which fails loudly. Tag `silent-replace` |
| 2   | Review: the model's `memory` field was validated with the tool result, so a fine draft with 4 note ids or an over-long offer label was discarded as `provider_error` and counted toward the discard cap                                                                  | missed case      | The result is validated without `memory`, which is then read leniently (M17); five cases in `memory.test.ts`. Tag `strict-sidecar`                                                                               |
| 3   | Review: nothing on the server stopped an account or phone number from being kept, though every entry goes out with each draft and the consent page promises payee details never do                                                                                       | missed case      | `save_ai_memory` refuses 8+ digits (`memory_private`) and the server never offers one (M15); pgTAP, Deno and stack tests. Tag `consent-promise`                                                                  |
| 4   | Review: an old list read could overwrite a fresh save; a settled offer could miss the live turns; a deleted entry stayed named in kept replies; an offer for a kept label replaced it silently                                                                           | missed case      | Load sequence against writes, matching by stored form, `dropMemoryUse` on delete and clear, `replaces` shown on the card (M16); unit tests for each. Tag `stale-overwrite`                                       |
| 5   | Three UI case mechanics failed on the first run: the settings row's load consumed the single fixture failure, a `ConfirmationDialog` title is not in the AX tree, and `assert_appearance` takes pixels, not points                                                       | test mechanics   | Fixture failures count per occurrence; the confirm action is tapped by label like the bounty cases; point-based `shot.rgb`. Tag `case-mechanics`                                                                 |
| 6   | Literal consent versions in 13 unit tests, 4 pgTAP files, 2 stack tests, a script and 2 UI cases all broke on the bump                                                                                                                                                   | design           | Unit tests now follow `APP_CONSENT_VERSION`; the SQL and stack tests still name 2, since they test the migration itself                                                                                          |

Two more found while running the cases:

- The 晕 face was nearly invisible on the dark card (ink on `secondarySystemBackground`); the screenshot showed it, no
  assertion did. It now takes the mascot's existing `darkOutline`. Tag `dark-mascot`.
- Four cases failed on lost inputs while the machine's load average stood at 93 (other sessions); each passed when rerun
  alone on a freshly booted Simulator at load 2. Tag `load-lost-input`.

## Follow-ups

- 146's on-device Foundation Models path as its own task (M12): which tasks, draft quality, a device check.
- Revisit M18 (`data_inspection_failed` as its own card) after the smoke run (148).
