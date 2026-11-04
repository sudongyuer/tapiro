# Status

Where the mainline stands and what comes next. Update this file in the PR that changes it (a merged step, a new
owner decision, a new queue item). Decisions and their reasons live in the specs and `docs/research/`; this file only
points to them.

Updated: 2026-11-04.

## Built and merged

| Area                   | Spec                                               | Notes                                                                                                                                     |
| ---------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation steps 1–4   | `docs/specs/2026-10-11-foundation-design.md`       | Accounts, shell and navigation, payee methods, payment and stickers                                                                       |
| Bounty steps 1–9       | `docs/specs/2026-10-11-bounty-design.md`           | Milestone run and walkthrough: `docs/walkthroughs/2026-10-31-bounty.md`                                                                   |
| Money in any currency  | `docs/specs/2026-10-29-multi-currency-design.md`   | RM and ¥                                                                                                                                  |
| Posting a bounty, redo | `docs/specs/2026-10-31-bounty-post-redo-design.md` | #40                                                                                                                                       |
| Carpool steps 1–7      | `docs/specs/2026-11-02-carpool-design.md`          | #48 schema, #49 appeal lapse, #50 list and create, #51 detail and 集合, #53 到了 and 结清, #54 reminders and the event outbox             |
| Device time zone (234) | `docs/specs/2026-11-02-carpool-design.md`          | Rides and bounties show and pick times, and local reminders keep quiet hours, in the system time zone; server rules stay in Malaysia time |

## In progress

- Chat (foundation step 7): the server half that questions 117–128 do not decide is built on its branch (threads,
  members, messages, reports, RPCs, thread creation at bounty `assigned` and ride acceptance, blocks, deletion,
  `chat.message` events); `docs/plans/2026-10-30-chat.md` Task 1 lists what waits on 117–128.

- Carpool milestone: the `ride_*` UI cases ran (zh-Hans light 27 plus 24 regression cases, dark 7, `en` 27, `ms` 20;
  all pass after #55). Waiting on the owner's Simulator walkthrough and the `ride.remind.*` device checks; then set the
  carpool spec to `implemented`.
- Live updates and push (`docs/plans/2026-11-03-realtime-push.md`): step 1 (server) merged in #62; step 2 (app) is
  in its PR: `src/lib/live/` (one private channel, reconnect refetch, dispatch by kind, verify emitter), live handlers
  for home cards, applicants, status, pay sheet and ride detail, the 「可能不是最新」 line, push token registration,
  the bounty permission moment and tap routing for every kind. Its four `live_*` UI cases are written and run with the
  feature's milestone run. Then step 3 waits on the paid account; the spec stays `approved` until then.

## Queue

1. Live updates milestone run: the four `live_*` cases plus the changed applicant, status, ride detail and home cases
   (zh-Hans light, `ms` for the applicant and home cases, `en` for the new `live.offline` key). Chat Task 3 registers
   its `chat.*` handlers on `live.on` and replaces the 消息-tab tap route.
2. Plans written, not built: chat (`docs/plans/2026-10-30-chat.md`, foundation step 7; server half in progress), 问小貘
   (`docs/plans/2026-10-30-ask-tapir.md`, step 8), coins and reputation remaining
   (`docs/plans/2026-10-30-coins-reputation-remaining.md`, steps 5–6).
3. Waiting on the paid Apple Developer account: push delivery, Live Activity, in-app purchase, TestFlight.

## Owner decisions pending

- Live updates and push: the ★ defaults in the realtime spec's Decisions (bounty kinds, push path, push copy; and from
  step 2 the 「可能不是最新」 line, the new-applicant motion, tap routes, the permission moment, reconnect, handlers and
  the push token rules).
- Live updates and push, quiet hours: only the ride you are on is exempt from 23:00–08:00. Should an active bounty
  (`en_route` or `done`) be exempt too? ★ yes, exempt the bounty you are on.
- Live updates and push, expiry: pending applicants get no signal when a bounty expires. ★ add a live-only
  `bounty.expired` to pending applicants.
- Carpool defaults marked "★ by default, owner may veto" in the carpool spec are open to veto at the walkthrough.
- Chat report snapshots (`reports.message_body`) are kept forever today, also after both accounts are deleted. ★ Keep
  them 1 year, then delete. Defaults for the chat server half are in `docs/plans/2026-10-30-chat.md` Rulings.

## Resuming on another machine

- Clone, `bun install`, then follow `AGENTS.md` (Homebrew Node, `pod install` after prebuild, `ios/.xcode.env.local`).
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
