# Status

Where the mainline stands and what comes next. Update this file in the PR that changes it (a merged step, a new
owner decision, a new queue item). Decisions and their reasons live in the specs and `docs/research/`; this file only
points to them.

Updated: 2026-11-12 (owner answered 273–278 A; coin purchase client and UI built on the local StoreKit and stack (Tasks 4–5): 买貘币 on the 貘币 page opens a sheet with the server's three packs, the no-balance card of the bounty and ride confirm pages lists them, coins show only after the server credits, a paid but unconfirmed purchase reads 购买处理中 and is finished only after a 200, a negative balance after a refund shows its reason; found and fixed: a negative balance made the post confirm pages fail to load; ★ B1–B13 for veto); 2026-11-12 (owner answered 129–149, all ★; 问小貘 Task 3: the consent page on the first 发送, 我的 → 小貘 with the cloud switch, one gate for every cloud call; 149 A: at most 5 fed leaves a day, provisional; ★ C1–C11 for veto); 2026-11-11 (IAP and Live Activity spikes: local purchases run through an XCUITest `SKTestSession` harness, not `expo run:ios`; buy, Ask to Buy and relaunch credit once against the local `iap-verify`; a refund made in the test session never reaches the app; `Xcode` transaction ids are namespaced by purchase date; the Live Activity renders on the Simulator Lock Screen and Dynamic Island from our own plugin behind a prebuild flag; ★ K1–K5, L6–L7 for veto); 2026-11-11 (queue 0d: the open UI case failures were checks measuring the wrong thing, fixed; `bounty_post_art`'s lost tap not reproduced); 2026-11-11 (266 A: sheets with a SwiftUI text field resign it before they close; the payee save crash reproduced under load, 5 of 72 runs before and 0 of 72 after); 2026-11-11 (#112 review fixes: refund notices in any order, a stricter local gate, the signed path tested in the Edge Runtime; ★ S13; Sandbox on hosted recorded as a launch item); 2026-11-11 (owner answered 268–272 and 279; the coin-purchase server is built and tested locally, not reachable from the app: `iap-verify`, `iap-notify`, refunds take the whole pack back; Apple's server library does not run in the Edge Runtime, so a port is held to its verdicts; ★ S1–S12 for veto); 2026-11-11 (plans for the account-free halves of in-app purchase and the Live Activity; questions 268–278); 2026-11-10 (the unpaid hint shows with a draft; forms with a number pad dismiss it on scroll, ★ for veto; the payee save crash waits on an owner choice); 2026-11-10 (CI's `supabase` job runs pgTAP, `test:deno` and `test:stack` on a fresh local stack on every PR; two stale payment stack tests fixed; verify:full on main: 1052 of 1174 first-run passes; number pads typed by tapping; two app bugs queued); 2026-11-09 (the 消息 list no longer stalls around a reload; a head read that shrinks a list asks for the next page, measured on all three lists; `bounty_post_place` passes; a stale 消息 list pages on (★ for veto); 问小貘 server and draft contract built with a fake provider, not reachable from the app; the board card and the map card show the poster's tier whole, name above tier; 264 A: rides closed without a Tapiro payment no longer count toward distinct people); 2026-11-07 (the milestone's en and ms cases done, the profile tier shows whole; reviews, profile, mascot level, coins in 我的, weekly feed and invites done: milestone run and Implementation Record; pinned bottom bars opaque; selected chips and the home status bar readable in dark; review and coin paging no longer stall around a reload; mascot level and weekly feed built; closed rides count toward 靠谱度; reviews can be reported); 2026-11-06 (owner answers: questions 238–255 and every pending ★ accepted; opaque secondary buttons in
pinned bars; reviews, profile, mascot level, weekly feed and invites: plan, server and client core).

## Built and merged

| Area                    | Spec                                               | Notes                                                                                                                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation steps 1–4    | `docs/specs/2026-10-11-foundation-design.md`       | Accounts, shell and navigation, payee methods, payment and stickers                                                                                                                                                                                                                            |
| Bounty steps 1–9        | `docs/specs/2026-10-11-bounty-design.md`           | Milestone run and walkthrough: `docs/walkthroughs/2026-10-31-bounty.md`                                                                                                                                                                                                                        |
| Money in any currency   | `docs/specs/2026-10-29-multi-currency-design.md`   | RM and ¥                                                                                                                                                                                                                                                                                       |
| Posting a bounty, redo  | `docs/specs/2026-10-31-bounty-post-redo-design.md` | #40                                                                                                                                                                                                                                                                                            |
| Carpool steps 1–7       | `docs/specs/2026-11-02-carpool-design.md`          | Implemented: #48–#51, #53–#55, #57, #70; milestone `docs/walkthroughs/2026-11-03-carpool.md`, owner walkthrough 2026-11-04                                                                                                                                                                     |
| Device time zone (234)  | `docs/specs/2026-11-02-carpool-design.md`          | Rides and bounties show and pick times, and local reminders keep quiet hours, in the system time zone; server rules stay in Malaysia time                                                                                                                                                      |
| Chat (foundation 7)     | `docs/specs/2026-10-11-foundation-design.md`       | Plan `docs/plans/2026-10-30-chat.md` done: server, 消息 list, thread, images, report and block, entries (#63, #72, #74–#77, #79 and this PR); milestone in the step 7 record                                                                                                                   |
| Reviews, profile, coins | `docs/specs/2026-10-11-foundation-design.md`       | Foundation step 6 and the account-free part of step 5, plan `docs/plans/2026-11-06-reviews-profile-coins.md` done (#85–#98); 258 A, 259 A, 264 A (an unpaid ride adds settled, not people); milestone in the record of 2026-11-07. Accessory art is stand-in; 买貘币 built locally 2026-11-12, real purchases wait on the paid account |
| Expo SDK 58             | —                                                  | RN 0.88, 问小貘 as the iOS 27 prominent tab; open, not SDK 58: the 已结清 exit animation (retro); `home_fan_out` fixed (scroll steps, 2026-11-06)                                                                                                                                              |

## In progress

- Carpool: `ride_settle_owing` no longer depends on the clock and `paste_into` pastes again (#73). The `ride.remind.*`
  device checks wait for TestFlight. The local pgTAP `rides_schema` test 39 failure is gone: the main session reset the
  local database on 2026-11-06 (`supabase db reset --local`, test accounts reseeded) and all 49 files, 1721 tests pass.
- Live updates and push (`docs/plans/2026-11-03-realtime-push.md`): steps 1 (server, #62) and 2 (app, #66) are merged;
  the owner's 2026-11-05 answers added quiet hours for the bounty you are on and a live-only `bounty.expired` to
  pending applicants. The milestone run passed on 2026-11-06 (`docs/retros/2026-11-06-live-milestone.md`). Step 3 waits on the paid account;
  the spec stays `approved` until then.

- 问小貘 (foundation step 8, `docs/plans/2026-10-30-ask-tapir.md`): Tasks 1 and 2 are merged with a fake provider: tables,
  RPCs, the 06:00 refill, `ai-draft` and `src/lib/drafts`. The owner answered 129–149 on 2026-11-12, all ★ (the plan's
  「Answers」). Task 3 is built: the consent page opens on the first 发送 in the 问小貘 sheet, 我的 → 小貘 has the
  「让小貘用云端」 switch, and every cloud call goes through one consent gate; the sheet's 发送 runs only that gate until
  Task 4. 149 A is in the server: at most 5 leaves fed per refill day (`fed_enough`); **the 5 is provisional** until real
  usage is measured. Next: Task 4 (the sheet). Nothing is deployed; the real provider waits on the Model Studio account
  (148). The token budget is an unmeasured placeholder and no model ID is pinned. Until the coins page learns the reason
  (Task 5), a `pantry_swap` row would read 「其他」; none can occur from the app.

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

1. Plan partly built: 问小貘 (`docs/plans/2026-10-30-ask-tapir.md`, step 8), Tasks 3–10 not started.
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
   (`feat/buy-coins`, 273 A): the client core and purchase UI (Tasks 4–5). Open: `verification/storekit`, rewritten to buy through the real
   sheet, does not pass yet: the test account lands in onboarding on a fresh Simulator, and XCUITest's tear-down hung
   after the failure (plan 「Client and purchase UI as built」). Waiting on the account: real Sandbox data, `IAP_APP_APPLE_ID`, the
   notification URL, `CONSUMPTION_REQUEST`, the hosted deploy. Live Activity spikes 1–2 done
   (`docs/plans/2026-11-11-live-activity-spike.md`): our own plugin's extension renders on the Simulator Lock Screen and
   Dynamic Island, generated only with `TAPIRO_LIVE_ACTIVITY=1` (kept until push, 278 A); spike 3 needs the owner's
   iPhone. Views built 2026-11-12 (`feat/live-activity-ui`, 274–277 A): Lock Screen and island compact, minimal and
   expanded with 小貘's head, the content builder in `src/lib/live-activity`, the Debug scene `live-activity`; next is
   Task 5 (start on `en_route` / 集合 from the screens, 275 A). Each plan lists what waits on the account.
3. Settled 2026-11-10: the 「dropped typed keys」 of `bounty_post_form`, `bounty_post_optional` and `ride_create_form`
   were HID keys sent to a number pad, which iOS 27.2 ignores; on-screen taps land (see 0).

## Owner decisions pending

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
  Activity, `docs/plans/2026-11-11-live-activity-spike.md`; views built, app wiring next).
- ★ for veto (2026-11-12): Live Activity view choices V1–V11 in `docs/plans/2026-11-11-live-activity-spike.md`
  「★ View choices」 (274's wording over 276's, ride route not shown, 「去碰面吧」 after arrival, the ride's 「出发了」
  final step, a checkmark in the compact island after the end, the stale look, at least 「约 1 分钟到」, two-line Lock
  Screen title, copy from the app, system background, taps open the status page).
- ★ for veto (2026-11-12): the purchase client and UI defaults B1–B13 in `docs/plans/2026-11-11-iap-local.md` 「★ Client
  and purchase UI defaults」 (packs from the server priced by StoreKit, the sheet stays open after a credit, a cancel shows
  nothing, 购买处理中 with 再确认一次 and no re-send on foreground, another account's transaction left alone, the 测试购买
  mark, the ledger copy, the negative-balance line, the packs also on the ride confirm page).
- ★ for veto (2026-11-10): forms that hold a number, decimal or phone pad, and the place search results, dismiss the
  keyboard as soon as they scroll (`docs/plans/2026-10-27-bounty-post.md` deviation 22).
- ★ for veto (2026-11-10): `home_settled_collect` passes when the sticker reaches 我的 in the same frame the 已结清
  card starts to leave; the product timing is unchanged, and the card still leaves in one frame instead of its 320 ms
  exit on iOS 27.2 (open since the SDK 58 retro).
- 问小貘 questions 129–149 are unanswered (plan 「Open questions」). The ★ defaults of its server and draft contract are
  listed for veto in the plan's 「★ Server defaults」 (S1–S13).
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
