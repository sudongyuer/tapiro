# Carpool steps 1–3: shared modules, schema and transitions, `nearby_rides` Implementation Plan

> **For agentic workers:** execute task by task. Track steps with checkboxes (`- [ ]`). The spec stays `approved`
> after this plan (steps 4–8 remain); Task 10 appends a dated Implementation Record without setting `implemented`.

**Goal:** The server runs the whole v1 carpool lifecycle with no UI: an organiser publishes a ride (coin or free slot,
payee method required, blocked while unpaid), others request with a note, the organiser approves or declines, members
tap 我到了 (undoable) or report 晚到, the organiser sets 车牌 / 预计到 / 集合说明, changes 车费怎么分 or the time, taps
出发 with the boarded ticks (no-shows recorded, appeals confirmed by a boarded member), taps 到了 and sends the split
(220 A) with an optional receipt, riders pay through the built payment RPCs, and the last 已收到 closes the ride with one
car sticker per boarded person. A Grab-split ride closes at 到了. Jobs move rides to 集合 and expire them; account
deletion is blocked while a ride is active. `nearby_rides` lists joinable rides by day and distance with a cursor.
Bounty keeps working unchanged on the shared place and block modules.

**Architecture:** Client: `src/features/place/` (place search, place pick, current place, origin store, short-name
logic) and `src/features/block/` (block service, flow and list stores, block events, service singleton) become shared
feature modules with an `index.ts` facade each; bounty imports them from there. Pure ride arithmetic lives in
`src/features/ride/` (no screens yet). Server: six migrations `20261102000000` … `20261102000500`, all transitions as
`security definer` RPCs that write `ride_events` and call the built contracts (`publish_blocked`, `spend_post`,
`refund_post`, `record_no_show`, `open_payment`, `set_payment_amount`); `confirm_payment_received` gains the ride
branch; a pg_cron job; an `auth.users` delete trigger; the `account-delete` Edge Function lists active rides.

**Tech stack:** Postgres 15 on the local Supabase stack, PostGIS in `extensions`, pg_cron, pgTAP via `supabase test
db`; TypeScript with `bun test`.

**Spec:** `docs/specs/2026-11-02-carpool-design.md` (approved): Decisions 177 B, 190 A, 195 A, 196 A, 197 A, 198 A,
201 A, 204 A, 211 A, 212 B, 215 A, 217 A, 218 A, 219 A, 221–232, open item 220 (A assumed); Rules carried over
unchanged; Data flow and ownership; Implementation order 1–3; Verification. Events outbox:
`docs/specs/2026-10-31-realtime-push-design.md` (not built yet, see Global constraints).

## Global constraints

- Zero comments in SQL and TypeScript unless they explain unexpected behaviour or a hidden invariant.
- Every RLS-bypassing function is `security definer`, `set search_path = ''`, schema-qualified; `revoke all … from
public, anon, authenticated`, then grant `authenticated` (client RPCs, actor from `auth.uid()`) or `service_role`.
- Tables: RLS on, `revoke all` from clients, narrowest column grant and policy; clients never write a ride table.
- Typed rejections: SQLSTATE plus slug (below), tested with `throws_ok`.
- Data integrity: a replayed call returns the first outcome and writes nothing; a failed publish debits nothing.
- The realtime `events` outbox does not exist yet (no migration creates it). Ride RPCs write `ride_events` only; the
  carpool kinds are emitted from them when the realtime layer lands (spec Implementation order step 5).
- Local Supabase only. The shared `tapiro` stack is never reset; this plan runs an isolated stack (`project_id`
  `tapiro-carpool`, ports 567xx) from a scratch copy of `config.toml` that links `migrations/` and `tests/`.
- Files under 500 lines; one migration per task.
- Checks per task, judged by exit status: `supabase db reset` + `supabase test db` (isolated stack), `bun test`,
  `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`, `check-specs`, `check-story-map`. No UI
  changes, so `verify:smoke` is skipped (stated in the PR).

## ★ UI polish, carpool (2026-11-17, for veto)

Fixes from the UI audit of 2026-11-16 (RIDE-1 to RIDE-9, RIDE-12, RIDE-13, RIDE-16, RIDE-17). The later carpool steps
have no plan of their own, so their choices are listed here. No amount, arithmetic, order of actions or copy changed.

| #   | Choice (★ taken)                                                                                                                                                                                                                                                                                                                                | Alternative                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| R1  | The 已申请 / 已结清 stamp hangs 4 pt under the car sticker, as RideDetail1 192 A draws it (`.stamp{top:76px}`), and the route, the lead line and a labels line beside it end before the stamp, so no text runs under it (RIDE-2, RIDE-3).                                                                                                       | Keep the text full width and let the stamp cover the end of a long line, as the board's short sample does. |
| R2  | Quick-time chips are 44 pt high like RideCreate1 203 A (`.qp{height:44px}`): the regular system capsule with a taller label, as the bounty post amounts do (RIDE-6).                                                                                                                                                                            | The system large control size (50 pt).                                                                     |
| R3  | A filled place row is one button for the place with 「票上叫…」 and 改 over its lower edge; 改 keeps a 44 pt target that overhangs the line instead of adding height (RIDE-6, RIDE-7). A two-line name is left-aligned (RIDE-5).                                                                                                                | 改 as a trailing 44 pt button beside the chevron.                                                          |
| R4  | In the 发起 step the organiser link keeps a 44 pt target that overhangs its 18 pt line; the application card's name row is unchanged (RIDE-12).                                                                                                                                                                                                 | A 44 pt row as before.                                                                                     |
| R5  | The pinned bar of the ride detail has 8 pt under its buttons, above the tab bar; a detail with no action has no bar and scrolls under the tab bar with the system scroll edge. The bar itself stays opaque (owner, 2026-11-06) (RIDE-8, RIDE-13).                                                                                               | Keep an empty opaque band above the tab bar.                                                               |
| R6  | 结清 rows lead with the 28 pt initial avatar of RideSettle1 214 A / 215 A (the viewer's in the accent, as in the seat row); text and row buttons start after it (RIDE-9).                                                                                                                                                                       | —                                                                                                          |
| R7  | With no current ride, 「我的拼车」 shows no count above 「去过的 · n 趟」 (RIDE-17).                                                                                                                                                                                                                                                            | Hide the heading; or move the row to the end of the list, where 219 A draws it.                            |
| R8  | The icons of 加点细节 share one 28 pt column, so 航班和行李, 加起飞时间 and 集合说明 start on one edge; 236's 12 pt between icon and label is kept as the minimum (RIDE-16).                                                                                                                                                                    | —                                                                                                          |
| R9  | Times follow the device's 12/24-hour setting in the app language, so the ticket, the quick times and the gather line write 「晚上9:00」 as the system picker does on a 12-hour device, and 21:00 on a 24-hour one (RIDE-19, with BP-13). One rule for the app; reasons and what is left in ruling 25 of `docs/plans/2026-10-27-bounty-post.md`. |
| R10 | 撤回申请, 不来了, 取消这趟 and 屏蔽 are the system action sheet as a popover from the control that asked (撤回申请, 晚到, ⋯, the 取消这趟 button on the 还差 n 人 card), the destructive action above a visible keep button (BS-2). Why and how: `docs/plans/2026-10-29-bounty-status.md`, Deviations and rulings, 2026-11-17 BS-2/BS-3.        |

Skipped, with the deciding line: RIDE-14, RideMeetup1 198 A draws the tile as 「填车牌 / VEN 2381 · 白色 Alza」 after the
organiser booked, which is what ships. RIDE-15, the pinned live ticket is a recorded deviation (step 4: 「It is pinned
above the scrolling Form」) and a soft edge under it would let rows cross the caption, which the opaque-bar rule
excludes (`docs/design-language.md`, owner 2026-11-06); asked as an owner question. RIDE-10, the spec's settle section
does not say which cells the organiser's ticket shows; asked as an owner question.

## Rejection reasons

| Slug                 | SQLSTATE | When                                                                                   |
| -------------------- | -------- | -------------------------------------------------------------------------------------- |
| `ride_not_found`     | `P0002`  | No ride with that id                                                                   |
| `invalid_ride`       | `22023`  | Publish or edit input breaks a rule (labels, short names, points, time, seats, money)  |
| `post_already_sent`  | `55000`  | A publish replay carries different content                                             |
| `publish_blocked`    | `55000`  | `publish_blocked()` for the organiser                                                  |
| `no_payee_method`    | `55000`  | The organiser has no payee method (publish, split)                                     |
| `no_balance`         | `55000`  | From `spend_post`                                                                      |
| `not_organiser`      | `42501`  | An organiser-only RPC called by someone else                                           |
| `not_member`         | `42501`  | A member-only RPC called by someone who is not an accepted member                      |
| `own_ride`           | `22023`  | The organiser requests their own ride, or leaves it                                    |
| `blocked`            | `42501`  | The caller blocked the other side                                                      |
| `closed`             | `55000`  | Cancelled, expired or closed ride; or the other side blocked the caller (not revealed) |
| `departed`           | `55000`  | The ride has left (出发) and the action needs it before                                |
| `full`               | `55000`  | Request or approval on a full ride                                                     |
| `not_pending`        | `55000`  | Withdraw or decide on a row that is not `requested`; request after decline or leave    |
| `invalid_transition` | `55000`  | Any other state mismatch                                                               |
| `invalid_split`      | `22023`  | Split rows do not match the boarded riders, a share ≤ 0, or riders exceed the total    |

## Tasks

### Task 1: shared place module

- [ ] `git mv src/features/bounty/place src/features/place`; move `board/originStore.ts` (+ test) there; move
      `BoardOrigin` / `NoOriginReason` to `src/features/place/types.ts`, re-exported from bounty `board/types.ts`.
- [ ] `src/features/place/index.ts` facade; bounty imports `@/features/place` only; `PlaceSearchScreen` exported from
      bounty's index unchanged for the routes.
- [ ] `bun test` (place and board tests unchanged), `tsc`, lint; commit `refactor(place): move place search and the
origin store out of bounty`.

### Task 2: shared block module

- [ ] Move `types`, `blockService` (+ test), `fixtureBlockService`, `blockFlow` (+ test), `shared/blockEvents` and the
      service singleton to `src/features/block/` with `index.ts`. Verify-mode fixture people are registered by bounty
      (`addBlockFixturePeople`) instead of imported by block. UI (`hooks`, `BlockMenu`, `BlockedListScreen`) stays in
      bounty; step 5 moves what ride needs.
- [ ] `bun test`, `tsc`, lint; commit `refactor(block): move the block client out of bounty`.

### Task 3: pure ride and place logic

- [ ] `src/features/place/shortName.ts`: normalise, longest matching pattern from the table, fallback to the leading
      part (≤ 8 code points), `placeKindFor`, `isAirport`.
- [ ] `src/features/ride/split.ts`: `shareStep(digits)`, `equalSplit(total, people, digits)` (riders rounded up to the
      step, organiser keeps the remainder, never negative), `organiserShare(total, riders)` and `splitProblem` (220 A).
- [ ] `src/features/ride/perPerson.ts` (221) and `src/features/ride/rideTimes.ts` (集合 T-30, no-show window T-15,
      expiry +2 h, 24 h history).
- [ ] Tests next to each file; commit `feat(carpool): split arithmetic, 每人约, short names and time nodes`.

### Task 4: schema (`20261102000000_rides.sql`)

- [ ] Enums; `rides` (snapped `start_public` / `dest_public`), `ride_details` (note, plate, eta), `ride_receipts`,
      `ride_members` (organiser row included), `ride_events`, `place_short_names` + seeds, `post_limits` rows for
      `ride`, sticker changes (nullable `payment_id`, `item_id`, one per (owner, ride)), storage bucket
      `ride-receipts`, RLS and policies; `private.ride_departs_at`, `private.ride_phase`, `private.place_kind`.
- [ ] pgTAP `rides_schema.test.sql`: RLS visibility for non-members, requesters, members, organiser, blocked users;
      seeds; limits. Commit `feat(carpool): rides schema and RLS`.

### Task 5: publish and join (`20261102000100_ride_join.sql`)

- [ ] `publish_ride`, `request_ride`, `withdraw_ride_request`, `decide_ride_request`, `ride_leave_preview`,
      `leave_ride`, `ride_cancel_preview`, `cancel_ride`.
- [ ] pgTAP `ride_join.test.sql`. Commit `feat(carpool): publish, request, approve, leave and cancel`.

### Task 6: meet-up and boarding (`20261102000200_ride_meetup.sql`)

- [ ] `mark_ride_arrived`, `undo_ride_arrived`, `report_ride_late`, `revise_ride_time`, `update_ride_details`,
      `set_ride_split_mode`, `depart_ride`, `appeal_ride_no_show`, `confirm_ride_appeal`.
- [ ] pgTAP `ride_meetup.test.sql`. Commit `feat(carpool): meet-up, boarding and appeals`.

### Task 7: arrival and settlement (`20261102000300_ride_settle.sql`)

- [ ] `reach_ride` (Grab-split closes), `send_ride_split`, `set_ride_receipt`, `dispute_ride_share`,
      `change_ride_share`, `ride_paid_states`, `confirm_payment_received` ride branch, `award_missing_stickers`
      excludes rides.
- [ ] pgTAP `ride_settle.test.sql`. Commit `feat(carpool): split, payments, Grab-split settle and stickers`.

### Task 8: jobs and account deletion (`20261102000400_ride_jobs.sql`)

- [ ] `run_ride_jobs` (集合, expiry with refund rule), cron `ride-jobs`; `active_rides_of`, delete trigger; Edge
      Function lists `rides` in the 409.
- [ ] pgTAP `ride_jobs.test.sql`, handler test. Commit `feat(carpool): ride jobs and account deletion`.

### Task 9: `nearby_rides` and my rides (`20261102000500_nearby_rides.sql`)

- [ ] `nearby_rides(latitude, longitude, page_after, page_size, reference_currency)`: joinable rides, ordered by
      Malaysia day, then start distance (or departure without a location), then departure, id; cursor `{id,
latitude, longitude}`; organiser only, no members. `my_rides()` (24 h rule) and `ride_history()`.
- [ ] pgTAP `ride_nearby.test.sql`. Commit `feat(carpool): nearby rides by day with a cursor`.

### Task 10: records and PR

- [ ] Story map rows (`db:` / `unit:`), stories to `building`; `check-story-map`.
- [ ] Spec Implementation Record (steps 1–3), status stays `approved`; retro; PR on `feat/carpool-foundation`.
