# Bounty step 8: the map view, the V2 list / map switch and the remembered view

> **For agentic workers:** execute task by task (superpowers `subagent-driven-development` if available). Track steps
> with checkboxes. Only one Simulator-using agent runs at a time. Tasks write their UI cases but do not run them; the
> last task runs the selection once (Pace, 2026-10-29). When all tasks are done, run `spec-lifecycle` before the PR (only
> "Deviations and rulings" is updated; the bounty spec is implemented after step 12).

**Status:** waiting for the user. UI questions 75–83 were drawn on 2026-10-29 while the user was asleep; canvas page 05,
board 「【待定】悬赏 · 地图 · 第 75–83 题」. Implementation does not start until they are answered.

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

**Verdict: go, with caveats.** `AppleMaps.View` with image annotations is enough. No RN view has to be rendered to an
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
- **Real Apple map (M2)** through `expo-maps` `AppleMaps`, stickers as image annotations, the user's position shown. No
  route or turn-by-turn (Known limits). The spike confirmed it (verdict above).
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

## UI questions (drawn 2026-10-29; waiting for the user)

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

Every option of Q82 and Q83 keeps the same Reduce Motion path: the selected sticker is drawn tilted and scaled with no
motion, the views swap at once, and the peek card fades over 150 ms with no movement.

## Rulings made in this plan (overturn by saying so)

1. **Map stickers are bundled square PNGs.** `scripts/render-map-stickers.swift` draws, for each of the eight
   categories, a normal sticker (art inside a white die-cut border, tilt ±6–8°, soft shadow) and a selected one (the same
   art with a 3 pt ring in `--color-on-sticker`). It also draws a stack sticker for groups, which carries the count as
   annotation `text`. Each sticker is 150 × 150 px, @3x of the fixed 50 pt frame. Colours come from `tokens.ts` through a
   JSON export, so no raw colour enters product code. The PNGs are committed under
   `assets/map-stickers/`, and the script is rerun when a sticker token changes; a unit test fails when a category has
   no image. 代取 uses the parcel art drawn in the same script. Photo stickers (step 9) slot in as `useImage(url)`
   later.
2. **One annotation per coordinate, always.** Rows that share a snapped point are merged before grouping (spike caveat
   6), whatever Q78 says about larger groups. Annotation ids are `pin:<bountyId>` for one bounty and
   `group:<lat>,<lng>` for a merge.
3. **Tap handling.** On `onAnnotationClick` the client opens the pin (per Q76) and calls `selectAnnotation(undefined)`
   so the next tap fires again. `onMapClick` is acted on (closing the peek card) only if no annotation click arrives
   within 700 ms. The client never calls `selectAnnotation(id)`, because it echoes a click; it marks the selected pin
   by giving it the selected image and moves the camera with `setCameraPosition`.
4. **Camera.** The initial camera centres on the origin at the zoom that shows 2 km to the nearest edge, the axis range
   (`AXIS_RANGE_M`). The camera is not remembered; only the view is. A new origin (place chosen, or `me` after
   permission) recentres the map. The `cameraPosition` prop is set once per origin (spike caveat 10).
5. **Origin marker.** Origin `me` uses `isMyLocationEnabled` (MapKit's own dot). Origin `place` is a system `Marker`
   (SF Symbol `mappin`, title 「这里」, the 29A label), drawn as a marker, not a sticker, so it never looks like a
   bounty.
6. **Map style.** `emphasis: MUTED` so the stickers lead (spike screenshot 06; the `AppleMaps` namespace does not export the
   emphasis enum, so pass `'MUTED'` typed as `AppleMaps.MapProperties['emphasis']`), `selectionEnabled: false` so MapKit's POI cards never open,
   compass and pitch toggle off, and the map's colour scheme follows the app. No decorative RN overlay on the map
   (AGENTS.md); the peek card is a real card, not an imitation of glass.
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
- `src/features/bounty/map/pins.ts` (pure, unit tested):
  `mapPins(rows, camera: { latitude, longitude, latitudeDelta, longitudeDelta }, viewport: { width, height }, minGapPt = 44)`
  returns `MapPin[]`, where `MapPin` is `{ id, point, kind: 'one' | 'group', rowIds, category, label }`. Rows without a
  point are dropped. Same-point rows are always one pin. Q78A merges by screen distance in Web Mercator at the camera
  span. `label` is the visible and VoiceOver title per Q77: 「{title} · {reward}」 for one bounty, 「{n} 个悬赏」 for a
  group.
- `src/features/bounty/map/stickerImages.ts`: `stickerImage(category, selected)` and `groupImage()` return the bundled
  `require(...)`; `useStickerImages()` loads each image once with `useImage` and shares it (the Rive rule's spirit:
  load once).
- `BoardMap` (`src/features/bounty/map/BoardMap.tsx`) props:
  `{ rows, origin, state, onOpen(id), onApply(id), onPickPlace(), onShowMore() }`. `BountyBoard` renders it in map
  view. Tapping the peek card's body calls `onOpen`, which pushes `/bounty/[id]` (3A). 申请 calls `onApply` (the built
  apply route).

## Tasks

Parallel groups: **Tasks 1, 2, 3 and 4 can run in parallel.** Their files are disjoint: SQL; locale files; the
sticker script and PNGs; and `package.json` / `app.json` plus the board types, parse, fixtures, view store and
`map/pins.ts`. Each consumes only the contracts above, never another task's code. **Then Tasks 5 and 6 run in
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
  - `bounty.board.map.pin` (「{{title}} · {{reward}}」), `bounty.board.map.group` (「{{count}} 个悬赏」);
  - `bounty.board.map.here` 「这里」 (reuses the 29A label if one exists).
- [ ] `src/lib/i18n/resources.test.ts` passes.

### Task 3: Map sticker images (ruling 1, gap 3)

- [ ] `scripts/render-map-stickers.swift` (CoreGraphics + SF Symbols, as in the spike) and a token export it reads.
      Write the eight normal, eight selected and one group PNGs to `assets/map-stickers/`, all square.
- [ ] `src/features/bounty/map/stickerImages.ts` with a unit test that every category has both images.

### Task 4: Install, data and pin logic (gaps 1, 4, 5)

- [ ] `bunx expo install expo-maps` (pin the version the install chooses), keep the plugin without options, then
      `prettier --write app.json`.
- [ ] `BoardRow.point` in `types.ts` and `parse.ts`; fixture rows carry their snapped points; parse tests for a bad
      point.
- [ ] `viewStore.ts` with tests (default, set, hint once, cleared on sign-out).
- [ ] `map/pins.ts` with tests: same-point merge, 44 pt grouping at two zooms, rows without a point dropped, labels
      for one and for a group, and stable ids across pages.
- [ ] Fixture: `-uiVerifyBoard crowded` (six bounties in one 0.001° cell and four within 30 m) for grouping, and
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

### Task 6: The map (Q75–Q79; rulings 2–6, 9–11)

- [ ] `BoardMap`:
  - `AppleMaps.View` with the stable camera prop (ruling 4) and the origin marker (ruling 5);
  - pins from `mapPins` on every `onCameraMove`;
  - tap handling per ruling 3;
  - the peek card per Q76 (the built `BoardCard` inside a card container, tokens only);
  - the Q79 chip calling `onShowMore` (the board's next page);
  - the ruling 9 states.
- [ ] Measure on the Simulator with `-uiVerifyBoard long` (45 bounties): pan and zoom for 10 s, note any hitch. Indicative
      only; record it in the report.
- [ ] Cases:
  - `bounty_board_map`: pins found by AX label, tap a pin, peek card, 申请 opens the apply sheet, card body pushes
    3A, tap empty map closes the card. Assert the card with pixels, not the tiles.
  - `bounty_board_map_crowded`: same-spot group, paging or zoom per Q78.
  - `bounty_board_map_states`: no origin, chosen place with 「这里」, first-load failure, empty filter, stale.
  - `bounty_board_map_worst`: `worst` titles under pins and in the peek card; `LOCALES` with `ms`.

  Write them; do not run them.

### Task 7: Motion (Q82, Q83)

- [ ] With `animate-expo`: the switch sticker spring and the list/map cross-fade (Q82), and the peek card in, out and
      swap (Q83), each on Reanimated transforms and opacity only. Reduce Motion as stated under the questions.
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
- [ ] Device checklist (`device`): tap-to-card latency (spike measured about 510 ms on the Simulator), pan and zoom with
      45 pins in Instruments, the user dot with Precise Location off.
- [ ] Update `docs/story-map.md`: `bounty.board.map` names its cases. Add `bounty.board.map.pin` (peek card and 申请),
      `bounty.board.map.crowded`, `bounty.board.map.no-origin`, `bounty.board.view-memory`, and the device lines.
      `node scripts/check-story-map.mjs` passes.
- [ ] Run the fast checks (`bun test`, `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`,
      `check-specs`, `check-story-map`, `supabase test db`) and `verify:smoke`.
- [ ] Retro, then `spec-lifecycle` (Deviations only), then the PR. The PR states the snapped-point disclosure
      (gap 1) and links the spike branch.

## Motion

| Motion                                   | Purpose                      | Gate                                                      | Build                                                                             |
| ---------------------------------------- | ---------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Selected switch sticker tilts and scales | feedback (which is chosen)   | Decided by V2; at most a few times a day                  | Q82: Reanimated spring on rotate + scale; Reduce Motion: static tilt and scale    |
| List ↔ map                               | preventing a jarring change  | A whole region swaps; only under Q82A                     | 200 ms opacity cross-fade; Reduce Motion: instant                                 |
| Peek card in / out / swap                | spatial (where it came from) | Frequent while browsing, so short and swap-in-place (Q83) | Q83: translateY 16 pt + opacity 220 ms in, 160 ms out; Reduce Motion: 150 ms fade |
| Camera moves (recentre, zoom to group)   | spatial                      | System                                                    | MapKit's own animation through `setCameraPosition`; no custom motion              |
| Pins appearing on load or regroup        | —                            | Data arriving; animating would delay reading              | No motion                                                                         |
| 「记住了」 hint                          | —                            | Once ever                                                 | No motion: it appears with the board and is removed after 4 s or the first scroll |

## Not in this plan

- Route, directions or Look Around (Known limits).
- An area query, 「搜索这一片」 or a camera memory, unless Q79 chooses B or C.
- Native clustering or the MapKit fallback in the kit (not needed after the spike).
- Photo stickers on pins (step 9; they will load as `useImage(url)`).
- Rides on the map (carpool spec).
- Live pin updates (push and Realtime, step 11).

## Deviations and rulings
