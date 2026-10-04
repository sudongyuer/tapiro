# PROJECT.md — acceptance adapter for Tapiro

## 1. Project summary

- Product: Tapiro, a mutual-help iOS app for Chinese students in Malaysia (bounty board first).
- Layout: `src/app` — Expo Router routes; `src/features` — feature code; `modules/tapiro-kit` — Swift kit; `supabase/` — backend migrations and Edge Functions.

## 2. Environment

- **Start dev environment:** `bun run start` (Metro)
- **Stop:** stop the Metro process this run started
- **Required services:** none for UI checks; verify mode (`EXPO_PUBLIC_UI_VERIFY=1`) runs offline
- **Already-running detection:** GUESS: `curl -s localhost:8081/status`
- **Env / port resolution:** GUESS: Metro default port 8081

## 3. Auth

- **Test account(s):** none yet; verify mode will supply a fixture user once auth exists
- **Seeding command:** n/a (fixtures live in `src/debug/`)
- **Per-surface status check:**
  - iOS Simulator: n/a until auth exists

## 4. Surfaces

### iOS Simulator

- Build: `bun run verify:build` (Release, verify mode, signing enabled) → `.verify/DerivedData/Build/Products/Release-iphonesimulator/Tapiro.app`
- Bundle id: `app.tapiro`; device: named Simulator `Tapiro Verify` (iPhone 17 Pro, newest iOS runtime)
- Driver: AXe via `verification/ui/driver.py` — `bun run verify:ui [case] [--appearance light|dark|both]`

## 5. Project probes & quick navigation

- Scene launch: `xcrun simctl launch <udid> app.tapiro -uiVerifyScene <id>` (scenes in `src/debug/scenes.tsx`)
- Ready probe: identifier `ui-verify-ready` in the AX tree (`axe describe-ui`)
- Capture helpers: `UI.capture`, `assert_appearance` in `verification/ui/driver.py`

## 6. Known constraints

- iOS only; never build Android.
- Keep at least 15 GB free disk before Release builds.
- PR evidence: push to an unmerged `acceptance-evidence` branch; never to the product branch.
