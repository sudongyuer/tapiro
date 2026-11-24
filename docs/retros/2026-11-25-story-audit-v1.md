---
branch: test/story-audit-v1
date: 2026-11-25
pr: Story audit of five v1 stories; pay sheet worst case and moved ride time cases
title: Story audit of v1 stories without open criteria
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: story audit of v1 stories without open criteria

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                                                                                       |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                                                                                                               |
| Quality   | Skipped verifications | Device criteria stay on the device checklist; nothing here can run them                                                                                                         |
| Speed     | Wasted time           | ~25 min: two reruns of the new cases (OCR placement in zh-Hans, the zh-first second read garbling Latin names, a sentence's full stop read as an ellipsis, a scrolled-past row) |
| Autonomy  | Interventions         | 0                                                                                                                                                                               |

## Findings

- A story with no open criteria is not necessarily finished: `home.live-activity` listed only unit tests and `device`, yet
  release builds carry no extension at all (`TAPIRO_LIVE_ACTIVITY=1` gate, 278 A). The story map now names that as a
  gap. `chat.push` and `chat.live` had the same shape: delivery was `device` only while the hosted project cannot send.
- The `ride.join.late` gap said the struck-through time was "drawn from the fixture"; no fixture sets `revisedAt`, so
  nothing drew it. The new case changes the time through the organiser's sheet instead.
- `whole.assert_drawn_whole` treats a line ending in a full stop as truncated (`ocr.clipped` folds `.` into `…`), and
  `ocr.lines_in` adds a zh-Hans-first read for Latin locales that garbles Latin names into near-duplicate lines in the
  same frame. Both bit the pay sheet case; it reads Latin names with one en-US-first pass and checks only real
  ellipses.

## Actions

- Candidate for `escalate-correction`: `ocr.clipped` should not turn a single trailing `.` into an ellipsis; changing it
  touches every case that uses `assert_drawn_whole`, so it is left for a runner change with its own selection.
