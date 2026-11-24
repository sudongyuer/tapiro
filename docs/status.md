# Status

Where the mainline stands and what comes next. Update this file in the PR that changes it (a merged step, a new
owner decision, a new queue item). Decisions and their reasons live in the specs and `docs/research/`; this file only
points to them.

Updated: 2026-11-25 (小貘 reads the Grab receipt total into the ride split; story audit: `pay.settle` and `bounty.post` are done, the photo sticker moves to a later story; `home.live-activity`, `chat.push` and `chat.live` stay building with what is missing named in the story map: the Live Activity extension is not in release builds and both wait on `APNS_PRIVATE_KEY`; new UI cases `pay_sheet_worst` and `ride_detail_revised_time` close `pay.sheet.worst` and `ride.join.late`). 2026-11-24 (notifications off keep the badge and strip, and one-time cards' seen marks were already built; unpaid bounty payments are pushed to the payer at 24 h and 72 h; 付不了: a payer reports a payment method that does not work and the payee's list asks for a check;
the pay sheet turns writes off without a network; an overdue arrival time says how late on the status page and the
poster's home card; the profile block entry was already built). Before: 2026-11-21 (UI audit batch B, China storefront
phase 1, PostgreSQL 17 stacks, force-push hook, first device test, urgent pushes, UI audit batches C and E).

## Built and merged

| Area                    | Spec                                                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Foundation steps 1–4    | `docs/specs/2026-10-11-foundation-design.md`        | Accounts, shell and navigation, payee methods, payment and stickers                                                                                                                                                                                                                                                                                                                                                      |
| Bounty steps 1–9        | `docs/specs/2026-10-11-bounty-design.md`            | Milestone run and walkthrough: `docs/walkthroughs/2026-10-31-bounty.md`                                                                                                                                                                                                                                                                                                                                                  |
| Money in any currency   | `docs/specs/2026-10-29-multi-currency-design.md`    | RM and ¥                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Posting a bounty, redo  | `docs/specs/2026-10-31-bounty-post-redo-design.md`  | #40                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Carpool steps 1–7       | `docs/specs/2026-11-02-carpool-design.md`           | Implemented: #48–#51, #53–#55, #57, #70; milestone `docs/walkthroughs/2026-11-03-carpool.md`, owner walkthrough 2026-11-04                                                                                                                                                                                                                                                                                               |
| Device time zone (234)  | `docs/specs/2026-11-02-carpool-design.md`           | Rides and bounties show and pick times, and local reminders keep quiet hours, in the system time zone; server rules stay in Malaysia time                                                                                                                                                                                                                                                                                |
| Chat (foundation 7)     | `docs/specs/2026-10-11-foundation-design.md`        | Plan `docs/plans/2026-10-30-chat.md` done: server, 消息 list, thread, images, report and block, entries (#63, #72, #74–#77, #79 and this PR); milestone in the step 7 record                                                                                                                                                                                                                                             |
| 问小貘 (foundation 8)   | `docs/specs/2026-10-11-foundation-design.md`        | Plan `docs/plans/2026-10-30-ask-tapir.md` Tasks 1–10 (#106, #117, #118, #122, #127–#130, #134 and `feat/ask-wrap`): consent v2, the sheet, 小貘体力 and the pantry, chat translation, voice, 小貘记得, the Model Studio provider; on the fake provider. Not built: on-device Foundation Models (M12; not now, owner 2026-11-15), the long-press spike. Milestone in the step 8 record                                    |
| Reviews, profile, coins | `docs/specs/2026-10-11-foundation-design.md`        | Foundation step 6 and the account-free part of step 5, plan `docs/plans/2026-11-06-reviews-profile-coins.md` done (#85–#98); 258 A, 259 A, 264 A (an unpaid ride adds settled, not people); milestone in the record of 2026-11-07. The 貘币, the four accessories and the leaf are final crayon or vector art (drawing task, 2026-11-16, 13 C); 买貘币 built locally 2026-11-12, real purchases wait on the paid account |
| Expo SDK 58             | —                                                   | RN 0.88, 问小貘 as the iOS 27 prominent tab; `home_fan_out` fixed (scroll steps, 2026-11-06)                                                                                                                                                                                                                                                                                                                             |
| Accessibility pass      | —                                                   | Plan `docs/plans/2026-11-18-accessibility-pass.md` (A1–A16 for veto): contrast #177, large text and VoiceOver sentences #178, checks and the core-screen tour (`a11y_screens`, `--text-size ax5`) in this PR; device checks `docs/walkthroughs/2026-11-18-accessibility.md`                                                                                                                                              |
| Polish: motion, render  | —                                                   | Plan `docs/plans/2026-11-21-polish-motion-perf.md` (P1–P23 for veto; P4 withdrawn; device sign-off closed by the owner: build A clean, B measured once (no hang), rest waived, `docs/research/2026-11-21-device-perf.md`): one Reduce Motion hook, shared curves, instant press dim, shorter stack timings, small fades, cached formatters, memoised rows, continuous corners                                            |
| UI audit D: layout      | `docs/specs/2026-10-11-foundation-design.md`        | Audit `docs/reviews/2026-11-21-ui-walkthrough.md` O2, H2, L1, P5, P6, S1, S3, H3 (decisions for veto in the record of 2026-11-21): native chip row, keyboard 完成, top scroll edge on every Form screen, a separator on the ride footer bar, accessory on tab roots only                                                                                                                                                 |
| Milestone before TF 2   | `docs/specs/2026-10-11-foundation-design.md`        | Milestone run over #204–#216 (record of 2026-11-21, M1–M4 for veto): Settings 退出登录 confirms, the language step heading below the bar, no floating 完成 on the post form, one sticker count in the fixtures; retro `2026-11-21-milestone-before-testflight`                                                                                                                                                           |
| 付不了 and offline pay  | `docs/specs/2026-11-24-cant-pay-offline-design.md`  | The payer reports a method that does not work (`report_cant_pay`, push `payment.cant_pay`); the payee's list leads with a yellow card and 我的 shows the dot until the method changes or 没问题; the pay sheet reads `expo-network` and turns writes off offline. Decisions CP1–CP8, OF1–OF4 (★ for veto). Hosted: apply migration `20261124000100_payee_cant_pay.sql`                                                   |
| Unpaid reminders        | `docs/specs/2026-11-24-unpaid-reminders-design.md`  | pg_cron `payment-reminders` pushes `payment.reminder` to the payer of a due bounty payment at 24 h and 72 h (rides keep their local reminders); the publish block was already built. Decisions UR1–UR7 (★ for veto). Hosted: apply migration `20261124000300_payment_reminders.sql` and redeploy `notify` (new copy)                                                                                                     |
| Receipt reading         | `docs/specs/2026-11-24-ride-receipt-read-design.md` | `ride.split.receipt`: with a receipt attached, the split sheet offers 「让小貘读总价」; `ai-draft` task `read_receipt` (tool `draft_split`, Qwen plus vision, metered as its own task) fills the total, the organiser checks and sends. Decisions RR1–RR13 (★ for veto). On the fake provider. Hosted: apply migration `20261124000500_ai_read_receipt_task.sql` and redeploy `ai-draft`                                 |

## In progress

- Selection and publish races, scope of gates (branch `test/select-publish-races`): two new stack tests run the
  last two-session races (`bounty.apply.select`: two devices select at once; `coins.ledger.spend`: two publishes take
  the last free slot or coin); the existing locks held, no migration. 先付 and application gates move to `later`
  (new story `bounty.gates`, `pay.prepay-refund`), as bounty decision 7A says; `bounty.board` and `bounty.apply` are done. Decisions for
  veto (★) in the bounty spec's record of 2026-11-24 (selection and publish races).

- Bounty races (`bounty.flow.auto-confirm`, `bounty.flow.cancel`; branch `feat/bounty-flow-races`): the 48 h
  auto-confirm, 「有问题」 pause and restart, no-show and waiver rules were already built and covered on one session; a
  new stack test (`src/features/bounty/status/statusRaces.integration.ts`) runs the two-session races (both sides
  cancel, one helper cancels two bounties, the poster confirms during the job), closing the last gaps; `bounty.flow`
  and `rep.no-show` are done. No migration. Decisions for veto (★) in the bounty spec's record of 2026-11-24 (races).

- Overdue arrival time (`bounty.flow.eta-overdue`, deferred as 3B on 2026-10-29; branch `feat/eta-overdue`): five
  minutes past the helper's ETA without 完成, the status page reads 「预计 … 到，已晚 N 分钟」 in the warning colour and
  the poster's home card 「某某在路上 · 晚了 N 分钟」, moving with the clock without a reload; the five minutes are the
  Live Activity's stale threshold. The profile's ⋯ → 屏蔽 entry (`chat.block.entry`) was already built in #88; the
  story map now says so. Decisions for veto (★) in the bounty spec's record of 2026-11-24.

- Sticker book deck (`docs/specs/2026-11-21-sticker-book-deck-design.md`, plan `docs/plans/2026-11-21-sticker-book-deck.md`,
  branch `feat/sticker-book-deck`): from the owner's reference video, the book is one swipeable deck with a date title,
  今天, 月历 and 分享; 月历 is a scrolling month sheet; 分享 makes a card or month poster (three backgrounds, 存到相册,
  system share) rendered at 3× by the kit. Decisions S1–S9 for veto in the plan. PR open, not merged.
- UI audit fixes (`docs/reviews/2026-11-21-ui-walkthrough.md`), four batches in parallel. Batch B (merged, #210): the
  payee page no longer says 「还没有收款方式」 with cash on (root cause: the empty state ignored cash), the payee list
  refetches on focus and marks a failed refresh stale, the pay sheet's no-method card offers 发消息提醒 with a prefilled
  draft, a missing payment says 这笔付款已不存在, cash has one control and one name, the rate source is named Bank Negara
  Malaysia everywhere, and the onboarding name step waits for the profile (O1). Decisions B1–B7 for veto in the
  foundation spec's record of 2026-11-21. Batch A (keep the user's context: N1, N5, P3, R1, R3, A1, D1 and the
  apply-sheet payee jump, #211): a flow never switches tabs; screens of another tab push over the tabs on the root
  stack, flows inside a sheet present the next sheet over it (decisions A1–A9 for veto in the same spec). Batches C
  (copy) and D (layout) are separate PRs.
  Batch E (the remaining Minor flow findings): 先不翻译 on the translation hungry card, secondary 申请 pills
  in board rows, tappable calm-card lines that prefill 问小貘, refresh and recentre on the full-screen map, failed chat
  images say so, a per-thread 收起提醒 on the safety tip, 去过的 reloads, a confirm before leaving the name step, and
  one stamp radius and map elevation. Decisions E1–E12 for veto in the foundation spec's record of 2026-11-21.

- First TestFlight device test (owner, build 20261120.1739): after 发出去 home now shows the poster's 「等人申请」 card
  at once, and an open board reloads every 60 s (bounty spec, Implementation Record 2026-11-21). The owner's three open
  test bounties on the hosted project (2026-11-20 18:29–18:31 UTC) are left for the owner to cancel or keep.

- TestFlight 1.0.0 (20261121.1730), uploaded 2026-11-22 from main at `d07fde59` (#224–#230: the held stack card
  stays opaque, no floating 完成 on the bank sheet, the sign-out row height, positioning copy without Malaysia or
  students, the sticker book deck), passed processing (`COMPLETE`). The owner skipped the two-phone run on 1036.

- TestFlight 1.0.0 (20261121.1036), uploaded 2026-11-21 from main at `10c8cc61` (#204–#222: the UI audit batches,
  the polish rounds and the milestone fixes of #221), passed processing (`COMPLETE`); the internal group Owner gets it
  automatically. Owner's call (2026-11-21): this internal build did not wait for the rest of the milestone run. Done
  before it: light zh-Hans/en/ms for accounts and home, bounty, 问小貘 and chat, with every failure fixed and rerun.
  Still running after it: coins, pay, payee and profile; reviews and rides; shell, stickers, tier and weekly; the dark
  and AX5 cases. Their findings go to a follow-up PR and the next build. No device test yet (neither iPhone touched).
  AX5 findings fixed in `fix/ax5-truncation` (2026-11-24, decisions A18–A21 in `docs/plans/2026-11-18-accessibility-pass.md`):
  the post form's live card wraps the time and type, the type row is a system `LabeledContent`, the ride ticket wraps
  flight and luggage, and the language step's heading scrolls with the rows.

- China mainland App Store (owner Q34 = B, 2026-11-21; `docs/specs/2026-11-21-china-storefront-design.md`, research
  `docs/research/2026-11-21-china-storefront.md`): phase 1 built (StoreKit storefront in the kit, every cloud AI entry
  hidden on CHN, `ai-draft` refuses CHN with 451, Settings notice and an App 备案号 row from `expo.extra.icpFiling`).
  Next: phase 2 (PIPL section and cross-border consent, header required, review notes), phase 3 (+86 real-name, needs
  an SMS provider), phase 4 (keyword filtering, 6-month retention). The China submission waits on phases 2–4 and the
  ICP number; other regions launch first. Release rule (owner, 2026-11-21): the first App Store release excludes China
  mainland in Pricing and Availability until the ICP number exists; the filing runs in parallel (spec decision 13).
- Carpool: `ride_settle_owing` no longer depends on the clock and `paste_into` pastes again (#73). The `ride.remind.*`
  device checks wait for TestFlight. The local pgTAP `rides_schema` test 39 failure is gone: the main session reset the
  local database on 2026-11-06 (`supabase db reset --local`, test accounts reseeded) and all 49 files, 1721 tests pass.
- Live updates and push (`docs/plans/2026-11-03-realtime-push.md`): steps 1 (server, #62) and 2 (app, #66) are merged;
  the owner's 2026-11-05 answers added quiet hours for the bounty you are on and a live-only `bounty.expired` to
  pending applicants. The milestone run passed on 2026-11-06 (`docs/retros/2026-11-06-live-milestone.md`). Step 3's
  delivery is built as direct APNs (2026-11-20, `docs/specs/2026-11-20-apns-direct-design.md`, D1–D9 for veto); it
  waits on the owner's `APNS_PRIVATE_KEY` and a device run (「Release builds」). The spec stays `approved` until then.
  Owner Q38 A (2026-11-21): time-critical pushes (payment to confirm or not received, chosen as helper, a bounty
  cancelled for its pair, a seat approved or declined, a ride cancelled or moved, a request for a ride leaving before
  10:00) skip quiet hours; the rest still wait for 08:00 Malaysia time (spec decisions table, `push_is_urgent`).
  With notifications turned off the 消息 badge and the strip still follow live signals (`chat.push.off`, UI case
  `push_off_live`, 2026-11-24); nothing in the app or the broadcast trigger depends on the permission or a push token.

## Queue

0. `bun run verify:full` ran on 271ba41 (2026-11-10, 1174 runs, 7 h 46 min, retro `2026-11-10-verify-full-round`):
   1052 passed first time, 122 failed. Fixed in `fix/verify-full-round`: number pads drop AXe's HID keys on iOS 27.2,
   so `keys.py` taps the pad (`bounty_post_form`, `_art`, `_draft`, `ride_settle_split`, `payee_add_bank` pass);
   a lost AXe automation session now stalls and reboots the Simulator; recorded frames read as sRGB (`bounty_select`
   dark); short in-flight windows, a swipe pull, the tile screen, the split applicant row and early call-log reads.
   Then `fix/post-hint-keypad-crash` (2026-11-10): 0a fixed, the pad defect behind 0c fixed in the product; 0b fixed
   in `fix/payee-resign-before-dismiss` (2026-11-11).
   - 0a. Fixed: with a saved draft the 「先付清再发新的」 hint never showed. Logged: the status answered (5 ms), then
     the tile screen, mounting unfocused under the form, blurred and dropped the waiting answer, then the form focused.
     The gate now tracks focus per screen and ignores a blur from a screen that was never focused (unit tests fail on
     the old gate). The code path dates from #40; no run between the 2026-10-31 milestone and this full run ran the
     three cases.
   - 0b. Fixed in `fix/payee-resign-before-dismiss` (266 A): saving a payee sheet crashed the app (SIGABRT,
     UICollectionView 「first responder … refused to resign」 while React removes the sheet's SwiftUI form with its text
     field still first responder). Reproduced under load: `payee_list`, `payee_qr_real`, `payee_add_bank`,
     `payee_add_duitnow`, `payee_qr_alipay` and `payee_qr_wechat` in ms, light and dark, on three Simulators with six
     busy CPU loops, 6 rounds of 12 runs each (two matched pairs of 3 rounds): before the fix 5 crashes in 72 runs (all
     this assertion, at a save in `payee_list` twice, `payee_qr_real`, `payee_qr_wechat` and
     `payee_add_bank`, all dark), with it 0 in 72 (Fisher one-sided
     p = 0.03). The kit's `resignFocus` ends editing on every window (forced)
     and resolves on the next main turn; `afterResign` awaits it before every close, save, stage switch or row removal of
     a form with a SwiftUI field (payee phone, bank and QR sheets, 申请, both 举报 sheets, 回复, 有问题, the ride
     detail sheets, 清空草稿, removing the place, 输入邀请码). The three report and reply sheets had called React
     Native's `Keyboard.dismiss()`, which never reaches a SwiftUI field. A swipe-down of a page sheet is left to UIKit,
     which resigns the field before React unmounts the screen: 11 swipes on the payee phone sheet with the name field
     focused closed it without a crash (one Simulator, no added load; a probe kept out of the repo); the SwiftUI bottom
     sheets (有问题, ride detail) route their swipe through `afterResign`. The payee cases lost typed digits under this load
     (pads typed by tapping since, see 0c).
   - 0c. Number, decimal and phone pads have no Return key, and the SwiftUI forms kept the pad up through a drag
     (measured, A/B): a real user could not put it away. The forms holding a pad and the place search results now
     dismiss the keyboard when they scroll (★ 22 in `docs/plans/2026-10-27-bounty-post.md`, for veto). Cases:
     `bounty_post_optional` and `_currency` drag the form as a person would, `ride_create_form` drags the results
     before picking KLIA2, `ride.form_scroll_to` uses held drags (`ride_create_worst` en and ms pass),
     `home_settled_collect` passes when the sticker lands in the frame the card starts to leave (owner ★, below).
   - 0d. Closed in `fix/open-ui-cases` (2026-11-11), no product bug among them
     (`docs/retros/2026-11-11-open-ui-cases.md`): `payee_list` tapped the centre of the SwiftUI cash toggle row, which
     iOS never flips (0 of 20; a 0.2 s touch on the switch 10 of 10), so cases use `UI.flip`; `home_settled_collect`
     en dark measured the glass tab bar, whose backdrop moves when the taller calm card arrives, and now reads only the
     我的 glyph (0.00 at the start, 0.3–0.9 while the sticker passes); `live_applicants` read the header after this
     bounty's signal because the plist lagged (the video showed 3 人申请 until it), and now places each read by the
     Mac clock (`startedAt` in the verify records); `chat_entry_status` en drags the address card behind each button
     when the longer copy leaves it lower; `bounty_status_poster` pastes its reason, and typed spaces are paced keys.
     Reruns after the fixes at load averages of 3–131: `payee_list` zh-Hans 3/3 and ms light 6/6 plus dark 1/1;
     `home_settled_collect` en dark 3/3, en light 3/3, zh-Hans light and dark 1/1 each; `chat_entry_status` en 3/3,
     zh-Hans 3/3; `live_applicants` after its last change zh-Hans 3/3 and ms 3/3; `bounty_status_poster` ms 3/3,
     zh-Hans light 2/2, dark 1/1; `bounty_apply` 3/3.
     Still open, with what is known: `bounty_post_art` zh-Hans lost the art tap 2 of 6 in an earlier batch and passed
     7 of 7 here (load averages up to 131); the art sits at the top of the form, well above the keyboard, so it is not
     hidden by it; no log of the lost tap survives. `pay_sheet_duitnow` zh-Hans dark failed once in the full run and
     passed 3 of 3 here; no cause found. `home_title_strip` ms: one downward swipe did not always reach the top again
     (1 of 4), so it swipes until the large title is back (ms needed two in 2 of 3 runs; 3/3 ms, 1/1 zh-Hans).

   - 0e. `verify:full` on 0784253 (2026-11-13, retro `2026-11-13-verify-full-cases`), stopped at the 4 h limit after
     230 of 1248 runs (light, `account_*` to `chat_thread_*`; dark and the rest not run): 203 passed, 24 failed, none a
     product bug. Fixed in `fix/verify-full-cases`: `bounty_post_form` ran out of its budget at load 10–12 in all three
     locales because the number pad covered the scroll swipe (it was not load), `bounty_applicants_worst`'s budget, and
     a stale paste in `bounty_post_place`. Open: 19 inputs that never arrived (taps at rest, sheet-dismiss swipes),
     each on a Simulator 8–40 min after its boot and ahead of a lost AXe session; 13 of 14 passed on fresh boots. Runner
     rule B (owner, 2026-11-15; `fix/runner-retry`, retro `2026-11-15-runner-retry`): any failed run reboots its
     Simulator and retries once on another one; a pass on retry is reported `flaky` with the first run kept in
     `first-attempt/`. Measured on the 15 cases that failed on 11-13, 4 rounds each in zh-Hans light (60 runs, three
     Simulators, load median 11): before, 9 of 60 failed (all 8–36 min after boot, 7 on one Simulator); after, 5 first
     runs failed, 4 passed on the retry and 1 failed twice (`ask_sheet_worst`, which also failed 2 of 4 before, once
     at the same 「Parcel」 prompt step; open), for 150 s more wall-clock (42 min 16 s against 39 min 44 s).
     `chat_report_message`'s missed reason tap was measured (2026-11-13, `fix/report-reason-tap`): 0 misses in 45 taps on the row, instant or held, so it is not the picker and the case
     is unchanged; two of its three misses fit the same aging-Simulator loss, one is unexplained.

   - 0f. `verify:full` on 7a63445 (2026-11-16, retro `2026-11-16-verify-full-1116`, 1310 runs, 10 h 23 min, 100 reboots
     of which 42 lost AXe sessions): 1224 passed first time, 72 flaky (38 first attempts a lost AXe session, 33 an
     assertion, 1 a timeout), 14 failed on both attempts. Fixed in `fix/verify-full-1116-cases`, all broken cases, no
     product bug: `ride_create_cost` en asserted the 35 pack while the longer notice kept it below the fold (it scrolls
     now); `bounty_status_helper` en and ms swiped the wheel at 62 % of its width, which in 12-hour locales is AM/PM and
     cannot move past PM in the afternoon (it swipes the minute column); `shell_ask_tapir` ms dark sampled the glass
     sheet's edge over a light ride card (96) and now samples the opaque prompt field; `coins_buy_processing` read the
     calls plist before the verify call reached it (it waits for it). Reruns after the fixes: the four cases in zh-Hans
     light and dark, en and ms light and dark where they run, 17 pass and 3 flaky (two lost sessions, one
     `bounty_status_helper` zh-Hans light 「the old time never shows struck after 好」, after the wheel step), smoke 4/4.
     Rerun with the runner on 2026-11-16 (`fix/verify-followups-1116`, retro `2026-11-16-verify-followups`): fixed,
     both broken cases: `bounty_applicants_worst` en dark failed again on both attempts because Vision's box for
     「Helped 128 times」 starts at x 90.0 against the row's 92 (slack 1); the row is widened by 4 pt for that read (then
     en dark, zh-Hans light and dark pass). `shell_minimise` en dark was flaky again at 135 with the minimised 小貘 button
     over a light Apply button; the minimised button no longer asserts its glass luma (backdrop not chosen by the
     case), the opaque head still must show its dark or light form (then en dark, zh-Hans light and dark pass). Passed
     on rerun with no change, cause not reproduced: `profile_report_review` 3 of 3, `_all` 2 pass and 1 flaky (the tap on
     全部评价 changed nothing, a different step from the night's open 举报 menu), `payee_list` ms dark,
     `bounty_post_place` and `ask_memory_sheet` zh-Hans dark, `bounty_post_optional` zh-Hans light, 1 of 1 each. The
     night's menu that stayed open, the flaky `_all` and the two flaky 问小貘 cases in `fix/ask-typing-paced` are all a
     tap that left the screen unchanged; recordings show no app reaction, so they are counted with the aging-Simulator
     input loss of 0e. `pay_sheet_duitnow` (pasteboard, 0d) not rerun.
     `verify:full` on 7c2a719 (2026-11-18, retro `2026-11-18-verify-full-1118`, 1326 runs, 11 h 38 min, 137 reboots;
     a first start under four sibling Release builds, load 880, was stopped after 30 min and restarted): 1204 passed
     first time, 19 passed with a tap retry (no target retried in most of its runs), 69 flaky (37 first attempts an
     assertion, 28 a lost AXe session, 4 a timeout), 34 failed on both attempts. Evidence and the run log:
     `docs/research/evidence/2026-11-18-verify-full/`. Fixed (`fix/verify-full-1118-cases`): the runner turns off
     `KeyboardAutocapitalization` (the software keyboard #153 keeps up capitalised AXe's first key: 「the prompt never
     read parcel」 read `Parcel`: 8 flaky 问小貘 runs and the first attempts of two failures); `ocr.lines_in` keeps a line both reads agree on once
     (`ask_memory_worst` en and ms counted four lines for two; `chat_entry_home` ms and en read the pill with the zh-Hans
     pass only, now both); `bounty_post_selected_chips` pins 14:00 (今晚 is hidden after 21:00); `bounty_post_no_balance`
     ms scrolls to the cost row under the packs; `keys.on_pad` waits up to 8 s for the pad's Delete key or a Return
     key before it taps the pad, and still taps it when neither shows; the pad is often on screen but not in the tree, so such an entry costs the
     whole 8 s (`payee_add_bank` gets 300 s). This closes `bounty_post_form` zh-Hans light
     (step 1 on main: 3 of 3 runs failed, 6 of 6 attempts, all on `Tapiro Verify`, the pad taps opening 选地点; with the
     change 4 of 5 runs passed first time on `Tapiro Verify`, the fifth flaky at the earlier 填一下赏金 step) and the same failure in `bounty_post_currency` (three locales)
     and `payee_add_bank` en (each passed on the rerun). On `Tapiro Verify` the pad rose up to 7 s after the focus;
     `HardwareKeyboardLastSeen` and `AutomaticMinimizationEnabled` read 1 again by the reward focus (probe) and writing
     them false mid-case changed nothing; typing the digits as HID keys when no pad showed put `0` in the field without
     the form taking it (填一下赏金), so that fallback was dropped; a `simctl erase` of `Tapiro Verify` changed nothing.
     First attempts failed 36 times on `Tapiro Verify` against 9 and 10 on the other two. Fixed in the product
     (#168): 我的 → 小貘 in ms, the spinner that replaces the switch while
     withdrawing let the label unwrap and the rows below jump 20 pt (a hidden, zero-height switch now holds its width);
     the 问小貘 sheet stayed at the top after 知道了 closed the consent page, so in en and ms the note card (#152) pushed
     the composer off the screen (the sheet now follows its content after a reply until the user drags). Open, cause not found: `shell_ask_tapir` en and ms dark read the
     sheet at 105 (the prompt field is translucent since #152, so the sample sees the light ride card; the case's
     opaque-field premise no longer holds); `ride_create_worst` zh-Hans dark (the two-line place name read as not
     left-aligned, both attempts; light passed); `home_settled_collect` zh-Hans dark (0.00 s board follow, then 0.20 s
     leave); `account_flow` zh-Hans light (the paste of `Lin Mo` left the blank `   `, then the 280 s budget; flaky in
     all three dark runs); `bounty_post_place` en and ms light, zh-Hans dark (「Return is still on screen」 after two
     retries on a Return key reported at y 1087, below the screen); `pay_sheet_duitnow` en and ms light (pasteboard,
     0d); `bounty_apply_failed` en light, `payee_add_bank` en dark, `bounty_post_no_balance` ms light second attempt,
     `ask_energy_sheet` zh-Hans dark and `ride_create_form` zh-Hans dark (lost AXe sessions on one or both attempts).
     Follow-ups (2026-11-18, PRs #171–#173 and `fix/verify-ride-settled`; retros `2026-11-18-hid-reward`,
     `-glass-ink`, `-affected-ms`, `-ride-settled-cases`): the HID 「0 in the field」 was the reward's placeholder, which an
     empty field reports as its value. A probe (number pad up, HID `5`) left the grey placeholder, so the form was right
     to say 填一下赏金; no product change. `bounty.typed` now refuses placeholder text, and the zero reward types `00` (#171).
     `shell_ask_tapir` and `shell_minimise` check the appearance by label ink against its ground, not by glass luma (#172).
     `--affected` adds `ms` (`en` without `ms`) to a changed screen's cases (#173). `ride_create_worst` dark: Vision's
     box took in the start dot (reproduced 1 of 3 on main), a case flaw. #174 fixed it by clamping such a box to the row's
     edge; that fix reads drift 0–0.1 pt on all 14 saved screenshots, the night's failure and ms dark included. `home_settled_collect` dark: the leave measured 0.20–0.23 s in 8 runs,
     against a limit of exactly 0.2, now 0.12. Open: the night's one-frame board read at its final place (0.00 s follow)
     was not seen in 8 runs (follow 0.15–0.19 s). The follow is now measured to the first frame of its final settled run; if a one-frame jump
     is real, only a recording of it will show it.
     The 已结清 card's one-frame exit is fixed (`fix/settled-exit`, 2026-11-16): the `exiting` animation did run, but a
     Reanimated exiting view keeps its host index and the calm card mounted in the same commit is inserted after it, so
     it drew over the leave from the first frame (a 1.5 s `FadeIn` on the calm card showed the leave underneath). The
     stack keeps the leaving card as a live child on top until its 320 ms leave ends; `home_settled_collect` now asserts
     the change across the card spans at least 0.2 s (before: 0.00 s, fails; after: 0.27–0.30 s, light and dark). The
     board below now follows over the same 420 ms (12 A, `fix/home-board-follows-stack`): 45 pt in one 33 ms frame
     before, eased over 0.25 s after; the case asserts the follow takes at least 0.12 s, and a jump under Reduce Motion.
     Lost taps are retried in the driver (`fix/verify-tap-retry`, 2026-11-16, retro `2026-11-16-tap-retry`, ★ in
     `verification/ui/README.md` for veto): every `ui.tap`, `tap_label`, `tap_point`, `flip` and `press` compares the
     accessibility tree (sorted-key JSON) before and after; only a tree identical for 3 s sends the tap again, at most
     twice, logged as `tap retry:` and listed in the run summary; the run still passes. `ask.focus_prompt` now uses it.
     Measured on 12 cases with lost taps on record, zh-Hans light, twice each, before and after alternating on the same
     three Simulators and app (evidence `docs/research/evidence/2026-11-16-tap-retry/`): before 19 pass, 4 flaky,
     1 fail (`ask_sheet_worst`, a lost session then 「Missing ask-turn-1」); after 24 pass, 0 flaky, 0 fail, 5 of them
     after 6 retries (关闭, 举报, the prompt, 填进表单, 撤销, 有问题; each screen changed after the first retry, all on
     Verify 3). Wall-clock 1365 s against 1323 s (+3 %, the before runs include their reboots and reruns); a tap that
     changes the screen costs no extra read, as the next read reuses the check's; a retry costs 7–8 s. Intentional
     no-op taps pass `expect_change=False`; the first runs found two the search had missed (own-review long press,
     and field focus under a number pad in `ride_settle_split`, now opted out in `bounty.typed`).
   - 0g. `verify:full` on e763aca6 (2026-11-19, retro `2026-11-19-verify-full-1119`, 1336 runs, 11 h 57 min; evidence,
     run log and rerun log in `docs/research/evidence/2026-11-19-verify-full/`): 1231 passed first time, 26 with a tap
     retry, 56 flaky (32 first attempts a lost AXe session, 15 an assertion, 9 a timeout), 23 failed on both attempts.
     Text size Large and 24-hour time at start and end. Product bugs fixed (`fix/ask-sheet-first-detent`): the 问小貘
     sheet opens at 0.56 instead of 0.5, so 自己填 under 「接着上次」 stays whole when en and ms wrap the subtitle (#165
     moved the header into the bar row; zh-Hans had 5 pt to spare); the belly row's height is held while it loads, so
     the field and its mic no longer drop 26 pt under the finger (`ask_voice_cloud`, and the suggestion tap of
     `ask_sheet_answer` dark). Case flaws fixed (`fix/verify-full-1119-cases`): the places `fail` fixture fails each
     query text once (a key gap sent a partial query that used up the failure); `live_applicants` keeps the channel
     down 32 s; `ride_create_form` settles on the ticket instead of `at_rest` (the caret blinks), re-measures the ticket
     after the time (en 12-hour wraps since #180) and gets 300 s; `bounty_post_optional` scrolls up to the live card;
     `payee_add_bank` and `ask_memory_page` type again once when a value reads wrong; `ocr.same` ignores how a truncated
     line ends; `paste_into` leaves the app and comes back before its retry (stale paste in `account_flow` and
     `bounty_post_place`; not exercised in the reruns). All passed on the rerun build (57 runs; flaky ones were lost
     sessions). BP-13 fixed on `fix/bp13-date-row` (ruling 27 of the bounty post plan): the post form's date rows are the kit's `DateTimeRow`, a system compact `UIDatePicker` given the whole width beside its title, because a compact picker sized to fit measures the text of its previous date and falls back to the short style; `bounty_post_optional` pins the day to 12-09 (`-uiVerifyToday`) and failed on the old form. The other compact pickers (出发, 航班起飞, 新的出发时间, 预计到) moved to `DateTimeRow` on `fix/date-row-pickers` (ruling 28): none showed the short style on the old build when measured, the move is for one picker path; the row takes `titleAbove` for the narrow 改出发时间 sheet (beside it read 「10/12/26」), an ESLint rule flags a compact `DatePicker` under `src/`, and `ride_create_time_day` and `ride_detail_edit_time` hold the long date. The ETA wheel (`EtaSheet`) stays a system wheel.
     `review_sheet` en dark (Submit did nothing on both attempts at 05:17, passed twice later) and the night's
     `ask_memory_page` en light (Save left the editor with both fields filled, once, at a load spike) have no cause.
     Lost sessions on both attempts: `chat_image_viewer` en, `home_fan_out` en, `profile_report_review` ms (all
     passed on rerun). 12-hour round (`--hour-cycle 12`, 79 time-showing cases, zh-Hans and en light, 158 runs): 135 passed, 5 flaky (4 lost
     sessions), 18 failed (one of them lost sessions on both attempts). Product: every time on screen reads in 12-hour form (上午8:47, 9:00 PM, 9:00 PTG; zh-Hans
     writes 早上 before 8:00 and 上午 after, as CLDR does); `chat_thread_long` en 12-hour sometimes opened at the
     oldest message (3 of 4 first attempts that night, 3 of 13 on 11-19 morning; list at its top although it had been
     told to scroll to the end). Fixed on `fix/bp13-chat-12h`: while the thread opens (1.5 s after it shows, or until a
     drag), a pinned list that loses the end goes back to it; 15 of 15 first attempts in en 12-hour then opened at the newest
     (load 5–20; the old build's failures were at an unrecorded, higher load), cause of the jump not isolated. The other failures are cases that assert a 24-hour
     clock; `driver.clock()` now reads the device's cycle and fixed `bounty_board_list`, `_states`, `bounty_detail` and
     `chat_list_*`/`ride_meetup*` patterns; the rest (`ride_detail`, `ride_list`, `ride_settle_owing*`, `bounty_status_helper`, `_states`, `_worst`, and
     `bounty_status_poster`) read set times through `hourcycle.clock_at` and passed in 12-hour zh-Hans and en and in
     24-hour zh-Hans (`fix/verify-followups-1119`); `test_clock_guard.py` now fails a case that hard-codes a clock.
     Ride flight time (`fix/bp13-chat-12h`, carpool plan R12): the picker stored its display text (「9:10 AM」), which
     made checking the draft throw on 下一步 on a 12-hour device, and the confirm sheet wrote a stored `09:10` raw. It
     is now stored as `HH:mm` (`wallClock`) and shown through the device clock (`wallClockText`); `ride_create_confirm`
     reads it through `hourcycle.clock_at` (exemption removed from `test_clock_guard.py`; it failed on the old build in
     en 12-hour). Still raw: the home ride card's `departAt` (verify fixtures only; production has no source yet). Tooling: `merge-when-green.sh` waits for checks on the pushed head (#184);
     `lint:changed` runs the size check.

1. 问小貘 follow-ups (`docs/plans/2026-10-30-ask-tapir.md`): on-device Foundation Models as its own task (M12, story `ask.on-device`), not before the owner has tried the cloud path on a real phone (owner, 2026-11-15); the long-press spike on a device (`ask.long-press-voice`); the smoke run and measured budget once the account exists (148, `ask.real-run`). The first hosted run (2026-11-20) found and fixed an untranslated `translate` and always-discarded drafts (plan 「First live run on hosted」, L1–L2), Model Studio then refused every model with `AccessDenied.Unpurchased` (L4); since 2026-11-21 hosted `ai_metering` shows real `ask` and `translate` calls on the pinned Qwen models, so the account works and the full smoke run (`ask.real-run`) is the next step.
2. Waiting on the paid Apple Developer account: push delivery, Live Activity, in-app purchase (TestFlight: see the
   「Release builds」 section). Real
   sign-in is built (2026-11-19, `feat/native-sign-in`; record in the foundation spec). Signing team: the owner's
   personal team `4RML7RLKML` (Individual), not the Lobehub organisation team (owner, 2026-11-19); it is
   `ios.appleTeamId` in `app.json`. Sign-in has the Apple adapter with a hashed
   nonce and the entitlement, the Google adapter (`@react-native-google-signin/google-signin`, client IDs from
   `EXPO_PUBLIC_GOOGLE_*`), both providers on the local stack. The Google clients and the hosted Apple and Google
   providers exist (2026-11-21, 「Release builds」); it waits on a device run (`account.sign-in.real-*`). Before App
   Store submission: revoke Apple tokens on account deletion (S9; needs a Sign in with Apple key from the owner). The
   account-free halves are planned (2026-11-11): in-app purchase on the Simulator with a local `.storekit` file, the
   local stack and a StoreKit 2 wrapper in the kit (`docs/plans/2026-11-11-iap-local.md`). Built 2026-11-11: the server
   (Task 3: ledger reasons, packs, transactions, `iap-verify`) and the `iap-notify` receiver (Task 9's account-free
   half). After the #112 review: refund notices in any order with the credit leave the buyer
   the pack, the `Xcode` gate needs three independent signs of the CLI's local stack, and the stack test signs Sandbox
   data through a local test root inside the Edge Runtime. Spikes 1–2 done (2026-11-11): the kit's StoreKit 2 wrapper
   (`Store`) and `forwardTransaction` (finish only on a 200), driven from a dev-only Debug scene by
   `verification/storekit` (XCUITest + `SKTestSession`; the scheme's `.storekit` file applies only to Xcode's Run);
   a refund in the test session never reaches the app, so refunds are proven server side only. Built 2026-11-12
   (`feat/buy-coins`, 273 A): the client core and purchase UI (Tasks 4–5). `verification/storekit` buys through the real
   sheet and passes all five cases from a fresh install (2026-11-12, `fix/storekit-harness`: the scene marks the test account
   onboarded, synchronous set-up and tear-down end the 3 h hang, a per-case allowance; plan 「Client and purchase UI as built」).
   App Store Connect products (2026-11-24, `feat/iap-asc-products`): the three consumables exist (`app.tapiro.coins.5`
   6838384831 at MYR 5.00, `.11` 6838384832 at MYR 10.00, `.35` 6838384879 at MYR 30.00; base territory Malaysia,
   every territory but China mainland, zh-Hans, en-US and ms names, review screenshot), matching the hosted
   `iap_products`; `iap-verify` and `iap-notify` are deployed with `IAP_APP_APPLE_ID` and both notification URLs set.
   `scripts/testflight.sh` now stops when a pack is not in App Store Connect (`scripts/iap-preflight.mjs`), and a
   StoreKit answer with no products reads as 「价格没加载出来 · 重试」 (`ui:coins_buy_none`), not an empty shop. Waiting on
   the owner: the Paid Apps agreement with banking and tax (StoreKit returns no products without it), then a TestFlight
   purchase for `coins.purchase.sandbox`; at App Store submission, the three products go with the app version. `CONSUMPTION_REQUEST` is still not handled. Live Activity spikes 1–2 done
   (`docs/plans/2026-11-11-live-activity-spike.md`): our own plugin's extension renders on the Simulator Lock Screen and
   Dynamic Island, generated only with `TAPIRO_LIVE_ACTIVITY=1` (kept until push, 278 A); spike 3 needs the owner's
   iPhone. Views built 2026-11-12 (`feat/live-activity-ui`, 274–277 A): Lock Screen and island compact, minimal and
   expanded with 小貘's head, the content builder in `src/lib/live-activity`, the Debug scene `live-activity`. App wiring
   built 2026-11-12 (`feat/live-activity-start`, 275 A, Task 5): the activity starts by itself while Tapiro is open as
   the poster's bounty goes `en_route` or a ride reaches 集合, updates on the realtime signals and once a minute while
   open, ends with the final step and 15 minutes on 完成 / 出发 and at once on cancel or sign out, and is found again
   with `list` after a relaunch; one server read `live_activity_subjects()`. V5's island checkmark never shows (the
   island drops an ended activity). Remote updates wait on APNs (Tasks 6–8). Each plan lists what waits on the
   account.
3. Done 2026-11-17 (Q8 A): `website/index.html`, `coins.html` and `terms.html` describe 问小貘 as the app does
   (drafts, answers, translation, cloud speech fallback, 小貘记得, consent first, coins swap for leaves).
4. Settled 2026-11-10: the 「dropped typed keys」 of `bounty_post_form`, `bounty_post_optional` and `ride_create_form`
   were HID keys sent to a number pad, which iOS 27.2 ignores; on-screen taps land (see 0).

## Owner decisions pending

- China mainland storefront (spec 「Owner decisions (open)」): Q-A the answer to Alibaba Cloud ticket 000CAT107A
  (can an individual file this app; does Bailian count as the access resource); Q-A2 buying `tapiro.cn` and its
  real-name verification (a `.app` domain cannot be filed); Q-B buying a mainland server for the filing (paid, ★ Aliyun
  lightweight, ≥3 months); Q-C the SMS provider for +86 verification (paid, ★ Aliyun 短信认证; Tencent Cloud SMS;
  Twilio Verify). Decisions 1–13 of the spec are listed for veto.
- Merged under the owner's delegation (2026-11-17): #137 (the public privacy page; deployed 2026-11-17 (version facaca3a)) and #141 (the in-app privacy copy, `fix/app-privacy-copy`: contact address, anonymised AI usage and Jar records on
  deletion, 小貘记得 sent only with drafts and answers, location, no training per Alibaba Cloud's terms, Model Studio's
  retention of at most 30 days, one provider name everywhere, the location permission string naming rides and place
  search). #137 also carries the 30-day retention sentence. The permission string reaches the app only after prebuild.
- Answered 2026-11-16: 9 A (a refund through `iap-notify` while the app is open: the balance still refreshes on the
  next return to the foreground; plan `docs/plans/2026-11-11-iap-local.md` 「Refund trace」), 10 A (the location
  permission string names bounties, rides and place search, #141), 11 A (Model Studio's retention looked up: prompts
  and responses at most 30 days by default, longer when the law or service security needs it, flagged content at most
  2 years; `docs/research/2026-10-04-ai-providers.md` section 7; in the in-app policy on #141 and the website on #137).
- ★ for veto (2026-11-17): carpool polish in `docs/plans/2026-11-02-carpool-foundation.md` (「★ UI polish, carpool」,
  R1–R8): the stamp under the car sticker with text ending before it, 44 pt quick-time chips, the place row as one
  button with 改 overhanging, the compact organiser link, 8 pt under the detail's pinned bar and no bar without an
  action, initial avatars on 结清 rows, 「我的拼车」 without a 0, one icon column in 加点细节.
- ★ for veto (2026-11-17, owner rows of the UI polish audit, decided under the owner's delegation): R10–R11 in the
  carpool foundation plan (the organiser's settling ticket shows Grab 总价 / 每人 / 你出 as 214 A draws; the create and
  confirm pages pin the ticket in a top bar with the system hard scroll edge); P7–P9 in the multi-currency plan (no
  「可以举报（即将开放）」 after 还没收到; the done card's caption wraps at full size; the landed celebration sticker keeps
  the board's larger rest, not built); U8–U9 in the chat plan (a recruiting ride's group card says 还差 n 人 / 已满 from
  a new `need` field in the thread item, migration `20261117000100`; the thread is grouped grey with white bubbles).
- ★ for veto (2026-11-17): posting a bounty polish, 24a–24h in `docs/plans/2026-10-27-bounty-post.md` 「Deviations and
  rulings」 (suggestion line style, split optional group with a place, wrapping time line, equal quick times, 56 pt
  confirm art, soft bar edge, shared row inset reaching the ride form, new copy), and 24i: 12 pt above and below the
  quick times, 16 pt under the amount buttons.
- ★ for veto (2026-11-17, `fix/ui-polish-time-format`, BP-13 and RIDE-19): every clock the app writes follows the
  device's 12/24-hour setting in the app language, so the system pickers and the text beside them agree (ruling 25 in
  `docs/plans/2026-10-27-bounty-post.md`, R9 in the carpool plan). Verify runs set the Simulator to 24 hours unless a
  case chooses 12. The post form's 开始 picker showing the short date (「18/11/26」) did not recur on this build; cause
  not found, and `bounty_post_optional` now fails if it returns.
- ★ for veto (2026-11-17): UI polish choices on the bounty map, board and detail (chip position on both maps, the
  map card's poster row, where the no-location hint shows, spacing and alignment) in
  `docs/plans/2026-10-30-bounty-map.md` 「Deviations and rulings」 and `docs/plans/2026-10-27-bounty-board.md`
  「UI polish」. BB-12 (clock inside the wrapping line on the list card) is not built; it needs a Swift text view.
- ★ for veto (2026-11-17): UI polish choices P1–P10 for bounty apply, applicants and status in
  `docs/plans/2026-10-29-bounty-status.md` 「Deviations and rulings」 (status line tones, a cancelled line in the
  secondary label, the rail and quiet done steps, inline failure cards, the no-payee card with a pinned pill, accent
  confirm in the ETA and issue sheets, footer counters, the undimmed sending button, the 13 pt hold hint). Open
  question there: after 有问题 the 点完成 step shows as current without its check and time (ruling 2), while the 7A
  board keeps it done and puts the reason on the confirm step.
- ★ for veto (2026-11-17): confirmations (audit BS-2, BS-3), C1–C4 in `docs/plans/2026-10-29-bounty-status.md`
  「Deviations and rulings」: every confirmation is the system action sheet as a popover from the control that asked (or
  ⋯), the confirm action above a visible keep button, a tap outside keeps. Since iOS 26 an anchored action sheet hides
  its Cancel and an unanchored one is a centred alert, so 8A's separate bottom Cancel is not available.
- ★ for veto (2026-11-17): UI polish in the account area, P1–P6 in `docs/plans/2026-11-06-reviews-profile-coins.md`
  「★ UI polish, account and mascot level」 (one scrolling delete sheet, picker without header, Settings avatar size, caret
  colour, level card source, one-row labels in the delete sheet).
- ★ for veto (2026-11-17, owner rows, `fix/ui-polish-me-owner`): in `docs/plans/2026-11-06-reviews-profile-coins.md`,
  account P7 (legal rows in Settings, ACC-5) and P8 (moment-title outline, ACC-13); profile P16 (tier and level on 我的,
  ME-4) and P17 (回复 on the face line, ME-13); coins C13 (买貘币 as wide as the cards, ME-10; against 273 A's drawing),
  C14 (history failure in place, G2-9); review R16 (read-only locked sheet, REV-3); entries E11 (envelope, REV-10) and
  E12 (stale notice not converged, REV-12). ME-12 recorded as C15 with its measurement, not fixed.
- ★ for veto (2026-11-17): home and 问小貘 owner rows decided under the delegation (#162): HOME-3, -5, -6, -7 in
  `docs/plans/2026-10-30-bounty-settle-art.md` 「Deviations and rulings」 (plain failed-payments line and a pull that
  retries payments, no 我到了 until a live ride feeds home, the strip skipping the screen on top, the system close on
  the 问小貘 sheet) and U14–U17 in `docs/plans/2026-10-30-ask-tapir.md` (the hungry card waits behind a fresh draft,
  changing E5; one capped title; the filled pantry swap, 137 A over E8; U4 replaced).
- ★ for veto (2026-11-17): reviews polish U1–U9 (`docs/plans/2026-11-06-reviews-profile-coins.md` 「★ Review polish」).
- ★ for veto (2026-11-17): 问小貘 polish in `docs/plans/2026-10-30-ask-tapir.md` (「★ UI polish choices」, U1–U12): one
  failure card with the first sentence as its title, filled cards and system fills in dark, a shorter hungry card, the
  zh-Hans listening hint on one line, a red notice for a failed swap, the off-and-empty 小貘记得 copy, green switches.
- ★ for veto (2026-11-17): chat polish in `docs/plans/2026-10-30-chat.md` (「★ UI polish defaults」, U1–U7): the title's
  width limit, `secondarySystemBackground` failure cards in the thread, the 22 pt ! with a 44 pt target, the 8 pt cut
  under the item card, the shorter translating line, the red failed-block card and the ! before 没解除成功.
- ★ for veto (2026-11-17, UI polish of 我的, 貘币, 邀请 and 主页): B15–B16 in `docs/plans/2026-11-11-iap-local.md`
  (failures on the urgent card, the busy pack keeps its row height) and C10–C12, I11, P13–P15 in
  `docs/plans/2026-11-06-reviews-profile-coins.md` (date column, the failed page as reason plus 重试, −6, 好 on the
  trailing edge, the profile header's spacing, the newcomer numbers on one line, the initial disc on 我的).
- ★ for veto (2026-11-17): payment and payee polish in `docs/plans/2026-10-29-multi-currency.md` (「★ UI polish, payment,
  payee methods and sticker book」, P1–P6): large 复制 buttons, 账号 in its own titled section with a new example
  placeholder, a system bordered 用相机扫, the footnote-size 汇率来源 link, the payee's settled row without the repeated
  amount.
- ★ for veto (2026-11-17): home polish in `docs/plans/2026-10-30-bounty-settle-art.md` (log, 2026-11-17): the bubble's
  width per pose (200 pt beside the car, 216 pt otherwise), up to four lines with the fourth growing upward, the home
  navigation bar always light, and the 2 pt spacing moves onto tokens.
- ★ for veto (2026-11-16, drawing task): G1–G8 in `docs/plans/2026-11-06-reviews-profile-coins.md` 「★ Drawing task
  defaults」: the thanks bubble follows `Motion257Leaf` (「谢谢！◎ +1 貘币」) over `CoinPick1`; no coin in history rows,
  cost rows or the pantry swap (no board draws one); 雨伞 hangs from the trunk; one crayon 嫩叶 replaces the weekly-feed
  teardrop. Art still drawn by us rather than by the image model or a designer: the 12 hand-art illustrations, the
  pantry jar and leaf, and the four accessories come from `scripts/hand-art/drawings.mjs` (91 A's model set waits on a
  Model Studio key; `generate.mjs` has prompts for the 12 only); 小貘 itself waits on a designer (design language,
  Mascot). No stand-in art remains in product UI.
- ★ for veto (2026-11-16): the driver sends a tap again when the accessibility tree stays identical for 3 s, at most
  twice, and a run that needed it still passes but is listed (`verification/ui/README.md` 「★ Tap retries」).
- Answered 2026-11-15: on-device Foundation Models A (not now; all 问小貘 calls are cloud), Jev A (not adopted;
  plan 「Consider later」), the public privacy page A (follows the in-app policy, #137).
- Answered 2026-11-15: 281–284 A (小貘记得: saved only on 记住, all entries at most 30 with drafts and answers, the
  switch stops saving and sending, kept until deleted, at most 50) and 285 A (DeepSeek fallback under the same consent).
- Answered 2026-11-11: 268 A (a refund takes the whole pack back, the balance may go below 0, free posts still work),
  269 A (nearest price point not above), 270 A (coins only), 271 A (no limit of ours), 272 A (sandbox coins credit,
  marked `Sandbox`), 279 B (no RevenueCat; our own StoreKit 2 wrapper and server verification).
- ★ for veto (2026-11-11): the coin-purchase server defaults S1–S13 in `docs/plans/2026-11-11-iap-local.md` 「★ Server
  defaults」 (verification port with Apple's library as the oracle, no OCSP yet, `Xcode` only on a local stack, one
  refund and one reversal per transaction in any order, notifications stored once, a local-only test root), and Task
  4's rule that the app keeps a transaction unfinished on any rejection.
- ★ for veto (2026-11-11): spike choices K1–K5 in `docs/plans/2026-11-11-iap-local.md` (local purchases tested through
  the XCUITest harness; the app also forwards revoked consumables from `Transaction.all`; `Xcode` ids namespaced by
  purchase date) and L1, L6, L7 in `docs/plans/2026-11-11-live-activity-spike.md` (our own plugin; the extension only
  behind a prebuild flag until 278; placeholder views).
- Owner's iPhone needed for Live Activity spike 3 (island while Tapiro is in front, background updates, the consent
  prompt, stale look, free provisioning of the extension); no purchase or account.
- Before launch (owner's call): `Sandbox` purchases credit coins on the hosted project for good (272 A); revisit
  before the App Store release (plan 「Before launch」).
- Answered 2026-11-12: 273 A (买貘币 on the 貘币 page; the 「还差 1 貘币」 card lists the three packs), 274–278 A (Live
  Activity, `docs/plans/2026-11-11-live-activity-spike.md`; views and app wiring built).
- ★ for veto (2026-11-12): Live Activity view choices V1–V11 in `docs/plans/2026-11-11-live-activity-spike.md`
  「★ View choices」 (274's wording over 276's, ride route not shown, 「去碰面吧」 after arrival, the ride's 「出发了」
  final step, a checkmark in the compact island after the end, the stale look, at least 「约 1 分钟到」, two-line Lock
  Screen title, copy from the app, system background, taps open the status page).
- ★ for veto (2026-11-12): Live Activity wiring choices W1–W11 in `docs/plans/2026-11-11-live-activity-spike.md`
  「★ Wiring choices」 (final step then end, so V5's checkmark never shows; poster only; 完成 is the bounty's 到了; all
  ride crew; one activity at a time; not restarted after a swipe; a minute redraw while open; a failed read changes
  nothing).
- ★ for veto (2026-11-12): the purchase client and UI defaults B1–B13 in `docs/plans/2026-11-11-iap-local.md` 「★ Client
  and purchase UI defaults」 (packs from the server priced by StoreKit, the sheet stays open after a credit, a cancel shows
  nothing, 购买处理中 with 再确认一次 and no re-send on foreground, another account's transaction left alone, the 测试购买
  mark, the ledger copy, the negative-balance line, the packs also on the ride confirm page).
- ★ for veto (2026-11-10): forms that hold a number, decimal or phone pad, and the place search results, dismiss the
  keyboard as soon as they scroll (`docs/plans/2026-10-27-bounty-post.md` deviation 22).
- ★ for veto (2026-11-10): `home_settled_collect` passes when the sticker reaches 我的 in the same frame the 已结清
  card starts to leave; the product timing is unchanged, and the card still leaves in one frame instead of its 320 ms
  exit on iOS 27.2 (open since the SDK 58 retro).
- 问小貘 ★ for veto: server and draft contract (S1–S13), consent (C1–C11), sheet (D1–D15), energy and pantry (E1–E12),
  translation (T1–T12), voice (V1–V14), the real provider (P1–P18), errors and 小貘记得 (M1–M18), copy (K1 the sheet's
  tab copy offers only drafting and answers, K2 the in-app privacy paragraph matches the consent page), all in
  `docs/plans/2026-10-30-ask-tapir.md`.
- 问小貘 walkthrough on a device: `docs/walkthroughs/2026-11-15-ask.md`; afterwards, which 问小貘 calls move to the
  on-device model (M12).
- 148, when the account exists: the plan's 「Task 9 smoke run」 (workspace, a key limited to the four pinned models, a
  local run, `bun run ai:budget`, then hosted secrets on the owner's go-ahead).
- The profile header ★ (P11 in `docs/plans/2026-11-06-reviews-profile-coins.md`): the tier keeps its full width and the
  note beside it wraps to a second line when both do not fit.
- The board card ★ (P12, same plan): on the bounty board card and the map card's back the poster's name sits over the
  tier, which always shows in full.
- The opaque bar's ★ (no hairline on its top edge; secondary pills stay `systemGray5`), below. The hard edge has not been
  seen on a device.
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
  bars a secondary pill fills with `systemGray5`; other secondary pills keep `tertiarySystemFill`. Superseded in part
  below: the whole bar became opaque, so the per-pill base is gone.

Later on 2026-11-06 the owner answered 「都按推荐」 (relayed by the main session):

- Questions 256–259 take their ★: 256 A (ride reviews on others' profiles show 「拼车」 without route or reviewer), 257
  a1 + b1 + c1 (envelope seal, crouch-then-grow, leaf drop then chew after `fed`), 258 A (a closed ride counts as
  settled toward 靠谱度 without a Tapiro payment), 259 A (long-press a review → 举报). Recorded in the plan's
  「Questions」.
- Accepted: the ★ defaults of Task 1 (「★ Server defaults」), Task 2 (「★ Client core defaults」), Task 5 (「★ Profile
  defaults」, P1–P10) and Task 6 (「★ Tier-drop defaults」, D1–D8).
- Text rows in pinned bottom bars: ★A, the whole bar opaque; built in `fix/opaque-bottom-bar`. ★ for veto: the bar is
  `systemGroupedBackground` with no hairline on top, so scrolled cards end in a clean cut at its edge; the per-pill
  opaque base went with it, and secondary pills keep `systemGray5`.

## Release builds

- Identifiers (not secret; defaults in `scripts/release-env.sh`, each with a `TAPIRO_*` override): Apple team
  `4RML7RLKML` (the owner's personal team, never Lobehub's `4684H589ZU`); App IDs `app.tapiro` (Push Notifications,
  Sign in with Apple) and `app.tapiro.LiveActivity`; App Store Connect app 「Tapiro」, Apple ID `6837172850`; App Store
  Connect API key `5TGB2NXCG5` (Admin), issuer `aaabce4e-636b-4c19-bed9-d6840d0a2465`, file
  `~/.appstoreconnect/private_keys/AuthKey_5TGB2NXCG5.p8` (never in the repo); hosted Supabase `wkpgoildusumtejzhtkv`
  (ap-southeast-1). Registered devices (automatic signing needs one before the first archive): 「Owner iPhone 13 Pro
  Max」 `00008110-0004455614F8801E` (2026-11-20, iOS 18.7.8, below the deployment target) and 「Owner iPhone 14 Pro」
  `00008120-001248DA1A0BC01E` (2026-11-21, iOS 26.3.1; `bun run device-install 00008120-001248DA1A0BC01E`).
- Before App Store submission (UI audit O3, 2026-11-21): replace the draft Terms and Privacy text (`account.legal.*`) with the final text, and replace the contact line `account.legal.contact` (today a personal Gmail address) with an address on the product domain. The 「草稿」 line is already hidden outside dev and verify builds; the address needs the owner (a mailbox on the domain).
- Pricing and Availability excludes China mainland until the ICP filing number exists (owner, 2026-11-21; China
  storefront spec decision 13).
- Scheduled Edge Functions (`fx-rate`, `payment-proof-cleanup`, `notify`) authenticate pg_cron with a dedicated cron
  secret (Vault `cron_secret` = function secret `CRON_SECRET`, header `x-cron-secret`), not the service role key; a
  missing Vault secret fails the job in `cron.job_run_details` (`supabase/README.md`, 「Scheduled functions」). Set on
  the hosted project 2026-11-20 together with Vault `project_url`; rotate by setting both to a new value.
- The hosted project (created 2026-11-19) gives `anon`, `authenticated` and `service_role` nothing on new public
  tables, sequences and functions (Supabase changelog 45329), so `fx-rate` failed `store_failed` and `account-delete`
  could not read payments. `20261121000200_service_role_grants.sql` grants the Edge Functions exactly what they use
  (pushed 2026-11-21; `fx-rate`, `payment-proof-cleanup` and `notify` answered 200 and a fresh rate was stored).
  Local and CI stacks now start with the same defaults (`api.auto_expose_new_tables = false`), pgTAP
  `edge_function_grants.test.sql` lists each function's grants, and stack-test fixtures write as `postgres` through
  `scripts/local-db.ts`. Local and CI stacks run PostgreSQL 17 like the hosted project (`db.major_version = 17`,
  2026-11-21); a shared local stack started on 15 must be recreated (`supabase stop --no-backup`, then `db:start` and
  `db:test-accounts`), which drops its local data.
- `bun run testflight` (`scripts/testflight.sh`): fresh prebuild, Release archive, checks (hosted URL in the bundle and
  no local one, build number, push and Sign in with Apple entitlements), export with `destination=upload`. Build number
  is the UTC time `YYYYMMDD.HHMM`; the version is `app.json`'s. It never reads `.env` files (`EXPO_NO_DOTENV=1`): the
  anon key comes from `supabase projects api-keys`, so the CLI must be logged in. Google sign-in: Google Cloud project
  `tapiro-515317`; iOS client `1014913967695-bga38t6l6tfr0fghcpip7utjjj1csauu.apps.googleusercontent.com`, web client
  `1014913967695-r8osi0t18a3i7em1g3ob4m6d3q1albs4.apps.googleusercontent.com` (not secret; hosted Supabase has Google
  with both IDs and skip nonce, S2, and Apple with client ID `app.tapiro`, 2026-11-21). They are the release defaults
  in `scripts/release-env.sh` (`EXPO_PUBLIC_GOOGLE_*` or `TAPIRO_GOOGLE_*` override), exported before prebuild so
  `withGoogleSignIn` registers the reversed iOS client ID as a URL scheme; the archive check fails when the built
  `Info.plist` lacks that scheme or the bundle lacks the client ID. Local and dev builds still read them from `.env`.
  Live Activity stays out (`TAPIRO_LIVE_ACTIVITY` unset).
- `bun run device-install <udid>` (`scripts/device-install.sh`): the same Release build against the hosted project,
  installed over the cable with `devicectl` and launched; no TestFlight, no Metro. `xcrun devicectl list devices`
  shows the UDID; `TAPIRO_SKIP_PREBUILD=1` reuses `ios/`. A new iPhone must be registered on the team first, and it must
  run iOS 26 or later (the deployment target); the script checks both before building. The registered iPhone 13 Pro
  Max runs iOS 18.7.8 (2026-11-20), so neither TestFlight nor this script can install Tapiro on it until it is updated
  to iOS 26; the build signed and bundled the hosted URL, the install step has not run on a phone yet.
- Uploaded: 1.0.0 (20261120.1136), 2026-11-20, failed Apple's processing (ITMS-90683: no
  `NSPhotoLibraryUsageDescription`; retro `2026-11-20-photo-purpose-string`). The string now ships in all three
  languages, and `check_bundle` runs `scripts/check-purpose-strings.mjs` on every release build before upload.
  1.0.0 (20261120.1227) uploaded 2026-11-20 with the fix and passed processing (`COMPLETE`). After an upload, `bun run testflight` waits up to 15 min
  (`TAPIRO_PROCESSING_WAIT`) for Apple's processing through `scripts/asc-upload-status.mjs` and fails with Apple's
  error codes on `FAILED`; `node scripts/asc-upload-status.mjs <version> <build>` checks one later.
- External testing (2026-11-24): once processing is `COMPLETE`, `bun run testflight` runs
  `scripts/asc-testflight.mjs <version> <build>`, which waits for the build to read `VALID`, writes 「What to Test」 in
  zh-Hans and en-US (creates them, or updates a different text), adds the build to the external group 「Public」
  (`ac03bf4b-819f-4004-ae13-b49f81d1c0e0`, public link on) and submits it for beta app review unless it already has a
  submission. The text comes from `TAPIRO_WHAT_TO_TEST` (a file) or `scripts/testflight-what-to-test.txt`: `[zh-Hans]`
  and `[en-US]` sections, or one text for both; the preflight refuses the build before archiving when either is
  empty. `TAPIRO_SKIP_EXTERNAL=1` stops after processing (internal group only). When processing outlasts the wait, or
  this step fails, the script prints the command to run it later; `--dry-run` does the reads and prints the writes.
  The app's beta description, feedback address and review contact are set in App Store Connect (2026-11-22), and
  `ITSAppUsesNonExemptEncryption: false` in `app.json` answers export compliance, so a new build needs nothing by
  hand. 1.0.0 (20261121.1730) is in 「Public」 and waits for beta review (submitted by hand, 2026-11-22).
- Push goes straight to APNs (2026-11-20, `docs/specs/2026-11-20-apns-direct-design.md`): the app registers its APNs
  token with `production` (TestFlight) or `sandbox` (cabled Release, dev builds), and `notify` signs an ES256 token with
  key `88Y29CGN9U`. On hosted, `APNS_KEY_ID` and `APNS_TEAM_ID` are set and `notify` is deployed with the migration
  `20261121000100_apns_tokens`; until `APNS_PRIVATE_KEY` exists every push fails as `apns_not_configured` (never shown
  as sent). Owner: Dashboard → Edge Functions → Secrets → add `APNS_PRIVATE_KEY` with the whole
  `AuthKey_88Y29CGN9U.p8` (BEGIN/END lines included), or
  `supabase secrets set --project-ref wkpgoildusumtejzhtkv APNS_PRIVATE_KEY="$(cat ~/.appstoreconnect/private_keys/AuthKey_88Y29CGN9U.p8)"`.
  The hosted poke and drain already reach `notify` with the cron secret. The device
  check is in the spec's Verification; builds before this change register nothing, so install a new one first.
- Waiting on the owner: update the iPhone 13 Pro Max to iOS 26 if it should run Tapiro too; the Paid Apps agreement,
  tax and banking in App Store Connect (in-app purchase); `MODEL_STUDIO_API_KEY` on the hosted Supabase project; adding TestFlight testers.

## Website

`website/` is the static site at https://tapiro.app (and www), first written for the Stripe account application
(owner, 2026-11-14): introduction, pricing, `/coins`, privacy, terms with the refund policy. It names the operator as Su
Dongyu and contains no "Malaysia" (owner's choices). Coins are sold only through Apple in-app purchase at launch (Q20 C,
owner 2026-11-21; foundation 「Coins: purchase」): `/coins` lists the three packs and points to Me → Coins in the app,
terms send coin refunds to Apple, and privacy names Apple, not Stripe, as handling payment. A website top-up with
Stripe may come later once there is revenue (3.1.3(b): IAP stays, the app never mentions or links it). Deploy from `website/` with `bunx wrangler@4 deploy` (Cloudflare Worker
`tapiro` with static assets, the owner's personal account; the `tapiro.app` zone is in the same account).

## Resuming on another machine

- Clone, `bun install`, then follow `AGENTS.md` (Homebrew Node, `pod install` after prebuild, `ios/.xcode.env.local`).
- After pulling an SDK bump, run `bunx expo prebuild --clean --platform ios` once before `bun run ios`; a plain
  prebuild keeps the old SDK's AppDelegate and scene delegate. `bun run verify:build` does this on its own.
- Two phones against the local stack: `bun run db:start`, `bun run db:test-accounts`, then `bun run dev:two` (builds
  the Debug app once, boots two non-verify iPhone Simulators, starts Metro, launches both; `--skip-build` reuses the
  last build). Sign in with 「测试账号」: 小林 on one, 阿明 on the other. Details in `supabase/README.md`, "Test accounts".
- Supabase CLI 2.x (`brew install supabase/tap/supabase@2`): CLI 3.0 rejects the `[inbucket]` block in
  `supabase/config.toml`. CI pins 2.122.1 in `.github/workflows/ci.yml`.
- The design canvas is the claude.ai artifact named in each spec; it is not in the repo.
- Local-only state that does not travel: `.verify/` build output (rebuild with `bun run verify:build`), the local
  Supabase database (rebuilt from `supabase/migrations`), and the agent's personal memory notes (the owner's working preferences are copied into `AGENTS.md`,
  "Working with the owner").
- Unmerged branch kept on purpose: `spike/photo-sticker` (pushed, nothing uncommitted).
