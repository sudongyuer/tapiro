# Bounty step 9: hand-drawn intent art, the done-card stack and the month calendar

> **For agentic workers:** execute task by task. Only one Simulator-using agent runs at a time. Tasks write their UI
> cases but do not run them; the last task runs the selection once (Pace, 2026-10-29). When all tasks are done, run
> `spec-lifecycle` before the PR (only "Deviations and rulings" is updated; the bounty spec is implemented after step 12).

**Status:** done (2026-10-31, overnight). Was draft. Answered: 86 ABCDE, 87 1, 88 A, 90 A, 91 A, 92 A, 94 A, 95 A, 96 A, 97 A (2026-10-30). 93 A
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

## Tasks (final)

1. **Art set.** 12 drawings (the canvas 8 plus bag, food, medicine, document) in `scripts/hand-art/drawings.mjs`,
   rendered by `render.mjs` (headless Chrome) to `assets/hand-art/<id>.png` (512 px, transparent, white die-cut border
   baked in) and the kit's `modules/tapiro-kit/ios/HandArt/`. `generate.mjs` prompts the same ids.
2. **Intent resolver.** `src/lib/handArt/`: 17 sub-intents, keyword tables in zh-Hans, en, ms; stored art, then title
   (chosen category first), then category drawing, then the cat.
3. **Stored art.** `bounties.art` + `publish_bounty(art)`; every read returning the category returns `art`.
4. **`HandArt` everywhere** (92A): the tiles, `EarnedSticker` and `CategorySticker` are gone; pins draw the PNG.
5. **Publish (86A, 94A).** Art row and 换一张 under the title; the shown art is published; it lands on the new home card.
6. **Card stack (95A)** and **month calendar (96A)** in 「一起办成的事」, native segmented switch, remembered.
7. **Fonts (97A)**, tokens, copy in three languages.
8. **UI cases** `bounty_post_art`, `sticker_book`, `sticker_book_labels`, `sticker_book_calendar`, updated
   `pay_settle_routine`, `sticker_book_empty`; story map, spec record, retro, PR.

## Rulings (overnight, 2026-10-30 → 31; taken on the owner's behalf, recommended option each time)

1. The art is stored per bounty (`bounties.art`), because 换一张 must survive publishing; payments and stickers read
   it from the bounty instead of copying it.
2. Publishing stores the art that was shown, chosen or automatic, so a later keyword change never redraws an old bounty.
3. 换一张 walks the whole set of 12, not only the category's drawings: most categories have one to three.
4. Keywords from all three languages apply whatever the app language (titles mix Chinese, English and Malay); a match
   in the chosen category wins over other categories.
5. Four extra drawings (bag, food, medicine, document) so 买 and 办事 have their own; the grain is softer than the
   canvas so 512 px fills read solid.
6. Map pins keep the category-colour disc (it is all that is left when zoomed out to dots) and draw the art inside it.
7. 94A lands on the poster's new live card on the bounty home: the board never lists your own bounties. Motion
   (decided for you, finite, transforms and opacity): the art drops from 140 pt above at 1.6× and −14°, a spring of
   600 ms with damping 0.55, 300 ms after the sheet closes; Reduce Motion fades in over 200 ms. In the form the art
   arrives with a 240 ms fade and scale 0.88 → 1 and −4° → 0; Reduce Motion skips it.
8. 95A: celebration G keeps its choreography; the book it opens is now the stack, newest on top.
9. 96A: the calendar starts on Monday, a day shows its newest errand's art, and tapping a day switches to 卡堆 at that
   card (卡堆 is then remembered).
10. The card's handwritten line is who helped whom (shrinks to one line); the title stays in the system font, two lines.
11. Caveat ships as Google's variable font; captions use weight 700.
12. After 换一张, editing the title back to automatic happens only when the title's meaning (its automatic art) changes.

## Open questions (canvas, page 05)

92. Where the hand art replaces the colour tiles (everywhere including map pins / stickers and cards only / new surfaces only).
93. The art style, picked from a small generated sample (crayon / yarn / soft watercolour; about US$0.36 for 3 × 3).
94. The publish moment: when the art appears and how it reaches the board.
95. The done-card stack: where it lives and how it joins celebration G and the payer's 已结清 card.
96. The month calendar: a view of the same book or its replacement; what an empty day shows.
97. The handwritten face: Long Cang + Caveat (5.6 MB) / Long Cang only / system font for en and ms.
