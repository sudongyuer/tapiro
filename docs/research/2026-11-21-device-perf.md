# Device performance: before and after the polish PRs (2026-11-21)

Goal: the device sign-off AGENTS.md requires («Performance sign-off happens on a device with Instruments»), comparing
build A = `366f907f` (main before #206) and build B = `dae1ca8d` (#206 motion/perf and #212), on the owner's iPhone 13
Pro Max (`00008110-0004455614F8801E`, iOS 26.7.3), with the `measure-iphone-interaction-hangs` method (Instruments
Animation Hitches plus Time Profiler, attached to a running Release build).

Result: **no hang or hitch numbers were recorded.** The run was blocked by the device (below). What was established is
the data volume on the device, which answers the board virtualisation question on its own.

## Results

| Interaction                       | Build        | Median hang ms | p95 hang ms  | Hitch ratio (ms/s) | n   |
| --------------------------------- | ------------ | -------------- | ------------ | ------------------ | --- |
| (1) Board scroll, top → end → top | A `366f907f` | not measured   | not measured | not measured       | 0   |
| (1) Board scroll, top → end → top | B `dae1ca8d` | not measured   | not measured | not measured       | 0   |
| (2) Open a chat thread and scroll | A            | not measured   | not measured | not measured       | 0   |
| (2) Open a chat thread and scroll | B            | not measured   | not measured | not measured       | 0   |
| (3) Board card → detail, then pop | A            | not measured   | not measured | not measured       | 0   |
| (3) Board card → detail, then pop | B            | not measured   | not measured | not measured       | 0   |

## Data on the device (hosted project, test user B)

- Bounty board (悬赏 tab, 「能接的悬赏」): **2 rows** (filter chip 「全部 2」), plus 3 live cards in the stack above it.
  With 2 rows (and `PAGE_SIZE` 20 per page from `nearby_bounties`) the board fits in about one and a half screens.
- Chat: the first thread (「AI Smoke」, a bounty thread) held only the item card and 小貘's safety note, no user
  messages; a query for the busiest thread over the user's last 1,000 messages found none. A thread scroll on this
  account has nothing to scroll.
- The local stack (`supabase status`) has 0 bounties and 0 threads.

## What blocked the run

1. **UI automation needs the passcode.** `agent-device` (XCTest) failed twice with 「Timed out while enabling automation
   mode」; the phone showed 「Enter iPhone Passcode for "XCTest" — Enable UI Automation」. No touch driving without the
   owner.
2. **In-app driver as a fallback.** An identical, uncommitted driver was added to both builds (launch argument
   `-perfDrive board|chat|pop`; animated `scrollTo` / `scrollToEnd` on the home `ScrollView` and the thread scroll view,
   `router.push` / `router.back()` for the detail pop, 5 repetitions each; diff kept outside the repo). It ran on the
   device (B entered the thread on cue). Attaching `xctrace` within 3 s of launch failed with 「Cannot find process」
   until retried; a retry loop fixed that.
3. **The phone is out of storage.** Switching from B to A failed: 「87,634,222 bytes needed, 17,857,040 bytes
   available」. Removing our agent-device runner did not free enough. Tapiro was uninstalled to make room (its
   preferences plist was backed up first; the session lives in the Keychain, which survives an uninstall). The install
   still failed with 17.9 MB available, so the phone was rebooted to clear staging space. After the reboot it needs the
   passcode before CoreDevice can reach it (「unavailable」 since 08:18), so nothing more could run.

## State left on the phone

- Tapiro is **not installed** on the 13 Pro Max; the phone waits for the passcode after a reboot.
- To restore: unlock it, free at least ~200 MB (the A/B switch needs ~88 MB staging per install), then
  `bun run device-install 00008110-0004455614F8801E` from main. If the app opens at onboarding, copy the backed-up
  preferences back (`xcrun devicectl device copy to … --domain-type appDataContainer --domain-identifier app.tapiro
--destination Library/Preferences/app.tapiro.plist`); if it opens signed out, test user B must sign in again.
- The 14 Pro was not touched.

## Recommendation

- **Board virtualisation: not worth doing now.** The real board holds 2 rows, the RPC already pages at 20, and a
  `ScrollView` with 20 cards mounts once. Revisit when a real board passes about 40 rows (two pages loaded), measured
  with the same driver.
- #206's effect on hangs is unknown, not «no change». To finish the sign-off: free storage on the phone, enter the
  passcode once so XCTest can enable UI automation (finger-like scroll and the edge-swipe pop), seed a measurement
  account with ~40 bounties and a thread of ~100 messages, then run A and B alternately, 2 runs × 5 repetitions per
  interaction, as `run.sh` / `campaign.sh` do.

Artifacts (outside the repo): `/Users/sudongyu/work/tapiro-worktrees/perf-artifacts/` holds both signed Release apps,
the driver diff, the recorder scripts and the preferences backup.
