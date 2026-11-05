# Status

Where the mainline stands and what comes next. Update this file in the PR that changes it (a merged step, a new
owner decision, a new queue item). Decisions and their reasons live in the specs and `docs/research/`; this file only
points to them.

Updated: 2026-11-06.

## Built and merged

| Area                   | Spec                                               | Notes                                                                                                                                     |
| ---------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation steps 1–4   | `docs/specs/2026-10-11-foundation-design.md`       | Accounts, shell and navigation, payee methods, payment and stickers                                                                       |
| Bounty steps 1–9       | `docs/specs/2026-10-11-bounty-design.md`           | Milestone run and walkthrough: `docs/walkthroughs/2026-10-31-bounty.md`                                                                   |
| Money in any currency  | `docs/specs/2026-10-29-multi-currency-design.md`   | RM and ¥                                                                                                                                  |
| Posting a bounty, redo | `docs/specs/2026-10-31-bounty-post-redo-design.md` | #40                                                                                                                                       |
| Carpool steps 1–7      | `docs/specs/2026-11-02-carpool-design.md`          | Implemented: #48–#51, #53–#55, #57, #70; milestone `docs/walkthroughs/2026-11-03-carpool.md`, owner walkthrough 2026-11-04                |
| Device time zone (234) | `docs/specs/2026-11-02-carpool-design.md`          | Rides and bounties show and pick times, and local reminders keep quiet hours, in the system time zone; server rules stay in Malaysia time |
| Expo SDK 58            | —                                                  | RN 0.88, 问小貘 as the iOS 27 prominent tab; open, not SDK 58: the 已结清 exit animation and `home_fan_out` on iOS 27.2 (retro)           |

## In progress

- Chat (foundation step 7): the server half is merged (threads, members, messages, reports, RPCs, thread creation,
  blocks, deletion, `chat.message` events, report snapshot retention). Questions 117–128 are answered (★, 125 B).
  Tasks 2 (shared block module) and 3 (client core: service, fixtures, store, outbox, live handler, read state and the
  消息 badge, `20261106000000_chat_read_state.sql`) are merged; `docs/plans/2026-10-30-chat.md` Tasks 0 and 4–8 are
  next (no chat screens yet).
- Carpool: two UI test-script problems to fix separately: `ride_settle_owing` depends on the clock (quiet hours defer
  the 24 h reminder in London's early morning) and `paste_into` in `verification/ui/bounty.py` does not paste on the new
  machine (`ride_settle_pay`, `bounty_post_place`). The `ride.remind.*` device checks wait for TestFlight.
- Live updates and push (`docs/plans/2026-11-03-realtime-push.md`): steps 1 (server, #62) and 2 (app, #66) are merged;
  the owner's 2026-11-05 answers added quiet hours for the bounty you are on and a live-only `bounty.expired` to
  pending applicants. The four `live_*` UI cases run with the feature's milestone run. Step 3 waits on the paid
  account; the spec stays `approved` until then.

## Queue

1. Live updates milestone run: the four `live_*` cases plus the changed applicant, status, ride detail and home cases
   (zh-Hans light, `ms` for the applicant and home cases, `en` for the new `live.offline` key). Chat's `chat.*`
   handlers are registered (Task 3); the 消息-tab tap route moves to the thread with the thread screen (Task 5).
2. Plans written, not built: chat (`docs/plans/2026-10-30-chat.md`, foundation step 7; server half in progress), 问小貘
   (`docs/plans/2026-10-30-ask-tapir.md`, step 8), coins and reputation remaining
   (`docs/plans/2026-10-30-coins-reputation-remaining.md`, steps 5–6).
3. Waiting on the paid Apple Developer account: push delivery, Live Activity, in-app purchase, TestFlight.

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
