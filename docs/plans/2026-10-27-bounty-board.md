# Bounty step 4: the board, apply and withdraw, place picker Implementation Plan

> **For agentic workers:** execute task by task. If a plan-execution skill is
> available (for example superpowers `subagent-driven-development` or
> `executing-plans`), use it. Track steps with checkboxes (`- [ ]`). When all
> tasks are done, run `spec-lifecycle` before opening the PR.

**Goal:** Under the 悬赏 home stage, 「能接的悬赏」 lists open bounties as 26A cards with poster and tier, a 0–2 km
distance axis (27A), 全部 / 急 / 塞得进空档 chips (30A) and inline states (32A). Location is asked only from an inline
card (28A); without it the user can pick any place to measure from (29A). A card or its 申请 opens the 3A detail or the
4A apply sheet; applying needs a payee method, tilts the sticker and stamps 已申请 once; withdrawing happens in the
detail only (31A). The posting form gains the 33A place picker (MapKit search in the kit) with an editable label and
the exact address. Nobody but the poster and the chosen helper ever receives a bounty's coordinates.

**Architecture:** One migration hardens place privacy (column privilege, coordinates only for parties, distance rounded
to 100 m, a cursor without distance) and adds the poster and a total to `nearby_bounties`. `expo-location` gives the
viewer's point through a location service in `src/lib/location/`. MapKit place search lives in `modules/tapiro-kit`
(`MKLocalSearchCompleter` + `MKLocalSearch`, request-tagged events) behind one typed facade. The board, detail, apply
sheet and place search screen live in `src/features/bounty/`; the 悬赏 route passes the board into `HomeScreen` through
a slot prop, and `BountySection` plus the `minHeight: windowHeight * 2` filler are removed. Cards are one SwiftUI `Host`
each inside the home RN `ScrollView`.

**Tech stack:** Expo SDK 57 (React Native 0.86), TypeScript 6, Expo Router (native Stack push, `pageSheet`), `@expo/ui`
SwiftUI (`Host`, `Form`, `Section`, `HStack`, `VStack`, `Text`, `Button`, `TextField`, `ConfirmationDialog`),
Reanimated 4 (transforms and opacity only), `expo-haptics`, Swift (MapKit) in the kit, pgTAP, `bun test`,
`verification/ui`. New dependency: `expo-location` only (docs: https://docs.expo.dev/versions/v57.0.0/sdk/location/),
installed with `bunx expo install expo-location`.

**Spec:** `docs/specs/2026-10-11-bounty-design.md` (approved): Implementation order step 4; Decisions rows Distance
axis, Filters, Applying, Location, Address privacy, Distance query, Freshness, Blocked users; Prerequisites "Location"
note; Errors and degradation rows "Board first load fails", "Board refresh fails", "Applying fails", "Applicant has no
payee method", "Bounty taken, closed or blocked while viewing", "Location denied"; UI/UX rows 3A, 4A, 5A (see Q4),
18A, 26A–33A; Motion row "申请 tilts the sticker and stamps 已申请". Canvas: page 05, boards 「悬赏 · 开工前（四）附近的
悬赏与地点」 (`BountyPickBoard`, `BountyPickBoard2`, all A) and 「（一）发布与申请」 (`BountyPickPost`, 3A, 4A with its
other states, 5A). Built contracts: `supabase/migrations/20261026001100_bounty_apply.sql`,
`20261027000100_nearby_bounties.sql`, `20261027000300_bounty_read.sql`, `20261026001000_bounty_publish.sql`.

## Global constraints

- Zero comments in TypeScript, Swift, SQL and Python unless they explain unexpected behaviour or a hidden invariant
  (AGENTS.md Conventions). No JSDoc.
- iOS only; no Android code, stubs or scripts. Never disable code signing. `ios/` is never edited by hand; after
  `bunx expo install expo-location` and after adding Swift files under `modules/tapiro-kit/ios`, run `pod install` in
  `ios/` before the next verify build. After a prebuild, point `NODE_BINARY` in `ios/.xcode.env.local` at Homebrew Node.
- New dependency: `expo-location` only. No `expo-maps` (step 8). No map view anywhere in this step.
- Location is When In Use only. The `expo-location` plugin sets `locationAlwaysAndWhenInUsePermission: false`,
  `locationAlwaysPermission: false`, `motionUsagePermission: false`, `isIosBackgroundLocationEnabled: false`. The one
  `NSLocationWhenInUseUsageDescription` covers both uses (distance on the board, current location when posting) and
  is localized through `src/lib/i18n/native/{zh-Hans,en,ms}.json` (ruling 5).
- The system location prompt appears only after the user taps 「允许定位」 (28A) or 「用当前位置」 (33A). Nothing
  requests permission on launch, on tab focus or on opening the form.
- `src/features/bounty/` imports no other feature (`home`, `payee`, `payment`, `account`). The route
  `src/app/(tabs)/bounty/index.tsx` composes the board into `HomeScreen` (ruling 4). Shared code goes to `src/lib/` or
  `src/ui/`.
- Native first: the place search uses the native header search bar and a native list; confirmations are system action
  sheets; the board card is SwiftUI. Never imitate a platform control in RN; no swipe-to-withdraw (31C was rejected).
- No user-facing string is hard-coded; every key exists in `zh-Hans`, `en` and `ms` (`src/lib/i18n/resources.test.ts`).
  zh-Hans first; `ms` checked for truncation.
- Tokens only: no raw colours, font sizes or font families (`node scripts/design-check.mjs`). Sticker on the board card
  48 pt (ruling 8); `--color-urgent` marks 急 together with `clock.badge.exclamationmark` (colour + shape).
- Every interactive element has a VoiceOver label and a 44 pt target; controls a case touches have a `testID` from the
  "testID pattern" table.
- Data integrity: a first-load failure is never shown as empty and shows no count; a failed refresh keeps the list under
  a warning notice with the time of the data; applying and withdrawing show progress until the RPC answers, never replay
  automatically, and keep the typed note on failure (the note is kept in memory for the open sheet and restored if the
  sheet is reopened for the same bounty in the session).
- Privacy: the client never sends, logs or stores another user's coordinates; the board stores only the viewer's own
  chosen place on the device.
- Text lengths count Unicode code points after `btrim`, as the server does (note ≤ 140, place label ≤ 80, address ≤ 120).
- Motion: transforms and opacity only; every motion finite, runs once per event, respects Reduce Motion; no
  `withRepeat`; curve and duration per the answers to M1 and M2.
- Files under 500 lines; components under 300 lines.
- End of every task, judged by exit status (capture `$?` before any pipe): `bun test`, `bunx tsc --noEmit`,
  `bun run lint -- <changed .ts/.tsx files>`, `bun run format:check`, `node scripts/design-check.mjs` (tasks touching
  `src/`), `node scripts/check-story-map.mjs`, `node scripts/check-specs.mjs --dir docs/specs`, `supabase test db`
  (Task 1, and any task touching SQL). Each new UI case is run once by its author: `bun run verify:build` then
  `bun run verify:ui <case>` (zh-Hans light), screenshots opened before reporting. `bun run verify:smoke` runs once at the
  end of each PR.
- Commits: Conventional Commits with scope `bounty` (`feat(bounty): …`, `test(bounty): …`); `feat(kit): …` for Swift;
  no AI co-author lines.

## Rulings already made (do not re-ask)

1. Privacy: only the poster and the chosen helper receive place coordinates from `bounty_detail`; everyone else gets the
   label only, and `nearby_bounties.distanceM` is rounded to 100 m for everyone except the poster (the poster never sees
   their own bounties on the board, so every board row is rounded). One migration in this step with pgTAP proving a
   non-party never sees coordinates or an unrounded distance.
2. The same migration adds the poster (`{ id, name, tier }` via `private.bounty_person`) to each `nearby_bounties` row.
3. 急 = deadline under 3 h (spec, `urgent` from the RPC); design-language already says so.
4. The board lives in `src/features/bounty/`; the route passes it into `HomeScreen` through a slot prop; `BountySection`
   and the `minHeight: windowHeight * 2` filler go away. No cross-feature import.
5. One `NSLocationWhenInUseUsageDescription` for both uses in zh-Hans, en, ms; Always and motion strings `false`.
6. Bounties without a place stay last (RPC order unchanged) under a small header 「没写地点的」.
7. Home-embedded empty and error states follow the everyday class (design-language "Screen classes", already updated).
8. Sticker size on the board card: 48 pt.

## Decided UI (do not re-ask)

| Item | Decision | Source |
| --- | --- | --- |
| Board card | Three rows: sticker 48 pt, category, title, reward / time (急 in urgent colour with the clock symbol), place label · distance / poster name · tier, 申请 bottom right; one SwiftUI `Host` per card in the home RN `ScrollView`; no SwiftUI `List` | 26A |
| Card taps | 申请 opens the 4A apply sheet; the rest of the card pushes the 3A detail | Board 26 "已定" |
| Applied card | 申请 is replaced by 「已申请 · 等对方选」; the sticker sits tilted 8° with the 已申请 stamp | 31A |
| Distance axis | 0–2 km, origin 「你」 (or 「这里」 for a chosen place), ticks 1 km / 2 km, one sticker per located bounty within 2 km; 「+N 更远」 bubble at the end scrolls to the first card beyond 2 km; tapping a sticker scrolls to its card and outlines it | 27A; "Distance axis" |
| List order | RPC order: located by distance, then unlocated by recency under 「没写地点的」; end card 「就这些了 · 下拉刷新」 | 27A; ruling 6 |
| Location card | Top of the board while permission is undetermined: 「看看离你多远」, body 「开定位后按距离排，只在用 Tapiro 时定位。现在先按最新排。」, buttons 允许定位 (prompt) and 先不用 | 28A |
| No location | 先不用, denied, or a failed fix: a row 「选一个地方」 / 「没开定位，现在按最新排」 that pushes the search screen; list by recency, no axis | 28A, 29A; Errors "Location denied" |
| Chosen place | Row 「{place} 附近」 / 「距离从这里算」 with 换; axis origin 「这里」; stored on the device per user | 29A |
| Filters | 全部 / 急 / 塞得进空档 chips under the section title, scrolling with the list (not pinned); an empty filter shows 「现在没有急单」-style inline card with 看全部 | 30A |
| States | Inline cards with a ≤ 32 pt 小貘 head, one line, one button: first-load failure 「没加载出来」 + 重试 (no count on chips); empty 「附近暂时没有悬赏」 + 发悬赏; end 「就这些了 · 下拉刷新」; refresh failure keeps the list under a warning `NoticeCard` 「没刷新成功 · 下面是 HH:mm 的，可能有的已经被接走。」 + 重试 | 32A |
| Detail | Pushed in the 悬赏 stack; system screen: sticker, title, reward (SF Rounded) on top; a grouped section with place + 「约 0.8 km · 精确地址只给选中的人」, time + 「急 · 还有 2 小时」, poster + tier; description in its own section; 申请 pinned at the bottom; ⋯ top right (contents per Q4) | 3A |
| Apply sheet | Sheet titled 申请帮忙 with 发送 top right; multi-line note (optional, ≤ 140, counter `n/140`); footer 「{name}会看到你的名字、靠谱度和这句话。」 and 「选中之前随时可以撤回。」 | 4A; 14A |
| No payee method | The same sheet shows 「先加一个收款方式」, body 「帮完忙，{name}会直接付钱给你，所以申请前要有一种收款方式。现金也算。」 and 添加收款方式 (target per Q3); no note field | 4A other states |
| Applied detail | Bottom shows 「已申请 · 等{name}选」, 「你写的：…」 and a text button 撤回申请; confirmed by a system action sheet 「撤回申请？」 / 「撤回后{name}看不到你的申请，你还可以再申请。」 with 撤回申请 (destructive) / 不撤回 | 4A, 31A |
| Place search | Pushed screen with the native header search bar; results title + subtitle; 33A adds a first row 「用当前位置」 / 「定位后换成最近的楼名，可以再改」 that asks permission only when tapped; 29A has no current-location row | 29A, 33A |
| Posting place rows | 「＋ 地点」 pushes the search; after a pick: 地点 row (result name, tap to pick again), 「地点名称 · 别人会看到」 field prefilled with the result name (n/80), 「精确地址 · 只给选中的人看」 field (placeholder 「比如 A 座 12-03」, ≤ 120), red 移除地点 | 33A; 1A |
| Location prompt text | 「按离你多远排附近的悬赏，或把你现在的位置当悬赏地点。只在你用 Tapiro 时定位。」 | Board 28/33 |
| Screen classes | Board states, detail, apply and place search are everyday screens: grouped background, type stickers, head ≤ 32 pt | Screen classes; ruling 7 |
| Map | Not in this step; the right of 「能接的悬赏」 is left free for step 8's two stickers | Board 26 "已定" |

## Rulings made in this plan (overturn by saying so)

These close small gaps the canvas did not draw, each following an existing decision.

1. **Location precedence.** Permission granted with a fix → the viewer's position (「你」). Otherwise a chosen place
   (「这里」). Otherwise recency. A granted user does not see 「选一个地方」; the stored choice is kept and used again if
   permission is later revoked.
2. **「先不用」 is remembered** per user on the device (`tapiro.boardLocationCard.<userId>`), like the chosen place
   (`tapiro.boardPlace.<userId>`); both are registered in `src/lib/userCleanups.ts`. Denied permission never shows the
   location card again; the 「选一个地方」 row replaces it.
3. **Position fix:** `getLastKnownPositionAsync({ maxAge: 120000 })`, else `getCurrentPositionAsync({ accuracy:
   Balanced })` with a 10 s timeout. A failed fix behaves as no location (recency, 「选一个地方」 row) and is retried on
   the next load. Reduced accuracy (`ios.accuracy === 'reduced'`) still uses the point (spec Known limits).
4. **Rounded distances read as 「约」**: the card shows `300 m`, `1.6 km` (one decimal from 1 km); the detail shows
   「约 0.8 km」. The server returns at least 100 (a bounty at the viewer's point reads 100 m).
5. **The axis plots loaded rows only.** Stickers and 「+N 更远」 count the located rows of the pages loaded so far; the
   axis grows as pages load. With Q1 = B the bubble uses `total` minus the in-range rows on the first page only.
6. **The stamp plays once, on the surface under the sheet**: applying from a card plays it on that card; from the
   detail, on the detail (the card then shows the final state without motion). A `justApplied` id is consumed once.
7. **Detail and apply read one cache.** A board row seeds the detail header and the apply sheet's name; `bounty_detail`
   then fills the rest. The apply sheet works from either entry.
8. **Write answers update in place** (freshness rule): applying sets `appliedByMe` on the row and `myApplication` on the
   detail; withdrawing clears them; neither reloads the board.
9. **Detail no longer visible** (`bounty_not_found`): the detail shows an inline card 「这条悬赏已经不在了」 and the row
   is dropped from the board on the next load; 申请 on a closed or taken bounty shows its reason and disables the button.
10. **Distance in the detail** comes from `bounty_detail(bounty, latitude, longitude)` (rounded), so a detail opened
    from the map in step 8 works the same.
11. **The current-location place (33A)** labels the point with the nearest named place from the kit's reverse geocode;
    if that fails, the label field is empty and focused, and 下一步 asks for a label (existing `placeTooLong` / a new
    `placeLabelEmpty` error).
12. **Tier mark:** tier name plus 1–4 small 小貘 heads (`Mascot` front, ≤ 12 pt, count = tier rank), as drawn; the
    name carries the meaning for VoiceOver. A new `src/ui/TierMark.tsx`.
13. **Home without a long board.** With the filler gone, a short board (empty, failed, one card) does not scroll far
    enough to collapse the stage; that is correct behaviour. The board fixture defaults to `full` (12 rows) so shell and
    home cases that scroll keep working.

## Open UI questions (answer before the task named in each)

Each has a recommendation (★). Pace rule: no implementation task starts with an open UI question; Tasks 1–4 and 6 have no
open UI and may start now. These go on the design canvas as drawn options before asking (memory: show first).

1. **Count on the 全部 chip** (canvas draws 「全部 12」; the RPC has no total). Blocks Task 1 and Task 7.
   - A Drop the count. No extra query; the canvas count goes.
   - B ★ The migration returns `total` (rows matching the filter) on the first page; the selected chip shows it; a
     first-load failure shows none (32A). Matches the canvas; one `count(*)` per first page.
2. **Axis stickers that collide** (several bounties within a few hundred metres; 44 pt targets on a ~330 pt axis).
   Blocks Task 9.
   - A ★ Stickers closer than 44 pt merge into one sticker with a small count; tapping scrolls to the nearest card of
     the group and outlines it.
   - B Two lanes: alternate stickers above and below the line.
   - C Draw them overlapping; a tap picks the nearest.
3. **Where 「添加收款方式」 goes from the apply sheet.** Blocks Task 11.
   - A ★ Close the apply sheet and switch to 我的 → 收款方式 (the 悬赏 stack keeps the detail; the user comes back and
     taps 申请 again). No sheet on sheet, reuses the built list and its + menu.
   - B Push the payee list inside the apply sheet; its + menu then opens the add sheets over the apply sheet (sheet on
     sheet, which step 3 avoided).
   - C Open the + menu choices directly from the apply sheet.
4. **5A block and the poster row in this step.** 3A has ⋯ top right; 5A's ⋯ holds 「看{name}的主页」 and 「屏蔽{name}」;
   no profile screen and no 屏蔽名单 exist yet, while the block copy promises 「可以在 我的 → 屏蔽名单 里解除」. Blocks
   Task 12 (and the ⋯ in Task 10).
   - A ★ Build ⋯ with only 屏蔽 (action sheet, then the detail closes and the board reloads) plus a minimal 我的 →
     屏蔽名单 (names, swipe 解除 as the system delete action). Poster row not tappable until a profile screen exists.
   - B No ⋯ in step 4; block and the list arrive with step 5 (applicant long-press).
   - C ⋯ with 屏蔽 only, the list later (the copy would point to a screen that does not exist).
5. **Apply sheet height.** Blocks Task 11.
   - A ★ `pageSheet` (full height), like the pay and payee sheets; the note field and footers stay above the keyboard.
   - B `formSheet` at a medium detent that grows to large while typing.

## Motion

| Motion | Purpose | Gate | Build |
| --- | --- | --- | --- |
| 申请 tilts the sticker to 8° and stamps 已申请 | feedback | Passed (spec, canvas G, 4A); once per application, not frequent | M1 below; Reanimated on the RN sticker inside the card's `RNHostView` |
| Axis sticker tap → list scrolls to the card and outlines it | continuity | Passed (Decisions "Distance axis"); only on tap | System `scrollTo({ animated })` + an outline ring per M2 |
| Push detail, push place search, sheets | navigation | System | Native Stack / sheet |
| Pull to refresh, apply / withdraw progress | status | System | `RefreshControl`; `PillButton loading` |
| Chip selection, list replacement on filter change | — | Frequent: no animation | Instant swap |
| Haptic on apply success | feedback | Not motion; one meaning | `notificationAsync(Success)`, the same meaning as publish success |

**M1 — sticker tilt and stamp** (`--duration-settle` 240 ms is the nearest token; Reduce Motion: no rotation or scale,
the stamp fades in over `--duration-fade` 150 ms and the sticker is shown at 8° statically).

- A ★ Spring: sticker rotates 0 → 8° (damping 14, stiffness 220, ~240 ms, small overshoot); the stamp drops from scale
  1.4 / opacity 0 to 1 / 1 with the same spring, starting 80 ms later; success haptic when the stamp lands. "Things that
  land squash and settle" (design-language Motion).
- B Timing: both 240 ms ease-out (`Easing.out(Easing.cubic)`), no overshoot, stamp 80 ms later.
- C Stamp only (fade + scale 1.2 → 1, 150 ms); the sticker snaps to 8° without motion.

**M2 — outline after scroll-to-card** (Reduce Motion: `scrollTo` without animation, outline appears and disappears
without fading).

- A ★ After the scroll settles, a 2 pt `--color-accent` ring fades in 150 ms, holds 1.2 s, fades out 240 ms; once.
- B The ring pulses twice (in 150 / out 240, two cycles), then rests.
- C The ring appears and stays until the next scroll or tap.

No `withRepeat`, no infinite cycles. Motion is written with `animate-expo` after M1 and M2 are answered.

## Contracts

### Server (migration `supabase/migrations/20261027000500_bounty_board_privacy.sql`)

```sql
-- column privilege: authenticated can no longer select bounties.place
revoke select on public.bounties from authenticated;
grant select (id, poster_id, helper_id, title, description, category, reward_sen, place_label, starts_at, ends_at,
  deadline_at, published_at, expires_at, sticker_path, status, payment_timing, gate, eta_at, previous_eta_at, done_at,
  status_changed_at, created_at, updated_at) on public.bounties to authenticated;

-- nearby_bounties: same signature, now security definer (it reads place); same visibility filters as today
--   (open, not expired, not own, not blocked) plus an explicit auth check. Changes:
--   items[].distanceM = greatest(100, round(distance / 100) * 100)::integer, null without a point or place
--   items[].poster    = private.bounty_person(b.poster_id)  -- { id, name, tier }
--   next (distance page) = { kind: 'distance', id, latitude, longitude, filter }  -- no distance value
--   next (recency page)  = { kind: 'recent', id, createdAt, latitude, longitude, filter }
--     the server recomputes the cursor's distance from the bounty id (place never changes)
--   total (Q1 = B) = count of rows matching the filter, only when page_after is null; else absent
-- bounty_detail(bounty uuid, latitude double precision default null, longitude double precision default null)
--   replaces bounty_detail(uuid) (drop + create, grants re-issued):
--   place = { label, latitude, longitude } for poster and helper; { label } for applicant and viewer
--   distanceM = rounded as above when a point is given and the bounty has a place, else null
```

Response shapes the client consumes:

```ts
type Tier = 'new_friend' | 'reliable' | 'very_reliable' | 'tapir_friend';
type Person = { id: string; name: string | null; tier: Tier };

type BoardRow = {
  id: string; title: string; category: BountyCategory; rewardSen: number;
  placeLabel: string | null; stickerPath: string | null;
  startsAt: string | null; endsAt: string | null; deadlineAt: string | null;
  urgent: boolean; distanceM: number | null; appliedByMe: boolean; createdAt: string;
  poster: Person;
};
type BoardPage = { items: BoardRow[]; next: unknown | null; total?: number };

// supabase.rpc('nearby_bounties', { latitude, longitude, board_filter, page_after, page_size: 20 })
//   errors: 'invalid_board_query' | 'board_cursor_mismatch' (22023) → restart from page one once, then 'failed'

type BountyDetail = {
  id: string; title: string; description: string | null; category: BountyCategory; rewardSen: number;
  status: string; viewerRole: 'poster' | 'helper' | 'applicant' | 'viewer';
  place: { label: string; latitude?: number; longitude?: number } | null;
  distanceM: number | null; address: string | null;
  startsAt: string | null; endsAt: string | null; deadlineAt: string | null; expiresAt: string;
  poster: Person;
  myApplication: { status: 'pending' | 'withdrawn' | 'selected' | 'not_selected'; note: string | null } | null;
  // party-only fields (helper, events, …) are ignored in this step
};
// supabase.rpc('bounty_detail', { bounty, latitude, longitude }); 'bounty_not_found' (P0002) → gone

// supabase.rpc('apply_to_bounty', { bounty, note }) → { status: 'pending', note: string | null }
//   rejections (message slug): bounty_not_found, own_bounty, blocked, closed, taken, not_pending, no_payee_method
//   a repeated apply while pending returns the first answer (idempotent)
// supabase.rpc('withdraw_application', { bounty }) → { status: 'withdrawn' }; rejection not_pending
// supabase.from('payee_methods').select('id', { count: 'exact', head: true }) → count (RLS: own rows)
```

### Client (new)

```ts
// src/lib/location/types.ts
export type LocationPermission = 'undetermined' | 'granted' | 'denied';
export type Point = { latitude: number; longitude: number };
export type LocationService = {
  permission(): Promise<{ status: LocationPermission; reduced: boolean }>;
  request(): Promise<{ status: LocationPermission; reduced: boolean }>; // shows the system prompt if undetermined
  currentPoint(): Promise<Point | null>; // ruling 3; null on failure, never throws
};
// src/lib/location/index.ts → export const locationService: LocationService (fixture in verify mode)

// modules/tapiro-kit/index.tsx (facade additions)
export type PlaceSuggestion = { id: string; title: string; subtitle: string };
export type PlaceSuggestionsEvent =
  | { searchId: string; requestId: string; status: 'ok'; items: PlaceSuggestion[] }
  | { searchId: string; requestId: string; status: 'failed'; code: 'network' | 'unknown' };
export type ResolvedPlace = { name: string; latitude: number; longitude: number; address: string | null };
export type PlaceResult =
  | { status: 'ok'; place: ResolvedPlace }
  | { status: 'notFound' | 'failed'; code?: 'network' | 'unknown' };
export function startPlaceSearch(region: Point | null): string;          // returns searchId; biases to region or Malaysia
export function updatePlaceQuery(searchId: string, query: string): string; // returns requestId; results via event
export function addPlaceSuggestionsListener(cb: (e: PlaceSuggestionsEvent) => void): { remove(): void };
export function resolvePlace(searchId: string, suggestionId: string): Promise<PlaceResult>;
export function placeAt(point: Point): Promise<PlaceResult>;                 // reverse geocode, nearest named place
export function endPlaceSearch(searchId: string): void;

// src/features/bounty/place/usePlaceSearch.ts (wraps the facade; fixture in verify mode)
export function usePlaceSearch(region: Point | null): {
  query: string; setQuery(q: string): void;
  state: { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; items: PlaceSuggestion[] } | { kind: 'failed' };
  resolve(id: string): Promise<PlaceResult>;
}; // subscribes on mount, removes the listener and ends the search on unmount, drops events with a stale requestId

// src/features/bounty/place/placePick.ts — hands a pick back to the screen that pushed the search
export type PlacePurpose = 'post' | 'board';
export const placePick: {
  set(purpose: PlacePurpose, place: ResolvedPlace): void;
  take(purpose: PlacePurpose): ResolvedPlace | null; // consumed once on focus of the pushing screen
};

// src/features/bounty/board/types.ts
export type BoardFilter = 'all' | 'urgent' | 'fits_my_time';
export type BoardOrigin =
  | { kind: 'me'; point: Point }
  | { kind: 'place'; point: Point; label: string }
  | { kind: 'none'; reason: 'undetermined' | 'declined' | 'denied' | 'noFix' };
export type BoardState =
  | { kind: 'loading' }
  | { kind: 'failed' }                                            // first load: no rows, no count
  | { kind: 'ready'; rows: BoardRow[]; total: number | null; next: unknown | null;
      loadedAt: string; refreshFailed: boolean; page: 'idle' | 'loading' | 'failed' };
export type ApplyFailure = 'noPayee' | 'closed' | 'taken' | 'gone' | 'own' | 'failed';
export type BoardService = {
  page(origin: BoardOrigin, filter: BoardFilter, after: unknown | null): Promise<BoardPage>; // throws on failure
  detail(id: string, point: Point | null): Promise<BountyDetail | 'gone'>;
  hasPayeeMethod(): Promise<boolean>;
  apply(id: string, note: string | null): Promise<{ ok: true; note: string | null } | { ok: false; reason: ApplyFailure }>;
  withdraw(id: string): Promise<{ ok: true } | { ok: false; reason: 'notPending' | 'failed' }>;
};
// src/features/bounty/board/boardState.ts — pure reducer, tested without React
export function boardReducer(state: BoardState, event: BoardEvent): BoardState;
// events: loadStarted, loadSucceeded(page, at), loadFailed, pageStarted, pageSucceeded(page), pageFailed,
//         applied(id), withdrawn(id), originChanged, filterChanged
// src/features/bounty/board/axis.ts — pure
export function axisMarks(rows: BoardRow[], widthPt: number):
  { marks: { ids: string[]; x: number; category: BountyCategory }[]; beyond: number; firstBeyondId: string | null };
export function formatDistance(m: number, language: string): string; // 300 m, 1.6 km, 18 km

// src/features/bounty/board/originStore.ts — Settings keys per user (ruling 2), userCleanups registered
export const originStore: {
  chosenPlace(userId: string): { label: string; point: Point } | null;
  setChosenPlace(userId: string, place: { label: string; point: Point } | null): void;
  cardDismissed(userId: string): boolean;
  dismissCard(userId: string): void;
};

// public exports from src/features/bounty/index.ts
export { BountyBoard } from './board/BountyBoard';           // ({ userId, onOpen(id), onApply(id), onPost, onPickPlace })
export { BountyDetailScreen } from './detail/BountyDetailScreen'; // ({ id, onApply, onAddPayee, onGone })
export { ApplySheet } from './apply/ApplySheet';            // ({ id, onClose, onAddPayee })
export { PlaceSearchScreen } from './place/PlaceSearchScreen'; // ({ purpose, onPicked })
```

`HomeScreen` gains `board?: ReactNode`, rendered where `BountySection` was; the 悬赏 route passes `<BountyBoard … />`.
`ScrollView` needs scroll-to-card and refresh: `HomeScreen` also takes `refreshControl?: ReactElement` and exposes the
scroll ref it already receives (`scrollViewProps.ref`) so the board can `scrollTo` a card's y (the board reports card
offsets relative to its own origin plus its own `onLayout` y inside the scroll content).

Routes:

| Path | File | Presentation |
| --- | --- | --- |
| `/bounty/[id]` | `src/app/(tabs)/bounty/[id].tsx` | Push in the 悬赏 Stack, transparent header, `scrollEdgeEffects` |
| `/bounty/place` | `src/app/(tabs)/bounty/place.tsx` | Push in the 悬赏 Stack (29A) |
| `/bounty-post/place` | `src/app/bounty-post/place.tsx` | Push inside the post sheet Stack (33A) |
| `/bounty-apply/[id]` | `src/app/bounty-apply/[id].tsx` (+ `_layout.tsx` for the header and 发送) | Root sheet per Q5 |
| `/me/blocked` (Q4 = A) | `src/app/(tabs)/me/blocked.tsx` | Push in the 我的 Stack |

testID pattern:

| Element | testID |
| --- | --- |
| Board root / section title | `bounty-board`, `bounty-board-title` |
| Filter chips | `bounty-filter-all`, `bounty-filter-urgent`, `bounty-filter-fits` |
| Card / its parts | `bounty-card-<id>`, `-title`, `-reward`, `-meta`, `-poster`, `-apply`, `-applied`, `-stamp` |
| Axis | `bounty-axis`, `bounty-axis-mark-<firstId>`, `bounty-axis-more` |
| Location card / row | `bounty-location-card`, `bounty-location-allow`, `bounty-location-later`, `bounty-place-row`, `bounty-place-change` |
| States | `bounty-board-failed`, `bounty-board-empty`, `bounty-board-filter-empty`, `bounty-board-end`, `bounty-board-stale`, `bounty-board-page-failed`, `bounty-board-unlocated` (section header) |
| Retry / actions in states | `bounty-board-retry`, `bounty-board-post`, `bounty-board-show-all` |
| Detail | `bounty-detail`, `-sticker`, `-stamp`, `-place`, `-time`, `-poster`, `-description`, `-apply`, `-applied`, `-withdraw`, `-more`, `-gone` |
| Apply sheet | `bounty-apply-note`, `bounty-apply-send`, `bounty-apply-count`, `bounty-apply-no-payee`, `bounty-apply-add-payee`, `bounty-apply-failed` |
| Place search | `place-search-current`, `place-search-result-<n>`, `place-search-failed`, `place-search-empty` |
| Post place rows | `bounty-post-add-place`, `bounty-post-place`, `bounty-post-place-label`, `bounty-post-address`, `bounty-post-remove-place` |

Verify launch arguments (fixture services, `uiVerify` only):

| Argument | Values | Effect |
| --- | --- | --- |
| `-uiVerifyLocation` | `granted` (default, Sunway Pyramid 3.0733, 101.6078), `undetermined` (prompt answers granted), `undeterminedDeny` (prompt answers denied), `denied`, `reduced`, `noFix` | `locationService` |
| `-uiVerifyBoard` | `full` (default: 12 rows, 9 located incl. 2 beyond 2 km, 3 unlocated, 2 urgent, 1 applied), `one`, `empty`, `worst`, `long` (45 rows, three pages) | `page()` data; filters applied in the fixture with the RPC's rules |
| `-uiVerifyBoardFail` | `first` (first load fails once), `refresh` (second load fails), `page` (second page fails once) | `page()` failures |
| `-uiVerifyBoardPlace` | `none` (clears), `sunway` (Sunway Geo Residences) | seeds the stored chosen place |
| `-uiVerifyApply` | `ok` (default), `failOnce`, `taken`, `closed`, `gone` | `apply()`; with `-uiVerifyFixture empty` `hasPayeeMethod()` is false and `apply` rejects `noPayee` |
| `-uiVerifyPlaces` | `ok` (default: Sunway results), `none`, `fail`, `resolveFail` | the place-search facade wrapper |

The fixture `apply` returns the first answer for a repeated id while pending, like the RPC.

## File structure

| Action | Path | Responsibility |
| --- | --- | --- |
| Create | `supabase/migrations/20261027000500_bounty_board_privacy.sql` | Column privilege, `nearby_bounties` and `bounty_detail` changes above |
| Create | `supabase/tests/bounty_privacy.test.sql` | Non-party never sees coordinates or exact distance; parties do |
| Modify | `supabase/tests/bounty_nearby.test.sql`, `supabase/tests/bounty_read.test.sql` | New keys, rounded values, cursor shape, label-only place for viewers |
| Modify | `app.json`, `package.json`, `bun.lock`, `src/lib/i18n/native/{zh-Hans,en,ms}.json` | `expo-location` plugin and the usage string |
| Create | `src/lib/location/{types,index,expoLocationService,fixtureLocationService}.ts` (+ tests) | Permission, point, fixture |
| Create | `modules/tapiro-kit/ios/PlaceSearch.swift` | Completer sessions, resolve, reverse geocode, typed codes |
| Modify | `modules/tapiro-kit/ios/TapiroKitModule.swift`, `modules/tapiro-kit/index.tsx` | Functions, event `onPlaceSuggestions`, facade |
| Create | `src/features/bounty/place/{usePlaceSearch,fixturePlaces,placePick,PlaceSearchScreen}.ts(x)` (+ tests) | Shared search screen 29A / 33A |
| Create | `src/features/bounty/post/PlaceRows.tsx`; Modify `OptionalRows.tsx`, `PostForm.tsx`, `PostConfirm.tsx`, `validate.ts` | 33A rows in the form, place summary on confirm |
| Create | `src/app/bounty-post/place.tsx`; Modify `src/app/bounty-post/_layout.tsx` | Post place route |
| Create | `src/features/bounty/board/{types,boardService,fixtureBoardService,boardState,axis,originStore,useBoard,useOrigin}.ts` (+ tests) | Board data, state, origin, freshness |
| Create | `src/features/bounty/board/{BountyBoard,BoardCard,DistanceAxis,FilterChips,LocationCard,PlaceRow,BoardStates}.tsx` | Board UI (each < 300 lines) |
| Create | `src/features/bounty/shared/{bountyCache,appliedStamp,tierCopy}.ts(x)` | Row/detail cache, once-only stamp trigger, the stamp + tilt motion |
| Create | `src/features/bounty/detail/{BountyDetailScreen,useDetail}.ts(x)` | 3A |
| Create | `src/features/bounty/apply/{ApplySheet,useApply}.ts(x)` | 4A, no-payee state, withdraw dialog hook |
| Create | `src/ui/TierMark.tsx`, `src/ui/InlineState.tsx` | Tier name + heads; the 32A inline card (head ≤ 32, one line, one button) |
| Modify | `src/features/home/HomeScreen.tsx`, `src/features/home/index.ts`; Delete `src/features/home/BountySection.tsx` | `board` slot and `refreshControl`, filler removed |
| Modify | `src/app/(tabs)/bounty/index.tsx`, `src/app/(tabs)/bounty/_layout.tsx`; Create `[id].tsx`, `place.tsx` | Compose board, detail, place |
| Create | `src/app/bounty-apply/_layout.tsx`, `src/app/bounty-apply/[id].tsx`; Modify `src/app/_layout.tsx` | Apply sheet |
| Create (Q4 = A) | `src/features/bounty/block/*`, `src/app/(tabs)/me/blocked.tsx`; Modify `src/app/(tabs)/me/index.tsx` | Block action and list |
| Modify | `src/lib/i18n/locales/bounty/{zh-Hans,en,ms}.ts`, `src/lib/i18n/locales/{zh-Hans,en,ms}.ts` | `bounty.board.*`, `bounty.detail.*`, `bounty.apply.*`, `bounty.place.*`, `bounty.tier.*`, `bounty.block.*`; remove `home.section.*` |
| Modify | `src/debug/BountyScenes.tsx`, `src/debug/scenes.tsx` | Scenes `bounty-board`, `bounty-detail`, `bounty-apply`, `place-search` |
| Create | `verification/ui/board.py`; cases `bounty_board_*`, `bounty_detail_*`, `bounty_apply_*`, `bounty_post_place`, `bounty_place_search` | Helpers and cases per task |
| Modify | `verification/ui/README.md`, `docs/story-map.md`, `docs/design-language.md` (component inventory: `TierMark`, `InlineState`) | Docs |

## PR split

**Recommendation: two PRs.** 4a = Tasks 1–5 (privacy migration, location, kit search, place picker in posting);
4b = Tasks 6–14 (board, detail, apply, withdraw, block). Reason in one line: once 33A ships, posts carry real
coordinates, so the privacy migration and the place picker must land together and before anything shows places, while
the board is a separate, larger UI review that can then build on a working search screen.

## Task 1: Privacy migration and pgTAP (PR 4a; Q1 decides `total`)

**Files:** migration, `bounty_privacy.test.sql`, updates to `bounty_nearby.test.sql` and `bounty_read.test.sql`

**Interfaces**

- Consumes: `private.bounty_person`, `private.is_blocked_between`, `private.bounty_viewer_role`, `private.bounty_slot`
- Produces: the "Server" contract above (Tasks 6, 10, 11)

**Steps**

- [ ] Write failing pgTAP in `bounty_privacy.test.sql` (fixtures around Sunway, users poster P, helper H, applicant A,
      viewer V, blocked B): as V and A, `bounty_detail` → `place` has exactly the key `label`; as P and as H (assigned)
      it has `latitude` and `longitude`; as V `select place from public.bounties` raises `42501`; `select id, place_label`
      still works; `nearby_bounties` as V returns every `distanceM` divisible by 100 and ≥ 100, and for a bounty placed
      at 3.0740, 101.6078 (≈ 78 m) returns 100, not 78; the `next` cursor of a distance page has no `distance` key and
      none of its values equals any row's exact distance; a crafted cursor with a `distance` key is ignored or rejected
      (`invalid_board_query`); `bounty_detail(id, lat, lon)` returns a rounded `distanceM` and `null` without a point;
      each row carries `poster` with `id`, `name`, `tier` only; with Q1 = B `total` counts filter matches on the first
      page and is absent on later pages; B (blocked either way) still sees nothing.
- [ ] Update `bounty_nearby.test.sql`: the key list adds `poster`; the 0 m assertion becomes 100; the 700–1000 m and
      ≈ 5 km assertions use rounded values; paging tests keep their gap-free and tie assertions with the new cursor.
- [ ] Update `bounty_read.test.sql` line "a viewer reads the place label and point" → label only; add "the poster reads
      the point".
- [ ] Write the migration: column grants; `nearby_bounties` recreated `security definer` with an explicit
      `auth.uid()` check and the same filters; cursor `{ kind, id, … }` with the after-distance recomputed from the
      bounty's `place`; rounding; `poster`; `total`; `bounty_detail` dropped and recreated with the optional point.
      Re-issue `revoke`/`grant` for both functions.
- [ ] Grep `src/` and `supabase/functions/` for selects on `bounties` that would read `place` as `authenticated`
      (today only `select('id')` in `postService.ts`; the account-delete test uses service role) and confirm none break.
- [ ] Run a mutation pass like step 2's (`scratchpad` scripts are not committed): remove the rounding, re-add `place` to
      the column grant, leak `distance` into the cursor; each mutant must fail a test. Record the result in the PR body.
- [ ] `supabase test db` passes; commit `feat(bounty): keep place coordinates to the poster and the helper`.

## Task 2: Copy in three languages (PR 4a, keys for 4b too)

**Files:** `src/lib/i18n/locales/bounty/{zh-Hans,en,ms}.ts`, root locale files, `src/lib/i18n/native/*.json`

**Steps**

- [ ] Add `bounty.place.*` (选地点, 选一个地方, search placeholder 「搜楼名、商场、学校」, 用当前位置 + subtitle, 搜索结果,
      no results 「没找到这个地方」, search failed + 重试, resolve failed, label/address row titles and footers, 移除地点,
      `placeLabelEmpty` error), `bounty.board.*` (能接的悬赏 if moved from `home.section.title`, chip labels, 全部 with
      `{{count}}`, 你 / 这里, `1 km` / `2 km` tick labels, `+{{count}} 更远`, location card title/body/buttons, 选一个地方 row
      and subtitle, 「{{place}} 附近」, 距离从这里算, 换, 没写地点的, states (first failure, empty + 发悬赏, filter empty
      per filter + 看全部, end, stale with `{{time}}`, page failed), 申请, 已申请 · 等对方选, distance formats, card
      VoiceOver label with every part), `bounty.tier.{new_friend,reliable,very_reliable,tapir_friend}` (新朋友, 靠谱, 很靠谱,
      貘友), `bounty.detail.*` (place row and 「约 {{distance}} · 精确地址只给选中的人」, time rows and 「急 · 还有
      {{hours}} 小时」 / minutes variant, poster row, 说明, 申请, 已申请 · 等{{name}}选, 你写的：{{note}}, 撤回申请, withdraw
      dialog title/body/buttons, gone, closed, taken, ⋯ label), `bounty.apply.*` (申请帮忙, 发送, placeholder, footers with
      `{{name}}`, counter, no-payee title/body/button, failure 「没发出去，再试一次」, closed/taken/gone reasons),
      `bounty.block.*` (Q4), `bounty.stamp` (已申请). Plurals use `_one` / `_other`.
- [ ] `NSLocationWhenInUseUsageDescription` in the three native JSON files: zh-Hans 「按离你多远排附近的悬赏，或把你现在
      的位置当悬赏地点。只在你用 Tapiro 时定位。」, then en and ms with the same two uses.
- [ ] Remove `home.section.*` once Task 7 no longer uses it (Task 7 does the removal; this task only adds keys).
- [ ] zh-Hans first, then en, then ms; `bun test src/lib/i18n` passes; commit `feat(bounty): board, detail, apply and
      place copy in zh-Hans, en, ms`.

## Task 3: `expo-location` and the location service (PR 4a)

**Files:** `app.json`, `package.json`, `bun.lock`, `src/lib/location/*`

**Interfaces**

- Produces: `locationService` (Tasks 5, 9, 10)

**Steps**

- [ ] `bunx expo install expo-location`; add the plugin entry with the four values in Global constraints and no
      `locationWhenInUsePermission` literal (the localized string comes from `locales`); `pod install`; confirm
      `requestForegroundPermissionsAsync`, `getForegroundPermissionsAsync`, `getLastKnownPositionAsync`,
      `getCurrentPositionAsync`, `Accuracy.Balanced` and `ios.accuracy` in `node_modules/expo-location/build/*.d.ts`.
- [ ] Run `bunx expo prebuild --no-install` into a scratch check (or `bunx expo config --type introspect`) and assert
      the generated Info.plist has `NSLocationWhenInUseUsageDescription` and no `NSLocationAlways*` or
      `NSMotionUsageDescription` keys; record the command output in the PR.
- [ ] Failing tests for the fixture and for a pure `mapPermission(response)` (granted + reduced, denied, undetermined,
      `canAskAgain: false` → denied); `currentPoint` returns `null` on timeout and on a thrown error.
- [ ] Implement `expoLocationService` (ruling 3) and `fixtureLocationService` per `-uiVerifyLocation`.
- [ ] Checks; commit `feat(bounty): when-in-use location service`.

## Task 4: Place search in the kit (PR 4a)

**Files:** `modules/tapiro-kit/ios/PlaceSearch.swift`, `TapiroKitModule.swift`, `modules/tapiro-kit/index.tsx`,
`src/features/bounty/place/{usePlaceSearch,fixturePlaces}.ts` (+ tests)

**Interfaces**

- Produces: the facade functions and `usePlaceSearch` (Tasks 5, 9)

**Steps**

- [ ] Read Apple's MapKit docs for `MKLocalSearchCompleter` (`resultTypes`, `region`, delegate), `MKLocalSearch.Request(
      completion:)` and the iOS 26 reverse geocoding API (`MKReverseGeocodingRequest`, or `CLGeocoder` if the former is
      unavailable on the deployment target); record the chosen API and doc links in the PR.
- [ ] `PlaceSearch.swift`: `@MainActor` class keeping completer sessions by `searchId`; `resultTypes = [.pointOfInterest,
      .address]`; region = given point ± ~5 km, else a Malaysia region; `updateQuery` stores the latest `requestId`
      and the delegate sends `onPlaceSuggestions` tagged with `searchId` and that `requestId`; suggestion ids are indexes
      into the last result set; `resolve` runs `MKLocalSearch` for that completion and returns name, coordinate and a
      one-line address, mapping every error to `failed` with `network`/`unknown`, and an empty response to `notFound`;
      `placeAt` reverse-geocodes to the nearest named place; `end` cancels and drops the session. Nothing throws to JS.
- [ ] Module: `Events("onPlaceSuggestions")`, `Function("startPlaceSearch")`, `Function("updatePlaceQuery")`,
      `Function("endPlaceSearch")`, `AsyncFunction("resolvePlace")`, `AsyncFunction("placeAt")`, all dispatched on the
      main queue. `pod install`.
- [ ] Facade in `index.tsx` with the typed signatures in Contracts; `addPlaceSuggestionsListener` returns the
      subscription so callers remove it.
- [ ] `usePlaceSearch` with a 250 ms debounce on the query, stale `requestId` events dropped, listener removed and
      search ended on unmount; in verify mode it uses `fixturePlaces` per `-uiVerifyPlaces`. Unit tests for the stale
      event rule and the cleanup with a fake facade.
- [ ] Run the app once on the Simulator from the `place-search` scene (Task 5 adds it; until then a temporary debug
      button is not committed): typing 「sunway」 lists real results. MapKit needs network; this is the only online
      check, the cases use the fixture.
- [ ] Checks; commit `feat(kit): MapKit place search with request-tagged events`.

## Task 5: Place search screen and the posting place rows (PR 4a)

**Files:** `PlaceSearchScreen.tsx`, `placePick.ts` (+ test), `PlaceRows.tsx`, `OptionalRows.tsx`, `PostForm.tsx`,
`PostConfirm.tsx`, `validate.ts` (+ test), `src/app/bounty-post/place.tsx`, `_layout.tsx`, scene `place-search`, cases
`bounty_place_search`, `bounty_post_place`

**Interfaces**

- Consumes: `usePlaceSearch`, `locationService`, `placeAt`, `draftStore`
- Produces: `PlaceSearchScreen({ purpose, onPicked })` (reused by Task 9)

**Steps**

- [ ] `PlaceSearchScreen`: native header search bar (`headerSearchBarOptions`, auto-focused, placeholder copy); a
      native list of results (title + subtitle); `purpose: 'post'` adds the 用当前位置 row first. Tapping it: request
      permission if undetermined (system prompt), then `currentPoint` → `placeAt` → pick with the nearest name; denied →
      an inline urgent notice 「没开定位，可以搜一个地方」 and the row stays. A result tap resolves the place (row shows
      progress) → `placePick.set` → `router.back()`. States: empty query (only the current-location row or nothing),
      no results, search failed + 重试, resolve failed (inline notice, stay).
- [ ] `PlaceRows` in the 1A form: 「＋ 地点」 row (`bounty-post-add-place`) pushes `/bounty-post/place`; on focus the form
      `take`s the pick and writes `place: { label: name, latitude, longitude, address: null }` to the draft; the rows in
      "Decided UI → Posting place rows"; editing the label or address writes through `draftStore.update`; 移除地点
      clears `place` (and the address with it).
- [ ] `validate.ts`: `placeLabelEmpty` when a place exists and the trimmed label is empty; existing `placeTooLong`,
      `addressTooLong`; `checkDraft` emits `place_label`, `latitude`, `longitude`, `address` (address only with a place).
      Failing tests first.
- [ ] Confirm (2A): preview card shows the place label (24A); summary gains the place row and 「精确地址只给选中的人看」
      when an address exists.
- [ ] Case `bounty_place_search` (scene `place-search`, `-uiVerifyPlaces ok`, then `none`, `fail`): typing lists the
      three fixture results; `none` shows the empty copy; `fail` shows 重试 and recovers; every row ≥ 44 pt.
- [ ] Case `bounty_post_place` (`-uiVerifySignedIn onboarded -uiVerifyBountyDraft demo -uiVerifyLocation undetermined`,
      `LOCALES ['zh-Hans', 'ms']`): 「＋ 地点」 → search → pick Sunway Geo Residences → the label field reads the name
      and `13/80`-style counter after editing to 「Sunway Geo 宿舍」; the address row appears only after the pick;
      移除地点 collapses back to 「＋ 地点」; pick again, then 用当前位置 shows the system prompt (allowed by the fixture)
      and fills the reverse-geocoded name; confirm shows the label and the address note; publish succeeds and the
      fixture records `latitude`/`longitude` (asserted via the debug marker the fixture exposes). Screenshots of each
      state.
- [ ] Update `bounty_post_optional` only if row order changed.
- [ ] Add the 4a story-map rows (`bounty.board.privacy`, `bounty.post.place`, see Task 14) and README rows for
      `-uiVerifyLocation` and `-uiVerifyPlaces` in this commit.
- [ ] Checks; run both cases once; `bun run verify:smoke`; commit `feat(bounty): pick a place when posting`. Open PR 4a
      with the mutation results and the Info.plist check in the body. `spec-lifecycle` is not due: the bounty spec is
      implemented after step 12, so only "Deviations and rulings" here is updated.

## Task 6: Board service, state and origin (PR 4b, no UI)

**Files:** `board/{types,boardService,fixtureBoardService,boardState,axis,originStore,useOrigin,useBoard}.ts` and tests,
`shared/bountyCache.ts`, `services.ts`

**Interfaces**

- Consumes: `getSupabase`, `locationService`, `uiVerifyArgument`, `userCleanups`
- Produces: `BoardService`, `boardReducer`, `axisMarks`, `formatDistance`, `originStore`, `useOrigin`, `useBoard`

**Steps**

- [ ] `boardState.test.ts`: loading → failed shows no rows and `total: null`; failed → retry → ready; ready + refresh
      failure keeps rows, sets `refreshFailed` and keeps the old `loadedAt`; a successful refresh clears it and replaces
      rows; page loading/failed does not touch existing rows; a page answer after `originChanged` or `filterChanged` is
      dropped (stale generation); `applied(id)` / `withdrawn(id)` flip `appliedByMe` on that row only; duplicate ids
      across pages are dropped.
- [ ] `boardService.test.ts` with a stub client: args are passed in the RPC's names; `board_cursor_mismatch` restarts
      from page one once; errors throw; `apply` maps each slug to `ApplyFailure` and a network error to `failed`;
      `hasPayeeMethod` reads the head count.
- [ ] `axis.test.ts`: rows beyond 2 km and unlocated are not marked; `beyond` counts located rows > 2000 m;
      `firstBeyondId` is the first such row; merge rule per Q2 (A: marks closer than 44 pt merge, ids kept in order);
      `formatDistance` for 100, 950, 1000, 1600, 18400 in zh-Hans, en, ms.
- [ ] `originStore.test.ts` with in-memory storage: per user, survives a new store instance, cleared by the registered
      cleanup.
- [ ] `useOrigin`: ruling 1 precedence; re-evaluates on app foreground and tab focus. `useBoard`: loads on mount, on
      foreground (`AppState`), on tab focus, on pull-to-refresh, on origin or filter change; next page when the board's
      end comes within one screen of the viewport; never more than one request in flight per kind.
- [ ] Fixture service per the launch-argument table (filters applied with the same rules as the RPC; `long` pages 20,
      20, 5 with a stable cursor).
- [ ] Checks; commit `feat(bounty): board service, state and origin`.

## Task 7: Board in home, filters and states (PR 4b; Q1 answered)

**Files:** `HomeScreen.tsx`, `home/index.ts`, delete `BountySection.tsx`, `src/app/(tabs)/bounty/index.tsx`,
`BountyBoard.tsx`, `FilterChips.tsx`, `BoardStates.tsx`, `src/ui/InlineState.tsx`, scene `bounty-board`, cases
`bounty_board_states`, home/shell cases that referenced `bounty-section-placeholder`

**Steps**

- [ ] `HomeScreen`: `board` slot and `refreshControl`; remove `BountySection` and `minHeight: windowHeight * 2`;
      `useWindowDimensions` dropped if unused. Ruling 13.
- [ ] `BountyBoard`: section title 「能接的悬赏」 (header role), `FilterChips` (selected chip uses the accent; count per
      Q1; chips are buttons with `accessibilityState.selected`), then by state: `InlineState` cards for failed, empty,
      filter-empty (with 看全部), end; a warning notice for `refreshFailed` with the data time (`HH:mm`, Malaysia time)
      and 重试; a page-failed inline card at the bottom with 重试. Cards come in Task 8; until then rows render as a
      plain `TaskCard` so the states can be checked.
- [ ] Route: pass `<BountyBoard userId … onPost={startPost} />` and a `RefreshControl` bound to the board.
- [ ] Remove `home.section.*` keys and every case reference to `bounty-section-placeholder`; check `shell_minimise`,
      `home_title_strip`, `home_fan_out`, `shell_accessory_tap` still scroll with the default `full` board.
- [ ] Case `bounty_board_states` (`LOCALES ['zh-Hans', 'ms']`): `-uiVerifyBoardFail first` → 没加载出来, chips show no
      count, 重试 loads rows (assert a row appears, so the first assertion can fail); `-uiVerifyBoard empty` → 附近暂时没有
      悬赏 and 发悬赏 opens the post sheet; `-uiVerifyBoardFail refresh` → pull to refresh shows the stale notice with a
      time and the rows stay; 急 chip with no urgent rows (`one`) → filter-empty + 看全部 returns to 全部; scrolled to the
      end → 就这些了. Pixel check: grouped background behind the inline card; head ≤ 32 pt.
- [ ] Checks; run the case and the four home/shell cases once; commit `feat(bounty): board in home with filters and
      states`.

## Task 8: Board card 26A and paging (PR 4b)

**Files:** `BoardCard.tsx`, `src/ui/TierMark.tsx`, `shared/tierCopy.ts`, `BountyBoard.tsx`, case `bounty_board_list`

**Steps**

- [ ] `TierMark` (ruling 12) in SwiftUI or RN as fits the card's Host; label = tier name.
- [ ] `BoardCard`: one `Host` (`matchContents`) per row: row 1 sticker 48 pt (RN `CategorySticker` in `RNHostView`),
      category caption, title (2 lines), reward SF Rounded `--text-reward`; row 2 time line (urgent: urgent colour +
      clock symbol + 「急 · 」 prefix) and 「place · distance」 (place only when no distance; 「没写地点」 when no place);
      row 3 poster initial avatar (`Avatar`), name, `TierMark`, and 申请 (accent pill, 44 pt) or 「已申请 · 等对方选」.
      The card is one accessibility element with a full label and two actions (open, 申请). Tapping 申请 calls
      `onApply(id)`; the rest calls `onOpen(id)`. Under 300 lines; split rows into a second file if needed.
- [ ] Paging: `long` board loads three pages without duplicates; the unlocated header appears once before the first
      unlocated row.
- [ ] Case `bounty_board_list` (`LOCALES ['zh-Hans', 'ms']`): the first card reads 帮取快递, RM 8, 急 with the clock
      symbol and urgent pixel colour, 「Sunway Geo 宿舍 · 300 m」, 小林 · 靠谱, and a 44 pt 申请; the applied row shows
      「已申请 · 等对方选」 and the stamp; `-uiVerifyBoard long` scrolls to 45 unique titles and 没写地点的 once; screenshots
      top and end.
- [ ] Checks; run once; commit `feat(bounty): board cards with poster and tier`.

## Task 9: Location card, chosen place and distance axis (PR 4b; Q2, M2 answered)

**Files:** `LocationCard.tsx`, `PlaceRow.tsx`, `DistanceAxis.tsx`, `useOrigin.ts`, `src/app/(tabs)/bounty/place.tsx`,
`_layout.tsx`, cases `bounty_board_location`, `bounty_board_axis`

**Steps**

- [ ] `LocationCard` while undetermined and not dismissed: 允许定位 → `locationService.request()` → granted reloads
      with 「你」; denied → row. 先不用 → `originStore.dismissCard` → row.
- [ ] `PlaceRow`: 「选一个地方」 pushes `/bounty/place` (`PlaceSearchScreen purpose="board"`); after a pick
      `originStore.setChosenPlace` and the board reloads from that point with 「这里」; the chosen row shows 换.
- [ ] `DistanceAxis` (RN): line, origin dot with 你 / 这里, ticks, marks from `axisMarks`, 「+N 更远」; each mark is a
      44 pt button labelled with the bounty title(s) and distance. Tap → `scrollTo` the card (header offset accounted)
      → outline per M2; Reduce Motion per M2.
- [ ] Case `bounty_board_location` (`-uiVerifyLocation undetermined`): the card shows; 允许定位 raises the system prompt
      (driven by the Simulator's prompt, allowed) → the axis appears with 你; second pass `undeterminedDeny` → the row
      「选一个地方」 and no axis (`ui.gone('bounty-axis')`); pick Sunway Geo Residences → 「Sunway Geo Residences 附近」,
      axis with 这里, distances on cards; relaunch keeps the place; third pass 先不用 → the row, and after a relaunch no
      card. Screenshot each state.
- [ ] Case `bounty_board_axis`: tapping the 1.6 km mark scrolls the 搬两个箱子上楼 card into view (its frame was below
      the viewport before the tap) and the outline pixels appear around it; 「+2 更远」 scrolls to 帮我去 JPJ 排号; video
      of one tap. Reduce Motion: find a supported way to turn it on for the verify Simulator (check the runner and
      `xcrun simctl` help first); if none exists, record `gap: <reason>` on the story-map row and add it to the device
      checklist instead.
- [ ] Checks; run both once; commit `feat(bounty): location card, chosen place and distance axis`.

## Task 10: Detail 3A (PR 4b; Q4 decides ⋯)

**Files:** `detail/{BountyDetailScreen,useDetail}.tsx`, `src/app/(tabs)/bounty/[id].tsx`, `_layout.tsx`, scene
`bounty-detail`, case `bounty_detail`

**Steps**

- [ ] `useDetail`: seed from `bountyCache`, load `bounty_detail` with the origin point, reload on focus; `gone` state.
- [ ] Screen per "Decided UI → Detail": header with the 48 pt sticker, title, reward; grouped rows (place + 「约 … ·
      精确地址只给选中的人」 or place only when no distance; time + 急 line; poster + `TierMark`, not tappable per Q4);
      description section; pinned bottom (`SheetFrame` pattern from `src/ui`) with 申请 (`bounty-detail-apply`) or the
      applied block (Task 11); ⋯ per Q4; transparent header with `scrollEdgeEffects`.
- [ ] Load failure: an urgent notice with 重试 in place of the rows (never an empty detail); `gone` → 「这条悬赏已经不在
      了」 and back.
- [ ] Case `bounty_detail` (`LOCALES ['zh-Hans', 'ms']`): tapping a card body pushes the detail with the same title and
      RM 8; rows show 约 0.3 km and 小林 · 靠谱; 申请 is pinned and 44 pt; system back returns to the board at the same
      scroll position and the row deselects; a worst row (`worst`) shows a 500-character description by scrolling with
      申请 still pinned.
- [ ] Checks; run once; commit `feat(bounty): bounty detail`.

## Task 11: Apply sheet 4A, payee block, withdraw 31A, stamp (PR 4b; Q3, Q5, M1 answered)

**Files:** `apply/{ApplySheet,useApply}.tsx`, `shared/appliedStamp.tsx`, `src/app/bounty-apply/*`, `src/app/_layout.tsx`,
`BoardCard.tsx`, `BountyDetailScreen.tsx`, cases `bounty_apply`, `bounty_apply_no_payee`, `bounty_apply_failed`,
`bounty_withdraw`

**Steps**

- [ ] Unit tests for `useApply` logic (plain reducer): checking payee → form | noPayee; send allowed once while busy;
      success → `applied(id)` on board and detail, `justApplied` set, sheet closes; `failed` keeps the note and shows
      「没发出去，再试一次」; `closed`/`taken`/`gone` show the reason and disable send; `noPayee` from the server switches to
      the no-payee state; nothing retries automatically. Withdraw: confirm → busy → `withdrawn(id)`; `notPending`
      reloads the detail.
- [ ] Sheet route per Q5 with a native header: title 申请帮忙, 发送 (`bounty-apply-send`) right, close left; body per
      "Decided UI"; note counted in code points, `maxLength` 140 as a guard. No-payee state per Q3's target.
- [ ] `appliedStamp`: the M1 motion on the RN sticker + stamp overlay, run once when `justApplied` matches the
      surface's id (ruling 6), static final state otherwise; Reduce Motion per M1. Success haptic.
- [ ] Detail applied block and withdraw via `ConfirmationDialog` (destructive 撤回申请, cancel 不撤回); success
      restores 申请 and the untilted sticker without motion.
- [ ] Cases (`ARGS -uiVerifySignedIn onboarded` plus):
      - `bounty_apply`: card 申请 opens the sheet titled `bounty.apply.title`; type a note; counter reads the code-point
        count; 发送 shows progress, the sheet closes, the card shows 「已申请 · 等对方选」 and the stamp (video); open
        the detail: 已申请 · 等小林选 and 你写的：<note>.
      - `bounty_apply_no_payee` (`-uiVerifyFixture empty`, `LOCALES ['zh-Hans', 'ms']`): the sheet shows 先加一个收款方式
        and no note field; 添加收款方式 goes to the Q3 target (assert 收款方式 screen title).
      - `bounty_apply_failed` (`-uiVerifyApply failOnce`, then `taken`): first 发送 shows the failure with the note
        intact; second succeeds; `taken` shows the reason and a disabled 发送.
      - `bounty_withdraw`: from an applied detail, 撤回申请 → the system action sheet → 撤回申请 → 申请 is back and the card
        shows 申请 again; 不撤回 leaves it unchanged (asserted before and after).
- [ ] Checks; run each once; commit `feat(bounty): apply with a note, payee check, stamp and withdraw`.

## Task 12: Block from the detail and the block list (PR 4b; only if Q4 = A)

**Files:** `block/*`, detail ⋯, `src/app/(tabs)/me/blocked.tsx`, `src/app/(tabs)/me/index.tsx`, case `bounty_block`

**Steps**

- [ ] Service: `block_user(target)`, `unblock_user(target)`, list from `blocks` (own rows) with names via a new read if
      `profiles` RLS does not allow it (check `20261012000000_profiles.sql` first; if a read is needed, add it to a
      small migration with pgTAP, and note it in rulings).
- [ ] ⋯ menu with 「屏蔽{name}」 in red → action sheet with 5A copy → block → the detail closes, the board reloads
      without that poster's bounties.
- [ ] 我的 → 屏蔽名单 row and screen: native list, swipe → system 解除 action; empty state inline.
- [ ] Case `bounty_block`: block 小林 from the detail → back on the board none of 小林's bounties show; 我的 → 屏蔽名单
      lists 小林; 解除 → the board shows 小林's bounty again after refresh.
- [ ] Checks; run once; commit `feat(bounty): block from the detail and unblock in 我的`.

## Task 13: Worst-case data (break-ui) (PR 4b)

**Files:** fixtures, case `bounty_board_worst`; fixes in Task 7–12 files

**Steps**

- [ ] Run `break-ui` on the board, detail, apply sheet and place search with: 60-code-point titles, 80-code-point place
      labels, 40-character poster names, RM 500 and RM 1, 18.4 km and 100 m, tier 貘友 (four heads), a bounty without
      place or time, 140-code-point notes, 45 rows, ms copy, light and dark at the default text size.
- [ ] Case `bounty_board_worst` (`-uiVerifyBoard worst -uiVerifyFixture worst`, `LOCALES ['zh-Hans', 'ms']`): the title
      wraps to two lines without hiding RM 500; the poster row keeps 申请 at 44 pt; the place · distance line truncates
      the label, never the distance; the axis 「+N 更远」 fits; screenshots top, middle, end; the detail and the apply
      sheet with the 140-character note.
- [ ] Fix every break (layout only; copy changes go to the user); re-run; commit `fix(bounty): worst-case board
      layout`.

## Task 14: Story map, README, rulings and the PR gate (PR 4b)

**Files:** `docs/story-map.md`, `verification/ui/README.md`, `docs/design-language.md` (component inventory), this plan

**Steps**

- [ ] `docs/story-map.md`:
      - `bounty.board.data` → add `db:supabase/tests/bounty_privacy.test.sql`, `ui:bounty_board_list`
      - `bounty.board.filters` → `unit:src/features/bounty/board/boardService.test.ts`, `ui:bounty_board_states`
      - `bounty.board.distance` → `unit:src/features/bounty/board/axis.test.ts`, `ui:bounty_board_axis`
      - `bounty.board.worst` → fix the behaviour to 「60 字标题、80 字地点、40 字名字、RM 500 和 RM 1 都排得下」
        (RM 9,999 is impossible since decision 6) → `ui:bounty_board_worst`
      - new `bounty.board.states` 「首次加载失败不显示成空、不显示数量；刷新失败保留列表并写明是几点的数据；到底有提示」 →
        `unit:src/features/bounty/board/boardState.test.ts`, `ui:bounty_board_states`
      - new `bounty.board.location` 「只在点允许定位时才弹系统定位；不开定位可以选一个地方，选的地方存在手机上」 →
        `unit:src/lib/location/…test.ts`, `ui:bounty_board_location`, `device: 定位弹窗文案、精确开关`
      - new `bounty.board.privacy` 「除了发布者和选中的人，谁都拿不到地点坐标；距离取整到 100 米」 →
        `db:supabase/tests/bounty_privacy.test.sql`
      - new `bounty.board.freshness` 「打开、回前台、切回悬赏、下拉都会刷新；申请和撤回只改那一条」 →
        `unit:src/features/bounty/board/boardState.test.ts`
      - `bounty.apply.apply` → add `ui:bounty_apply`, `ui:bounty_withdraw`, `unit:src/features/bounty/apply/…test.ts`
      - `bounty.apply.no-payee` → add `ui:bounty_apply_no_payee`
      - new `bounty.apply.failure` 「申请失败保留那句话，不自动重发；被接走或关闭时说明原因」 → `ui:bounty_apply_failed`
      - new `bounty.post.place` 「发悬赏时搜地点或用当前位置；名称可改，精确地址只给选中的人」 →
        `ui:bounty_post_place`, `ui:bounty_place_search`, `unit:src/features/bounty/post/validate.test.ts`
      - `bounty.apply.blocked` → add `ui:bounty_block` if Q4 = A
      Test names exactly as in the files; `node scripts/check-story-map.mjs` passes.
- [ ] README: the six launch arguments and every new case row; `-uiVerifyBoard full` is the default that keeps home
      scrollable.
- [ ] `bun run verify:smoke` and `bun run verify:ui --affected` (zh-Hans light); open every screenshot.
- [ ] Record answers to Q1–Q5, M1–M2 and anything changed during the build under "Deviations and rulings"; commit
      `docs(bounty): step 4 story map and verification notes`.

## Pre-flight conflicts

Tasks that share files or interfaces; run them in order, never in parallel.

| Shared file / interface | Tasks | Rule |
| --- | --- | --- |
| Migration + `bounty_nearby.test.sql` / `bounty_read.test.sql` | 1 | One task owns all SQL; Task 12 adds its own migration only if needed |
| `nearby_bounties` / `bounty_detail` JSON shapes | 1 → 6, 10, 11 | Task 6 starts after Task 1 is committed; types copied from the SQL |
| `src/lib/i18n/locales/bounty/*` | 2, then small additions in 5, 7–12 | Task 2 adds every foreseeable key; later tasks append, never rename |
| `app.json`, `package.json`, `bun.lock`, `ios/` pods | 3, 4 | Task 4 runs `pod install` after Task 3's |
| `modules/tapiro-kit/index.tsx`, `TapiroKitModule.swift` | 4 | Only Task 4 |
| `PostForm.tsx`, `OptionalRows.tsx`, `PostConfirm.tsx`, `validate.ts` | 5 | Only Task 5 in this step |
| `src/features/bounty/index.ts`, `services.ts` | 5–12 | Append exports; rebase before each commit |
| `src/debug/BountyScenes.tsx`, `src/debug/scenes.tsx` | 5, 7, 10, 11 | Append scenes; shared path selects every case at the milestone |
| `HomeScreen.tsx`, home cases | 7 | Only Task 7; home/shell cases rerun there |
| `src/app/(tabs)/bounty/_layout.tsx`, `index.tsx` | 7, 9, 10 | Each adds its own `Stack.Screen`; keep toolbar 「+」 untouched |
| `src/app/_layout.tsx` | 11 | Registers `bounty-apply` |
| `BoardCard.tsx`, `BountyDetailScreen.tsx` | 8, 10, 11, 13 | 11 adds the stamp; 13 fixes layout last |
| `bountyCache`, `boardReducer` events `applied` / `withdrawn` | 6 → 10, 11 | Contract fixed in Task 6 |
| `verification/ui/README.md`, `docs/story-map.md` | 5 (4a rows), 14 | 4a adds its own rows in Task 5's commit |

## Not in this plan

| Item | Owning step |
| --- | --- |
| Map view, sticker annotations, the list/map sticker switch and remembered view | Step 8 (after the `expo-maps` spike) |
| Applicant list, hold-to-commit selection, 「这次没选上」 / 「已经选好了」 | Step 5 |
| Applicant-row long-press block (5A third entry) | Step 5 |
| Poster profile screen (「看{name}的主页」, tappable poster row) | Not scheduled; canvas item when a profile screen is designed |
| Bounty status screens, live-item source, card-detail types in `src/lib`, 出发了 / 完成 / 有问题 / cancel | Step 6 |
| The poster's own open bounties on the board (the RPC excludes them; they show as live cards) | Step 6 |
| Photo → die-cut sticker on cards (`stickerPath` is ignored here) | Step 9 |
| Publish fly-to-stack | Step 9 |
| Push for new applications and selection | Step 11 |
| Gates (dimmed cards, 「{tier} 及以上可申请」) — `bounty.board.locked` stays planned | Step 12 |
| Report a bounty | Foundation step 7 |
| Reviews feeding the tier | Foundation step 6 |

## Final acceptance

- [ ] PR 4a: Tasks 1–5 committed; `supabase test db`, `bun test`, `tsc`, lint on changed files, `format:check`,
      `design-check`, `check-specs`, `check-story-map` pass; mutation results and the Info.plist check in the PR body;
      `bounty_place_search`, `bounty_post_place` ran once; `verify:smoke` passes.
- [ ] PR 4b: Tasks 6–14 committed; the same fast checks; cases `bounty_board_states`, `bounty_board_list`,
      `bounty_board_location`, `bounty_board_axis`, `bounty_detail`, `bounty_apply`, `bounty_apply_no_payee`,
      `bounty_apply_failed`, `bounty_withdraw`, `bounty_block` (Q4 = A), `bounty_board_worst` each ran once (zh-Hans
      light) with screenshots opened; the four home/shell cases ran once after Task 7; `verify:smoke` passes. Dark, `en`
      and `ms` run at the bounty milestone.
- [ ] Device checklist entries added: the location prompt text (precise, When In Use only, all three languages),
      reduced-accuracy distances, MapKit search on a real network, the stamp haptic; board scroll performance with 45
      cards measured with Instruments at the milestone (one `Host` per card).
- [ ] Deviations and rulings collected for the spec's Implementation Record (written when the bounty spec is
      implemented, not in this step).

## Deviations and rulings

Filled in Task 14.

### Task 5 (place search and posting place rows)

- `placeLabelEmpty` (ruling 11, Task 5 brief) is the existing `bounty.post.error.placeEmpty`; the duplicate
  `bounty.place.placeLabelEmpty` was deleted from all three locales (controller ruling). `validate.ts` already emitted
  it, so the task added a code-point/trim test and no validation change.
- New copy keys in all three locales: `bounty.place.{denied, noFix, stale, locating, searching, resolving, addLabel,
  picked}`, `bounty.post.confirm.{place, addressNote, meta}`, `debug.bounty.placeSearch`. `stale` (「列表变了，再点一次」)
  is shown when resolve answers `failed`/`stale`; `noFix` covers a granted permission without a position.
- 用当前位置 stores the device point as the coordinates and the reverse-geocoded name as the label; if `placeAt` fails or
  throws, the label is empty and the field takes focus (ruling 11). The search is biased to the viewer's point only
  when permission is already granted (a status check, no prompt); otherwise to Malaysia.
- The 地点 row shows the current place name from the draft (the draft keeps no separate result name). Picking again
  resets the exact address to empty, as the brief's `address: null` says.
- Empty results use the system `ContentUnavailableView`; a failed search is an urgent `NoticeCard` with 重试, never the
  empty view.
- Verify mode cannot show the system location alert: the `undetermined` fixture answers the request itself, so
  `bounty_post_place` asserts the outcome, and the prompt text stays on the device checklist.
- "The debug marker the fixture exposes" is the defaults key `uiVerifyPublishedArgs`: the verify post service writes
  each accepted publish's arguments there (cleared at launch) and `bounty.published_args(ui)` reads the app container
  plist, because the sheet closes on publish and no on-screen marker survives.
- AXe cannot type CJK, so the case renames the place by pasting (`simctl pbcopy` + ⌘V).
- The verify build lacked `NSLocationWhenInUseUsageDescription`: `ios/` predated Task 3 and `build.sh` prebuilds only when
  the workspace is missing. `expo prebuild --platform ios` was re-run (no tracked file changed); see the retro.
- The search bar sets `placement: 'stacked'`: with the default placement iOS 26 put it in the bottom toolbar, while
  Decided UI asks for the header search bar. `autoFocus: true` is set, but in the Simulator the field was not focused
  when the screen settled (the cases tap it first); check on a device.
