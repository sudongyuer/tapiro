# UI verification

Offline, deterministic UI checks on the iOS Simulator. A verify build (`EXPO_PUBLIC_UI_VERIFY=1`,
Release) runs without network or login; each case drives the real UI with AXe, asserts on the
accessibility tree, and captures screenshots and video in light and dark.

```bash
bun run verify:build          # prebuild if needed, Release build into .verify/DerivedData
bun run verify:ui             # all cases, light + dark → .verify/ui/<locale>/<appearance>/<case>/
bun run verify:smoke          # app_launches, sign_in_fixture, shell_tabs, home_one_card; zh-Hans light
bun run verify:ui --affected  # cases whose DEPS meet the diff against main; zh-Hans light
bun run verify:ui --affected --base main --dark --locales   # also dark, also each case's LOCALES
bun run verify:full           # the full matrix: every case, light + dark, every declared locale
bun run verify:ui design_tokens --appearance dark
bun run verify:clean
```

The runner uses a named Simulator, `Tapiro Verify` (iPhone 17 Pro, newest iOS runtime), and
creates it once if missing; never create Simulators or pass another DerivedData path yourself.
`--affected` collects `git diff --name-only <base>...HEAD`, uncommitted changes and untracked files, and
picks each case whose `DEPS` prefixes (or its own file) match one, printing why. A change to shared code
(`affected.SHARED`: `src/ui/`, `src/lib/`, the root layout and index route, the Debug scenes (`src/debug/`, `src/app/debug/`), `modules/`, `plugins/`, `assets/`,
`app.json`, `package.json`, `bun.lock`, `tsconfig.json`, the runner, driver, selector, breaker and build script)
picks every case; a case without `DEPS` always runs. Smoke and affected run zh-Hans light unless `--dark` or
`--locales` is given; the PR gate is smoke plus affected, and the full matrix runs when the machine is idle and
before TestFlight. `python3 -m unittest test_affected test_breaker` in `verification/ui` covers the selection (and
checks that every case declares `DEPS` that match real paths); CI runs it.
Cases launch in `zh-Hans` (`-AppleLanguages`); a case that shows long copy adds
`LOCALES = ['zh-Hans', 'ms']` to also run in Malay and catch truncation. `ARGS = [...]` adds
launch arguments, such as `-uiVerifyShellFeed <kinds>` to choose the live items (omitted: all
four; `none`: calm) and `-uiVerifyFixture worst|one|empty` to swap the fixture data behind the
same items, the 消息 badge, the fixture user's name and the seeded payee methods (`worst`: 40-character names, long routes,
RM 12,345.60, 1,284 unread; `one`: `Jo`, RM 0.50, 1 minute, 1 unread; `empty`: no payee methods; `worst` also seeds seven payee methods with long names).
`-uiVerifySignedIn [onboarded]` starts with the fixture session already signed in (with `onboarded`, onboarding is also done, so the app opens on home); `reach_home` then only waits for home. Cases that just need home, tabs or payee use it; only cases that test welcome, sign-in or onboarding go through welcome, and they call `ui.at_rest()` (or `sign_in_apple`) before tapping, because any continuous motion blocks `axe tap`.
`-uiVerifyQr <names>` replaces the screenshot picker and camera at the decode boundary: each pick
returns the next fixture in the comma-separated list (`duitnow`, `paying`, `dynamic`, `alipay`,
`wechat`, `none`), so a case can show an error and then a success. The system photo picker never
opens, so captures taken after an injected pick are named `injected-…` and the case docstring says so.
Without `-uiVerifyQr` the app uses the device source (expo-image-picker + `scanFromURLAsync`):
`payee_qr_real` adds the PNGs in `media/` to the Simulator library with `xcrun simctl addmedia`
before each pick, finds the picker cell by the image's tint (Alipay `#b8e4ff`, DuitNow TNG
`#ffd8a8` light modules) and taps it by coordinates, because the picker runs out of process and
`axe describe-ui` does not expose its cells. simctl cannot remove photos, so the library grows by
two images per run; the case does not depend on order or count. The PNGs were made with segno
1.6.1 (scale 12, border 8); the DuitNow payload is a static TNG code for NURUL AINA BINTI AHMAD
with a valid CRC. Each run writes
`result.json` with commit, locale, Xcode, device and `duration_s` (wall-clock seconds of that
case, locale and appearance); the runner ends with a per-case timing table and the total, and
`verify:build` prints its own wall-clock seconds.
`log.txt` lists every AXe call with its duration; a timeout message adds the median call time,
which separates a slow Simulator from a stuck screen. A case gets 180 s unless it declares
`BUDGET = <seconds>`. Three consecutive runs that fail with the same timeout class (screenshot, `axe <command>`, or the case budget) stop the whole run with a render server CPU sample; `python3 -m unittest test_breaker` in `verification/ui` covers the rule. Only one `verify:ui` run may drive the Simulator at a time; a second run
exits instead of interleaving taps with the first. Every run also takes the machine-wide lock `/tmp/ios-ui-verify.lock` shared with other projects' runners and waits while another project holds it, printing the holder. The lock does not cover `verify:build` or
scripts that drive the Simulator outside the runner. Do not click or scroll in the Simulator window
while a run is in progress: a pointer drag reaches the app as a real touch, and a home case once
failed because a stray drag scrolled 悬赏 back to the top.

Shell and home cases sign in through `reach_home`. `Shot` reads screenshot pixels in points, so
cases assert colours against `src/ui/theme/tokens.ts` (`token`, `assert_colour`), the 悬赏令 halo
(`glow`) and the 小貘 button outline (`assert_tapir_button`).

## Cases

| Case                          | Behaviour                                                                                                                                                                                                                                                                                          | Scene            | Shell feed / fixture                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------ |
| `app_launches`                | The app launches offline in verify mode, signed out, and shows the welcome screen on the moment background.                                                                                                                                                                                        | —                | —                                    |
| `welcome_a`                   | Welcome A settles with seven stickers, 小貘's bubble, the wordmark and a 44 pt sign-in panel; tapping a sticker puts its example in the bubble.                                                                                                                                                    | —                | —                                    |
| `welcome_legal`               | The welcome terms line opens 用户协议 and 隐私政策 as draft sheets; the close button and a swipe down each return to the same sign-in panel.                                                                                                                                                       | —                | —                                    |
| `design_tokens`               | The design-tokens scene renders every type role, the status set and a 44 pt accent button in the current appearance.                                                                                                                                                                               | `design-tokens`  | —                                    |
| `sign_in_fixture`             | Verify mode starts signed out and signs in as the fixture user after tapping a provider button.                                                                                                                                                                                                    | `sign-in`        | —                                    |
| `account_flow`                | Sign in with the fixture, set a name, pick a language, reach home, sign out and back in, then delete the account and land on welcome.                                                                                                                                                              | —                | —                                    |
| `account_onboarding_sign_out` | The name step offers a header sign-out action; it returns to welcome, and signing in again restarts onboarding.                                                                                                                                                                                    | —                | —                                    |
| `account_delete_blocked`      | Deleting an account with an unsettled payment shows the reason and the payment, and keeps the delete button disabled.                                                                                                                                                                              | `delete-blocked` | —                                    |
| `account_long_name`           | The name step shows a 40-character prefilled name with the field and continue button at full size.                                                                                                                                                                                                 | `profile-setup`  | —                                    |
| `onboarding_moment`           | The name step sits on the moment background with 小貘's head and the moment title, and keeps a 40-character name in a full-size field.                                                                                                                                                             | `profile-setup`  | —                                    |
| `onboarding_language_moment`  | The language step sits on the moment background with 小貘's head and the moment title above the native picker and a 44 pt get-started button.                                                                                                                                                      | `language-step`  | —                                    |
| `account_settings_long`       | Settings with a 40-character name and long email keeps every row reachable and the delete row visible.                                                                                                                                                                                             | `settings`       | —                                    |
| `settings_language`           | Choosing English in settings switches the settings screen to English at once; choosing the launch language switches it back.                                                                                                                                                               | `settings`       | —                                    |
| `shell_tabs`                  | Four tabs switch screens, 消息 shows its badge, the 62 pt 小貘 button keeps its outline; the accessory is hidden at the top of 悬赏 and shown on other tabs.                                                                                                                                       | —                | —                                    |
| `shell_accessory_tap`         | Tapping the accessory on 拼车, and the inline accessory on a scrolled 悬赏, opens 悬赏 at the top with the live cards fanned out and the accessory hidden.                                                                                                                                       | —                | —                                    |
| `shell_ask_tapir`             | 问小貘 opens from 悬赏 and 拼车 with that tab's subtitle and suggestions; closing it keeps the tab selected.                                                                                                                                                                                       | —                | —                                    |
| `shell_minimise`              | Scrolling 悬赏 minimises the bar (selected tab, inline accessory, 48 pt 小貘), and tapping the minimised tab expands it.                                                                                                                                                                           | —                | —                                    |
| `home_title_strip`            | The 悬赏令 title keeps its white halo expanded, collapsed and after a tab switch; the strip hangs directly under the compact bar.                                                                                                                                                                  | —                | —                                    |
| `home_fan_out`                | Four urgent cards stack and fan out; the accessory stays hidden until the last fanned card passes under the bar.                                                                                                                                                                                   | —                | —                                    |
| `home_live`                   | A ride and a bounty in progress show the live stage with the ride card in front.                                                                                                                                                                                                                   | —                | `rideSoon,bountyInProgress`          |
| `home_calm`                   | With no live items, home shows the calm stage and card, and no tab shows the accessory.                                                                                                                                                                                                            | —                | `none`                               |
| `home_one_card`               | One live item shows one card with no peeks and no stack toggle.                                                                                                                                                                                                                                    | —                | `bountyInProgress`                   |
| `home_three_cards`            | Three live items stack with two peeks and fan out to three cards.                                                                                                                                                                                                                                  | —                | `oweMoney,rideSoon,bountyInProgress` |
| `home_worst`                  | Worst-case data renders on home stacked and fanned, the collapse strip, the accessory and the 消息 badge.                                                                                                                                                                                          | —                | `-uiVerifyFixture worst`             |
| `home_worst_calm`             | The calm card greets a 40-character display name with the ask button at full size.                                                                                                                                                                                                                 | —                | `none`, `-uiVerifyFixture worst`     |
| `home_one`                    | Short and single-count data (`Jo`, RM 0.50, 1 minute, 1 unread) renders on the same surfaces.                                                                                                                                                                                                      | —                | `-uiVerifyFixture one`               |
| `home_worst_inline`           | Scrolling past one worst-case pay card shows the inline accessory with its long title on one line.                                                                                                                                                                                                 | —                | `oweMoney`, `-uiVerifyFixture worst` |
| `payee_list`                  | 我的 shows a red dot for a stale QR; the list shows the default mark, a masked bank number, the re-check banner and the cash toggle clear of the accessory; re-picking the TNG code with an Alipay code confirms the switch and replaces the row; the + menu lists Alipay, WeChat, TNG, then 其他. | —                | `-uiVerifyQr alipay`                 |
| `payee_add_duitnow`           | With no methods, the + menu adds a DuitNow phone; the bank name is required; the saved row is the default.                                                                                                                                                                                         | —                | `-uiVerifyFixture empty`             |
| `payee_qr`                    | From 支付宝收钱码 the sheet shows Alipay's steps; a paying code shows the red card and saves nothing; a DuitNow code is accepted after a wallet-switch line and 发布者会看到 name · bank.                                                                                                          | —                | `one`, `-uiVerifyQr paying,duitnow`  |
| `payee_qr_alipay`             | From 支付宝收钱码 an injected Alipay receive code confirms as 支付宝收钱码 with no wallet-switch line and saves the Alipay row.                                                                                                                                                                     | —                | `one`, `-uiVerifyQr alipay`          |
| `payee_qr_wechat`             | From 微信收款码 an injected `wxp://` receive code confirms as 微信收款码 with no wallet-switch line and saves the WeChat row.                                                                                                                                                                       | —                | `one`, `-uiVerifyQr wechat`          |
| `payee_qr_real`               | Real system photo picker, nothing injected: a generated Alipay QR and a DuitNow TNG QR are decoded on device, confirm and save. zh-Hans; passes in light and dark.                                                                                                                                                     | —                | `one`                                |
| `payee_long`                  | Seven worst-case methods (long bank and payee names); after scrolling to the bottom the cash row sits fully above the accessory and tab bar.                                                                                                                                                       | —                | `-uiVerifyFixture worst`             |

## Adding a case

1. Add or reuse a scene in `src/debug/scenes.tsx`; it calls `onReady` once settled, which shows
   the `ui-verify-ready` marker.
2. Write `cases/<name>.py`: docstring = behaviour sentence; `DEPS = [...]` path prefixes the case
   depends on (feature folders, routes, helpers such as `verification/ui/payee.py`; shared code and Debug scenes are
   implied, so `DEPS = []` is valid); `SCENE = '<id>'` if it starts from a scene (the runner launches with `-uiVerifyScene <id>`); optional `LOCALES = [...]`; wait on
   identifiers, assert, capture. Cases receive the locale as `ui.locale` for controls that only
   expose a localized label (native toolbar buttons); SwiftUI views from `@expo/ui` take their
   identifier from `testID` or the `accessibilityIdentifier` modifier.
3. Controls a case touches need a `testID`; plain `View`s also need `accessible` to appear in the
   accessibility tree.
4. Run both appearances and open the screenshots before reporting.
5. Reference the case from the acceptance criterion it proves in `docs/story-map.md`; the story-map
   check warns about a case no criterion references.
