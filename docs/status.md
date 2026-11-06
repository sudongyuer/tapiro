# Status

Where the mainline stands and what comes next. Update this file in the PR that changes it (a merged step, a new
owner decision, a new queue item). Decisions and their reasons live in the specs and `docs/research/`; this file only
points to them.

Updated: 2026-11-07 (mascot level built); 2026-11-06 (owner answers: questions 238–255 and every pending ★ accepted; opaque secondary buttons in
pinned bars; reviews, profile, mascot level, weekly feed and invites: plan, server and client core).

## Built and merged

| Area                   | Spec                                               | Notes                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation steps 1–4   | `docs/specs/2026-10-11-foundation-design.md`       | Accounts, shell and navigation, payee methods, payment and stickers                                                                                                          |
| Bounty steps 1–9       | `docs/specs/2026-10-11-bounty-design.md`           | Milestone run and walkthrough: `docs/walkthroughs/2026-10-31-bounty.md`                                                                                                      |
| Money in any currency  | `docs/specs/2026-10-29-multi-currency-design.md`   | RM and ¥                                                                                                                                                                     |
| Posting a bounty, redo | `docs/specs/2026-10-31-bounty-post-redo-design.md` | #40                                                                                                                                                                          |
| Carpool steps 1–7      | `docs/specs/2026-11-02-carpool-design.md`          | Implemented: #48–#51, #53–#55, #57, #70; milestone `docs/walkthroughs/2026-11-03-carpool.md`, owner walkthrough 2026-11-04                                                   |
| Device time zone (234) | `docs/specs/2026-11-02-carpool-design.md`          | Rides and bounties show and pick times, and local reminders keep quiet hours, in the system time zone; server rules stay in Malaysia time                                    |
| Chat (foundation 7)    | `docs/specs/2026-10-11-foundation-design.md`       | Plan `docs/plans/2026-10-30-chat.md` done: server, 消息 list, thread, images, report and block, entries (#63, #72, #74–#77, #79 and this PR); milestone in the step 7 record |
| Expo SDK 58            | —                                                  | RN 0.88, 问小貘 as the iOS 27 prominent tab; open, not SDK 58: the 已结清 exit animation (retro); `home_fan_out` fixed (scroll steps, 2026-11-06)                            |

## In progress

- Carpool: `ride_settle_owing` no longer depends on the clock and `paste_into` pastes again (#73). `bounty_post_place`
  still fails after its pastes: AXe key events (Return, typed keys) are dropped on iOS 27.2 and need their own look. The
  `ride.remind.*` device checks wait for TestFlight. The local pgTAP `rides_schema` test 39 failure is gone: the main
  session reset the local database on 2026-11-06 (`supabase db reset --local`, test accounts reseeded) and all 49
  files, 1721 tests pass.
- Live updates and push (`docs/plans/2026-11-03-realtime-push.md`): steps 1 (server, #62) and 2 (app, #66) are merged;
  the owner's 2026-11-05 answers added quiet hours for the bounty you are on and a live-only `bounty.expired` to
  pending applicants. The milestone run passed on 2026-11-06 (`docs/retros/2026-11-06-live-milestone.md`). Step 3 waits on the paid account;
  the spec stays `approved` until then.

- Reviews, profile, mascot level, coins in 我的, weekly feed and invites (foundation step 6 and the account-free part
  of step 5): plan `docs/plans/2026-11-06-reviews-profile-coins.md`; Task 1 (server: reviews, the review share in
  靠谱度, tier drops, mascot level, profile reads, weekly feed, invite codes, coin history) is merged; Task 2 (client
  core: `src/features/reputation/` and `src/features/coins/`, review live signals, copy) is merged; Task 5 (the profile
  screen, 全部评价, 回复, ⋯ 举报 / 屏蔽, the five entries and the gone state; cases `profile_*`) is built; Task 6 (the
  tier-drop sheet, cases `tier_drop_*`) is built; Task 8 (the 我的 「貘币」 row and the 貘币 page: balance, free posts
  left, monthly history; cases `coins_page*`) is merged (#91); Task 10 (the 邀请朋友 page: my code, 复制, 分享, the
  code field before the first deal, progress rows; cases `invite_*`) is built. Task 3 (the review sheet: faces, chips by role, sentence, draft and discard, 改一下, the envelope seal 257 a1; cases
  `review_sheet*`) is merged (#93); Task 4 (review entries: the row under 已结清, one row per counterpart on a closed ride, the sealed
  lines, one home card per pending review; cases `review_entry_*`) is built. Task 7 (小貘 grows on the stage (257 b1), 「小貘长大的时刻」, the accessory picker, stand-in accessory art; cases `mascot_*`) is built. Next: Task 9, the weekly feed (257 c1). 258 A (count closed rides toward 靠谱度, a
  server change) and 259 A (report a review from a profile) are answered but not planned as tasks yet.

## Queue

1. Plans written, not built: 问小貘 (`docs/plans/2026-10-30-ask-tapir.md`, step 8).
2. Waiting on the paid Apple Developer account: push delivery, Live Activity, in-app purchase, TestFlight.
3. Text rows in pinned bottom bars (notices, the 已申请 and outcome lines) sit over scrolled content: the owner chose
   ★A on 2026-11-06, the whole bar opaque. A task of its own, not started.

## Owner decisions pending

- The review sheet ★ details of Task 3 (plan 「★ Review defaults」, R1–R15) and the review entries of Task 4 (「★ Review entry
  defaults」, E1–E10).
- The coins page ★ details of Task 8 (`docs/plans/2026-11-06-reviews-profile-coins.md`, 「★ Coins defaults」, C1–C9)
  and the invite page ★ details of Task 10 (「★ Invite defaults」, I1–I10), listed for veto after the owner's
  2026-11-06 answer below.

On 2026-11-06 the owner answered 「按你推荐的走」:

- Questions 238–255 (steps 5–6) take their ★: `docs/plans/2026-10-30-coins-reputation-remaining.md`, 「Answers」.
- Accepted 2026-11-06 and kept where they are recorded: the chat plan's defaults (server, client core, 消息 list,
  thread, report and block, images, entries, the thread spike, report row retention; `docs/plans/2026-10-30-chat.md`)
  and the live updates ★ rows (`docs/specs/2026-10-31-realtime-push-design.md`, Decisions). Confirmed by name: 120
  stays as the canvas draws it (spinner while sending, no dimming), and a blocked bounty thread keeps hiding 已读.
- Secondary buttons in pinned bottom bars are opaque (`fix/opaque-bar-buttons`). ★ for veto: inside `SheetActions`
  bars a secondary pill fills with `systemGray5` and every pill sits on an opaque canvas-coloured base, so pressed and
  disabled dimming and plain pills hide scrolled content too; other secondary pills keep `tertiarySystemFill`. Text
  lines in those bars (notices, the 已申请 and outcome lines) still sit over scrolled content: answered later the same
  day (below), Queue item 3.

Later on 2026-11-06 the owner answered 「都按推荐」 (relayed by the main session):

- Questions 256–259 take their ★: 256 A (ride reviews on others' profiles show 「拼车」 without route or reviewer), 257
  a1 + b1 + c1 (envelope seal, crouch-then-grow, leaf drop then chew after `fed`), 258 A (a closed ride counts as
  settled toward 靠谱度 without a Tapiro payment), 259 A (long-press a review → 举报). Recorded in the plan's
  「Questions」.
- Accepted: the ★ defaults of Task 1 (「★ Server defaults」), Task 2 (「★ Client core defaults」), Task 5 (「★ Profile
  defaults」, P1–P10) and Task 6 (「★ Tier-drop defaults」, D1–D8).
- Text rows in pinned bottom bars: ★A, the whole bar opaque (Queue item 3).

## Resuming on another machine

- Clone, `bun install`, then follow `AGENTS.md` (Homebrew Node, `pod install` after prebuild, `ios/.xcode.env.local`).
- After pulling an SDK bump, run `bunx expo prebuild --clean --platform ios` once before `bun run ios`; a plain
  prebuild keeps the old SDK's AppDelegate and scene delegate. `bun run verify:build` does this on its own.
- Two phones against the local stack: `bun run db:start`, `bun run db:test-accounts`, then `bun run dev:two` (builds
  the Debug app once, boots two non-verify iPhone Simulators, starts Metro, launches both; `--skip-build` reuses the
  last build). Sign in with 「测试账号」: 小林 on one, 阿明 on the other. Details in `supabase/README.md`, "Test accounts".
- Supabase CLI 2.x (`brew install supabase/tap/supabase@2`): CLI 3.0 rejects the `[inbucket]` block in
  `supabase/config.toml`.
- The design canvas is the claude.ai artifact named in each spec; it is not in the repo.
- Local-only state that does not travel: `.verify/` build output (rebuild with `bun run verify:build`), the local
  Supabase database (rebuilt from `supabase/migrations`), and the agent's personal memory notes (the owner's working preferences are copied into `AGENTS.md`,
  "Working with the owner").
- Unmerged branch kept on purpose: `spike/photo-sticker` (pushed, nothing uncommitted).
