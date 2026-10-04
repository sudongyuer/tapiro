# UI verification

Offline, deterministic UI checks on the iOS Simulator. A verify build (`EXPO_PUBLIC_UI_VERIFY=1`,
Release) runs without network or login; each case drives the real UI with AXe, asserts on the
accessibility tree, and captures screenshots and video in light and dark.

```bash
bun run verify:build          # prebuild if needed, Release build into .verify/DerivedData
bun run verify:ui             # all cases, light + dark → .verify/ui/<locale>/<appearance>/<case>/
bun run verify:ui design_tokens --appearance dark
bun run verify:clean
```

The runner uses a named Simulator, `Tapiro Verify` (iPhone 17 Pro, newest iOS runtime), and
creates it once if missing; never create Simulators or pass another DerivedData path yourself.
Cases launch in `zh-Hans` (`-AppleLanguages`); a case that shows long copy adds
`LOCALES = ['zh-Hans', 'ms']` to also run in Malay and catch truncation. Each run writes
`result.json` with commit, locale, Xcode and device.

## Cases

| Case            | Behaviour                                                                                                            | Scene           |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | --------------- |
| `home_launches` | The app launches offline in verify mode and shows the home screen filling the display.                               | —               |
| `design_tokens` | The design-tokens scene renders every type role, the status set and a 44 pt accent button in the current appearance. | `design-tokens` |

## Adding a case

1. Add or reuse a scene in `src/debug/scenes.tsx`; it calls `onReady` once settled, which shows
   the `ui-verify-ready` marker.
2. Write `cases/<name>.py`: docstring = behaviour sentence; `SCENE = '<id>'` if it starts from a
   scene (the runner launches with `-uiVerifyScene <id>`); optional `LOCALES = [...]`; wait on
   identifiers, assert, capture.
3. Controls a case touches need a `testID`; plain `View`s also need `accessible` to appear in the
   accessibility tree.
4. Run both appearances and open the screenshots before reporting.
