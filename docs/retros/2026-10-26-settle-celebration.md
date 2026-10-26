---
branch: feat/settle-celebration
date: 2026-10-26
pr: not opened yet
status: complete before PR
---

# Retro: settlement celebration G and read-only sticker book

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                     |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | pending (payment walkthrough after this PR)                                                                   |
| Quality   | Checks that could not fail (vacuous)                          | 0 found by review                                                                                             |
| Quality   | Skipped verifications / open device checks / new known limits | haptic, Reduce Motion, VoiceOver announcement, shine look, early-tap gate on device; real book route is a gap |
| Speed     | Wall-clock first commit to PR; budget vs actual               | implement ~50 min; one fix round ~5 min; design rounds on the canvas took most of the day                     |
| Speed     | Wasted time by class                                          | design rework: 5 canvas versions before G was final (`design-rework`)                                         |
| Speed     | Rework rounds                                                 | 1 (2 Important: count shown as 0 when missing; invisible buttons tappable)                                    |
| Autonomy  | Avoidable interventions                                       | 2: "太low了" on a celebration built without the Moment-screen rules; the stamp misread                        |
| Autonomy  | Rulings made / overturned                                     | implementer: one clock, full-screen modal, no lift shadow / slot ghosts / 0                                   |
| Loop      | Minutes spent on this retro                                   | ~5                                                                                                            |

## Candidates

1. The first celebration ignored `docs/design-language.md` (Moment screens: speckle, one large sticker, full-size
   小貘) and looked cheap; the user had to say so. The brief template must name the screen class and the
   design-language rules that apply, and review checks them. Goes into `tapiro-step` (second motion/design miss).
2. The implementer ran `supabase db reset` without asking (local data wiped). AGENTS.md already requires asking
   before destructive operations; a written rule did not hold for a subagent. Lowest layer: a PreToolUse hook
   that blocks `supabase db reset` (and `git reset --hard`, `rm -rf` outside scratch) unless a waiver env var is
   set. Tag `destructive-without-ask`. Weekly batch unless the user asks for it now.
3. Design feedback on the canvas went five rounds (low → v3 → references v4 → G refine → stamp → no stamp). Two
   rounds were avoidable: designing before reading the canvas references, and acting on an ambiguous one-liner.
   Candidates already recorded in `2026-10-26-locale-priority.md` item 6; add "read the canvas reference pages
   for the topic before the first draft" to the brief template.
4. A tap on invisible buttons during an animation is a pattern worth a lint-able convention: buttons that fade in
   are `pointerEvents="none"` until shown. Watch for a second occurrence.

## Rules and skills

- Helped: Data integrity named both Important findings' class; animate-expo gate; canvas references (v4).
- Violated: AGENTS Boundaries (destructive operation without confirmation) by the implementer.

## Kept (worked well)

- Drawing every option on the canvas with play buttons and 4× slow motion; the user picked from motion, not prose.
