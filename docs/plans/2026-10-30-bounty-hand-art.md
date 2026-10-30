# Bounty step 9: hand-drawn intent art, the done-card stack and the month calendar

> **For agentic workers:** execute task by task. Only one Simulator-using agent runs at a time. Tasks write their UI
> cases but do not run them; the last task runs the selection once (Pace, 2026-10-29). When all tasks are done, run
> `spec-lifecycle` before the PR (only "Deviations and rulings" is updated; the bounty spec is implemented after step 12).

**Status:** draft. Answered: 86 ABCDE, 87 1, 88 A, 90 A, 91 A, 92 A, 94 A, 95 A, 96 A, 97 A (2026-10-30). 93 A
(2026-10-30). Ready to start.

**Goal:** Every bounty gets a hand-drawn illustration chosen from its intent. It appears as the poster types the title
(86A), turns into a card in a stack when the bounty is done (86B), and fills that day on a month calendar (86C). One
set of illustrations, generated offline by the image model Tapiro will later call live (91A), ships in the app.

**Spec:** `docs/specs/2026-10-11-bounty-design.md`, Implementation order 9. Foundation spec 「Settlement celebration and
sticker book (2026-10-26)」. Product notes: Stickers. Spike: `docs/research/2026-10-30-photo-sticker-spike.md` (branch
`spike/photo-sticker`, not merged). Canvas: page 05 「HandArtPick」 (prototypes A–E), 「HandArtSet」, 「第 87 题依据」.

## Decided (do not re-ask)

- **90A No photo stickers in v1.** The on-device cut-out works (Mac, 4/4 photos; iPhone 14 Pro, 2/2 on 2026-10-30), but
  a real photo next to a hand-drawn illustration reads as two styles, and dim indoor photos look grey. Photos stay plain
  attachments on the detail screen. 86D is dropped by 90A.
- **Later: a fast model draws a per-bounty 意境 sticker from the task description** (user, 2026-10-30). Not in this step.
  The set shipped here is that feature's fallback, so this step keeps the art slot model-agnostic: one `HandArt` value
  per bounty, resolved locally today, replaceable by a stored generated image later.
- **91A The fixed set is generated offline** with the same model family (`qwen-image-2.1-pro`, Model Studio Singapore,
  US$0.04 per image, transparent output; spike report table). Generation is a dev-time script; no model or key ships.
- **88A / 97A Captions under the art use a handwritten face:** Long Cang for zh-Hans, Caveat for en and ms (5.6 MB).
- **92A The hand art replaces the S1 colour tiles everywhere**, map pins included (the kit gets the same set).
- **94A The art appears while the title is typed** (0.5 s after typing stops), 换一张 cycles, and publishing flies it to
  the top of the board. Motion values are offered as options before Task 4.
- **95A 「一起办成的事」 becomes a card stack**; celebration G and the payer's 「收进贴纸本」 both end on it.
- **96A The same book switches between 卡堆 and 月历** with a segmented control that remembers the choice; empty days
  stay blank.
- **93A The style is crayon flat fill**: thick wobbly ink-brown outline, flat fills with crayon grain (canvas
  「第 93 题 · 画风三选一 + 提示词」, column A; `STYLES.crayon` in the script).
- **The prompt is the asset** (user, 2026-10-30): one model-agnostic template (subject, composition, style block,
  palette, people, avoid, plus a separate negative prompt) lives in `scripts/hand-art/generate.mjs`, so a different
  model later gives a similar set. The canvas samples are hand-drawn SVG stand-ins; no model is called in this step
  until a key is provided.
- **86E The carpool route card** is recorded in the carpool spec's open items, not built here.
- **87 option 2 (Image Playground) is out:** no Simulator support, not on mainland-China iPhones, no Malay, no crayon style.

## Deviations from the spec

- Implementation order 9 says 「Photo → die-cut sticker in the kit」. It becomes 「hand-drawn intent art」 (90A). The
  publish fly-to-stack animation stays. Recorded in the spec's Implementation Record when step 9 ships.
- Step 7 Q74 kept the S1 colour tiles because step 9 might replace them; this step replaces them (92).

## Gaps found while preparing

1. **Category is too coarse for the art.** Eight categories map to eight drawings; 「带杯奶茶」 and 「买药」 are both `buy`.
   The intent resolver matches the title against a per-locale keyword list into a sub-intent (about 24, for example
   `buy.tea`, `buy.medicine`, `accompany.hospital`), falling back to the category drawing, then to `other`.
2. **Map pins draw natively.** `BountyPinView.swift` takes an SF Symbol name (`modules/tapiro-kit/ios/BountyPinView.swift:13`).
   Showing the art on pins means the PNG set must also be loadable by the kit (an asset catalog in the kit, keyed by
   the same art id). Asked as 92.
3. **The handwritten face is large.** Long Cang (OFL) is 5.2 MB; Caveat (OFL, Latin) is 0.4 MB. Free-text titles can
   contain characters the face lacks; iOS falls back per glyph. Asked as 97.
4. **The sticker book changes shape.** 86B and 86C both reshape 「一起办成的事」 from step 7 (a three-column grid). Asked
   as 95 and 96.
5. **The settle celebration already plays for the payee** (celebration G) and the payer gets the green 「已结清」 card
   (10A). The done card (86B) must join those moments, not add a third. Asked as 95.

## Tasks (draft; final after 92–97)

1. **Art set.** `scripts/hand-art/generate.mjs` calls the model with one style prompt and the sub-intent list, writes
   candidates to a scratch folder, and a canvas board shows them for picking (93). Picked images go to
   `assets/hand-art/<id>.png` (512 px, transparent) and, if 92 includes pins, the kit's asset catalog. The key is read
   from the shell environment, never from a committed file.
2. **Intent resolver.** `src/lib/handArt/` maps `(category, title, locale)` to an art id with keyword tables for
   zh-Hans, en and ms. Unit tests cover every sub-intent in all three locales, the category fallback and `other`.
3. **`HandArt` component** replacing the S1 tiles wherever 92 says: `StickerArt` gains `{ kind: 'hand'; id }`;
   `CategorySticker`, `EarnedSticker`, the home cards and the map pin read it.
4. **Publish (86A).** The post form shows the art for the title as it is typed; 换一张 cycles the sub-intents of the
   category; on publish the art flies into the board's stack (motion asked as 94).
5. **Done card stack (86B)** per 95.
6. **Month calendar (86C)** per 96.
7. **Fonts and copy** per 97; every new string in zh-Hans, en and ms.
8. **Run the selected UI cases once**, update `docs/story-map.md`, the spec record, product notes (Stickers: 90A and the
   later per-bounty generation), and open the PR.

## Open questions (canvas, page 05)

92. Where the hand art replaces the colour tiles (everywhere including map pins / stickers and cards only / new surfaces only).
93. The art style, picked from a small generated sample (crayon / yarn / soft watercolour; about US$0.36 for 3 × 3).
94. The publish moment: when the art appears and how it reaches the board.
95. The done-card stack: where it lives and how it joins celebration G and the payer's 已结清 card.
96. The month calendar: a view of the same book or its replacement; what an empty day shows.
97. The handwritten face: Long Cang + Caveat (5.6 MB) / Long Cang only / system font for en and ms.
