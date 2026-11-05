# Tapiro feasibility: push notifications + approximate location (iOS, Expo)

Date: 2026-10-04. Throwaway prototype in a throwaway prototype (not kept).

## Versions used

| Item | Version | Source |
|---|---|---|
| Expo SDK | `expo@57.0.26` (npm `latest` dist-tag = `sdk-57`) | `npm view expo dist-tags` |
| React Native | 0.86.3 / React 19.2.3 | generated `package.json` |
| expo-notifications | ~57.0.21 | `npx expo install` |
| expo-location | ~57.0.20 | `npx expo install` |
| expo-dev-client | ~57.0.19 | `npx expo install` |
| Xcode / runtime | Xcode 26.6 (17F113), iOS 26.5 Simulator (iPhone 17 Pro, dedicated device `B79B9585-…`) | `xcodebuild -version` |
| UI driver | AXe 1.8.0 | `axe --version` |

## Questions

- (a) Push for "new bounty nearby" and "task status changed": Expo Push Service vs direct APNs; whether the Simulator can be used for prototyping; what real remote push requires; the iOS permission UX, including provisional authorization.
- (b) Approximate location with expo-location: When In Use only, reduced vs full accuracy, Info.plist strings set through Expo config, background location (to be avoided), Simulator location.
- (c) App Review constraints: guidelines 4.5.4, 5.1.1 and 5.1.5.

## Method

1. Ran `create-expo-app --template blank-typescript` with `--no-install`, then `npx expo install expo-notifications expo-location expo-device expo-dev-client`.
2. Config (`app/app.config.js`): bundle id `com.tapiro.proto.pushlocation`. `expo-notifications` plugin with `mode: development` and `enableBackgroundRemoteNotifications: false`. `expo-location` plugin with only `locationWhenInUsePermission`; `locationAlwaysAndWhenInUsePermission`, `locationAlwaysPermission` and `motionUsagePermission` set to `false`; `isIosBackgroundLocationEnabled: false`. `ios.infoPlist.NSLocationDefaultAccuracyReduced` is switched by env `TAPIRO_REDUCED`.
3. Ran `npx expo prebuild -p ios`, then `npx expo run:ios --device <udid>` (Debug, Simulator). Signing was not disabled: Xcode signed the app ad hoc ("Sign to Run Locally", `Signature=adhoc`, no team). Simulated entitlements (`TapiroProto.app-Simulated.xcent`) contained `aps-environment=development`. No Apple credentials, EAS or external services were configured.
4. One screen (`app/App.tsx`) with buttons for explicit and provisional notification permission, `getDevicePushTokenAsync`, a 3-second local notification and When In Use location. It shows an on-screen log of received notifications, permission results and coordinates/accuracy. AXe tapped the buttons; screenshots came from `xcrun simctl io <udid> screenshot`.
5. Remote push was simulated with `xcrun simctl push <udid> payloads/*.apns`, using a `Simulator Target Bundle` key.
6. Location was set with `xcrun simctl location <udid> set 3.1390,101.6869` (Kuala Lumpur).
7. Docs were fetched this session: Expo SDK 57 versioned docs, Apple docs through their `tutorials/data/*.json` endpoints, the App Review Guidelines page, and `xcrun simctl help push|location|privacy`.

Incident: midway through, an external process (not this agent) deleted the scratchpad directory, including the first run's app, screenshots and the sibling `research-backend-platform.md`. The disk was also full at one point (530 MB free), which broke one build. The prototype was rebuilt and every step re-run. All evidence below comes from the second run.

## Results and evidence

Screenshots are in `evidence/2026-10-04-push-location/`.

### (a) Push

| Step | Result | Evidence |
|---|---|---|
| Provisional request (`allowProvisional: true`) | No system prompt. Result: `status=undetermined`, `ios.status=3 (PROVISIONAL)`. **Gotcha:** expo-notifications reports provisional as `status: 'undetermined'` / `granted: false`, so check `ios.status === IosAuthorizationStatus.PROVISIONAL`. | `01-provisional-granted-no-prompt.png`, `09-push-log.png` |
| Local notification while provisional, app in foreground | The listener fired, but no banner appeared, even though `shouldShowBanner: true` | `02-provisional-local-no-banner.png` |
| `simctl push` while provisional, app backgrounded | No banner. In Notification Center history the notification showed "Keep receiving notifications from the TapiroProto app?" with **Keep… / Turn Off…** buttons, matching Apple's description | `03-…`, `04-provisional-notification-center.png` |
| Explicit request after provisional | The system prompt still appeared ("Would Like to Send You Notifications"), so provisional can be upgraded later in context. After Allow: `status=granted`, `ios.status=2` | `05-explicit-prompt-after-provisional.png` |
| Local notification (TIME_INTERVAL 3 s), foreground | Banner shown and listener fired with `data={"taskId":"local-1"}` | `06-local-delivered-foreground-banner.png` |
| `getDevicePushTokenAsync()` on Simulator | Returned an APNs device token (`type: ios`, 64 hex chars). It took about 2 s in run 1 and about 30 s in run 2 | `09-push-log.png` |
| `simctl push`, foreground, custom keys at top level | Banner shown, listener fired, but `content.data === null` | `07-simctl-push-foreground-banner.png`, `09-push-log.png` |
| `simctl push`, foreground, custom data under a `"body"` key | `content.data = {"status":"completed","taskId":"t-42","event":"status_changed"}` | `09-push-log.png` |
| `simctl push`, app backgrounded (Settings in front) | System banner shown | `08-simctl-push-background-banner.png` |

Source check for the `data=null` result: in `node_modules/expo-notifications/ios/ExpoNotifications/Notifications/NotificationRecords.swift:331`, `content.data` comes from `request.content.userInfo["body"]`. The full raw payload is also in `trigger.payload`. If Tapiro sends directly to APNs, it must put its custom data under `body`, or the client must read `trigger.payload`.

Commands:
```
xcrun simctl push B79B9585-BE6B-4B7B-99C9-0C4E3B5528B7 payloads/task-status.apns
xcrun simctl push B79B9585-BE6B-4B7B-99C9-0C4E3B5528B7 payloads/task-status-expo-shape.apns
xcrun simctl push B79B9585-BE6B-4B7B-99C9-0C4E3B5528B7 payloads/nearby-bg.apns
```
`simctl help push`: the payload "must contain an 'aps' key … be 4096 bytes or less. Only application remote push notifications are supported. VoIP, Complication, File Provider, and other types are not supported."

#### Expo Push Service vs direct APNs (primary sources)

- Expo Push Service: endpoint `https://exp.host/--/api/v2/push/send`, "up to 100 message objects" per request, "600 notifications per second per project", receipts kept "24 hours" with checks recommended after "15 minutes". Optional "enhanced push security" access token. APNs key is managed through `eas credentials`. https://docs.expo.dev/push-notifications/sending-notifications/
- Cost and privacy: "There is no cost associated with sending notifications through Expo push notification service." "Expo doesn't store the contents of push notifications any longer than it takes to deliver them…". Delivery is "at-least-once" to APNs/FCM. https://docs.expo.dev/push-notifications/faq/
- `getExpoPushTokenAsync()` needs an EAS `projectId`. "A paid Apple Developer Account is required to generate credentials." https://docs.expo.dev/push-notifications/push-notifications-setup/
- Direct APNs: use `getDevicePushTokenAsync`, an APNs `.p8` key with its Key ID and Team ID, an ES256 JWT, HTTP/2 to `api.sandbox.push.apple.com` or `api.push.apple.com`, and header `apns-topic: <bundle id>`. https://docs.expo.dev/push-notifications/sending-notifications-custom/
- APNs token auth: JWT `alg=ES256, kid, iss=TeamID, iat`. Refresh "no more than once every 20 minutes and no less than once every 60 minutes". Team-scoped keys are environment-specific (max two per environment). https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns
- Simulator: "Simulator now supports remote notifications in iOS 16 when running in macOS 13 on Mac computers with Apple silicon or T2 processors. Simulator supports the Apple Push Notification Service Sandbox environment… Each simulator generates registration tokens unique to the combination of that simulator and the Mac hardware". https://developer.apple.com/documentation/xcode-release-notes/xcode-14-release-notes. Expo also says push works on "iOS simulators on Xcode 14 or later". https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- Entitlement: "The iOS APNs entitlement is always set to 'development'. Xcode automatically changes this to 'production' in the archive generated by a release build." `enableBackgroundRemoteNotifications` adds `UIBackgroundModes: remote-notification`. Same Expo SDK 57 page.

#### Provisional authorization (Apple)

"The system delivers provisional notifications quietly — they don't interrupt the person with a sound or banner, or appear on the lock screen. Instead, they only appear in the notification center's history. These notifications also include buttons that prompt the person to keep or turn off the notification." "…if you request provisional authorization, you can request authorization when your app first launches." For explicit prompts: "Make the request in a context that helps people understand why your app needs authorization." https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications

### (b) Location

| Step | Result | Evidence |
|---|---|---|
| Prompt with `NSLocationDefaultAccuracyReduced=true` | "Allow "TapiroProto" to use your **approximate** location?" with Allow Once / Allow While Using App / Don't Allow and the purpose string | `10-location-prompt-approximate.png` |
| Reduced fix at KL (3.1390, 101.6869) | `scope=whenInUse accuracy=reduced`. Position returned: `lat=3.1445 lon=101.6777 acc=4664m`, about 1.2 km from the set point (an earlier run gave 3.1434, 101.6766, also 4664 m) | `11-location-kl-reduced.png` |
| Prompt with key `false` | "Allow "TapiroProto" to use your location?" | `12-location-prompt-precise.png` |
| Full fix at KL | `accuracy=full`, `lat=3.1390 lon=101.6869 acc=5m` | `13-location-kl-precise.png` |
| Generated Info.plist | Only `NSLocationWhenInUseUsageDescription` and `NSLocationDefaultAccuracyReduced`. No Always keys, no `UIBackgroundModes` | `ios/TapiroProto/Info.plist` after prebuild |

Commands: `xcrun simctl location <udid> set 3.1390,101.6869`. `simctl location` also supports `start` (waypoints with speed/interval), `run <scenario>` and `clear`. `simctl privacy <udid> grant location <bundle>` can pre-grant, but its help warns that this "can mask bugs".

Plugin source (`node_modules/expo-location/plugin/build/withLocation.js` and `@expo/config-plugins` `ios/Permissions.js`): the plugin **adds Always/AlwaysAndWhenInUse/Motion usage strings by default**, and passing `false` deletes each key. Background mode is added only if `isIosBackgroundLocationEnabled` is true.

Docs:
- expo-location options and defaults (`isIosBackgroundLocationEnabled` defaults to `false`), `ios.accuracy: 'full' | 'reduced'` ("iOS 14+"), and the Accuracy enum (`Balanced` = "within one hundred meters", `Low` = "nearest kilometer", `Lowest` = "nearest three kilometers"). Background location needs the `location` UIBackgroundMode and a dev build. https://docs.expo.dev/versions/v57.0.0/sdk/location/
- `NSLocationDefaultAccuracyReduced`: "When this key is set to true, all Core Location services … receive service at the reduced-accuracy service level … the location authorization prompt will show a map with an approximate location". The user "can override it any time in Settings". https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationdefaultaccuracyreduced
- Core Location: "When in Use authorization … is the preferred choice, because it has better privacy and battery life implications." "make authorization requests only when someone engages a part of your app that requires that data." Apple also lists which usage key is required when. https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services

### (c) App Review Guidelines (https://developer.apple.com/app-store/review/guidelines/, fetched 2026-10-04; the page shows no "last updated" date)

> **4.5.4** Push Notifications must not be required for the app to function, and should not be used to send sensitive personal or confidential information. Push Notifications should not be used for promotions or direct marketing purposes unless customers have explicitly opted in to receive them via consent language displayed in your app's UI, and you provide a method in your app for a user to opt out from receiving such messages. Abuse of these services may result in revocation of your privileges.

> **5.1.1 (ii) Permission:** Apps that collect user or usage data must secure user consent for the collection, even if such data is considered to be anonymous at the time of or immediately following collection. Paid functionality must not be dependent on or require a user to grant access to this data. Apps must also provide the customer with an easily accessible and understandable way to withdraw consent. Ensure your purpose strings clearly and completely describe your use of the data. …

> **5.1.1 (iii) Data Minimization:** Apps should only request access to data relevant to the core functionality of the app and should only collect and use data that is required to accomplish the relevant task. …

> **5.1.1 (iv) Access:** Apps must respect the user's permission settings and not attempt to manipulate, trick, or force people to consent to unnecessary data access. … Where possible, provide alternative solutions for users who don't grant consent. For example, if a user declines to share Location, offer the ability to manually enter an address.

> **5.1.1 (i) Privacy Policies:** All apps must include a link to their privacy policy in the App Store Connect metadata field and within the app in an easily accessible manner. … (also 5.1.1 (v): account deletion in-app if accounts exist; login not required unless core to the app)

> **5.1.5 Location Services:** Use Location Services in your app only when it is directly relevant to the features and services provided by the app. Location-based APIs shouldn't be used to provide emergency services or autonomous control over vehicles, aircraft, and other devices, except for small devices such as lightweight drones and toys, or remote control car alarm systems, etc. Ensure that you notify and obtain consent before collecting, transmitting, or using location data. If your app uses Location Services, be sure to explain the purpose in your app; refer to the Human Interface Guidelines for best practices for doing so.

(The guidelines page was quoted through a fetch-and-summarize tool. Check the exact wording before pasting it into any submission.)

## Simulator vs device (be honest)

- `simctl push` injects the payload locally. It does not go through APNs, so it does not test JWT/credentials, `apns-push-type`/priority, throttling, or delivery to a killed app on a real device. The Simulator *can* reach the APNs sandbox with a real token, but that needs a `.p8` key, which was not tested because no credentials were configured.
- The Simulator location prompt showed **no map and no "Precise" toggle**. Apple documents both for devices. The reduced fix (about 1.2 km offset, 4664 m accuracy) is the Simulator's behaviour; device accuracy and offset may differ.
- The Precise Location toggle in Settings could not be flipped with AXe, so precise mode was tested through a second build with the plist key set to `false`.
- Token latency varied (2 s vs about 30 s). Expect variance on devices too; never block UI on the token.
- One observed behaviour was not confirmed: in run 1, a background push also fired the JS received-listener; in run 2 it did not. Do not rely on JS listeners for background delivery.

## Recommendation

- **Push: start with Expo Push Service.** It is free, handles APNs JWT/HTTP2 and batching, and returns receipts. The backend only stores Expo push tokens per device. Move to direct APNs only if Tapiro needs features Expo does not cover, or wants no third-party hop. Even then, keep the `body` data key convention so the client stays the same. Real remote push needs: a paid Apple Developer account, an APNs auth key (`.p8`) uploaded through `eas credentials` (or held by your own backend for direct APNs), the Push Notifications capability/`aps-environment` (already added by the plugin), an EAS `projectId` for Expo tokens, and a dev build (not Expo Go).
- **Permission UX:** ask for provisional authorization early (e.g. after onboarding) so "new bounty nearby" can arrive quietly. Show the explicit prompt in context, for example right after the user posts or accepts their first bounty, where "you'll be notified when the status changes" is obvious. Both were verified on the Simulator.
- **Location:** use expo-location `requestForegroundPermissionsAsync` (When In Use only) and set `NSLocationDefaultAccuracyReduced: true`. Approximate location (about 1–5 km) is enough for "bounties near me" in KL/PJ/Sunway, and the prompt then says "approximate". Do not ask for Always and do not use a background location mode. "Nearby" push should be computed on the server from the last location the user shared in the foreground (coarsened). Offer manual area/campus selection as the fallback when location is declined (5.1.1(iv)).

## Constraints implied

- **No `CODE_SIGNING_ALLOWED=NO`; Simulator builds sign ad hoc.** Signing worked with no team.
- **Push is optional for core use.** Required by 4.5.4: the board must work with notifications off.
- **No sensitive content in push payloads** (exact addresses, phone numbers, payment amounts tied to identity). Required by 4.5.4. Send IDs and fetch details in-app.
- **No marketing pushes without in-app opt-in and opt-out.** Required by 4.5.4.
- **Request notification permission in context; use provisional first.** Apple guidance, and it raises opt-in.
- **Treat `ios.status === PROVISIONAL` as "can send".** expo-notifications reports provisional as `status: 'undetermined'` / `granted: false` (observed).
- **Custom push data goes under the `body` key** (or read `trigger.payload`). expo-notifications maps `content.data` from `userInfo.body` (source + observed `data=null`).
- **When In Use only; set `locationAlwaysAndWhenInUsePermission`, `locationAlwaysPermission` and `motionUsagePermission` to `false`.** The plugin adds those strings by default, and unused Always strings invite review questions under 5.1.1(iii) and 5.1.5.
- **`isIosBackgroundLocationEnabled: false`, no `UIBackgroundModes: location`.** Not needed; Apple prefers When In Use.
- **`NSLocationDefaultAccuracyReduced: true`; never require precise location.** Data minimization under 5.1.1(iii); approximate is enough for nearby matching.
- **Purpose string states exactly why**, e.g. "Tapiro uses your approximate location to show bounties near you." Required by 5.1.1(ii) and 5.1.5.
- **Manual location or campus picker when location is denied.** Required by 5.1.1(iv).
- **Privacy policy link in App Store Connect and in-app; account deletion in-app if accounts exist.** Required by 5.1.1(i) and (v).
- **Verify real APNs delivery on a physical device before launch.** The Simulator `simctl push` bypasses APNs.
- **Use a dev build (expo-dev-client), not Expo Go, for push work.** Expo docs require a development build for remote push.
