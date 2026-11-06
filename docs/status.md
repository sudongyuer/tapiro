# Status

Where the mainline stands and what comes next. Update this file in the PR that changes it (a merged step, a new
owner decision, a new queue item). Decisions and their reasons live in the specs and `docs/research/`; this file only
points to them.

Updated: 2026-11-06 (live updates milestone run).

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
  `ride.remind.*` device checks wait for TestFlight.
- Live updates and push (`docs/plans/2026-11-03-realtime-push.md`): steps 1 (server, #62) and 2 (app, #66) are merged;
  the owner's 2026-11-05 answers added quiet hours for the bounty you are on and a live-only `bounty.expired` to
  pending applicants. The milestone run passed on 2026-11-06 (`docs/retros/2026-11-06-live-milestone.md`). Step 3 waits on the paid account;
  the spec stays `approved` until then.

## Queue

1. Plans written, not built: 问小貘
   (`docs/plans/2026-10-30-ask-tapir.md`, step 8), coins and reputation remaining
   (`docs/plans/2026-10-30-coins-reputation-remaining.md`, steps 5–6).
2. Waiting on the paid Apple Developer account: push delivery, Live Activity, in-app purchase, TestFlight.

## Owner decisions pending

- Live updates and push: the ★ defaults in the realtime spec's Decisions (bounty kinds, push path, push copy; and from
  step 2 the 「可能不是最新」 line, the new-applicant motion, tap routes, the permission moment, reconnect, handlers and
  the push token rules).
- Live updates and push, from the 2026-11-05 answers (★ by default, owner may veto, realtime spec Decisions): a
  bounty with a problem reported after 完成 stays exempt until confirmation, and one cancelled on the way stays exempt
  for its bounty pushes;
  the bounty detail reloads on its own signals, and a pending application on a closed bounty shows 「已经关闭了」.
- Chat report retention: the report row (reason, note) stays after its message copy is cleared at one year (★ by
  default, `docs/plans/2026-10-30-chat.md` Rulings). Defaults for the chat server half are in the same Rulings.
- Chat client core (★ by default, plan 「Client core defaults」): mark read up to the newest shown message; 已读 and
  a live-only `chat.read` in bounty threads only; the badge counts unread threads and ignores blocked senders; failed
  messages stay on the device below the stored ones and are sent again only on a tap.
- Chat thread spike (2026-11-06, ★ by default): 128 A confirmed; non-inverted list; 消息 tab without automatic
  content insets; composer capped at 5 lines. For Task 5's canvas: ★ hide the tab bar while a thread is open.
- Chat thread screen (2026-11-06, ★ by default, plan 「Thread screen defaults」): 120 A built as the canvas draws it
  (spinner while sending, no dimming; the Answers list says "dim", veto to switch); ! offers 重发 / 删除; the item card
  is a fixed bar and 看详情 opens the status or ride screen in its own tab; 举报 is a confirm-and-send until Task 6's
  sheet; time lines every hour gap; speaker names in ride groups; tab bar hidden in a thread; drafts kept per thread.
- Chat report and block (2026-11-06, ★ by default, plan 「Report and block defaults」): 提交 needs a reason; the offer to
  block after a report is the only confirmation; ride groups list members by name under 举报成员 / 屏蔽成员 / 解除屏蔽;
  解除 asks first; the report note is not kept across restarts; 「消息发不出去」 under every refused send; 举报 stays
  available in a ride you left.
- Chat images (2026-11-06, ★ by default, plan 「Image defaults」): a picked photo sends at once as its own message; 2048
  px JPEG 0.7; 3:1 crop and a 72 pt minimum in the bubble; Quick Look keeps its share button; 复制 copies the picture;
  unreferenced uploads are swept after seven days.
- Chat 消息 list (2026-11-06, ★ by default, plan 「消息 list defaults」): one inset grouped card; red unread dot like the
  tab badge; 「我：」 and group 「名字：」 prefixes; empty moment with 「去看看悬赏」; a failed page retries only on 重试; a
  reload asks again for every row shown (up to 100) and replaces the list.
- Chat entries (2026-11-06, ★ by default, plan 「Entry defaults」): 发消息 on the status screen (beside the main action,
  or alone) and on the home in-progress card (a VoiceOver custom action there); 群聊 in the ride detail's navigation bar
  (not drawn on the canvas; not on the home ride card); entries hidden until a thread exists; no unread mark on them;
  the thread opens in the 消息 tab over the list.

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
