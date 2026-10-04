# PROJECT.md — acceptance adapter for Tapiro

## 1. Project summary

- Product: Tapiro, a mutual-help iOS app for Chinese students in Malaysia (bounty board first).
- Layout: `src/app` — Expo Router routes; `src/features` — feature code; `modules/tapiro-kit` — Swift kit; `supabase/` — backend migrations and Edge Functions.

## 2. Environment

- **Start dev environment:** `bun run start` (Metro)
- **Stop:** stop the Metro process this run started
- **Required services:** GUESS: Supabase local stack or the UI-verify fixture mode (decided in phase 5)
- **Already-running detection:** GUESS: `curl -s localhost:8081/status`
- **Env / port resolution:** GUESS: Metro default port 8081

## 3. Auth

- **Test account(s):** GUESS: UI-verify mode bypasses login with fixtures (phase 5)
- **Seeding command:** n/a until phase 5
- **Per-surface status check:**
  - iOS Simulator: GUESS: decided with the UI-verify mode

## 4. Surfaces

### iOS Simulator

- Build: `bunx expo run:ios` (dev build; signing stays enabled) → app path GUESS: `ios/build`
- Bundle id: decided in phase 4; preferred device/runtime: iPhone 17, iOS 26.5
- Driver: AXe — `axe` (installed at `/opt/homebrew/bin/axe`)

## 5. Project probes & quick navigation

- Filled in phase 5 with the UI-verify Debug scene.

## 6. Known constraints

- iOS only; never build Android.
- Keep at least 15 GB free disk before Release builds.
- PR evidence: push to an unmerged `acceptance-evidence` branch; never to the product branch.
