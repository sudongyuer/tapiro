---
title: Push through APNs directly (release builds)
status: proposed
created: 2026-11-20
approved:
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Amends: realtime-push (2026-10-31), rows 「Push trigger」 and 「Account-free build」 (Expo Push → direct APNs), and the
foundation's push row (「Direct APNs: later if needed」). Builds on: docs/plans/2026-11-03-realtime-push.md step 3. -->

## Problem

TestFlight and cabled Release builds never receive a push. `notify` only records pushes (`recordingSender`,
`supabase/functions/notify/index.ts` before this change), and the app registers an Expo push token only when an EAS
`projectId` exists, which Tapiro never had (`src/lib/push/instance.ts`, `projectId()`), so `push_tokens` stays empty.
Sending through Expo would also need our APNs key uploaded to an EAS project and a third party in the path
(`docs/status.md`, 「Release builds」). The APNs key `88Y29CGN9U` (Sandbox & Production, team `4RML7RLKML`) exists.

## Goals and scope

**Do**

- `notify` sends each claimed push straight to APNs over HTTP/2 with token-based auth (ES256 JWT).
- The app registers the native APNs device token and the APNs environment it was signed for.
- The payload the app reads stays the same: title, body, `thread-id`, and `{kind, id}` under the payload's `body` key.
- A stack test runs the real sender inside the Edge Runtime against a mock APNs with a test key.

**Don't do**

- Live Activity pushes: `notify` sends none today (remote updates are Tasks 6–8 of the Live Activity plan). The sender
  posts with topic `app.tapiro` and push type `alert` only; Live Activity needs topic
  `app.tapiro.push-type.liveactivity` and push type `liveactivity`, added with those tasks.
- Expo Push: no EAS project, no third party in the path.
- Retrying the other APNs host on `BadDeviceToken`: the environment comes from the signing entitlement, so a mismatch
  means a broken build, not a normal case.

## Decisions

| Decision                 | Choice                                                                                                                                                                                                                                                                      | Why                                                                                                                                                                                            | Alternatives considered                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| D1 Transport             | Direct APNs, `POST /3/device/<token>`, `fetch` in the Edge Runtime (HTTP/2 by ALPN)                                                                                                                                                                                         | Release builds need it; no third party sees the copy; the probe got APNs JSON reasons from both hosts inside the Edge Runtime                                                                  | Expo Push: needs an EAS project and our key uploaded there                                                                 |
| D2 Provider token        | ES256 JWT (`kid` = key ID, `iss` = team, `iat`), signed with WebCrypto from the PKCS#8 `.p8`; `iat` is the start of the current 30-minute window, so every isolate signs the same claims and a token is at most 30 minutes old                                              | Apple rejects tokens older than an hour and throttles refreshes more often than every 20 minutes; isolates start at any time (review, 2026-11-20)                                              | A token per isolate start or per run: risks `TooManyProviderTokenUpdates`                                                  |
| D3 Secrets               | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (PEM, newlines or `\n` both accepted); the owner pastes the key                                                                                                                                                           | The key never enters the repo or an agent's context                                                                                                                                            | —                                                                                                                          |
| D4 Environment           | The app reads `aps-environment` from the embedded profile (`expo-application` `getIosPushNotificationServiceEnvironmentAsync`): `development` → sandbox, `production` → production; none → production, or sandbox in a `__DEV__` build                                      | App Store and TestFlight installs carry no embedded profile and use production; a cabled Release build is signed with a development profile and uses sandbox, which `__DEV__` alone gets wrong | `__DEV__` only: wrong for cabled Release installs; server retries the other host: doubles traffic and hides a broken build |
| D5 Token storage         | `push_tokens.token` holds the hex APNs token (lowercase, 64–200 hex); new column `environment`; `register_push_token(token, language, environment)` replaces the two-argument RPC; the old constraint is replaced `NOT VALID`, and `set_push_language` skips any legacy row | Additive; builds before this change never registered a token (no `projectId`), so the dropped two-argument RPC breaks nothing that worked                                                      | Delete Expo rows in the migration: destructive, and there are none on hosted                                               |
| D6 Payload               | `aps.alert {title, body}`, `aps.sound`, `aps.thread-id`; `body: {kind, id}`; headers `apns-topic: app.tapiro`, `apns-push-type: alert`, `apns-priority: 10`                                                                                                                 | expo-notifications reads `content.data` from `userInfo.body` (`NotificationRecords.swift:331`), so tap routing is unchanged                                                                    | Top-level custom keys: arrive as `data = null`                                                                             |
| D7 Dropped tokens        | `410`, `Unregistered`, `DeviceTokenNotForTopic` → token dropped (the old `DeviceNotRegistered` path); `BadDeviceToken` stays the error `apns_400_BadDeviceToken`                                                                                                            | Those can never deliver; a hex-checked token that is "bad" means a wrong environment, which must show in `events.push_error` rather than vanish as `no_device` (review, 2026-11-20)            | Drop on `BadDeviceToken`: hides a wrong environment                                                                        |
| D8 Missing configuration | Hosted without the three secrets: every push fails as `apns_not_configured` (or `apns_bad_key`); only the CLI's local stack falls back to `recorded_pushes`                                                                                                                 | A push that was not delivered must not be marked sent (AGENTS.md, Data integrity)                                                                                                              | Record on hosted too: shows undelivered pushes as sent                                                                     |
| D9 Stack test            | `x-tapiro-test-apns: 1` routes `notify` to a mock APNs, honoured only with `APNS_ALLOW_TEST=1` on the CLI's local stack (`isLocalStack`); test key in `local.env`                                                                                                           | Mirrors `ai-draft`'s test provider; a hosted project can never be pointed away from Apple                                                                                                      | Deno-only tests: do not count for crypto paths (AGENTS.md)                                                                 |

## Data flow and ownership

App: `getDevicePushTokenAsync()` + entitlement → `register_push_token(token, language, environment)`. Database:
`claim_due_pushes` returns each recipient's `{token, language, environment}`. `notify`: copy per token language →
`apnsSender` signs one provider token per batch, posts each push to `api.push.apple.com` or
`api.sandbox.push.apple.com` by the token's environment, maps answers to `ok` / `Unregistered` / `apns_<status>_<reason>`
→ the existing `finish_push` / `drop_push_token`.

## Errors and degradation

| Failure                              | User sees              | System does                                                             |
| ------------------------------------ | ---------------------- | ----------------------------------------------------------------------- |
| Token gone                           | No push on that device | Token dropped; the push counts as sent if another device took it        |
| Wrong environment (`BadDeviceToken`) | No push on that device | `apns_400_BadDeviceToken` in `events.push_error`; token kept            |
| APNs 429 / 5xx / network             | No push this run       | `apns_<status>_<reason>` or `apns_unreachable`; one retry (existing)    |
| Secrets missing or key malformed     | No push                | `apns_not_configured` / `apns_bad_key` in `events.push_error`, not sent |
| Expired or invalid provider token    | No push this run       | `apns_403_<reason>`; the next window signs a new token                  |

## UI/UX and motion

None: no screen changes; the registration call gains one argument.

## Known limits

- Real delivery is unverified until a device on iOS 26 runs a TestFlight or cabled build.
- The hosted push poke and five-minute drain call `notify` only once the Vault secrets `project_url` and
  `service_role_key` exist (`public.call_edge_function`).
- Live Activity remote updates are not sent (see Don't do).

## Implementation order

1. Migration: `environment`, the APNs token check, the three-argument RPC, `claim_due_pushes` with the environment.
2. `notify`: `apns.ts`, `config.ts`, `index.ts`; unit tests in Bun and Deno.
3. App: `deviceToken.ts` with `expo-application`; registration passes the environment.
4. Stack test against a mock APNs; hosted deploy and the non-secret secrets.

## Verification

- `bun test`, `bun run test:deno`, pgTAP on a fresh stack, the stack test `notify-apns.integration.ts`.
- Manual, on a device on iOS 26 after the owner sets `APNS_PRIVATE_KEY` and the Vault secrets: sign in as A on the
  phone (TestFlight), check one `push_tokens` row with `environment = production`; have B apply to A's open bounty;
  A's locked phone shows 「<bounty title> / B 申请了你的悬赏」 within seconds, and tapping it opens the applicant list;
  `push_queue.sent_at` is set and `events.push_error` is null. A cabled build repeats it with `sandbox`.

## Implementation Record (2026-11-20)

PR: not opened yet · Commits: see the PR

### What was built

- Direct APNs sender with ES256 provider tokens, per-environment hosts and the `body` data key. Evidence:
  `supabase/functions/notify/apns.ts`; `supabase/functions/notify/apns.test.ts`.
- Sender selection: live from the three secrets, `apns_not_configured` / `apns_bad_key` on hosted without them,
  `recorded_pushes` only on the local stack, the mock behind the local-only test header. Evidence:
  `supabase/functions/notify/config.ts`, `config.test.ts`, `index.ts`.
- Tokens carry their environment from the database to the sender. Evidence: `supabase/functions/notify/handler.ts`
  (`ApnsEnvironment`, `UNREGISTERED`), `supabase/migrations/20261120000100_apns_tokens.sql`.
- The app registers the APNs token and environment. Evidence: `src/lib/push/deviceToken.ts`, `instance.ts`,
  `pushRegistration.ts`; `expo-application` added as a direct dependency (`package.json`).

### Deviations from the design

| Design said                                            | Shipped                     | Why                                                                             | Confirmed by                                                                 |
| ------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| realtime-push: `notify` calls Expo Push (`ExpoSender`) | Direct APNs (this spec, D1) | Expo needs an EAS project and our key there; TestFlight builds received nothing | Owner delegated technical decisions (AGENTS.md, 2026-11-17); listed for veto |

### Bugs fixed during implementation

Found by the review round before the PR, fixed in the second commit of the branch:

- **Symptom:** each isolate signed its own provider token at its start time. **Root cause:** a per-isolate cache;
  cold starts every few minutes could exceed Apple's refresh limit. **Fix:** `iat` pinned to the 30-minute window
  (`apns.ts`, test 「isolates started at different times in one window sign the same iat」).
- **Symptom:** a wrong-environment token would be deleted and the push recorded as `no_device`. **Root cause:**
  `BadDeviceToken` was in the drop list. **Fix:** kept as `apns_400_BadDeviceToken` (D7).
- **Symptom:** `set_push_language` would fail on any legacy Expo row. **Root cause:** an update re-checks a `NOT VALID`
  constraint. **Fix:** it updates only hex rows (migration).
- **Symptom:** a malformed local test key would crash `notify` at boot on the local stack. **Fix:** `localTestSender`
  catches the import like `liveSender` (`config.ts`).

### Verification

- `bun test supabase/functions/notify src/lib/push` → 54 pass across 6 files.
- Deno: `apns.test.ts` and `config.test.ts` pass under `deno test` (added to `test:deno`).
- Isolated fresh stack (scratch `config.toml`, ports 567xx): `supabase test db` → 67 files, 2243 tests, PASS; a second
  run failed only `live_push` 35 (「every event row is broadcast once」, have 26, want 25), the absolute count CI's
  comment already calls fragile; no change here touches broadcasts. After the review fixes a third fresh stack passed
  all of pgTAP and the stack test.
- Stack test `supabase/functions/tests/notify-apns.integration.ts` through `supabase functions serve` → 1 pass, 12
  assertions: the JWT verifies with the test public key, sandbox and production paths, payload with `body`, gone token
  dropped, queue row sent.
- Edge Runtime HTTP/2 probe (scratch function, not committed): `POST` with a bogus provider token to both hosts →
  `403 {"reason":"InvalidProviderToken"}` from each, so the runtime reaches APNs over HTTP/2.

### Known limits

- Unverified: delivery to a real device (the owner's iPhone is being updated to iOS 26); the manual check is in
  Verification above.
- Spec stays `proposed`: only the owner moves a spec to `approved` (AGENTS.md); the record is appended so the next
  session sees what shipped.
