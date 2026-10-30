# Bounty step 8: the map view, the V2 list / map switch and the remembered view

> **For agentic workers:** execute task by task (superpowers `subagent-driven-development` if available). Track steps
> with checkboxes. Only one Simulator-using agent runs at a time. Tasks write their UI cases but do not run them; the
> last task runs the selection once (Pace, 2026-10-29). When all tasks are done, run `spec-lifecycle` before the PR (only
> "Deviations and rulings" is updated; the bounty spec is implemented after step 12).

**Status:** ready. Answered 2026-10-30: 75A, 79A–82A as drawn; 76A, 77B, 78A, 83A on the redrawn interactive board
「地图交互 · 可交互 · 第 76–78、83 题重画」 after the owner's reference video (board 「【参考】地图交互 · 用户给的视频」, page 05).
The owner chose the kit's own MapKit view over `expo-maps` (2026-10-30, 「地图 A」), because the video's pins grow labels,
change with zoom and open a card in place, which `expo-maps`' fixed 50 pt image annotations cannot do. The owner
approved returning the snapped ~110 m point on the board (gap 1).

**Goal:** Beside 「能接的悬赏」 two die-cut stickers switch the board between the list and a real Apple map. The map shows
each located bounty as its category sticker around the user (or the chosen place). Tapping a sticker shows the bounty
with 申请, and the detail is one more tap away. The last view (list or map) is remembered on the device, and the first
time it comes back as the map, the title says 「记住了」.

**Built contracts:** the board model `useBountyBoard` (`src/features/bounty/board/useBountyBoard.ts`) with origin, filter,
pages and the 32A states; `BoardCard` (26A) and its apply route; the origin store (`originStore.ts`, device settings
keyed by user, cleared on sign-out); `nearby_bounties` returns `distanceM` from `place_public`, the place snapped to a
0.001° grid (`20261027000500_bounty_board_privacy.sql`), and no coordinates. `CategorySticker` draws the category art
in RN (S1 tiles with an SF Symbol; 代取 is the parcel SVG).

**Spec:** `docs/specs/2026-10-11-bounty-design.md`: Goals (map line: real Apple map via `expo-maps` `AppleMaps`, stickers
as image annotations, user position, a pin opens a card with 申请); Decisions 「List vs map switch」 (V2), 「View
memory」 (G13), 「Distance axis」; 3A (detail pushed from a list card or a map pin), 26A–35A; Errors row 「Location
denied」 (no map pins until a place is chosen); Known limits (no route); Implementation order 8; Open questions (the
`expo-maps` spike, MapKit in the kit as the fallback). Canvas: 「G · 列表/地图怎么切」 (V2, page 99), 「G 首屏 · 15 种情况」
G10–G13 (page 02), 「真实地图 M2」 (page 05, `SpecVisual3`).

## Spike: `expo-maps` on SDK 57 (2026-10-29)

Branch `spike/expo-maps` (commits `8c62300` and `dd67505`, never merged): `bunx expo install expo-maps` installed `expo-maps@57.0.4` and
added its config plugin. A Debug scene `map-spike` puts ten fixture bounties around Sunway Pyramid as sticker images.
The images are 150 px PNGs drawn by a CoreGraphics script with the category colour, the SF Symbol and a white die-cut
border. The scene logs every event with its time since mount. Built with `bun run verify:build` (265 s from a clean
worktree) and driven with AXe on `Tapiro Verify` (iPhone 17 Pro, iOS 26). Screenshots:
`/private/tmp/claude-501/-Users-sudongyu-work-tapiro/239e5a54-cf0e-4063-8e59-7e739e506b2b/scratchpad/spike-map-0{1..6}-*.png`,
and on the canvas board.

**Superseded 2026-10-30.** The spike's verdict held for the 2026-10-29 questions; the owner's video asks for pins that
grow, carry a die-cut label, shrink to dots when zoomed out and open a card in place, which the fixed 50 pt image
annotations below cannot draw. The map moves to the kit (the spec's named fallback). Caveats 1–10 no longer apply; the
findings on Info.plist, location and tiles still do.

**Verdict (2026-10-29): go, with caveats.** `AppleMaps.View` with image annotations is enough. No RN view has to be rendered to an
image, and the MapKit fallback in the kit is not needed for v1.

What works:

- Sticker images render crisp on the real map, in light and dark (the map follows the system appearance; the white
  border reads on both). The user's position shows with `isMyLocationEnabled` once location is authorised.
- **Tap events fire.** `onAnnotationClick` returns the annotation `id`; observed for b01, b02 and b02 again after a
  clear.
- Camera control works. `setCameraPosition({ coordinates, zoom })` moves the map, and `onCameraMove` reports zoom and
  span (first event 679 ms after mount).
- Annotation titles reach VoiceOver and the AX tree: each annotation is an AX `Group` labelled with its `title`, which
  makes pins testable by label in UI cases.

Caveats that become rulings below:

1. **The icon is always drawn in a fixed 50 × 50 pt frame** (`Image(uiImage:).resizable().frame(width: 50, height: 50)`
   in `AppleMapsViewiOS18.swift`). Non-square images are stretched; the spike's 240 × 150 image was squashed. Sticker
   art for the map must be square, padded PNGs.
2. **No selected look.** A custom annotation does not change when it is selected. A selected look needs a second
   image for that pin.
3. **Re-tapping the selected pin fires nothing**: the event comes from a SwiftUI selection change. After
   `selectAnnotation(undefined)` the same pin fires again. The client clears the selection after every tap.
4. **`onMapClick` also fires for a tap on a pin**, about 510 ms _before_ `onAnnotationClick` (509, 512 and 513 ms in three
   taps). expo-maps works around an iOS 26 `onTapGesture` bug with a simultaneous `SpatialTapGesture`, so the map tap
   cannot tell a pin tap from an empty tap. A "tap empty map to close" must wait for that window.
5. **Programmatic `selectAnnotation(id)` echoes `onAnnotationClick`** and recentres the camera on the full map frame,
   not on the area that overlays leave visible. The client does not use it to select; it moves the camera itself.
6. **Two annotations at the same coordinate resolve to the first one.** The tap is matched back by `MKMapItem`
   coordinate, so tapping b10 (same point as b01) reported b01, and b10 was hidden under it. Bounties in the same
   0.001° cell share a coordinate, so the client merges them before they reach the map.
7. **No clustering.** At zoom 12 the ten stickers pile into one heap. Grouping is the client's job (Q78).
8. **The title is drawn as visible text under the pin** in MapKit's own label style, and an empty title makes VoiceOver
   say 「地图大头针」 (map pin). The label that VoiceOver reads is the label everyone sees (Q77). Overlapping labels are
   hidden by MapKit.
9. `annotation.text` is drawn centred on top of the image: usable for a count, not for a badge position.
10. A changed `cameraPosition` prop resets the camera (`onChange(of: props.cameraPosition)`), so the prop is passed
    once and kept stable; later moves go through `setCameraPosition`.

Performance (Simulator only, indicative per AGENTS.md; device sign-off with Instruments in Task 8):

- First camera event 679 ms after the scene mounted.
- Tap to `onAnnotationClick` about 510 ms. This is the SwiftUI selection path, and on device it decides whether the
  peek card feels late. If the device shows the same delay, record it under Deviations; the fallback is the kit's MapKit
  view (spec open question), not a JS workaround.
- Ten annotations pan and zoom without visible hitches on the Simulator. A 45-bounty board was not measured; Task 6
  measures it with the `long` fixture.

Blockers: none.

- Info.plist: the `expo-maps` plugin adds nothing unless `requestLocationPermission` is set, so it is left unset.
  `NSLocationWhenInUseUsageDescription` already comes from `expo-location` with three locales. (The plugin's Android
  permission branch never runs without that option.)
- Location: the map never asks for permission. `isMyLocationEnabled` is set only when the board origin is `me`, which
  means the board already has When In Use.
- iOS 26: the `onTapGesture` issue above is worked around inside expo-maps; `onAnnotationClick` needs iOS 18+, and the
  deployment target is 26.0.
- Prebuild: adding the plugin changes `app.json` and `ios/`; `bun run format:check` needs `prettier --write app.json`
  after `bunx expo install` (it rewrote the inline arrays).

## Decided (do not re-ask)

- **V2 switch.** Two die-cut stickers, 列表 and 地图, beside the section title; the selected one tilts and scales. V1, V3
  and V4 were rejected (page 99 「G · 列表/地图怎么切」).
- **View memory (G13).** The last view is stored on the device and restored on launch, with 「记住了」 under the title the
  first time it is restored as the map.
- **Real Apple map (M2)** drawn by the kit (`modules/tapiro-kit`, MapKit `MKMapView`), stickers as custom annotation
  views, the user's position shown. No route or turn-by-turn (Known limits). Owner, 2026-10-30.
- **A pin leads to the 3A detail and to 申请** (Goals, 3A, G12). How (card first or push) is Q76.
- **Location denied:** no map pins until a place is chosen (Errors table). How the map area looks then is Q81.
- **Bounties without a place** never appear on the map (Client: 「not placed on the axis or map」).
- **Filters (30A, 34B)** apply to both views; the filter is one board state, not one per view.
- **32A states** (first-load failure, empty, refresh failure with the time of the data) are the same in both views;
  a failed or loading board never shows an empty map as 「没有悬赏」.

## Gaps found while preparing

1. **The board has no coordinates.** `nearby_bounties` returns `distanceM` only, and `BoardRow` has no point. The map
   needs each row's `place_public` point, the 0.001° snapped point that the distance is already computed from. It is
   the board's existing precision (about 110 m). The exact place stays private to poster and helper. Contract below;
   this is a new disclosure of the snapped point, so the PR states it.
2. **The map shows only loaded pages.** The board loads 20 by distance and pages on scroll; a map has no scroll end.
   Q79 decides how the map is honest about what it shows (data integrity: never show partial data as complete).
3. **Sticker art is RN, the map needs images.** `CategorySticker` is RN views and SVG. The spike drew PNGs with
   CoreGraphics and SF Symbols, and that is enough (ruling 1). Photo stickers (step 9) are already PNG URLs and load
   with `useImage(url)`.
4. **Same-cell bounties collide** (spike caveat 6), and crowded zoom levels pile up (caveat 7).
5. **No view memory store.** The origin store keeps the place and the 先不用 choice; the view (list / map) and the
   「记住了」 seen flag are new keys in the same store and are cleared on sign-out the same way.
6. **The board lives in the home scroll view.** A map inside a vertical `ScrollView` takes vertical drags for panning,
   so the page above it is reached only by dragging outside the map. Q75 decides its size and place.
7. **Taps on the map are ambiguous** (spike caveats 3–5). Ruling 3 fixes the handling.
8. **Map tiles come from Apple's servers.** Verify builds are offline at the app's service boundary, but the map still
   draws live tiles, so screenshots of the map area differ between runs. Cases assert pins through the AX tree and
   pixels only on our own surfaces (switch, peek card, chips), never on tiles.

## UI questions (drawn 2026-10-29; answered 2026-10-30)

Drawn on the canvas as questions 75–83. ★ marks the recommendation.

| #   | Question                                       | Options                                                                                                                                                                                                                                                                    | ★   |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 75  | Where the map sits and how big it is           | A the map fills the board from the chips down to the tab bar; choosing it scrolls home so the title sits under the strip · B a 360 pt rounded map card inside the scroll, with 「展开」 to full screen · C 地图 pushes a full-screen map                                   | A   |
| 76  | What tapping a sticker does                    | A a peek card at the bottom of the map: the list card (26A) with 申请; tapping the card pushes 3A; tapping empty map closes it · B push 3A at once · C a small callout (title, reward, 「看详情」) above the pin                                                           | A   |
| 77  | What each pin shows (and VoiceOver reads)      | A sticker plus MapKit's label 「帮取快递 · RM 8」, hidden by MapKit when crowded · B sticker plus 「RM 8」 · C sticker only (VoiceOver would say 「地图大头针」, so C needs a patch to `expo-maps` or the kit map)                                                         | A   |
| 78  | Stickers that overlap                          | A merge stickers closer than 44 pt into one stacked sticker with a count; tap zooms in, or, if they share one spot, the peek card pages through them · B only same-spot merges (「+1」); the rest overlap until zoomed · C merged sticker opens a peek list of all of them | A   |
| 79  | Which bounties the map shows                   | A the ones the list has loaded (nearest 20 first) with a chip 「地图上 20 / 45 · 再显示 20 个」 when there are more · B 「搜索这一片」 after panning (new area query) · C everything within 2 km at once (new query, capped)                                               | A   |
| 80  | Chips, distance axis and place row in map view | A chips and the 「这里」 place row stay above the map; the axis is hidden (the map shows distance) · B all three stay · C map only; filters move into a ⋯ menu                                                                                                             | A   |
| 81  | Map view without a location or a chosen place  | A no map: the 28A card or 「选一个地方」 row stands in the map's place, and the 地图 sticker stays selected · B a map of Sunway with no pins and the card floating over it · C fall back to the list with a one-line note                                                  | A   |
| 82  | Switch and view change motion (Reduce Motion)  | A the selected sticker springs to −8° and 1.12× (perceptual 350 ms, damping 0.75), list and map cross-fade 200 ms · B the same sticker spring, views swap instantly · C sticker eases over 180 ms, views swap instantly                                                    | A   |
| 83  | Peek card in and out                           | A slides up 16 pt and fades in 220 ms ease-out, out 160 ms; a new pin swaps the content in place without re-entering · B no motion · C spring from the pin                                                                                                                 | A   |

**Answers.** 75A, 79A, 80A, 81A, 82A as above. Redrawn after the video and answered on the interactive board:

| #   | Answer                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 76  | A: the pin grows into a card in place, with a tail pointing at the pin; the map does not move. The card has 申请; the back face links to 3A |
| 77  | B: a white die-cut label on top of each sticker names the category (代取, 代买 …); VoiceOver reads 「{title}，{reward}」                    |
| 78  | A: zoomed out, stickers shrink to small dots and the labels hide; near pins overlap (no count, no merge)                                    |
| 83  | A: the card springs out of the pin (about 380 ms, slight overshoot); tapping the card flips it to the back face                             |

Every option of Q82 and Q83 keeps the same Reduce Motion path: the selected sticker is drawn tilted and scaled with no
motion, the views swap at once, and the peek card fades over 150 ms with no movement.

## Rulings made in this plan (overturn by saying so)

1. **The kit draws the pins.** A native `BountyMapView` (Expo view in `modules/tapiro-kit`, `MKMapView`) draws each pin
   as a custom `MKAnnotationView`: a round sticker (category colour and SF Symbol, the S1 tile art, inside a white
   border with a soft shadow) and, above it, a die-cut label with the category name (77B). JS passes the art (colour
   hex from tokens, symbol name, ink hex) and the strings, so no raw colour or copy lives in Swift. Photo stickers
   (step 9) later pass an image URL instead of a symbol.
2. **Zoom levels (78A).** Above a span of about 3 km on the short edge the stickers scale to 0.42 and the labels fade
   (200 ms, Reduce Motion: instant); below it they return. No clustering and no counts. Pins that share a snapped point
   are fanned out on a 10 pt ring by `centerOffset`, so each stays tappable; `displayPriority` is required so MapKit
   never hides one.
3. **Taps are native.** `didSelect` reports `onPinPress { id, x, y }` with the pin's top centre in the view's
   coordinates and deselects at once, so the next tap fires again. A tap on empty map (a tap gesture that ignores
   annotation views) reports `onMapPress`; a pan or zoom by the user reports `onRegionChange`. The card closes on
   either.
4. **Camera.** The initial camera centres on the origin at the zoom that shows 2 km to the nearest edge, the axis range
   (`AXIS_RANGE_M`). The camera is not remembered; only the view is. A new origin (place chosen, or `me` after
   permission) recentres the map: the `camera` prop carries an `originKey`, and the view moves only when it changes.
5. **Origin marker.** Origin `me` uses `showsUserLocation` (MapKit's own dot). Origin `place` is a system
   `MKMarkerAnnotationView` (glyph `mappin`, title 「这里」, the 29A label), never a sticker.
6. **Map style.** `MKStandardMapConfiguration(emphasisStyle: .muted)` so the stickers lead, points of interest
   excluded, no compass or pitch, and the colour scheme follows the app. The card is a real RN card, not an imitation
   of glass (AGENTS.md).
7. **View memory.** Keys `tapiro.boardView.<userId>` (`list` / `map`) and `tapiro.boardViewHint.<userId>` (`1` once
   「记住了」 has shown) in the origin store's settings, cleared through the same `UserCleanups`. 「记住了」 shows under the
   title the first time a launch restores the map, until the first scroll or 4 s, whichever is first, then never again.
   VoiceOver announces it once.
8. **Switch semantics.** The two stickers are one control for VoiceOver: a tab-bar-like pair with roles `tab`,
   `selected` state, labels 「列表」 / 「地图」, and 44 × 44 pt targets. Switching keeps the filter, the origin and the
   loaded pages; the list keeps its scroll position when you come back.
9. **States in map view.** Loading shows the built `BoardLoading` in the map's place. First-load failure shows
   `BoardFailed` in the map's place, with no map, and never a count. A failed refresh shows the built `BoardStale`
   notice above the map, with the pins kept. An empty board or empty filter shows the map with no pins, under the built
   `BoardEmpty` card (「这个筛选下没有」 with 「看全部」).
10. **Applied and own bounties.** A pin whose bounty is `appliedByMe` uses its normal sticker. The peek card shows
    「已申请 · 等对方选」 exactly as the list card does (31A). The map adds no applied variant.
11. **Map within the home scroll (gap 6).** The map's height is fixed when it lays out, so the page does not jump as
    pins load. Pull-to-refresh stays on the page, and the map pans by itself.

## Contracts

- `nearby_bounties(...)` items gain `point: { latitude, longitude } | null`, read from `place_public` (the snapped
  point) and null when the bounty has no place. pgTAP checks that the point equals `st_snaptogrid(place, 0.001)`, is
  never the exact place, and is null without a place.
- Client: `BoardRow.point: Point | null`; `parse.ts` validates it (finite, in range) and fails the read otherwise. The
  fixture rows carry their snapped `pointAt(...)` values.
- `src/features/bounty/board/viewStore.ts`: `boardView(userId): 'list' | 'map'` (default `list`),
  `setBoardView(userId, view)`, `hintShown(userId)`, `markHintShown(userId)`, registered with `UserCleanups`.
- `src/features/bounty/map/pins.ts` (pure, unit tested): `mapPins(rows, t)` returns `MapPin[]`, where `MapPin` is
  `{ id, point, rowId, label, a11yLabel, art: { color, ink, symbol }, fan: { index, of } }`. Rows without a point are
  dropped; rows that share a point get their fan index; `label` is the category name (77B) and `a11yLabel` is
  「{title}，{reward}」.
- Kit facade (`modules/tapiro-kit/index.tsx`): `BountyMapView` props
  `{ pins: MapPin[], selectedId?: string, origin: { latitude, longitude, kind: 'me' | 'place', title } | null,
camera: { originKey, latitude, longitude, radiusM }, onPinPress, onMapPress, onRegionChange }`.
- `BoardMap` (`src/features/bounty/map/BoardMap.tsx`) props:
  `{ rows, origin, state, onOpen(id), onApply(id), onPickPlace(), onShowMore() }`. `BountyBoard` renders it in map
  view. The pin card (76A) is RN, drawn over the kit view at the reported pin point: the front shows the category art,
  title, meta line, reward and 申请 (the built apply route via `onApply`); tapping the card flips it (83A) to the back,
  which shows the note when the board row has one and 「看详情」, which calls `onOpen` and pushes `/bounty/[id]` (3A).

## Tasks

Parallel groups: **Tasks 1, 2, 3 and 4 can run in parallel.** Their files are disjoint: SQL; locale files; the
kit map view (`modules/tapiro-kit`, its facade entry and a Debug scene); and the board types, parse, fixtures, view store
and `map/pins.ts`. Each consumes only the contracts above, never another task's code. **Then Tasks 5 and 6 run in
parallel.** Task 6 owns `src/features/bounty/map/*` and Task 5 owns `BountyBoard.tsx`, the title row and the scenes;
Task 5 imports `BoardMap` by the contract and lands after 6. **Then Task 7, then Task 8.**

### Task 1: SQL — the snapped point on the board (gap 1)

- [ ] Migration `supabase/migrations/20261030000100_board_point.sql`: `nearby_bounties` items add `point` from
      `place_public`. Signature and grants unchanged.
- [ ] pgTAP in `supabase/tests/nearby_bounties.test.sql`: the point is the snapped point, never the exact place;
      null without a place; a blocked poster's bounty is still absent.
- [ ] `supabase test db` passes.

### Task 2: Copy in three languages

- [ ] zh-Hans first, then en and ms:
  - `bounty.board.view.list` / `map` / `a11y`;
  - `bounty.board.remembered` 「记住了」;
  - `bounty.board.map.more` (Q79A chip, with counts);
  - `bounty.board.map.pin` (VoiceOver, 「{{title}}，{{reward}}」); the label on a pin reuses the built category names;
  - `bounty.board.map.details` 「看详情」 (the card's back face);
  - `bounty.board.map.here` 「这里」 (reuses the 29A label if one exists).
- [ ] `src/lib/i18n/resources.test.ts` passes.

### Task 3: The kit map view (rulings 1–6)

- [ ] `modules/tapiro-kit/ios/BountyMapView.swift` (+ pin view file): the `MKMapView` with the muted style, the camera
      rule, the origin marker, pins as custom annotation views with the label, the zoom levels and fan offsets, native
      tap handling and the three events. Register it through the module facade; run `pod install` in `ios/` after
      adding the files (AGENTS.md).
- [ ] Each pin view is an accessibility element: label from `a11yLabel`, trait button, identifier `map-pin-<rowId>`.
- [ ] A Debug scene `map-kit` with ten fixture pins around Sunway Pyramid (two sharing a point), to check by hand and to
      host the motion case later.

### Task 4: Data and pin logic (gaps 1, 4, 5)

- [ ] `BoardRow.point` in `types.ts` and `parse.ts`; fixture rows carry their snapped points; parse tests for a bad
      point.
- [ ] `viewStore.ts` with tests (default, set, hint once, cleared on sign-out).
- [ ] `map/pins.ts` with tests: rows without a point dropped, same-point fan indexes, labels and a11y labels, art from
      the category, stable ids across pages.
- [ ] Fixture: `-uiVerifyBoard crowded` (six bounties in one 0.001° cell and four within 30 m) and
      `-uiVerifyBoardView list|map` seeding the stored view at launch (omitted: kept, for the relaunch check).

### Task 5: V2 switch, view memory and 「记住了」 (decided V2, G13; Q80, Q81; rulings 7, 8)

- [ ] Title row: 「能接的悬赏」 with the two stickers on the right (`CategorySticker`-style die-cut art for 列表 and
      地图, from tokens). The static tilted and scaled selected state goes in now; motion comes in Task 7.
- [ ] `BountyBoard` switches the body between the list and `BoardMap`. In map view it hides the axis and keeps the chips
      and the place row (per Q80). Without an origin it renders the location card or the place row in the map's place
      (per Q81).
- [ ] Choosing the map scrolls home so the title sits under the strip (per Q75A).
- [ ] Cases: `bounty_board_view_switch` (switch both ways; filter and origin kept; the list keeps its scroll) and
      `bounty_board_view_memory` (relaunch restores the map; 「记住了」 the first time only; `en`). Update the
      `bounty_board_*` cases whose title row changes. Write them; do not run them.

### Task 6: The map and its pin card (Q75–Q79, 76A, 77B, 78A; rulings 2–6, 9–11)

- [ ] `BoardMap`: the kit `BountyMapView` with pins from `mapPins`, the selected pin, the origin and camera; the RN pin
      card at the reported point (placed above the pin, kept inside the map's bounds, the tail at the pin), closed on
      `onMapPress` and `onRegionChange`; the Q79 chip calling `onShowMore`; the ruling 9 states.
- [ ] Measure on the Simulator with `-uiVerifyBoard long` (45 bounties): pan and zoom for 10 s, note any hitch. Indicative
      only; record it in the report.
- [ ] Cases:
  - `bounty_board_map`: pins found by AX label, tap a pin, the card, 申请 opens the apply sheet, flip and 「看详情」
    pushes 3A, tap empty map closes the card. Assert the card with pixels, not the tiles.
  - `bounty_board_map_crowded`: six pins in one cell are each tappable; zoomed out the labels hide.
  - `bounty_board_map_states`: no origin, chosen place with 「这里」, first-load failure, empty filter, stale.
  - `bounty_board_map_worst`: `worst` titles in the card and VoiceOver labels; `LOCALES` with `ms`.

  Write them; do not run them.

### Task 7: Motion (Q82, Q83)

- [ ] With `animate-expo`: the switch sticker spring and the list/map cross-fade (Q82); the pin card springs out of the
      pin (scale from 0.18 at the tail, about 380 ms, slight overshoot) and out in 160 ms, and flips with a 500 ms
      `rotateY` on two faces (83A), each on Reanimated transforms and opacity only. Reduce Motion as stated under the questions.
- [ ] Case `bounty_board_view_motion` with video: one switch each way and one peek card in and out. Write it; do not
      run it.

### Task 8: Run the selection, worst case, story map, PR gate

- [ ] Run the selection, each case once, and write it with its reasons in the report. The motion case gets one run
      with video. Run `xcrun simctl location <udid> set 3.0733,101.6078` before the map cases so MapKit's own dot
      matches the fixture origin.

  | Case                                                           | Mode                | Why                                         |
  | -------------------------------------------------------------- | ------------------- | ------------------------------------------- |
  | `bounty_board_view_switch`, `bounty_board_view_memory`         | zh-Hans light       | New title row and view memory               |
  | `bounty_board_map`, `_crowded`, `_states`                      | zh-Hans light       | New screen                                  |
  | `bounty_board_map`                                             | dark                | Stickers and the peek card drawn over tiles |
  | `bounty_board_map_worst`                                       | zh-Hans light, `ms` | Long labels under pins                      |
  | `bounty_board_view_motion`                                     | video               | Motion                                      |
  | `bounty_board_list`, `_axis`, `_location`, `_states`, `_worst` | zh-Hans light       | Title row changed above them                |
  | `bounty_board_view_memory`, `bounty_board_map`                 | `en`                | New copy keys                               |

- [ ] `break-ui` on the map and the switch: 60-code-point titles under pins; RM 500 and ¥800 labels; 45 bounties; ten in
      one cell; no place; `ms`; dark. Fix what breaks.
- [ ] Device checklist (`device`): tap-to-card latency, pan and zoom with 45 pins in Instruments, the user dot with
      Precise Location off.
- [ ] Update `docs/story-map.md`: `bounty.board.map` names its cases. Add `bounty.board.map.pin` (peek card and 申请),
      `bounty.board.map.crowded`, `bounty.board.map.no-origin`, `bounty.board.view-memory`, and the device lines.
      `node scripts/check-story-map.mjs` passes.
- [ ] Run the fast checks (`bun test`, `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`,
      `check-specs`, `check-story-map`, `supabase test db`) and `verify:smoke`.
- [ ] Retro, then `spec-lifecycle` (Deviations only: the kit map instead of `expo-maps`), then the PR. The PR states the
      snapped-point disclosure (gap 1, approved by the owner 2026-10-30) and links the spike branch.

## Motion

| Motion                                   | Purpose                      | Gate                                               | Build                                                                             |
| ---------------------------------------- | ---------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Selected switch sticker tilts and scales | feedback (which is chosen)   | Decided by V2; at most a few times a day           | Q82: Reanimated spring on rotate + scale; Reduce Motion: static tilt and scale    |
| List ↔ map                               | preventing a jarring change  | A whole region swaps; only under Q82A              | 200 ms opacity cross-fade; Reduce Motion: instant                                 |
| Pin card in / out                        | spatial (where it came from) | Chosen by the owner on the interactive board (83A) | Spring from the pin, about 380 ms, out 160 ms; Reduce Motion: 150 ms fade         |
| Pin card flip                            | spatial (front and back)     | Only on a tap on the card (83A)                    | `rotateY` 500 ms on two faces; Reduce Motion: cross-fade 150 ms                   |
| Pins at zoom-level change                | spatial (near or far)        | System-driven by the zoom (78A)                    | Native, 200 ms scale and label fade; Reduce Motion: instant                       |
| Camera moves (recentre, zoom to group)   | spatial                      | System                                             | MapKit's own animation through `setCameraPosition`; no custom motion              |
| Pins appearing on load                   | —                            | Data arriving; animating would delay reading       | No motion                                                                         |
| 「记住了」 hint                          | —                            | Once ever                                          | No motion: it appears with the board and is removed after 4 s or the first scroll |

## Not in this plan

- Route, directions or Look Around (Known limits).
- An area query, 「搜索这一片」 or a camera memory, unless Q79 chooses B or C.
- Clustering or counts on pins (78A).
- Photo stickers on pins (step 9; the kit pin takes an image URL then).
- Rides on the map (carpool spec).
- Live pin updates (push and Realtime, step 11).

## Deviations and rulings

- 2026-10-30, Task 3: the zoom threshold is half the short edge over 3 km (so the 2 km initial camera shows labels and
  about 1.5× out shows dots); ruling 2's 3 km on the short edge would open on dots. Accepted.
- 2026-10-30, Task 3: rotation is off as well as compass and pitch: without a compass a rotated map cannot be turned
  back to north. Accepted.
- 2026-10-30, Task 3: the sticker border, label ground (white) and shadow (black) are drawn in Swift, as `StickerFlight`
  and `TitleHalo` already do; JS passes the category colour and ink. Accepted on that precedent.
- 2026-10-30, Task 3 → Task 6: a 10 pt fan left the lower of two same-point stickers almost hidden, so the fan radius
  becomes 26 pt (each sticker shows enough to be tapped). The origin marker sits under the stickers. `onRegionChange`
  fires when a user gesture starts and carries no payload.
- 2026-10-30, Task 5: `-uiVerifyBoardView` omitted now seeds `list`, and `keep` keeps the stored view, because Simulator
  settings persist between cases and a map saved by one case would open every later home case on the map.
  `-uiVerifyHintMs` holds 「记住了」 longer for the memory case. In map view the list's scroll paging is off; only the
  Q79 chip loads pages. Accepted.
- 2026-10-30, Task 6: the card's back face shows time, place and poster, not a note: `nearby_bounties` returns no
  description. `BoardMap` takes `height` and `radiusM` beyond the contract; `BoardMapBody` holds the ruling 9 states
  and `BountyBoard` renders it in map view. MapKit lists each pin twice in the AX tree, so cases tap pins by position
  (`verification/ui/map.py`). Accepted.
- 2026-10-30, 85A (owner 2026-10-30): the embedded map gets a full-screen map. Rulings: (a) the cover is the root
  Stack route `bounty-map` with `presentation: 'fullScreenModal'` (system transition, no custom motion), closed by a
  system `xmark` toolbar button; (b) both maps read one board: the home screen publishes its live `useBountyBoard` model
  through `map/boardLink.ts` and the cover renders it, so filters, pages and applied changes are the same state, not a
  copy; (c) 看详情 on the cover dismisses the cover and then pushes the detail in the 悬赏 tab stack, because the detail
  lives in the tab's stack and a push inside a modal would lose the tab bar and the back path to the board; 申请 opens
  the apply sheet over the cover; (d) the cover opens on the embedded map's current camera: the kit reports
  `onCameraChange { latitude, longitude, radiusM }` (half the short edge) after each region change, and the cover uses
  it while the origin is unchanged, else the origin camera; (e) the expand button and the location button are drawn in
  the kit (`UIButton.Configuration.glass()` with `arrow.up.left.and.arrow.down.right`; `MKUserTrackingButton` bound to
  the `MKMapView` in a glass capsule), the latter only for origin `me`; a tracking-mode change closes the card like a
  pan; (f) the cover keeps the 32A states as floating cards under the chips, and the card is placed inside the area
  between the chips and the bottom safe area; pull-to-refresh stays on the home page only.
- 2026-10-30, 84A (owner 2026-10-30) overturns ruling 10: an applied pin (`row.appliedByMe`) matches the list card.
  The kit's `BountyPinView` tilts the disc 8° (`--sticker-rotation-max`, the list's direction) and draws the list's
  「已申请」 stamp (`bounty.stamp`, border and text `--color-success`, fill `--color-receipt`, -12°, 2 pt border) under
  it; JS passes `applied` and `stamp { text, ink, fill }` on each `BountyMapPin`. The label tab keeps its own tilt and
  stays readable; fan offsets and the disc-and-label hit test are unchanged (the stamp takes no touches); zoomed-out
  dots keep the tilt but show no stamp. VoiceOver appends `bounty.board.card.applied` after the reward with the list
  card's separator. Motion copies the list's once-only landing: `useStampHold` holds the stamp while the apply sheet's
  `justApplied` entry (surface `card`) is waiting, then the pin springs to 8° and the stamp scales in from 1.4 after
  80 ms (stiffness 220, damping 14) with a success haptic; Reduce Motion fades the stamp in 150 ms. The map takes the
  entry, so the list does not replay it later.
