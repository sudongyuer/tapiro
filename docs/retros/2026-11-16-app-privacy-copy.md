---
branch: fix/app-privacy-copy
date: 2026-11-16
pr: The in-app privacy policy names the contact, the anonymised AI records, the memory scope, location and one provider name
title: Every privacy sentence traced to code or the provider's terms; two string guards added
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: in-app privacy copy (2026-11-16)

## Core (mandatory)

| Dimension | Measure               | This step |
| --------- | --------------------- | --------- |
| Quality   | Escaped defects       | 0 known   |
| Quality   | Skipped verifications | The case screenshots show the top of the policy only; the 删除账号 section and the contact line are below the fold and are covered by `resources.test.ts`, not by a picture |
| Speed     | Wasted time           | ~1.5 h waiting on the shared sim lock (another agent's queue); the verify build ran in that time |
| Autonomy  | Interventions         | 0         |

## Findings

- The training claim rested on a product page; the binding source is the international Product Terms of Service
  4.48.1(e), which says "develop or improve … unless you separately provide your consent". Privacy claims about a
  provider cite its terms, not its marketing page, and the research doc now quotes both.
- The 143 card and the speech permission string said 「阿里云（新加坡）」 while consent and the policy said the full name.
  The plan copied the board's short form. Fixed at the lowest layer: `resources.test.ts` fails any string, native
  permission strings included, that names Alibaba Cloud without the full `ask.provider`.
- 「Approximate location」 was not true as written: the app reads at `Accuracy.Balanced` but never asks for reduced
  accuracy, so the policy says 「your location」. The website on #137 still says "approximate location … to show errands
  nearby", and the location permission string names bounties but not rides; both listed for the owner.
- `prettier --write` on a doc under `docs/` reflowed every table in it; `format:check` covers only `src/`, `app.json`
  and `package.json`, so docs edits stay hand-aligned.
- `welcome_legal` and `ask_voice_device` passed first time in zh-Hans, en and ms (light); smoke passed.
