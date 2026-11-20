---
title: China mainland App Store storefront
status: proposed
created: 2026-11-21
approved:
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Research: docs/research/2026-11-21-china-storefront.md. Owner decision: Q34 = B (2026-11-21), ship on the China
mainland storefront in parallel; other regions first. Amends: foundation's AI section (cloud AI is not offered on the
China mainland storefront). -->

## Problem

Many of Tapiro's users are Chinese students who download apps with China mainland Apple IDs, so the app has to be on the
China mainland App Store (owner, Q34 = B). Apple's new App Compliance page (2026-11-16) asks every China mainland app
for an ICP/APP filing number and for two declarations: generative AI, and security assessment. Answering "No" to both is
accepted only when those features are "disabled or geoblocked in China mainland"
(`docs/research/2026-11-21-china-storefront.md` §1, §4). Tapiro's cloud AI (问小貘, chat translation, cloud speech) runs
on Alibaba Model Studio Singapore, which an individual cannot register with the CAC (§3). Today nothing in the app or on
the server knows which storefront an install came from, and there is no place to show the filing number.

China mainland distribution also brings obligations that are not AI: real-name verification before posting or chatting,
keyword filtering and log retention, and PIPL cross-border notice and separate consent (§5).

## Goals and scope

**Do (phase 1, this spec's first PR)**

- Detect the App Store storefront through StoreKit 2 in the kit and expose it through the typed facade.
- On the China mainland storefront (`CHN`) hide every cloud AI surface and refuse any cloud AI call, in the app and on
  the server.
- Tell China mainland users in the app that the AI features are not offered, so nothing disappears unexplained
  (guideline 2.5.19).
- Show the App 备案号 in Settings once it exists; hidden until configured.

**Do later (phases 2–4, before the China mainland submission)** — see Implementation order.

**Don't do**

- AI for China mainland users. It needs a Chinese company, a Bailian cooperation agreement on the Beijing region, local
  CAC registration and an algorithm filing (research §3); revisit when there is a company (phase 5, owner-led).
- Geoblocking by IP or device region. Students are physically in Malaysia; the obligation follows the store the app is
  distributed in, which is the storefront.
- Hiding anything other than cloud AI on `CHN` in phase 1. Bounties, carpool, chat, payments and coins stay.

## Decisions

| #   | Decision                         | Choice                                                                                                                                                                                                                                                                                                                                              | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Alternatives considered                                                                                                                                                                                                                                     |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Storefront source                | StoreKit 2 `Storefront.current?.countryCode` (ISO 3166-1 alpha-3) and `Storefront.updates`, in `modules/tapiro-kit/ios/Store.swift` (`StorefrontWatch`), exposed as `Storefront.countryCode()` and `Storefront.listen(cb)` in the facade (`onStorefront` event, removed on unsubscribe)                                                             | Apple documents `Storefront` (iOS 15+) as "the region … of the App Store storefront for the device", `current` as `static var current: Storefront? { get async }`, and `updates` as the sequence to follow because "the storefront value can change at any time" (developer.apple.com/documentation/storekit/storefront, read 2026-11-21). The storefront is what decides China mainland distribution, not where the student stands                                                                                                                                                                                | A: device region/locale (says nothing about the store). B: IP geolocation (students are in Malaysia). C: StoreKit 1 `SKPaymentQueue.storefront` (legacy API, same data)                                                                                     |
| 2   | Unknown storefront               | No cache and no answer yet: AI closed. StoreKit answered with no storefront (no App Store account), or no answer within 5 s: AI open; an answer that arrives after the 5 s is still applied. A cached storefront is used at cold start and kept when StoreKit returns nothing; "no storefront" is cached as `none`, so such installs start resolved | Closed-until-known means a China mainland install never shows the 问小貘 button for a frame. Only the very first launch is affected, and that launch shows the welcome and onboarding screens first; this matters because changing a tab trigger's `hidden` remounts the tab navigator (expo-router `NativeTabs` docs), so later launches must start resolved. Opening on "no storefront" keeps AI for Simulator and dev builds without an account; an install from the China store had an account when it was downloaded, and the cache keeps `CHN` if the user later signs out of Media & Purchases              | A: closed on unknown (Simulators and signed-out users lose AI). B: open while pending (the button can flash on a China install)                                                                                                                             |
| 3   | Cache                            | Last seen code in `NSUserDefaults` key `storefrontCountry`, written from JS through RN `Settings`; logic in `src/lib/storefront/controller.ts`; refreshed at launch, on return from background and on `Storefront.updates`                                                                                                                          | Keeps the kit a thin StoreKit adapter and the rules testable with `bun test`; `Settings` is how other app state is kept (`src/lib/live-activity/instance.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                      | A: cache in Swift `UserDefaults` (rules then need Swift tests and a synchronous native call)                                                                                                                                                                |
| 4   | Server enforcement               | The app sends `x-tapiro-storefront: <code or unknown>` with every `ai-draft` call; the function refuses `CHN` with 451 `region_unavailable` right after authentication, before metering, memory or the provider. No storefront is recorded on the server                                                                                            | There is no signed storefront to verify at sign-in: `AppTransaction` has no storefront field (its documented properties are app, version, environment, platform, store type, dates and device verification; read 2026-11-21); only purchase transactions carry `storefront`, and most users never buy. A server record built from the client's claim is no stronger than the header itself. The App Store binary always sends the header and a China user cannot change it; sending something else needs a client that is not the app distributed in China. 451 ("Unavailable For Legal Reasons") names the reason | A: profile column written by the client (same trust, plus a migration). B: record the verified storefront from `iap-verify` transactions (covers buyers only; kept as an optional audit signal in phase 2). C: IP geoblock (wrong population, see Don't do) |
| 5   | Missing header                   | Accepted in phase 1; required from phase 2 (refuse when absent)                                                                                                                                                                                                                                                                                     | Builds already on TestFlight do not send it and are not distributed in China. Before the China submission every live build sends it, so absence then means a client we did not ship                                                                                                                                                                                                                                                                                                                                                                                                                                | Require it now (breaks AI on current TestFlight builds for no gain)                                                                                                                                                                                         |
| 6   | Hidden on `CHN`                  | The round 问小貘 tab button (`NativeTabs.Trigger hidden`), the calm card's ask field and its three sample tags, 我的 → 问小貘 row, chat 翻译 / 隐藏翻译 (no translator, so kept translations are not drawn either), and the routes `ask`, `ask-consent`, `ask-memory-entry`, `me/tapir`, `me/tapir-memory` (`Stack.Protected`)                      | These are every entry to cloud AI: the ask sheet holds drafting, answers, image questions and voice input (on-device and cloud speech both live inside it), and the consent screen and 小貘记得 only serve AI. The calm card keeps its greeting. There is no AI step in onboarding (name and language only)                                                                                                                                                                                                                                                                                                        | Keep on-device speech and Foundation Models for `CHN` (on-device Apple Intelligence is unavailable on China mainland iPhones anyway, and voice only fills the ask sheet)                                                                                    |
| 7   | Client gate                      | `createCloudGate` returns `unavailable` without sending when the storefront closes AI, and maps a server `region_unavailable` to `unavailable`                                                                                                                                                                                                      | A second line in the app in case a future entry forgets the UI check; no call ever leaves a China install                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | UI checks only                                                                                                                                                                                                                                              |
| 8   | Telling users                    | Once the storefront has resolved to `CHN` (not while pending), Settings shows a footer under 用户协议 / 隐私政策: 「从中国大陆 App Store 下载的 Tapiro 不提供问小貘、消息翻译和语音输入。」 (en, ms in `account.settings.regionNoAi`)                                                                                                               | Guideline 2.5.19 forbids hidden features; the review notes state the difference and the app says it where a user looks for what the app offers. No canvas board: removal plus one footer line in the system Settings form has no layout choice the owner would weigh                                                                                                                                                                                                                                                                                                                                               | A: keep the 问小貘 button and open an explanation (a prominent control that does nothing useful). B: an explanation page from 我的 (a row for a feature that is not there)                                                                                  |
| 9   | ICP filing number                | Settings, last row of the legal section: 「App 备案号」 and the number, on every storefront, from `expo.extra.icpFiling` in `app.json`; the row is absent while the value is unset or blank                                                                                                                                                         | Aliyun asks for the number "in a prominent place such as the app's settings or about page" (research §2). Showing it on every storefront keeps a legal display independent of detection and costs nothing elsewhere. A config value, not code, is changed when the number arrives                                                                                                                                                                                                                                                                                                                                  | Only on `CHN` (a legal display that depends on detection)                                                                                                                                                                                                   |
| 10  | Review notes                     | Text below, added to App Review notes for every submission from the first China build                                                                                                                                                                                                                                                               | 2.3.1(a) and 2.5.19: the regional difference is stated, not discovered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |                                                                                                                                                                                                                                                             |
| 11  | Real-name SMS provider (phase 3) | Recommend A below; owner decides (paid)                                                                                                                                                                                                                                                                                                             | See Owner decisions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |                                                                                                                                                                                                                                                             |
| 12  | Moderation scope (phase 4)       | Keyword filtering on the server for every bounty, ride and message, whatever the poster's storefront; records retained 6 months in a server-only table, also after account deletion                                                                                                                                                                 | China mainland users read posts from users on every storefront; filtering only `CHN` posters would leave what they see unfiltered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Filter `CHN` posters only                                                                                                                                                                                                                                   |
| 13  | Release sequencing               | The first App Store release excludes China mainland in App Store Connect → Pricing and Availability; the ICP filing runs in parallel; China mainland is added to availability only once the filing number exists and phases 2–4 are done. The filing domain is likely `tapiro.cn` (not bought yet)                                                  | Owner clarification (2026-11-21): ticket 000CAT107A with Alibaba Cloud asks whether an individual can file and whether Bailian counts as the access resource; a `.app` domain cannot be filed. Without the number Apple will not list the app in China, so availability must not include it                                                                                                                                                                                                                                                                                                                        | Wait for the filing before the first release (delays every other region)                                                                                                                                                                                    |

### App Review notes (decision 10)

> Tapiro on the China mainland storefront does not offer its cloud AI features (Ask Tapir / 问小貘, message translation
> and voice input), to comply with local regulations on generative AI services. The app detects the storefront with
> StoreKit (`Storefront.current`), hides these entry points, and our server refuses AI requests from China mainland
> storefront installs. Settings → (legal section) tells China mainland users that these features are not offered. On
> every other storefront the features are available after the user consents. To see the China mainland behaviour, use a
> Sandbox account whose App Store region is China mainland.

### Owner decisions (open)

- **Q-A Aliyun filing answer**: whether an individual can file this app (overseas servers, user chat) and whether
  Bailian counts as the access resource. Waiting on the owner's ticket 000CAT107A with Alibaba Cloud ICP support.
- **Q-A2 Filing domain**: buy `tapiro.cn` and complete its real-name verification (paid; a `.app` domain cannot be filed).
- **Q-B Mainland server** (paid, ≥3 months prepaid in a mainland region; research §2): A Aliyun lightweight server (needed
  for an Aliyun filing) ★; B Tencent Cloud lightweight server.
- **Q-C SMS provider for +86 verification** (paid; nothing has been signed up for):
  - A ★ Aliyun 短信认证 (Phone Number Verification Service, SMS verify for individual developers): an individually
    verified account can send codes without a signature or template of its own (help.aliyun.com/zh/pnvs, "sms verify for
    individual developers"); package or pay-as-you-go, unit price to be read in the console (not published in what we
    found). Connected through Supabase's Send SMS hook to an Edge Function.
  - B Tencent Cloud SMS, individual account: verification and notice SMS only; 10,000-message package 470 元 (≈0.047
    元/条), 100 free on first activation; needs an approved real-name qualification and signature
    (cloud.tencent.com/document/product/382/9556). Also through the Send SMS hook.
  - C Twilio Verify through Supabase's built-in provider: US$0.05 per successful verification plus the per-SMS rate;
    Twilio states delivery to mainland China is best effort and not ensured (twilio.com/guidelines/cn/sms). Least code,
    worst delivery.
  - D Aliyun 号码认证 one-tap (本机号码校验) at 0.04–0.05 元/次: no SMS, but a carrier SDK in the kit; later, on top of A.

## Data flow and ownership

```
StoreKit ──Storefront.current / updates──▶ kit StorefrontWatch ──facade Storefront──▶ src/lib/storefront
                                                                                         │ state {countryCode, resolved}
                                     NSUserDefaults storefrontCountry ◀──cache──────────┤
                                                                                         ├─▶ useAiOffered(): tabs, home, 我的,
                                                                                         │   thread translator, route guards, Settings
                                                                                         ├─▶ cloud gate (no call when closed)
                                                                                         └─▶ x-tapiro-storefront header ─▶ ai-draft
                                                                                                         (451 region_unavailable on CHN)
```

- `src/lib/storefront/` owns the state; features read it through `useAiOffered()` and never call the kit.
- `RootStack` follows the storefront for the app's lifetime (`useStorefrontFollow`); the kit's update task stops when the
  listener is removed.
- Verify mode replaces the source at its boundary: `-uiVerifyStorefront <code|none>` (default `MYS`), no cache.
- `ai-draft` owns the refusal (`supabase/functions/ai-draft/region.ts`); consent, energy and memory RPCs are database
  calls that send nothing to a model and are not gated server-side (their screens are unreachable on `CHN`).

## Errors and degradation

| Failure                                   | User sees                                            | System does                                                      |
| ----------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| StoreKit never answers                    | AI after 5 s (unless a cached `CHN` keeps it closed) | Resolves as unknown; next foreground refreshes                   |
| StoreKit returns no storefront            | Same as last seen storefront; AI if never seen       | Cache is not overwritten                                         |
| Storefront changes while the app runs     | AI entries appear or disappear at once               | `Storefront.updates` event; cache written                        |
| User on `CHN` reaches an AI route somehow | Lands on the stack's anchor (home or 我的)           | `Stack.Protected` redirects                                      |
| A call is attempted on `CHN`              | Nothing (no entry exists)                            | Gate returns `unavailable`; server would answer 451, no metering |

## UI/UX and motion

### Screens and states

| Screen        | Design board   | States to cover                                                                                                |
| ------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| Tabs and home | none (removal) | `CHN`: no 问小貘 button, calm card with greeting only; other storefronts unchanged (`shell_tabs`, `home_calm`) |
| 我的          | none (removal) | `CHN`: no 问小貘 row                                                                                           |
| Settings      | none           | `CHN` footer; ICP row set / unset; `ms` long copy                                                              |
| Chat thread   | none (removal) | `CHN`: long-press menu without 翻译                                                                            |

### Motion

None: rows and buttons are absent from the first frame; a storefront change mid-session swaps them without animation.

## Known limits

- The header is a client claim (decision 4). A modified client with a China user's token could still call `ai-draft`;
  that client is not the app distributed in China.
- A user who used 小貘记得 on another storefront and moves to `CHN` cannot open it; the entries stay on the server and are
  deleted with the account. Phase 2's PIPL work adds a way to export or delete them without the AI screens.
- Sandbox storefront switching is the only way to see `CHN` before launch; Simulators without an account report no
  storefront.
- On-device Apple Intelligence is never offered on `CHN` either; it is not built yet (`ask.on-device`, planned).

## Implementation order

1. **Phase 1 (this PR)**: kit `StorefrontWatch` and facade; `src/lib/storefront`; hidden AI surfaces and route guards;
   cloud gate; `ai-draft` 451 with unit and stack tests; Settings footer and ICP row; i18n in zh-Hans, en, ms; UI cases
   `storefront_china`, `chat_translate_china`; story map `china.*`.
2. **Phase 2 (no paid dependency, before submission)**: privacy policy PIPL section (overseas recipient Supabase and
   Alibaba Cloud Singapore, contact, rights) and a separate cross-border consent for `CHN` before first use; require the
   storefront header in `ai-draft`; optionally record verified transaction storefronts from `iap-verify` as an audit
   signal; a 小貘记得 export/delete path outside the AI screens; App Store Connect App Compliance answers (owner, account
   rights) and the review notes above.
3. **Phase 3 (needs Q-C)**: real-name for `CHN`: link a verified +86 number (Supabase phone change + Send SMS hook to an
   Edge Function) before posting a bounty, creating a ride or sending a message; other storefronts unchanged.
4. **Phase 4**: server keyword filtering for bounties, rides and messages; 6-month retention of posts and messages in a
   server-only table that survives account deletion; existing report and block flows stay.
5. **Phase 5 (owner-led, optional)**: AI for `CHN` through a Chinese company (Bailian Beijing, CAC registration,
   algorithm filing).

The China mainland submission waits for phases 2–4, the ICP number (Q-A, Q-B) and the 公安联网备案 within 30 days of
launch.

## Verification

- `bun test` (`src/lib/storefront/controller.test.ts`, `src/features/ask/cloudGate.test.ts`,
  `supabase/functions/ai-draft/handler.test.ts`), `bun run test:deno`, and the stack test in
  `supabase/functions/tests/ai-draft.integration.ts` through `supabase functions serve`.
- UI cases `storefront_china` (zh-Hans, ms) and `chat_translate_china`; `shell_tabs` and `home_calm` keep covering the
  default storefront.
- Device: a Sandbox account with App Store region China mainland, then switching the region while the app runs.

## Implementation Record (2026-11-21)

PR: see the branch `feat/china-storefront` PR · Commits: origin/main..feat/china-storefront

Phase 1 only; the spec stays `proposed` (only the owner approves) and phases 2–5 are not built.

### What was built

- StoreKit 2 storefront in the kit: `StorefrontWatch` (`modules/tapiro-kit/ios/Store.swift`), `storefrontCountry`,
  `storefrontStartUpdates`, `storefrontStopUpdates` and the `onStorefront` event (`TapiroKitModule.swift`); facade
  `Storefront.countryCode()` / `Storefront.listen()` with start and stop chained (`modules/tapiro-kit/index.tsx`).
- Storefront state, cache (`storefrontCountry`, `none` for no storefront), 5 s timeout with late answers still applied,
  stale-refresh drop, `useAiOffered`, `useChinaStorefront`, the header value; verify source `-uiVerifyStorefront`.
  Evidence: `src/lib/storefront/`.
- Hidden on CHN: tab button (`src/app/(tabs)/_layout.tsx`), calm card ask field and tags
  (`src/features/home/cards/CalmCard.tsx`, `src/app/(tabs)/bounty/index.tsx`), 我的 row (`MeView.tsx`,
  `src/app/(tabs)/me/index.tsx`), translator (`src/app/(tabs)/messages/[thread].tsx`), AI routes behind
  `Stack.Protected` (`src/app/_layout.tsx`, `src/app/(tabs)/me/_layout.tsx`).
- Cloud gate refuses when AI is closed and maps `region_unavailable` (`src/features/ask/cloudGate.ts`); the sender adds
  `x-tapiro-storefront` (`askService.ts`, `services.ts`).
- `ai-draft` returns 451 `region_unavailable` for CHN before metering (`supabase/functions/ai-draft/region.ts`,
  `handler.ts`).
- Settings: CHN footer and App 备案号 row from `expo.extra.icpFiling` or `-uiVerifyIcpFiling`
  (`SettingsView.tsx`, `src/lib/icpFiling.ts`); copy in zh-Hans, en, ms (`account.settings.icp`, `regionNoAi`).

### Deviations from the design

| Design said                                                                           | Shipped                                                       | Why                                                                                                                                      | Confirmed by                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Decision 2 first draft: a timed-out answer resolves as unknown; only a code is cached | Late answers are applied; "no storefront" is cached as `none` | Review: a slow CHN answer was dropped, and an install without a storefront flipped the tab trigger every launch, which remounts the tabs | Not intent-changing; decision 2 amended before merge |
| Decision 8 first draft: footer whenever AI is closed                                  | Footer only once resolved to CHN                              | Review: the UI case could not tell CHN from "still pending"                                                                              | Not intent-changing                                  |
| —                                                                                     | Decision 13 (release sequencing) added                        | Owner clarification relayed 2026-11-21                                                                                                   | Owner, 2026-11-21                                    |

### Bugs fixed during implementation

- **Symptom:** the new handler test passed under Bun and failed under Deno. **Root cause:** the Deno `bun:test` shim
  spreads each `test.each` case, so bare strings became their first letter. **Fix:** tuple cases
  (`handler.test.ts`).
- Review round (one, all fixed): late StoreKit answer dropped; repeated tab remount for installs without a storefront;
  unordered native start/stop; overlapping refreshes; UI case unable to prove resolution. Tests:
  `controller.test.ts` 「a China answer that arrives after the timeout still closes AI」, 「an install with no storefront
  remembers it and starts the next launch resolved」, 「an older refresh that answers late does not overwrite a newer
  one」.

### Verification

- `bun test` (all), `bun run test:deno`, `bunx tsc --noEmit`, `bun run lint:changed origin/main`,
  `bun run format:check`, `bun run test:kit-swift`, `node scripts/design-check.mjs`, check-specs, check-story-map,
  `python3 -m unittest` in `verification/ui` → exit 0.
- Stack: `supabase/functions/tests/ai-draft.integration.ts` on an isolated stack with `supabase functions serve` from
  this tree → 14 pass, including 「a China mainland storefront is refused through the served function and costs
  nothing」.
- UI: `verify:smoke`; `storefront_china` zh-Hans and ms, light and dark; `chat_translate_china` light and dark; after
  the review fixes `storefront_china`, `chat_translate_china`, `account_settings_long` and smoke again (screenshots in
  the PR).

### Known limits

- The header is a client claim (decision 4); required only from phase 2 (decision 5).
- `china.no-ai.routes` and `china.icp.unset` have no dedicated test (gaps in `docs/story-map.md`).
- `chat_translate_china` itself does not prove the storefront resolved; `storefront_china`'s footer does, with the same
  verify source.
- Device check with a China mainland Sandbox account not done.
