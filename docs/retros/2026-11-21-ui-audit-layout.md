---
branch: worktree-agent-a4fb51ac2b930d555
date: 2026-11-21
pr: UI audit batch D (layout) — O2, H2, L1, P5, P6, S1, S3, H3
title: Layout findings from the 2026-11-21 UI walkthrough
escaped: 0
rework: 3
interventions: 0
overturned: 0
---

# Retro: UI audit batch D (layout)

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                                                  |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 0 known                                                                                                                                    |
| Quality   | Skipped verifications | AX5 and device runs; ms dark (no ms-only colour or surface change)                                                                         |
| Speed     | Wasted time           | ~90 min waiting for the shared Simulator queue (four batches and the shared-UI session at once); ~15 min on three check rewrites           |
| Autonomy  | Interventions         | 0; three coordinator notes (do-not-touch list grew twice, applicants added to H3), absorbed without rework since H3 already hid every push |

## Findings

- S1 was a lookup, not a missing option. Both react-native-screens (`RNSScrollViewFinder`, first-subview chain) and
  UIKit's navigation bar find a screen's scroll view by walking first subviews; a SwiftUI Form in an `@expo/ui` Host is
  rarely there. Reading the installed sources first gave a one-call fix (`setContentScrollView(_:for: .top)`) in the
  kit instead of a guess. Tag `native-lookup`. Any UIKit behaviour keyed on "the content scroll view" (large-title
  collapse, edge effects, scroll to top) misses hosted SwiftUI lists; a new Form or List screen needs
  `navigationScrollEdge()` or `PinnedBar`. Not enforced yet: a check that flags a `<Form`/`<List` in `src/features`
  without either is a follow-up.
- S3 rework (tag `native-shape`): the first fix floated the footer over the timeline with
  `UIScrollEdgeElementContainerInteraction` and the hard edge. The screenshot showed no effect under the footer: the
  interaction takes its shape from UIKit labels, images and controls, and React Native text is none of them. Lesson:
  system scroll-edge interactions do not see RN content; check the header's wording ("descendants … such as labels")
  before building on it. Fell back to the opaque bar plus the system separator.
- H2 rework: `flexWrap` did not move the switch below the title (Yoga shrank the title first); the visible fix was the
  wider gap alone, so the wrap code was dropped and the decision rewritten to what the screen shows.
- O2: the audit guessed the host clipped at x = 0; the screenshot showed the cut 5 pt inside the box on the second line
  only, so the heading moved out of the Form instead of gaining padding. Measuring first saved a wrong fix.
- Checks that read pixels: `verification/ui/whole.py` (OCR; AX labels hold the whole string even when the line is cut)
  caught O2 on the first run; it needed two calibrations (curly quotes, Vision dropping a lone 一). `edges.py` measures
  the sharpest luma step of text under the status bar (crisp 128–252, under the effect 20–63); its first two versions
  depended on where a locale's copy left the rows, and it now drags in short steps until text sits there. Its separator
  twin in `ride_settle_worst` failed on the build without the separator (28 against 28), so it can fail.
- Tooling friction: the worktree guard refused compound shell commands (heredocs mentioning `git`, `xargs bunx`, quoted
  `(tabs)` paths); edit scripts in the scratchpad were faster than rewording. A blanket rewrite of `| S3  |` hit the
  earlier record's Apple nonce row of the same id and was caught in the diff; table edits now anchor on the record.
- `prettier --write docs` reformatted about 50 unrelated plans, research notes and retros (docs are not
  prettier-clean on main); caught by the diff stat after the rebase and undone by restoring `docs/` from main and
  re-applying only this step's rows. Pattern: run prettier on named doc files only, never on the folder.
