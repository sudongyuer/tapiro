# Status

Where the mainline stands and what comes next. Update this file in the PR that changes it (a merged step, a new
owner decision, a new queue item). Decisions and their reasons live in the specs and `docs/research/`; this file only
points to them.

Updated: 2026-11-17 (posting a bounty, UI polish from the audit: whole time on the cards, swap badge on 56 pt art, suggestion inside the reward card, optional rows in the 156 A order, rows and hairlines on the system edge, soft bar edge; ★ 24a–24h for veto in the bounty-post plan); 2026-11-17 (UI polish audit, payment, payee methods and sticker book: the month calendar lays seven days per week row so each day sits under its weekday, its chevrons use the accent, the QR add sheet has two full-width buttons, payee fields keep a VoiceOver label and 账号 a visible title, 复制 and the BNM source link reach 44 pt, the payee's settled row shows the amount once; ★ for veto in the multi-currency plan); 2026-11-17 (UI polish audit, home: 小貘's bubble takes its width from the pose and never reaches the car or 小貘, 「+」 over the stage is light glass in dark mode, the settings back title follows an in-app language switch, home paddings on tokens; ★ for veto in the bounty-settle-art plan log); 2026-11-16 (12 A: the home board follows the stack's height change over the 420 ms restack instead of one frame, measured frame by frame in `home_settled_collect`; ★ for veto in the bounty-settle-art plan log); 2026-11-16 (a tap that leaves the accessibility tree unchanged is sent again by the driver, at most twice, and listed in the run summary; 12 lost-tap cases twice each went from 19 pass, 4 flaky, 1 fail to 24 pass, 5 with a retry, for 3 % more wall-clock; ★ for veto); 2026-11-16 (verify:full on 7a63445: 1224 of 1310 first-time passes, 72 flaky, 14 failed; four broken cases fixed; `ask_sheet_worst`'s failures are iOS's accent menu left by AXe's typing; the 已结清 card's exit confirmed as one frame, cause not found); 2026-11-16 (a local refund traced hop by hop, plan 「Refund trace」: it stops inside the Xcode StoreKit test environment, which never hands the refund to the app although Apple documents both `Transaction.updates` and `Transaction.all` for it; the app, `iap-verify` and the ledger hops are tested; what remains is a Sandbox refund on a device); 2026-11-16 (signing out now also cancels ride reminders, as the carpool spec says, and forgets the ride and bounty note drafts, the ride cache, chat images, stickers and the 问小貘 consent read; `src/lib/sessionLifetimes.test.ts` fails when a module-level store has no declared lifetime or a session store is not cleared when the session ends); 2026-11-15 (owner answered three 问小貘 follow-ups A: on-device Foundation Models not built now, decided after the owner tries the cloud path on a real phone; Jev not adopted, under the plan's 「Consider later」; the public privacy page follows the in-app policy, #137 open for review); 2026-11-15 (问小貘 review leftovers: consent rows read name above value, leading-aligned; any error card hides the sheet's suggestions as the hungry card does; the home calm card's first tag is a question 小貘 can answer, ★ K3 for veto); 2026-11-15 (问小貘 done on the fake provider, Task 10: copy pass, story map, milestone run, step 8 record; waiting on the owner: 148 account and smoke run, device walkthrough; not built: on-device Foundation Models, long-press spike); 2026-11-15 (问小貘 Task 8: the dizzy 小貘 on the sheet's error card; 小貘记得 on 我的 → 小貘 with a switch, swipe delete, an editor, 添加 and 全部删除; 小貘 asks 「要小貘记住吗？」 and saves only on 记住; drafts and answers name the entry used with 改; the server sends the newest 30 entries with drafts and answers only and keeps at most 50; consent version 2 names them; owner answered 281–285 A; ★ M1–M18 for veto); 2026-11-14 (tapiro.app: a static introduction site for the Stripe application, source in `website/`); 2026-11-13 (the report sheets' reason tap is not a picker problem: 0 misses in 45 taps; a local `functions serve` that fails with 「destination … must be a directory」 is a scratch workdir recreated at the same path, which Docker Desktop keeps cached, not CLI 2.122.1); 2026-11-13 (问小貘 Task 9, server side: `ai-draft` can call Qwen on Model Studio Singapore with pinned snapshots, flash for translate and answer, plus for drafting and screenshots, Qwen ASR for the mic's cloud path charged per billed second; DeepSeek through the same account as a fallback, off until question 285; every provider failure is 小貘晕了 with nothing charged; tested against a mock Model Studio in the Edge Runtime; the smoke run and the token budget wait on the account; ★ P1–P18 for veto); 2026-11-13 (问小貘 Task 7: the microphone in the sheet works: a card explains the microphone and speech recognition before the system prompts, a tap listens with the words appearing in the field and a red 停, nothing is sent until 发送; on-device engines first, otherwise the recording goes through consent to the fake cloud transcription, metered as `transcribe`; the real engines wait on a device; ★ V1–V14 for veto); 2026-11-12 (问小貘 Task 5: a five-segment belly beside 小貘 that follows each answer and explains itself on a tap, orange with 「还能再帮一次左右」 at one segment; an empty belly shows the hungry 小貘 with 喂一片嫩叶, a coin swap that feeds at once (one server call, confirmed in a system action sheet), 吃撑了 after five feeds or 明早再来; feeding flies a crayon leaf to 小貘 and fills the bar in 0.8 s; 我的 → 小貘 has the crayon jar with its count and the coin swap; ★ E1–E12 for veto); 2026-11-12 (the local StoreKit harness passes all five cases against the real 买貘币 sheet: the test account is marked onboarded by its Debug scene, the 3 h tear-down hang was an async set-up deadlocking the main actor, the first case after a fresh install read an empty catalog until the app had run once); 2026-11-12 (Live Activity Task 5: starts by itself on the poster's `en_route` and at a ride's 集合 while Tapiro is open, updates while open, ends with the final step and 15 minutes or at once on cancel and sign out, recovered with `list` after a relaunch; ★ W1–W11 for veto); 2026-11-13 (the post form's type row keeps 「Ambil」 on one line beside 「Ikut tajuk」 in ms: the menu picker keeps its own width; `bounty_post_form` and `ask_sheet_draft_fill` assert it); 2026-11-13 (sign-out clears per-user stores on the auth change itself, not on a last render of the tabs: the same user signing back in rescans unfinished purchases and reloads coins, chat, payments, payees, live bounties and reputation; signing out, or a session the server ends, forgets the 问小貘 words and conversation as D4 says); 2026-11-12 (the local StoreKit harness passes all five cases against the real 买貘币 sheet: the test account is marked onboarded by its Debug scene, the 3 h tear-down hang was an async set-up deadlocking the main actor, the first case after a fresh install read an empty catalog until the app had run once); 2026-11-12 (Live Activity Task 5: starts by itself on the poster's `en_route` and at a ride's 集合 while Tapiro is open, updates while open, ends with the final step and 15 minutes or at once on cancel and sign out, recovered with `list` after a relaunch; ★ W1–W11 for veto); 2026-11-12 (问小貘 Task 4: the sheet drafts, answers and asks one question back with buttons; a screenshot with several requests offers each; 填进表单 fills the post form with a 1.2 s glow, 「小貘填了 N 项 · 撤销」 and the fields it could not fill named; typed words and the last conversation stay on the device, 7 days; ★ D1–D15 for veto); 2026-11-12 (owner answered 273–278 A; coin purchase client and UI built on the local StoreKit and stack (Tasks 4–5): 买貘币 on the 貘币 page opens a sheet with the server's three packs, the no-balance card of the bounty and ride confirm pages lists them, coins show only after the server credits, a paid but unconfirmed purchase reads 购买处理中 and is finished only after a 200, a negative balance after a refund shows its reason; found and fixed: a negative balance made the post confirm pages fail to load; ★ B1–B13 for veto); 2026-11-12 (owner answered 129–149, all ★; 问小貘 Task 3: the consent page on the first 发送, 我的 → 小貘 with the cloud switch, one gate for every cloud call; 149 A: at most 5 fed leaves a day, provisional; ★ C1–C11 for veto); 2026-11-11 (IAP and Live Activity spikes: local purchases run through an XCUITest `SKTestSession` harness, not `expo run:ios`; buy, Ask to Buy and relaunch credit once against the local `iap-verify`; a refund made in the test session never reaches the app; `Xcode` transaction ids are namespaced by purchase date; the Live Activity renders on the Simulator Lock Screen and Dynamic Island from our own plugin behind a prebuild flag; ★ K1–K5, L6–L7 for veto); 2026-11-11 (queue 0d: the open UI case failures were checks measuring the wrong thing, fixed; `bounty_post_art`'s lost tap not reproduced); 2026-11-11 (266 A: sheets with a SwiftUI text field resign it before they close; the payee save crash reproduced under load, 5 of 72 runs before and 0 of 72 after); 2026-11-11 (#112 review fixes: refund notices in any order, a stricter local gate, the signed path tested in the Edge Runtime; ★ S13; Sandbox on hosted recorded as a launch item); 2026-11-11 (owner answered 268–272 and 279; the coin-purchase server is built and tested locally, not reachable from the app: `iap-verify`, `iap-notify`, refunds take the whole pack back; Apple's server library does not run in the Edge Runtime, so a port is held to its verdicts; ★ S1–S12 for veto); 2026-11-11 (plans for the account-free halves of in-app purchase and the Live Activity; questions 268–278); 2026-11-10 (the unpaid hint shows with a draft; forms with a number pad dismiss it on scroll, ★ for veto; the payee save crash waits on an owner choice); 2026-11-10 (CI's `supabase` job runs pgTAP, `test:deno` and `test:stack` on a fresh local stack on every PR; two stale payment stack tests fixed; verify:full on main: 1052 of 1174 first-run passes; number pads typed by tapping; two app bugs queued); 2026-11-09 (the 消息 list no longer stalls around a reload; a head read that shrinks a list asks for the next page, measured on all three lists; `bounty_post_place` passes; a stale 消息 list pages on (★ for veto); 问小貘 server and draft contract built with a fake provider, not reachable from the app; the board card and the map card show the poster's tier whole, name above tier; 264 A: rides closed without a Tapiro payment no longer count toward distinct people); 2026-11-07 (the milestone's en and ms cases done, the profile tier shows whole; reviews, profile, mascot level, coins in 我的, weekly feed and invites done: milestone run and Implementation Record; pinned bottom bars opaque; selected chips and the home status bar readable in dark; review and coin paging no longer stall around a reload; mascot level and weekly feed built; closed rides count toward 靠谱度; reviews can be reported); 2026-11-06 (owner answers: questions 238–255 and every pending ★ accepted; opaque secondary buttons in
pinned bars; reviews, profile, mascot level, weekly feed and invites: plan, server and client core).

## Built and merged

| Area                    | Spec                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation steps 1–4    | `docs/specs/2026-10-11-foundation-design.md`       | Accounts, shell and navigation, payee methods, payment and stickers                                                                                                                                                                                                                                                                                                                   |
| Bounty steps 1–9        | `docs/specs/2026-10-11-bounty-design.md`           | Milestone run and walkthrough: `docs/walkthroughs/2026-10-31-bounty.md`                                                                                                                                                                                                                                                                                                               |
| Money in any currency   | `docs/specs/2026-10-29-multi-currency-design.md`   | RM and ¥                                                                                                                                                                                                                                                                                                                                                                              |
| Posting a bounty, redo  | `docs/specs/2026-10-31-bounty-post-redo-design.md` | #40                                                                                                                                                                                                                                                                                                                                                                                   |
| Carpool steps 1–7       | `docs/specs/2026-11-02-carpool-design.md`          | Implemented: #48–#51, #53–#55, #57, #70; milestone `docs/walkthroughs/2026-11-03-carpool.md`, owner walkthrough 2026-11-04                                                                                                                                                                                                                                                            |
| Device time zone (234)  | `docs/specs/2026-11-02-carpool-design.md`          | Rides and bounties show and pick times, and local reminders keep quiet hours, in the system time zone; server rules stay in Malaysia time                                                                                                                                                                                                                                             |
| Chat (foundation 7)     | `docs/specs/2026-10-11-foundation-design.md`       | Plan `docs/plans/2026-10-30-chat.md` done: server, 消息 list, thread, images, report and block, entries (#63, #72, #74–#77, #79 and this PR); milestone in the step 7 record                                                                                                                                                                                                          |
| 问小貘 (foundation 8)   | `docs/specs/2026-10-11-foundation-design.md`       | Plan `docs/plans/2026-10-30-ask-tapir.md` Tasks 1–10 (#106, #117, #118, #122, #127–#130, #134 and `feat/ask-wrap`): consent v2, the sheet, 小貘体力 and the pantry, chat translation, voice, 小貘记得, the Model Studio provider; on the fake provider. Not built: on-device Foundation Models (M12; not now, owner 2026-11-15), the long-press spike. Milestone in the step 8 record |
| Reviews, profile, coins | `docs/specs/2026-10-11-foundation-design.md`       | Foundation step 6 and the account-free part of step 5, plan `docs/plans/2026-11-06-reviews-profile-coins.md` done (#85–#98); 258 A, 259 A, 264 A (an unpaid ride adds settled, not people); milestone in the record of 2026-11-07. Accessory art is stand-in; 买貘币 built locally 2026-11-12, real purchases wait on the paid account                                                |
| Expo SDK 58             | —                                                  | RN 0.88, 问小貘 as the iOS 27 prominent tab; `home_fan_out` fixed (scroll steps, 2026-11-06)                                                                                                                                                                                                                                                                                          |

## In progress

- Carpool: `ride_settle_owing` no longer depends on the clock and `paste_into` pastes again (#73). The `ride.remind.*`
  device checks wait for TestFlight. The local pgTAP `rides_schema` test 39 failure is gone: the main session reset the
  local database on 2026-11-06 (`supabase db reset --local`, test accounts reseeded) and all 49 files, 1721 tests pass.
- Live updates and push (`docs/plans/2026-11-03-realtime-push.md`): steps 1 (server, #62) and 2 (app, #66) are merged;
  the owner's 2026-11-05 answers added quiet hours for the bounty you are on and a live-only `bounty.expired` to
  pending applicants. The milestone run passed on 2026-11-06 (`docs/retros/2026-11-06-live-milestone.md`). Step 3 waits on the paid account;
  the spec stays `approved` until then.

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
     `ask_sheet_worst` measured (2026-11-16): 2 of 10 first runs failed (loads 3–83), both at the 发送 after the
     relaunch; the recordings show iOS's press-and-hold accent menu for 「l」 (ł ļ ľ) over the field from the end of
     `axe type Parcel` until the press, which only closed the menu. Holding `l` with `axe key 15 --duration 1.5`
     opens it 10 of 10; unpaced `axe type Parcel` left it 2 of 12 and 0 of 20; arrow and Escape keys do not close it,
     a tap on the sheet top does (2 of 2). An outside cause (AXe's unpaced typing leaves its last key held). Fixed in
     `fix/ask-typing-paced`: the 问小貘 cases type `parcel` through paced HID keys, and the prompt is tapped until the
     keyboard shows (up to three taps; a tap after a reboot once left no focus). 10 runs of `ask_sheet_worst`, zh-Hans
     light: 9 pass, 0 flaky, 1 fail (run 6: a lost AXe session, then on the retry the first tap on the prompt brought no
     keyboard; the focus retry was added after it and runs 8–10 passed with it). No run showed the accent menu. The full run's two
     other first-attempt 「the prompt never read Parcel」 were the same unfocused prompt (`ask_memory_sheet`).
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

1. 问小貘 follow-ups (`docs/plans/2026-10-30-ask-tapir.md`): on-device Foundation Models as its own task (M12, story `ask.on-device`), not before the owner has tried the cloud path on a real phone (owner, 2026-11-15); the long-press spike on a device (`ask.long-press-voice`); the smoke run and measured budget once the account exists (148, `ask.real-run`).
2. Waiting on the paid Apple Developer account: push delivery, Live Activity, in-app purchase, TestFlight. The
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
   onboarded, synchronous set-up and tear-down end the 3 h hang, a per-case allowance; plan 「Client and purchase UI as built」). Waiting on the account: real Sandbox data, `IAP_APP_APPLE_ID`, the
   notification URL, `CONSUMPTION_REQUEST`, the hosted deploy. Live Activity spikes 1–2 done
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
3. Settled 2026-11-10: the 「dropped typed keys」 of `bounty_post_form`, `bounty_post_optional` and `ride_create_form`
   were HID keys sent to a number pad, which iOS 27.2 ignores; on-screen taps land (see 0).

## Owner decisions pending

- ★ for veto (2026-11-17): posting a bounty polish, 24a–24h in `docs/plans/2026-10-27-bounty-post.md` 「Deviations and
  rulings」 (suggestion line style, split optional group with a place, wrapping time line, equal quick times, 56 pt
  confirm art, soft bar edge, shared row inset reaching the ride form, new copy), and 24i: 12 pt above and below the
  quick times, 16 pt under the amount buttons.
- ★ for veto (2026-11-17): payment and payee polish in `docs/plans/2026-10-29-multi-currency.md` (「★ UI polish, payment,
  payee methods and sticker book」, P1–P6): large 复制 buttons, 账号 in its own titled section with a new example
  placeholder, a system bordered 用相机扫, the footnote-size 汇率来源 link, the payee's settled row without the repeated
  amount.
- ★ for veto (2026-11-17): home polish in `docs/plans/2026-10-30-bounty-settle-art.md` (log, 2026-11-17): the bubble's
  width per pose (200 pt beside the car, 216 pt otherwise), up to four lines with the fourth growing upward, the home
  navigation bar always light, and the 2 pt spacing moves onto tokens.
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
- Review and merge #137: `website/privacy.html`'s AI section aligned with the in-app policy, then deploy the site.
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

## Website

`website/` is the static site at https://tapiro.app (and www), written for the Stripe account application (owner,
2026-11-14): introduction, pricing, `/coins`, privacy, terms with the refund policy. It names the operator as Su Dongyu
and contains no "Malaysia" (owner's choices). `/coins` lists the three packs with disabled buttons; taking card payments
on the web is not planned (owner, 2026-11-14). Deploy from `website/` with `bunx wrangler@4 deploy` (Cloudflare Worker
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
