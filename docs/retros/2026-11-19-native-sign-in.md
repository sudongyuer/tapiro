---
branch: feat/native-sign-in
date: 2026-11-19
pr: Real Sign in with Apple and Google Sign-In adapters; both providers on the local stack
title: adapters had waited for the paid team since step 1; built as far as Simulator and stack tests prove
escaped: 0
rework: 4
interventions: 0
overturned: 0
---

# Retro: real sign-in (Apple and Google adapters)

## Core (mandatory)

| Dimension | Measure               | This step                                                                                           |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0 so far                                                                                            |
| Quality   | Skipped verifications | Real sign-in on a device (needs the owner's Google clients, App ID capability and hosted Auth)      |
| Speed     | Wasted time           | ~10 min: the first stack run timed out on Apple's key fetch; the CLI source search hit a moved path |
| Autonomy  | Interventions         | 0                                                                                                   |

## Findings

- The stack test's Apple case timed out at bun's 5 s default: GoTrue fetches Apple's signing keys on the first
  Apple token (about 6 s from the container). A provider-enabled check needs a timeout that covers a JWKS fetch. Tag
  `stack-network-timeout`.
- The Google nonce question was settled from source, not docs: GoogleSignIn-iOS uses AppAuth's initializer that
  generates a nonce when none is passed, which is why Supabase needs `skip_nonce_check` for this library. Docs on both
  sides were silent. Tag `read-the-source`.
- `require()` of an Expo config plugin can return `{ default }`; `expo config --type introspect` with the env set
  caught it before any build. Introspection is the cheap check for a plugin wrapper. Tag `plugin-introspect`.
- The full `bun test` failed once: `sessionLifetimes.test.ts` requires a declared lifetime for every module-level
  value, and I had run only the account tests. The guard worked as designed; the full suite before commit caught it.
  Tag `scoped-test-run`.
- Review of #189 found the Google cancel code wrong on iOS (`-5`, read from native constants, not the JS name) and
  Apple's one-time name lost on a failed exchange. I had read the library's JS `statusCodes` but not where the values
  come from. Both fixed with tests that fail on the old code. Tag `native-constant`.
- The re-review found my first name fix leaked a name across accounts: one pending value for the whole service,
  never cleared on sign-out. State that outlives a request needs an owner (provider + subject) and an end (session
  change); `sessionLifetimes.test.ts` only sees module-level values, not closures. Tag `closure-lifetime`.
- `prettier --write docs/retros/*.md` reformatted 23 other retros and the whole index table, and I committed it
  without reading the staged list. Restored in follow-up commits. Format only the files I changed, and read
  `git status` before every commit (CLAUDE.md already says so). Tag `glob-format`.
- I told the reviewer a missing URL scheme only fails because the library has `@try`; the `@try` is under `#if DEBUG`.
  Read the preprocessor guards around a catch before relying on it. Tag `debug-only-guard`.
- My first `/code-review` without a target reviewed the previous merged PR, because the main checkout was the cwd.
  Pass the PR number. Tag `review-target`.
- Supabase CLI 2.x moved its Go sources under `apps/cli-go/`; `env()` that is unset only warns, so enabling a provider
  with an env client ID does not break `supabase start` or CI.

## Changes landed

None beyond the feature; no rule or check needed: each finding was caught by a check in the same step.
