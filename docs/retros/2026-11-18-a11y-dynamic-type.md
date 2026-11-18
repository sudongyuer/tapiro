---
branch: fix/a11y-dynamic-type
date: 2026-11-18
pr: Type roles stop at their iOS AX5 size; cleaner VoiceOver labels on home, the ask prompt, the chat composer and deadline picks
title: maxTextScale per type role, fixed-size stage bubble and bottom accessory, hidden initials and back faces, field names
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: large text and labels

## Core (mandatory)

| Dimension | Measure               | This step                                                                               |
| --------- | --------------------- | --------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                       |
| Quality   | Skipped verifications | Real VoiceOver speech and the largest size on a device (`docs/walkthroughs/` checklist) |
| Speed     | Wasted time           | ~0                                                                                      |
| Autonomy  | Interventions         | 0                                                                                       |

## Findings

- The AX5 caps come from `UIFont.preferredFont` measured on the Simulator (Large Title 60, Title 1 58, Title 2 56,
  Title 3 55, Body 53, Subheadline 49, Footnote 44), not from memory; `tokens.test.ts` pins two of them and the order.
- Two VoiceOver faults had one cause each and a lower layer: an aggregated card label picks up every descendant text,
  so a back face drawn for the stack and a decorative chevron were read aloud; and a text input labelled with its own
  placeholder is read twice. The second is now a rule in `a11y.py` (fails `a11y_screens`); the first stays per
  component (hidden back face, hidden initials, hidden chevron) with assertions in `home_live` and `pay_card_button`.
