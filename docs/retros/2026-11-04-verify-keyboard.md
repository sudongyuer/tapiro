---
branch: fix/verify-keyboard
date: 2026-11-04
pr: verify keyboard
title: a deterministic keyboard on every runner Simulator
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: verify keyboard

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                  |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                    |
| Quality   | Vacuous checks          | 0: `test_keyboard` fails without the writes; `test_ride` fails on the old clock regex (`下午5:00` read as 05:00)           |
| Quality   | Skipped verifications   | dark, en and ms (runner change only); a `simctl erase` round trip (the runner never erases and rewrites the keys each run) |
| Speed     | Wall-clock              | About 1.5 h, most of it eight short Simulator runs while the load average sat between 40 and 160                           |
| Autonomy  | Avoidable interventions | 0                                                                                                                          |
| Loop      | Minutes on this retro   | 5                                                                                                                          |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                       | Root cause class | Change and layer                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Typed ASCII became Pinyin candidates: a new Simulator has no `AppleKeyboards`, so the app derives its keyboards from `-AppleLanguages (zh-Hans)`                                                                                    | environment      | `prepare()` writes `AppleKeyboards` (US English, emoji) and the current keyboard in `com.apple.keyboard.preferences` on every Simulator it prepares (`keyboard_commands`, unit test) |
| 2   | The first fix turned on the English keyboard, whose prediction and autocorrection rewrote words (`klia` to `Kline`, `see you at the lobby` to `See lobby`); a first try also turned off autocapitalisation, which no case needs off | incomplete fix   | Prediction and autocorrection off, autocapitalisation left alone; found by opening each failure screenshot, not from the assertion text                                              |
| 3   | `parcel` never became `Parcel`: the Simulators run headless, with no hardware keyboard, and AXe's keys are not autocapitalised; the cases relied on the old machine's Simulator.app                                                 | environment      | Cases type `Parcel` and `Help me` themselves; README says to type text in the case it should read                                                                                    |
| 4   | `ride_create_form` read the picker's `下午5:00` as 05:00: iOS 27.2 formats zh_MY 12-hour with the marker in front                                                                                                                   | check bug        | `ride.clock_24h` reads a marker before or after the clock (`test_ride`)                                                                                                              |
| 5   | The prescribed wait `until ! pgrep -f verification/ui/run.py` never ended: `pgrep -f` matches the waiting shells of every agent, its own included                                                                                   | tool footgun     | Not needed: `run.py` already waits on the machine-wide lock (`/tmp/ios-ui-verify.lock`); experiments outside the runner hold that lock with `lockf -k`                               |

## Notes

- Mechanism sources: appium-ios-simulator `lib/extensions/settings.ts` (`configureLocalization` writes `AppleKeyboards`
  and `KeyboardsCurrentAndNext` / `KeyboardLastUsed`, there in `com.apple.Preferences`); on iOS 27.2 the live keys sit
  in `com.apple.keyboard.preferences` (read on the device), where WebDriverAgent's `FBConfiguration.m` also keeps
  `KeyboardAutocorrection` and `KeyboardPrediction`. The keys apply to the next app launch without a reboot.
- Open, outside this change: the number fields (`bounty-post-reward`, `ride-form-estimate`) sometimes ignore input,
  both AXe's keys and a tap on the on-screen key, so `bounty_post_optional` and, at times, `ride_create_form` fail
  after the keyboard change; it needs its own look.
