# Spike: N3+E navigation on iOS 26 native tabs

Date: 2026-10-11. Question from KICKOFF (导航 N3+E): can Expo Router NativeTabs (1) show the
bottom accessory on some tabs and hide it on others, and (2) use the separate search slot as a
custom-icon button that opens a sheet instead of switching tabs?

## Method

Throwaway routes in the app (removed after the run, never committed): four tabs, a fifth
`role="search"` trigger, a `NativeTabs.BottomAccessory` rendered conditionally, and a `formSheet`
route. Release Simulator build via `bun run verify:build` (expo-router 57.0.24,
react-native-screens 4.26.2), iPhone 17 Pro Simulator, iOS 26.5, driven with AXe. Screenshots in
`evidence/2026-10-11-nav-n3e-spike/`; the screen recordings did not save.

Setup that worked:

- Tab bar: `<NativeTabs minimizeBehavior="onScrollDown">`.
- Search slot: `<NativeTabs.Trigger name="ask" role="search" disabled listeners={{ tabPress: () => router.push('/ask') }}>`
  with `<NativeTabs.Trigger.Icon src={…} renderingMode="original" />`.
- Accessory: `{show && <NativeTabs.BottomAccessory>…</NativeTabs.BottomAccessory>}`, where `show`
  comes from `usePathname()` plus a small external store that the home screen sets on scroll.
- Sheet: `presentation: 'formSheet'`, `sheetAllowedDetents: [0.5, 1]`, `sheetGrabberVisible`, set
  on the root `Stack.Screen`.

## Results

| Question                                         | Result                                                                                                                                                                                                                                | Evidence   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Accessory hidden on one tab, shown on others     | Yes. Absent at the top of the home tab; present on 拼车; appears on home once the store flips on scroll. `react-native-screens` calls `setBottomAccessory:nil animated:YES` on unmount (`ios/tabs/host/RNSTabsHostComponentView.mm`). | 01, 05     |
| Minimised layout                                 | When the bar minimises, the selected tab shrinks to a 48 pt circle at the left, the accessory moves inline between the two, and the search circle stays at the right. Matches the N3+E design.                                        | 02, 06     |
| Expanding again                                  | Scrolling back up about 220 pt did not expand the bar; tapping the minimised tab did.                                                                                                                                                 | AX dump 04 |
| Custom image in the search slot                  | Yes. `Icon src` replaces the magnifying glass; with `renderingMode="original"` the image fills the 62 pt circle.                                                                                                                      | 01         |
| Search slot opens a sheet without switching tabs | Yes. `disabled` blocks native selection; `tabPress` still fires and pushes the sheet. After closing, the previous tab (拼车) stays selected.                                                                                          | 07, 08     |
| Sheet presentation                               | `formSheet` options set inside the sheet screen were ignored (full-screen push); set on the root `Stack.Screen`, it opened as a half sheet with a grabber.                                                                            | 07         |

## Constraints for the spec

- 问小貘 is a `role="search"` trigger with `disabled` and a `tabPress` listener; the sheet is a
  root-stack `formSheet` route whose presentation options live in the root layout.
- The mascot icon for the search slot needs its own asset sized for a 62 pt circle (and 48 pt when
  minimised). This was not tested with the real artwork.
- Accessory visibility is driven by app state (route plus home scroll state). Expo renders two
  accessory instances, so the content's state must live outside the accessory.
- Do not promise "scroll up expands" in the design; tapping the minimised tab expands the bar.
  Whether returning to the very top expands it was not tested.

## Not verified

- Physical device, dark mode, VoiceOver reading order, Dynamic Type at large sizes.
- The animation of the accessory appearing and disappearing (stills only; recordings lost).
- How the `disabled` state looks on a physical device (no dimming was seen on the Simulator).
