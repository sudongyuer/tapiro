---
branch: docs/model-studio-live
date: 2026-11-25
topic: stale-blocker-status
---

# Retro candidates: owner blockers reported from stale notes

- What happened: I told the owner three times that 问小貘, bounty drafting and the receipt read wait on Alibaba Model
  Studio being activated. Hosted `ai_metering` has had real `ask` and `translate` calls on the pinned Qwen models since
  2026-11-21; the `AccessDenied.Unpurchased` note in `docs/status.md` was from 2026-11-20. The owner asked
  「阿里云百炼开通 不是开通了么？之前不是都做过了？」.
- Cost: the owner was asked again for something already done; a subagent built the receipt read against the fake
  provider only, when it could have been smoked against the real model.
- Root-cause class: an external account's state was repeated from repo notes instead of being checked live. Same class
  as `store-config-unchecked` (IAP products assumed to exist), third occurrence in two days.
- Tag: `stale-external-state`
- Candidate fix: `scripts/owner-blockers.mjs` probes each owner-side dependency live before a report lists it (ASC
  agreements and IAP products via the API key, hosted secret names for `APNS_PRIVATE_KEY`, the last successful
  `ai_metering` row per provider) and prints what is still blocked; reports quote its output.
- Landed (2026-11-25, `chore/owner-blockers`): `scripts/owner-blockers.mjs` with unit tests; agreements have no App
  Store Connect API and print as CHECK. AGENTS.md (Working with the owner) asks for its output before a report names
  something as waiting on the owner.
