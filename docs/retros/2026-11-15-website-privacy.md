---
branch: docs/website-privacy
date: 2026-11-15
pr: The public privacy page's AI section matches the in-app 问小貘 paragraph
title: Each sentence of the web AI section traced to app copy or server code; the in-app policy lacks a few facts the code shows
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: website privacy, AI section (2026-11-15)

## Core (mandatory)

| Dimension | Measure               | This step                                                                                              |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 0 known                                                                                                |
| Quality   | Skipped verifications | No browser screenshot (one HTML section of paragraphs in the existing style); not deployed, owner's PR |
| Speed     | Wasted time           | ~0                                                                                                     |
| Autonomy  | Interventions         | 0; the owner answered the website question A                                                           |

## Findings

- 「Memory goes only with drafts and answers」 is in the 小貘记得 footers and `MEMORY_TASKS` in
  `supabase/functions/ai-draft/memory.ts`, not in the in-app policy paragraph; a public page written from the policy
  alone would have missed it. Public privacy copy is traced to the consent screen, the settings footers and the server,
  not to one paragraph.
- The training sentence on the web page has no app copy behind it; it rests on the provider research
  (`docs/research/2026-10-04-ai-providers.md`). It was kept and flagged for the owner rather than removed or copied into
  the app.
- The site still says 「AI drafting」 on `index.html`, `coins.html` and `terms.html`; those pages describe what coins buy,
  not data handling, and were left as they are.
