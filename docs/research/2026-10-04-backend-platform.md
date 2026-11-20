# Tapiro: backend and platform feasibility research

Date: 2026-10-04. Every fact below was fetched in this session from the cited URL. Items marked **[uncertain]** have no primary source, or rest on secondary or anecdotal sources only.

---

## 1. Expo SDK, React Native, iOS versions

| Item | Value | Source |
|---|---|---|
| Current stable Expo SDK | **SDK 57** (released 2026-06-30) | https://expo.dev/changelog |
| React Native in SDK 57 | **0.86**, React 19.2 | https://expo.dev/changelog/sdk-57 |
| SDK 57 min iOS / Xcode | **iOS 16.4+**, **Xcode 26.4+** (SDK 56 is the same; SDK 55 was iOS 15.1+) | https://docs.expo.dev/versions/latest/ (support table) |
| Next SDK | **SDK 58 beta** (2026-09-15), on RN 0.88 RC. Stable ships after RN 0.88 is released; the beta lasts "three to four weeks" | https://expo.dev/changelog/sdk-58-beta |
| iOS 27 lifecycle | "Apps built with the iOS 27 SDK must use the UIKit scene-based life cycle, or they do not launch correctly on iOS 27." SDK 57 supports it as an opt-in via `ios.enableSceneSupport` (from `expo@57.0.23`). SDK 58 turns it on by default | https://expo.dev/changelog/sdk-57 |
| SDK 58 breaking changes | Strict TypeScript API is the default (no deep `react-native/Libraries` imports); expo-router navigation core reworked; `File.write()` is now async; CLI sets `NODE_ENV` before it loads `.env` | https://expo.dev/changelog/sdk-58-beta |
| Latest iOS releases | **iOS 27.0.1** (2026-09-28); iOS 26.6.2 (2026-09-08); iOS 27.2 beta 2 (2026-09-21) | https://developer.apple.com/news/releases/ |
| Latest two iOS majors | **iOS 27 and iOS 26**, so the deployment target is **iOS 26.0** | same |

Implication: iOS 26.0 is well above Expo's 16.4 floor. The project should start on SDK 58 if it is stable when scaffolding begins. Otherwise start on SDK 57 with `ios.enableSceneSupport: true` and plan the upgrade to 58 soon after.

---

## 2. Backend comparison

### 2.1 Summary table

| Dimension | Supabase | Firebase | Cloudflare (Workers + D1/DO + R2) |
|---|---|---|---|
| Nearest region | Singapore `ap-southeast-1` ([regions](https://supabase.com/docs/guides/platform/regions)) | `asia-southeast1` Singapore. No Malaysia region ([Firestore locations](https://firebase.google.com/docs/firestore/locations)) | D1 hint `apac` ([D1 location](https://developers.cloudflare.com/d1/configuration/data-location/)). DO hints include `apac-se`, but they are "best effort and not a guarantee" ([DO location](https://developers.cloudflare.com/durable-objects/reference/data-location/)). Workers run at the edge |
| Free tier | 500 MB DB, 1 GB storage, 50k MAU, 5 GB egress. **Paused after 1 week of inactivity**. 2 active projects ([pricing](https://supabase.com/pricing)) | Firestore 1 GiB, 50k reads/day, 20k writes/day. Auth 50k MAU. FCM free ([pricing](https://firebase.google.com/pricing)) | Workers 100k req/day. D1 5M rows read/day, 100k writes/day, 5 GB. DO (SQLite) 100k req/day. R2 10 GB-month ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)) |
| Paid entry | **Pro $25/mo**: 8 GB disk, 100 GB storage, 100k MAU, 250 GB egress, $10 compute credits, no pausing ([pricing](https://supabase.com/pricing)) | Blaze pay-as-you-go. Free quotas kept. $0.026/GB storage after the free tier ([pricing](https://firebase.google.com/pricing)). **New Storage default buckets require Blaze since 2026-02-03** ([FAQ](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)) | **$5/mo minimum**: 10M req, 30M CPU-ms. D1 $1/M rows written. R2 $0.015/GB-mo, **free egress** ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/)) |
| RN/Expo SDK | `@supabase/supabase-js` + `expo-sqlite/localStorage` for the session; Expo has an official guide ([Expo guide](https://docs.expo.dev/guides/using-supabase/)) | JS SDK (Auth, Firestore, RTDB, Storage) or React Native Firebase (native, **needs a dev build**). "Firebase JS SDK does not support all services for mobile apps", e.g. Analytics and Crashlytics ([Expo guide](https://docs.expo.dev/guides/using-firebase/)) | No first-party client SDK or auth product. The REST/WebSocket API and auth are built by hand **[no single doc; derived from absence of an auth product in fetched pages]** |
| Apple + Google sign-in | Native: `expo-apple-authentication` then `signInWithIdToken({provider:'apple'})`. Native-only setups **do not** need the 6-month secret rotation ([Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)). Google: `@react-native-google-signin/google-signin` then `signInWithIdToken({provider:'google'})`, with Web + iOS client IDs ([Google](https://supabase.com/docs/guides/auth/social-login/auth-google)) | RNFirebase: `AppleAuthProvider.credential(identityToken, nonce)`, `GoogleAuthProvider.credential(idToken)` + community Google library ([RNFirebase social auth](https://rnfirebase.io/auth/social-auth)) | You verify the Apple/Google ID tokens yourself (JWKS) and run your own sessions |
| Realtime (future chat) | Broadcast, Presence, Postgres Changes. Broadcast is the suggested option for chat ([Realtime](https://supabase.com/docs/guides/realtime)). Free: 200 concurrent / 100 msg/s. Pro: 500 / 500 ([limits](https://supabase.com/docs/guides/realtime/limits)) | Firestore `onSnapshot` listeners ([listen](https://firebase.google.com/docs/firestore/query-data/listen)) | Durable Objects + WebSocket Hibernation. Duration is not billed while hibernating. Suited to "chat rooms" ([DO WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)) |
| Geo queries (nearby tasks) | **PostGIS** extension, nearest-neighbor via `<->` + `ST_Distance` through RPC ([PostGIS](https://supabase.com/docs/guides/database/extensions/postgis)) | Geohash range queries. "False positives… you have to filter out false-positive results on the client side" ([geoqueries](https://firebase.google.com/docs/firestore/solutions/geoqueries)) | D1 supports FTS5, JSON and math only. **No R-tree or spatial support listed** ([D1 SQL](https://developers.cloudflare.com/d1/sql-api/sql-statements/)), so you would need a hand-rolled bounding box or geohash |
| Image storage | Supabase Storage (1 GB free / 100 GB Pro). Image transformations are **Pro+ only**, with 100 included, then $5 per 1,000 origin images ([transforms](https://supabase.com/docs/guides/storage/serving/image-transformations)) | Cloud Storage (Blaze required for new buckets, see above) | R2, free egress |
| Push | Expo Push via Edge Function + DB webhook on a `notifications` table ([push example](https://supabase.com/docs/guides/functions/examples/push-notifications)) | FCM (free) | Call Expo Push or APNs from the Worker |
| Custom domain | Paid add-on on paid plans: **$10/mo**, not covered by the Spend Cap ([custom domains](https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains)) | n/a | Native (your own zone) |

Push for any backend: the Expo Push Service is free ("There is no cost associated with sending notifications through Expo push notification service"), capped at 600 notifications per second per project. You can also send through APNs directly with `getDevicePushTokenAsync` ([Expo push FAQ](https://docs.expo.dev/push-notifications/faq/)).

### 2.2 Mainland China reachability (students going home)

- **Google is blocked.** Wikipedia (secondary): "most Google services … has been blocked in mainland China since 27 May 2014" ([Google China](https://en.wikipedia.org/wiki/Google_China)). It follows that **Google Sign-In will not work from mainland China without a VPN**. **[secondary source]**
- **Firebase:** no Google primary source. Third-party vendors (appinchina.co, chinafy.com, 21cloudbox.com in search results) say Firebase, FCM and Firestore are inaccessible from China. **[uncertain: secondary only, but consistent with the Google block]**
- **Supabase:** GitHub issue #2631 (2021-07-29) reports "(Seems) supabase api and website are blocked by Chinese GFW" ([issue](https://github.com/supabase/supabase/issues/2631)). Discussion #27678 (2024-07-01) says "requests from mainland China are unstable due to GFW". A 2026-02-16 comment there says an EU West project "worked just fine without a vpn". No maintainer answer and no China region ([discussion](https://github.com/orgs/supabase/discussions/27678)). **[uncertain: anecdotal and mixed]** Supabase *realtime* timeouts in China were also reported in the supabase-flutter issue #1054 (search result only, not fetched). A custom domain ($10/mo) avoids dependence on `*.supabase.co` DNS, but **no source confirms it fixes reachability**.
- **Cloudflare:** the Cloudflare China Network (in-China PoPs via JD Cloud) needs an **Enterprise plan + ICP filing**. The docs say traffic routed through servers outside China "faces significant latency and reliability issues" ([China Network](https://developers.cloudflare.com/china-network/)). Community threads report `workers.dev` DNS is poisoned in China and recommend a custom domain ([community thread, 403 on fetch; search snippet only](https://community.cloudflare.com/t/worker-is-not-available-in-china/497419)). **[uncertain]**
- **Apple:** Sign in with Apple and APNs are Apple services. No fetched source says they are blocked in China. **[uncertain: no primary source fetched; widely assumed to work]**

Conclusion: no option gets a guaranteed mainland China path without an ICP filing and in-China infrastructure, which is out of scope. Firebase is the worst case because the whole backend sits on Google domains. For the rest, design for **degraded rather than broken** behavior: Apple sign-in as the login that should work in China, a custom API domain, and offline-tolerant UI. Test this from a real mainland China network before launch.

### 2.3 Recommendation: **Supabase (Singapore, `ap-southeast-1`)**

Reasons:
1. **Geo queries are first-class.** PostGIS nearest-neighbor via RPC fits "nearby tasks" now, and rentals, the market and carpool later. Firestore geohash gives false positives, and D1 has no spatial support.
2. **The data model is relational.** Bounties, acceptances, reports and blocks, then listings and rides, are relational with access rules. Postgres + RLS fits them. Firestore would need denormalization.
3. **Native Apple + Google auth through `signInWithIdToken`**, with no secret rotation on native-only setups. Expo has an official integration guide.
4. **Realtime Broadcast/Presence** covers in-app chat later without a new service.
5. **Singapore is the closest region** to Malaysia.
6. **Avoids the Google stack**, which is blocked in mainland China.

Trade-offs to accept:
- The free tier pauses after 1 week idle. **Budget Pro at $25/mo for production** (+$10/mo custom domain if adopted).
- China reachability is unverified, so it must be tested on the ground.
- Image resizing is Pro-only and metered. Compress client-side before upload.

Rejected:
- **Firebase.** Google infrastructure is blocked in China, the target users travel there, geo queries are weak, and Storage now needs Blaze.
- **Cloudflare self-built.** Cheapest at scale and egress is free, but auth, geo indexing and the admin and moderation tooling all have to be built by hand, which is too much for a v1. It remains a reasonable later option for a chat DO layer or R2 image hosting if Supabase egress costs grow.

---

## 3. Apple App Review Guidelines

Source for all quotes: https://developer.apple.com/app-store/review/guidelines/

### 4.8 Login Services: is Sign in with Apple required alongside Google?
> "Apps that use a third-party or social login service (such as Facebook Login, Google Sign-In, …) to set up or authenticate the user's primary account with the app must also offer as an equivalent option another login service with the following features: the login service limits data collection to the user's name and email address; the login service allows users to keep their email address private as part of setting up their account; and the login service does not collect interactions with your app for advertising purposes without consent."

The guideline does not name Sign in with Apple. It requires an *equivalent* login with those properties, and Sign in with Apple meets them. Tapiro already offers Apple + Google, so it complies. None of the exemptions (own-account-only, education/enterprise, government ID, third-party client) apply.

### 5.1.1(v) Account Sign-In / deletion
> "If your app supports account creation, you must also offer account deletion within the app."

From https://developer.apple.com/support/offering-account-deletion-in-your-app/:
- Deletion must be easy to find, typically in account settings.
- Delete the account record **and associated personal data, including user-generated content**. Temporary deactivation is not enough.
- The flow should complete in the app. Do not require phone calls or emails.
- Re-authentication and confirmation steps are allowed. If deletion is not immediate, tell the user the timeline.
- **Sign in with Apple:** "Use the Sign in with Apple REST API to revoke user tokens" (TN3194).

Also from 5.1.1(v): "If your app doesn't include significant account-based features, let people use it without a login." This suggests letting guests browse the board, with login required only to post or accept.

### 1.2 User-Generated Content
> "Apps with user-generated content or social networking services must include:
> - A method for filtering objectionable material from being posted to the app
> - A mechanism to report offensive content and timely responses to concerns
> - The ability to block abusive users from the service
> - Published contact information so users can easily reach you"

> "…random or anonymous chat … making physical threats, or bullying do not belong on the App Store…"

### 5.1.1(iv) consent / purpose strings
> "Apps that collect user or usage data must secure user consent for the collection… Apps must also provide the customer with an easily accessible and understandable way to withdraw consent. Ensure your purpose strings clearly and completely describe your use of the data."

### 5.1.5 Location Services
> "Use Location Services in your app only when it is directly relevant to the features and services provided by the app… Ensure that you notify and obtain consent before collecting, transmitting, or using location data. If your app uses Location Services, be sure to explain the purpose in your app…"

### 4.5.4 Push Notifications
> "Push Notifications must not be required for the app to function, and should not be used to send sensitive personal or confidential information. Push Notifications should not be used for promotions or direct marketing purposes unless customers have explicitly opted in to receive them via consent language displayed in your app's UI, and you provide a method in your app for a user to opt out…"

---

## 4. Expo i18n

Sources: https://docs.expo.dev/guides/localization/ and https://docs.expo.dev/versions/latest/sdk/localization/

- **Libraries:** `expo-localization` reads device settings. The guide's primary example uses `i18n-js`, and it lists Lingui, react-i18next and Intlayer as alternatives.
- **System locale:** `getLocales()` (synchronous) or the `useLocales()` hook. `Locale` has `languageTag`, `languageCode`, `languageScriptCode`, `regionCode` and `textDirection`. To map `zh-Hans` correctly, use `languageCode` + `languageScriptCode`, not `languageCode` alone.
- **iOS locale change:** "On iOS, when a user changes the device's language, the app will reset", so no live listener is needed on iOS.
- **iOS per-app language (Settings > App > Language):** set the `expo-localization` config plugin's `supportedLocales`, plus `ios.infoPlist.CFBundleAllowMixedLocalizations: true`:
  ```json
  ["expo-localization", { "supportedLocales": { "ios": ["zh-Hans","en","ms"] } }]
  ```
- **Localized app name and permission strings:** use the top-level `locales` map, e.g. `"zh-Hans": "./languages/zh-Hans.json"`, with an `ios` section holding `CFBundleDisplayName`, `NS*UsageDescription` and `Localizable.strings`. `CFBundleAllowMixedLocalizations` makes prebuild write `InfoPlist.strings`.
- **RTL:** "RTL is enabled by default in SDK 58+". Set `"supportsRTL": false` in the plugin, because none of zh-Hans, en or ms is RTL.
- **In-app switch:** the docs do not prescribe an approach. Combining them gives a stored user preference with fallback to `getLocales()`, falling back to `zh-Hans`, applied in the JS i18n library. The iOS Settings per-app language changes what `getLocales()` returns, so "follow system" mode respects it. **[design inference, not documented]** Native strings (permission dialogs, app name) follow the iOS per-app setting only, not a JS-only override. That is the reason to also expose a "Change in Settings" link.

---

## 5. Malaysia PDPA (Act 709, as amended 2024)

- Seven principles: General (consent), Notice and Choice, Disclosure, Security, Retention, Data Integrity, Access ([PDP principles](https://www.pdp.gov.my/ppdpv1/en/principles-of-personal-data-protection/)). The Act regulates processing "in commercial transactions" ([Act page](https://www.pdp.gov.my/ppdpv1/en/akta/pdp-act-2010-en/)). **[uncertain]** whether a free, money-free mutual-help app counts as "commercial". Assume it applies.
- The 2024 amendments cover breach notification (Circular 1/2025), DPO (Circular 2/2025), data portability and cross-border transfer ([Act page](https://www.pdp.gov.my/ppdpv1/en/akta/pdp-act-2010-en/)).
- **Breach notification:** to the Commissioner "within 72 hours", and to affected individuals within 7 days after that, where there is significant harm or 1,000+ individuals are affected. In force 2025-06-01 ([DLA Piper summary, secondary](https://privacymatters.dlapiper.com/2025/03/malaysia-guidelines-issued-on-data-breach-notification-and-data-protection-officer-appointment/)).
- **DPO:** required above 20,000 data subjects (10,000 for sensitive data), or for regular and systematic monitoring. The DPO must be fluent in Malay and English (same source, secondary).
- **Cross-border transfer:** the s.129 whitelist was removed (in force 2025-04-01). The data controller must assess that the destination has substantially similar or adequate protection, or rely on an exception ([Rödl summary, secondary](https://www.roedl.com/en/insights/malaysia-part3-personal-data-protection-amendment-act-2024/)). The official guideline PDF (https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2025/08/GP_CBPDT_EN-1.pdf) was fetched but could not be parsed. **[review the guideline before storing data in Singapore]**

---

## Constraints implied

1. **Deployment target iOS 26.0.** Reason: latest two majors are 27 and 26. Expo's floor is 16.4.
2. **Expo SDK 58 if stable at scaffold time, else SDK 57 + `ios.enableSceneSupport: true`.** Reason: the iOS 27 SDK requires the UIScene lifecycle.
3. **Use a dev build, not Expo Go.** Reason: `@react-native-google-signin/google-signin` and the Swift kit module need native code.
4. **Backend: Supabase, Singapore `ap-southeast-1`, Pro plan for production.** Reasons: PostGIS, relational + RLS, native ID-token auth. Free projects pause after 7 idle days.
5. **Auth is native ID-token only.** Use `expo-apple-authentication` / google-signin, then `signInWithIdToken`. No web OAuth. Reasons: no Apple secret rotation, and better UX.
6. **Show Apple first, Google second, never Google alone.** Reasons: Guideline 4.8, and Google is blocked in mainland China.
7. **Store the Apple name on first sign-in.** Reason: Apple returns it only once.
8. **In-app account deletion removes the account + all UGC + storage objects, and revokes Apple tokens through the REST API.** Reason: 5.1.1(v), TN3194.
9. **Allow guest browsing; require login only to post or accept.** Reason: 5.1.1(v), "let people use it without a login".
10. **UGC v1 must ship with a content filter, report (task and user), block user, moderation queue with timely response, and published contact info.** Reason: Guideline 1.2.
11. **No anonymous or random chat.** Chat (later) is only between poster and accepter of a task. Reason: 1.2 excludes "random or anonymous chat".
12. **Location is when-in-use only, used only for nearby tasks, and has an in-app explanation before the system prompt. The app must work with a manually picked area if location is denied.** Reasons: 5.1.5, 5.1.1(iv).
13. **Push is opt-in. The app works without it. Payloads carry no personal details. No marketing push without separate consent and an opt-out.** Reason: 4.5.4.
14. **Push goes through the Expo Push Service, triggered by a Supabase Edge Function + DB webhook.** Reason: free, and it is the documented pattern.
15. **No money flows in the app. Copy must say rewards are settled offline between users.** Reason: product decision, which also keeps IAP rules out of scope. **[IAP guideline not researched]**
16. **i18n uses `expo-localization` + one JS i18n library. Resolution order: stored override > `getLocales()` (match `languageCode` + `languageScriptCode`) > `zh-Hans`.** Reason: follows the system locale and supports the in-app switch.
17. **Config needs `supportedLocales: ["zh-Hans","en","ms"]`, `CFBundleAllowMixedLocalizations: true`, a `locales` map for app name and permission strings, and `supportsRTL: false`.** Reasons: iOS per-app language and localized system dialogs. RTL is on by default from SDK 58.
18. **Run all backend traffic through a custom API domain. Treat China connectivity as degraded: offline-tolerant reads, clear network errors. Test from mainland China before launch.** Reason: `*.supabase.co` reachability is unverified, and Google is blocked.
19. **Compress and resize images on the client before upload.** Reason: Supabase image transforms are Pro-only and metered.
20. **PDPA: bilingual-ready privacy notice shown at signup, purpose-limited collection, a retention and deletion policy, a 72-hour breach runbook, and a documented cross-border (Singapore) transfer assessment.** Reason: Act 709 principles + 2024 amendments.
21. **Minimize data: no student ID, IC or passport numbers in v1.** Reasons: lowers PDPA exposure and avoids sensitive-data DPO triggers.
