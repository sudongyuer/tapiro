# Status

Where the mainline stands and what comes next. Update this file in the PR that changes it (a merged step, a new
owner decision, a new queue item). Decisions and their reasons live in the specs and `docs/research/`; this file only
points to them.

Updated: 2026-11-03.

## Built and merged

| Area                   | Spec                                               | Notes                                                                                                                       |
| ---------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Foundation steps 1–4   | `docs/specs/2026-10-11-foundation-design.md`       | Accounts, shell and navigation, payee methods, payment and stickers                                                         |
| Bounty steps 1–9       | `docs/specs/2026-10-11-bounty-design.md`           | Milestone run and walkthrough: `docs/walkthroughs/2026-10-31-bounty.md`                                                     |
| Money in any currency  | `docs/specs/2026-10-29-multi-currency-design.md`   | RM and ¥                                                                                                                    |
| Posting a bounty, redo | `docs/specs/2026-10-31-bounty-post-redo-design.md` | #40                                                                                                                         |
| Carpool steps 1–7      | `docs/specs/2026-11-02-carpool-design.md`          | #48 schema, #49 appeal lapse, #50 list and create, #51 detail and 集合, #53 到了 and 结清, #54 reminders and the event outbox |

## In progress

- Carpool milestone: run the `ride_*` UI cases once (zh-Hans light, plus dark, `en` and `ms` as Pace selects), then the
  owner's Simulator walkthrough and the `ride.remind.*` device checks; set the carpool spec to `implemented`.

## Queue

1. Shared live-update layer: `docs/specs/2026-10-31-realtime-push-design.md` (approved, not built). Carpool and chat
   refetch and poll until it exists. The `public.events` outbox and the recording sender exist (carpool step 7); the
   channel, the Broadcast trigger, bounty kinds and `push_tokens` do not.
2. Plans written, not built: chat (`docs/plans/2026-10-30-chat.md`, foundation step 7), 问小貘
   (`docs/plans/2026-10-30-ask-tapir.md`, step 8), coins and reputation remaining
   (`docs/plans/2026-10-30-coins-reputation-remaining.md`, steps 5–6).
3. Waiting on the paid Apple Developer account: push delivery, Live Activity, in-app purchase, TestFlight.

## Owner decisions pending

None. Carpool defaults marked "★ by default, owner may veto" in the carpool spec are open to veto at the walkthrough.

## Resuming on another machine

- Clone, `bun install`, then follow `AGENTS.md` (Homebrew Node, `pod install` after prebuild, `ios/.xcode.env.local`).
- The design canvas is the claude.ai artifact named in each spec; it is not in the repo.
- Local-only state that does not travel: `.verify/` build output (rebuild with `bun run verify:build`), the local
  Supabase database (rebuilt from `supabase/migrations`), and the agent's personal memory notes.
- Unmerged branch kept on purpose: `spike/photo-sticker`.
