# Research: mascot animation tech for Tapiro (RN + Expo, iOS)

Date: 2026-10-04 · Prototype (throwaway): `evidence/2026-10-04-animation/` (prototype code was throwaway and not kept)

## Question

Which mascot animation tech works for a cute cartoon Malayan-tapir mascot in an Expo iOS app: **Lottie** (`lottie-react-native`), **Rive** (`@rive-app/react-native`) or **Reanimated + react-native-svg**? Compared on:
- Expo / New Architecture compatibility
- runtime cost while scrolling a list of animated items
- binary size delta
- interactivity
- designer workflow

## Versions used (from the installed packages)

| Item | Version | Source |
|---|---|---|
| Expo SDK | 57 (`expo ~57.0.26`) | `base/package.json` from `npx create-expo-app@latest --template blank-typescript --yes` |
| React Native / React | 0.86.3 / 19.2.3 | same |
| New Architecture | always on, cannot be disabled (SDK 55+) | https://docs.expo.dev/guides/new-architecture.md |
| lottie-react-native | 7.3.8 (SDK-pinned `~7.3.8`; npm latest 7.5.0) → pod `lottie-ios 4.6.0` | `node_modules/expo/bundledNativeModules.json`, `lottie-react-native.podspec` |
| @rive-app/react-native | 0.5.2 (published 2026-10-03; 0.5.0→0.5.2 in 5 days) + `react-native-nitro-modules 0.36.5` → pod `RiveRuntime 6.28.0` | `npm view`, package.json `runtimeVersions.ios` |
| react-native-reanimated / worklets / svg | 4.5.1 / 0.10.1 / 15.15.4 (SDK-pinned) | `bundledNativeModules.json` |
| Xcode / Simulator | Xcode 26.6 (17F113), iOS 26.5 runtime, iPhone 17 simulator | `xcodebuild -version` |

**Which Rive package is official:** Rive's docs mark `@rive-app/react-native`, the Nitro-based "Rive React Native 2.0" from repo `rive-app/rive-nitro-react-native`, as the recommended "New Runtime". The legacy `rive-react-native` (9.8.5) "is still supported, but we recommend migrating" (https://rive.app/docs/runtimes/react-native/react-native, https://rive.app/docs/runtimes/react-native/adding-rive-to-expo).

## Method

1. Created four copies of the same app: `base` (static circles), `lottie`, `rive` and `rea` (Reanimated+SVG). Each has a `FlatList` of 300 rows with an animated mascot in every 3rd row (64pt), a 200pt hero mascot that reacts to taps, and a JS-thread FPS counter (`shared/Shell.tsx`).
2. Ran `npx expo install <lib>`, then `expo prebuild --platform ios` and `pod install`. Built with `xcodebuild -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator'`. Signing used the default "Sign to Run Locally" ad-hoc identity (`evidence/*-codesign.txt`), and was never disabled. Script: `proto-animation/setup-build.sh`.
3. **Size:** `.app` size (`du -sk`), plus the arm64 slice of the main executable and any embedded framework (`lipo -thin arm64`). Results are in `proto-animation/sizes.txt`.
4. **Smoothness:**
   - JS FPS overlay, visible in the screenshots.
   - `simctl io recordVideo` during six `axe swipe` flings, then frame-interval analysis with ffprobe (`measure.sh`, `analyze.sh`, `evidence/*-fps.txt`).
   - CPU of the app process and the simulator's `backboardd` (the render server), sampled with `top` for 10 s while idle and 10 s while swiping (`cpu.sh`, `evidence/cpu.txt`).
5. **Interactivity:** tapped each hero with `axe tap` and took screenshots before and after.

Sample assets and licenses:
- Lottie: `Watermelon.json` and `LottieLogo1.json` from airbnb/lottie-react-native `example/animations` (Apache-2.0).
- Rive: `rating.riv` (state machine with tap listeners) and `bouncing_ball.riv` from rive-app/rive-nitro-react-native `example/assets/rive` (MIT).
- Tapir: a hand-drawn SVG tapir I wrote (`shared/Tapir.tsx`).

## Results

| | Lottie | Rive | Reanimated + SVG |
|---|---|---|---|
| Expo compat | Built and ran first try. Expo SDK 57 pins `~7.3.8`. Native module, so it needs prebuild or a dev build. No config plugin. (Expo's docs no longer have a Lottie page, and v54–v57 all return 404. Not verified whether it's in Expo Go.) | Built and ran. Native code, so a dev build is required, not Expo Go (Rive docs). Needs `react-native-nitro-modules` and a `metro.config.js` with `assetExts.push('riv')`. Without that, the runtime throws "Ensure 'riv' is in metro.config.js assetExts". `pod install` downloads a **122 MB** `RiveRuntime.xcframework.zip` from GitHub. On the first try it failed with `curl: (35) LibreSSL ... sslv3 alert unexpected message`, which looked like a network blip; it worked on retry. Package is pre-1.0 (0.5.2). | Expo SDK docs: "Included in Expo Go" for both packages. Babel plugin is configured automatically by `babel-preset-expo`. Built first try. |
| Release `.app` size (sim, fat x86_64+arm64) | 61,664 KB (**+9.1 MB**) | 74,548 KB (**+21.7 MB**) | 65,656 KB (**+13.0 MB**) |
| arm64 native delta | exe +4.4 MiB | exe +5.5 MiB, plus `RiveRuntime.framework` 4.9 MiB = **+10.3 MiB** | exe +5.8 MiB |
| JS bundle delta | +85 KB | +67 KB | +1.15 MB (Reanimated + worklets JS) |
| Idle CPU (hero + ~5 row mascots animating) | app **0.5%**, render server `backboardd` **86.7%** (see note) | app **4.2%**, backboardd 0.4% | app **64.8%**, backboardd 7.5% |
| CPU while swiping | app 19.7%, backboardd 87.5% | app 19.2%, backboardd 9.7% | app **78.3%**, backboardd 7.9% |
| Baseline CPU (no animation) | idle 0.6%; swiping 18.3% (app), 5.8% (backboardd) | ← same | ← same |
| JS FPS during scroll | 60 | 60 | 60 |
| Video frame gaps over 34 ms during swipes | 0 / 1443 | 51 / 2128 (2.4%) | 191 / 11936 (1.6%) |
| Baseline frame gaps | 22 / 862 (2.6%) | ← same | ← same |
| Interactivity | Imperative only: `play(start,end)`, `reset`, `speed`, `progress`, `onAnimationFinish`. **No state machine, no hit-testing** in `lottie-react-native` (props listed in `lib/typescript/types.d.ts`). Touch needs a Pressable wrapper plus JS logic. A separate package, `@lottiefiles/dotlottie-react-native` 0.12.1, has dotLottie state machines (`stateMachineLoad/Fire/Set*Input`). Not tested here. | **Best.** The state machine and pointer listeners live in the `.riv` file. Tapping the 4th star filled 4 stars with **zero app code** (`evidence/montage-tap.png`). Hooks for data binding and inputs: `useViewModelInstance`, `useRiveNumber/Boolean/String/Enum/Color/Trigger/List`, `useRive`. Also has `frameRate` and `RiveFileFactory`. | Full code control. Tap triggered a squash, jump and spring bounce (`evidence/rea-tap-seq.png`). Every state and transition is code a developer has to write. |
| Designer workflow | After Effects + Bodymovin, or LottieFiles Creator/Figma. This is the most common skill set, with many existing assets. Not every AE feature renders on iOS: lottie-ios's Core Animation engine "doesn't support all Lottie features" and falls back to the Main Thread engine (`RenderingEngineOption.swift`). | The Rive editor does design, animation, state machine and data binding in one tool. The designer can own the interaction logic. **Free plan exports "play a Rive splash screen"**; removing it needs Cadet ($9/seat/mo) or higher (https://rive.app/pricing). | No designer tool. The designer hands over SVG parts and the developer animates them in code. Cheap for simple idle/bounce/blink, expensive for expressive character acting. |

Notes on the measurements (read these before quoting the numbers):
- **Lottie's 87% `backboardd`:** lottie-ios defaults to `.automatic`, which uses the Core Animation engine ("better performance characteristics than the Main Thread engine"). That moves the work out of the app into the render server. On the Simulator the render server composites on the host CPU, so this number overstates the cost on a device, where the GPU does it. The app-process cost really was close to zero.
- **Reanimated+SVG cost is mostly from animating SVG props.** The full tapir animates an SVG `<G rotation>` and `<Ellipse ry>` through `useAnimatedProps`. A second build ("rea-lite": transforms only, no SVG props, same native binary with a swapped JS bundle, re-signed ad-hoc) used **22.5% idle / 33.2% while swiping**. Each animated SVG prop re-renders the SVG natively every frame on the main thread. While those animations ran, `axe` calls slowed to 10–35 s each (accessibility queries were starved), which is another sign of main-thread pressure.
- **Video frame-rate numbers are not real fps.** `recordVideo` emits a frame for every surface commit, so Rive (Metal layers) and Lottie show more than 60 "fps". The usable signals are the long-gap (hitch) counts, which are all at or near the baseline, and CPU. On the Simulator none of the three dropped visibly. JS stayed at 60 fps in every variant because none of them animate through the JS thread. **This is a Simulator measurement. Profile on a real device with Instruments before a final perf sign-off.**
- **Sizes are Simulator Release builds** (fat x86_64+arm64, not App-Store-thinned). Use the arm64 deltas as the estimate for a device: roughly Lottie +4.5 MB, Reanimated +6–7 MB, Rive +10 MB uncompressed. Reanimated is very likely to be in the app anyway for UI motion, so its marginal cost for the mascot is about 0.

## Evidence

All paths are relative to `evidence/2026-10-04-animation/` (prototype code was throwaway and not kept).
- Screenshots:
  - `evidence/{base,lottie,rive,rea}-idle.png`, `*-scrolling.png`, `rea-lite-idle.png`
  - `montage-idle.png`
  - `montage-tap.png` (Rive before/after tap; Reanimated tap)
  - `rea-tap-seq.png` (screenshot sequence after a tap)
- Videos and frame analysis: `evidence/*-scroll.mp4`, `*.mp4.pts` (frame timestamps), `*-windows.txt` (swipe windows), `*-fps.txt`
- CPU: `evidence/cpu.txt`
- Sizes and signing: `sizes.txt`, `evidence/*-frameworks.txt`, `evidence/*-codesign.txt`
- Built apps: `apps/{base,lottie,rive,rea,rea-lite}.app`
- Code: `shared/` (Shell, Tapir, `App.<variant>.tsx`, Rive `metro.config`), plus `setup-build.sh`, `measure.sh`, `analyze.sh`, `cpu.sh`
- Build logs: `<variant>/build.log`, `<variant>/pod.log`
- Commands: `./setup-build.sh <variant>` · `./measure.sh <variant>` · `./cpu.sh`
- Incident: about 07:14 the whole `proto-animation/` directory disappeared while the disk was at 100% (428 MB free). It was not deleted by this session, and another session's directory now exists in the same scratchpad. The project was rebuilt from scratch. The sizes from both runs matched exactly.

## Recommendation

**Rive for the mascot. Reanimated (transforms only) for UI motion. Lottie as the fallback** if the designer only knows After Effects or the Rive licence is unacceptable.

- **Rive:** the mascot's value is reacting to the user: idle, happy, sleepy, tap/poke, and states driven by app data. Rive's state machine and data binding let the designer build and own that logic in the `.riv` file. The app only binds view-model values and triggers. App CPU was the lowest of the animated options (4%). The costs:
  - About +10 MB per device
  - A pre-1.0 package with fast churn
  - A dev build is required
  - A paid editor seat to ship without the splash screen
- **Lottie:** cheapest binary (+4.5 MB), mature, and nearly free in-process on iOS. But it is linear playback, so interactive behaviour becomes app code that stitches segments together. A state-machine Lottie would mean switching to `dotlottie-react-native` (untested).
- **Reanimated + SVG:** fine for a few simple loops on transforms, but expensive once SVG props animate. It also puts all character acting on developers.

## Constraints implied

- Use `@rive-app/react-native` (Nitro), not legacy `rive-react-native`. It is the one Rive docs recommend.
- Pin an exact `@rive-app/react-native` version and upgrade deliberately. It is 0.x, with 3 releases in 5 days.
- Add `riv` to `metro.config.js` `resolver.assetExts`. Without it, `require('*.riv')` fails at runtime.
- Commit the generated `*.riv.d.ts` (from `rive-gen-types`) next to each `.riv`. `useRiveFile` only accepts `require()` numbers through the typed `RiveFileSource`, and the types also check artboard and state-machine names.
- Load each `.riv` once (`useRiveFile` at screen or provider level) and share the `RiveFile` across list rows. Don't load it per row.
- Use a dev build (`expo run:ios` or EAS) as the only dev loop. Expo Go cannot run Rive.
- Cache CocoaPods or allow-list GitHub release downloads in CI. `pod install` fetches a 122 MB xcframework, and that download failed once with a TLS error.
- Budget a paid Rive seat (Cadet or higher) for the designer before shipping. Free exports show a Rive splash screen.
- With Reanimated, animate only transforms and opacity on `Animated.View`. Never drive SVG attributes through `useAnimatedProps` in lists. In this test that cost about 3x the CPU (65% vs 22% idle).
- If Lottie is used, keep `renderMode` `AUTOMATIC` (Core Animation engine). Ask designers to stay within the features that engine supports, or it falls back to main-thread rendering.
- Don't use Simulator perf numbers for sign-off. Instruments on a device is required (the Simulator render server runs on the CPU).
- Keep at least 15 GB of free disk for iOS Release builds. Four variants filled the disk (DerivedData plus Pods), and the scratchpad was lost.
