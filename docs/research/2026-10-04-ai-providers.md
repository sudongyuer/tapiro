# Tapiro AI feasibility: models, speech, compliance, cost

Research date: 2026-10-04. Every fact below was fetched this session from the cited URL. Items marked **[UNVERIFIED]** have no primary source and need a test or a legal opinion. Prices are list prices in USD on the fetch date.

## 1. Model comparison

| | A. Apple Foundation Models (on-device) | A'. Apple PCC model | B1. Qwen via Model Studio Singapore | B2. DeepSeek direct API | B3. DeepSeek via Model Studio Singapore | B4. Z.ai GLM (optional) |
|---|---|---|---|---|---|---|
| Where it runs | On the device | Apple Private Cloud Compute | Inference on "global nodes excluding Chinese mainland"; request data stored in Singapore [1][2] | PRC: "we directly collect, process and store your Personal Data in People's Republic of China" [3] | Same as B1, "International" scope [4] | Singapore entity; "generally provide the Services from Singapore" [5] |
| OS / device | iOS 26.0+; needs an Apple Intelligence device (iPhone 15 Pro / Pro Max, iPhone 16 and later) [6][7] | iOS 27+ only, Apple Intelligence device, managed entitlement required [8] | Any (server) | Any (server) | Any (server) | Any (server) |
| Malaysia | No Malaysia exclusion found. Device **and Siri language** must be a supported language [6] | Same | n/a | n/a | n/a | n/a |
| Mainland China | Does not work on devices bought in mainland China. A device bought elsewhere does not work while in mainland China **if** the Apple Account region is also mainland China [6] | Same | Callers only reach our Supabase proxy. See section 5 | Same | Same | Same |
| zh-Hans | Yes [6] | Yes | Yes (Qwen3: 119 languages) [9] | Not checked | Not checked | Not checked |
| Malay (ms) | **No**. Not in the Apple Intelligence language list [6][7]. The model throws `unsupportedLanguageOrLocale` [10] | No | **Yes**. Malay is listed in the Qwen3 language table [9] | **[UNVERIFIED]** no published language list | [UNVERIFIED] | [UNVERIFIED] |
| Context | **4,096 tokens per session**, counting instructions, tools, schemas and outputs. About 1 token per Chinese character [11] | 32K [8] | qwen3.7-flash 1M tier pricing; requests under 32K use the cheapest tier [12] | 1M [13] | per model [12] | not checked |
| Structured output / tools | `@Generable` guided generation and the `Tool` protocol [14][15] | Same API [8] | Function calling on Qwen3.7-Plus/Flash, Qwen-Plus/Flash series. Qwen3.8-Flash is **not** in the list [16] | JSON output and tool calls [13] | Function calling on deepseek-v4-pro/flash [16] | not checked |
| Limits | On-device: "Unlimited" [8] | Daily per-user quota; iCloud+ upsell [8] | RPM/TPM per model per account [1] | Concurrency 2,500 (flash) [13] | RPM/TPM [1] | not checked |
| Training on our data | Not applicable (on device) | PCC privacy | "will never use your data for model training" [17] | The consumer privacy policy lists training as a purpose. The open-platform terms make us the controller for our end users. API-specific opt-out not found [3][18] | Same as B1 [17] | "do not store any of the content … not saved on our servers" for API [5] |
| Retention | n/a | n/a | "stores data generated from model and application calls". Retention period **[UNVERIFIED]** [17] | "as long as necessary" [3] | Same as B1 | Not stored [5] |
| Governing law | Apple DPLA | Apple | Alibaba Cloud international terms [UNVERIFIED which entity] | PRC mainland law and courts [18] | Alibaba | not checked |
| Simulator | Works only if the host Mac runs macOS 26+ with Apple Intelligence enabled. Source is a developer-forum thread, not docs [19] | [UNVERIFIED] | yes | yes | yes | yes |
| How to call from RN | Swift only. Needs our own Expo native module: the Expo `expo-ai` Foundation Models provider PR #49998 was **closed, not merged**. Third-party modules exist [20] | Same | HTTPS from an Edge Function (OpenAI-compatible) [1] | HTTPS from an Edge Function [13] | HTTPS from an Edge Function | HTTPS from an Edge Function |

Notes:
- Apple model versions change with the OS (26.0–26.3, 26.4, 27.0). Apple recommends versioning prompts on a server [21].
- On-device guardrails only cover supported languages. Malay text mixed into a prompt may bypass them [10].
- The DashScope domain `dashscope-intl.aliyuncs.com` "will no longer support new features after September 30, 2026". Use the workspace domain `{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com` [1].

## 2. Speech-to-text (zh / en / ms)

| Option | zh-CN | en-MY | ms-MY | Cost | Notes |
|---|---|---|---|---|---|
| Apple on-device dictation models (`DictationTranscriber`, iOS 26) | Mandarin (China mainland), on-device | English (Malaysia), on-device | **Malay (Malaysia) on-device: yes** | $0 | The Apple feature-availability page lists Malay (Malaysia) under "On-Device and Modeless Dictation" [22]. `DictationTranscriber` uses the same on-device models but "does not support languages … that SFSpeechRecognizer only supports via network access" [23] |
| Apple `SpeechTranscriber` (new model, iOS 26) | **[UNVERIFIED]** | [UNVERIFIED] | **[UNVERIFIED]** | $0 | Locales are only exposed at runtime via `supportedLocales`. Apple suggests `DictationTranscriber` as the fallback [24]. Assets download through `AssetInventory` [25] |
| Legacy `SFSpeechRecognizer` (server mode) | yes | yes | yes | $0 | Per-device and per-app daily throttles, **1-minute audio limit**, and "Do not perform speech recognition on private or sensitive information" [26] |
| Qwen ASR via Model Studio Singapore | Mandarin plus dialects | yes | **Malay listed** [27] | qwen-audio-3.0-asr-flash (≤5 min, HTTP): **$0.000035/s**. 3.0 streaming: **$0.00009/s**. qwen3-asr-flash-realtime: $0.00009/s. 10 h free quota for 90 days [12] | International scope, so no mainland processing [2] |

Recommendation: use the Apple on-device `DictationTranscriber` first for all three locales. Fall back to Qwen ASR in the cloud when the device lacks the asset or accuracy is poor. Test ms-MY `supportedLocales` on a real device in week 1.

## 3. Cost model

Assumed usage per active user per month (30 days):

- **Chat:** 20 turns/day. Each turn has about 3,500 input tokens (1,500 cacheable system prompt and tool schemas, plus 2,000 of history, user text and tool results) and 250 output tokens. That is 2.1M input (0.9M cacheable) and 150K output.
- **Drafts:** 3/week ≈ 13/month. Each is 3K in and 600 out, so 39K in and 8K out.
- **Summaries:** 1/day at 4K in and 300 out, so 120K in and 9K out.
- **Monthly total:** ≈ **2.26M input (0.9M cacheable) and 0.167M output.**
- **Voice:** 2 min/day = **3,600 s/month**.

| Option | Prices used (per 1M in / out) | LLM $/user/mo | ASR $/user/mo | Total |
|---|---|---|---|---|
| Apple on-device LLM + Apple ASR | 0 | 0 | 0 | **$0** (ineligible devices and Malay need a cloud fallback) |
| qwen3.7-flash, Intl [12] | $0.03 / $0.13 (≤32K tier) | 0.068 + 0.022 = **$0.09** | Apple $0, or Qwen file ASR $0.13, or streaming $0.32 | **$0.09–0.41** |
| qwen-plus, Intl [12] | $0.4 / $1.2 (non-thinking) | 0.90 + 0.20 = **$1.10** | same | $1.10–1.42 |
| qwen3.7-plus, Intl [12] | $0.4 / $1.6 list (limited-time 20% off) | **$1.17** list | same | $1.17–1.49 |
| deepseek-flash, direct [13] | peak: hit $0.006, miss $0.30 / out $1.20. Off-peak is half | peak $0.61, off-peak $0.31 | Qwen ASR or Apple | $0.31–0.93 |
| deepseek-v4-flash via Model Studio Intl [12] | $0.20 / $0.40 | **$0.52** | same | $0.52–0.84 |
| GLM-4.7-FlashX, Z.ai [28] | $0.07 (cached $0.01) / $0.40 | **$0.17** | same | $0.17–0.49 |

Cost observations:
- Context caching would reduce the Qwen figures further; the computation ignores it [12].
- The Model Studio Singapore free quota is 1M tokens per model plus 10 h of ASR, valid 90 days [12].
- Not included above: Supabase Edge Function invocations and egress.
- On-device use saves roughly $0.09 per user per month on a flash model and about $1.1 on a plus-class model. Because flash-class cloud pricing is already under $0.10, on-device mainly buys privacy and offline use; the cost saving is small.

## 4. Compliance

### Malaysia PDPA (Act 709, s.129 as amended in 2024)
The PDP Commissioner's Guideline 3/2025 on Cross Border Personal Data Transfer [29] says:
- A transfer is allowed where the destination has a "law substantially similar to the Act 709" or "an adequate level of protection". A Transfer Impact Assessment is the suggested method (4.1, 5.3).
- Notwithstanding that, a transfer is also allowed on any one of these grounds:
  - consent (4.2.1);
  - necessity for a contract with the data subject (4.2.2);
  - "all reasonable precautions and … due diligence" (4.2.6), for example binding corporate rules or contractual clauses (12.1).
- The controller "shall through its personal data protection notice … inform data subject about the transfer" (4.3).
- For consent, the notice must state "the class of third parties to whom the data is transferred to" and "the purpose". Consent "must be recorded and maintained" (7.2–7.3).

What this means for Tapiro:
- Supabase in Singapore is itself a cross-border transfer.
- Each AI provider is a separate recipient class.
- Practical basis: record explicit consent plus the contract-necessity ground, and do a TIA for Singapore. China (DeepSeek direct) would need its own TIA.

### China: Interim Measures for Generative AI Services (2023)
- **Art. 2:** the Measures apply to services that provide generated content "向中华人民共和国境内公众" (to the public within PRC territory) [30].
- **Art. 20:** services offered from outside the PRC into the PRC that do not comply may be blocked by the CAC through "technical measures" [30].
- **Assessment:** an app not listed on the mainland China App Store and targeted at students in Malaysia is most likely not "to the public within the territory". Users who travel to the mainland and keep using the app create residual exposure, mainly that the service gets blocked there. This needs a legal opinion **[UNVERIFIED interpretation]**.
- **PIPL Art. 3:** PIPL reaches processing outside China of personal information "of natural persons within PRC territory" for providing them products or services. Art. 53 then requires a designated representative in China. The trigger is the user's location, not nationality [31].
- **Implication:** do not market to or geo-target users in the mainland.

### Apple App Review Guidelines (Last Updated June 8, 2026) [32]
- **5.1.2(i), quoted:** "Unless otherwise permitted by law, you may not use, transmit, or share someone's personal data without first obtaining their permission. You must provide access to information about how and where the data will be used. You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so."
  - Consequence: before the first cloud AI call, show a consent sheet that names the provider (for example "Alibaba Cloud Model Studio, Singapore") and gives an explicit opt-in.
- **1.2 UGC:** bounty posts are user-generated content. The app needs a filter for objectionable material, a report mechanism with timely responses, user blocking, and published contact info.
- AI-drafted posts become UGC once the user confirms them, so run the same moderation on them.
- **4.7 / 4.7.1:** these cover "chatbots" offered as software *not embedded in the binary*. Our mascot is first-party, so 4.7 probably does not apply **[interpretation]**; the UGC and filtering duties apply anyway through 1.2.
- **Age rating** [33]: the questionnaire has no AI-specific question in the published definitions. Relevant items are:
  - "User-Generated Content" and "Messaging and Chat" capabilities;
  - In-App Controls (parental controls, age assurance);
  - Guideline 2.3.6 requires honest answers.
  - Whether the live App Store Connect form adds an AI question is **[UNVERIFIED]**.

## 5. Recommended architecture

```
RN (Expo SDK 57) ──► TapiroKit (Swift Expo module)
                       ├─ DictationTranscriber (zh-CN / en-MY / ms-MY, on-device)
                       └─ FoundationModels (optional, zh/en only, local intent + short drafts)
       │
       └─ HTTPS ──► Supabase Edge Function `ai-chat` (ap-southeast-1, x-region pinned)
                       ├─ primary: Qwen (qwen3.7-flash; qwen3.7-plus for drafts) Model Studio Singapore workspace endpoint
                       ├─ secondary: deepseek-v4-flash via same Model Studio account (no PRC storage)
                       ├─ ASR fallback: qwen-audio-3.0-asr-flash
                       └─ tools execute server-side against Postgres (search tasks, create *draft* rows)
```

1. **Cloud first, not on-device first.** On-device alone cannot carry v1:
   - Malay is unsupported, and v1 requires it.
   - The context is 4K tokens, roughly 4K Chinese characters including tools.
   - It needs an iPhone 15 Pro or later.
   - It does not work on devices bought in mainland China, which is common for Chinese students.
2. **Use on-device as an optional accelerator** for zh/en users whose `availability == .available` and `supportsLocale()` passes: offline intent classification and a first-pass draft. Every action still goes through the server.
3. **Keys never in the app.** Edge Functions run in the region closest to the caller by default; pin `x-region: ap-southeast-1` (pinning disables automatic failover) [34].
   - Limits: 2 s CPU, 150 s idle timeout, 150 s (free) or 400 s (paid) wall clock [35].
   - Stream tokens over SSE; the network wait does not count as CPU time.
4. **Fallback ladder:**
   - Qwen flash → DeepSeek-v4-flash, same account and Singapore scope.
   - If the server is unreachable: on-device FM if available, otherwise a non-AI form UI. Drafting must always be possible through a manual form.
   - Mainland reachability of `*.supabase.co` and of the Model Studio Singapore endpoint is **[UNVERIFIED]**; test from the mainland before launch.
5. **The AI only drafts.** Tool calls write `status = draft` rows; publishing needs a user tap and an RLS policy check. Run moderation on the confirmed text (UGC 1.2).
6. **Conversation storage options:**
   - **(a) Device-only history.** History lives in local SQLite, and the server is stateless with no logging of prompts. This is the PDPA-minimal option; the provider still retains request data per its policy.
   - **(b) Server history with TTL.** History goes in Postgres with RLS and a 30–90 day retention job, plus a user "delete history" action.
   - **(c) Drafts and summaries only.** Store drafts and summaries; never persist raw chat.
   - Recommendation: **(c) plus (a)**.
   - Model Studio stores call data [17]; get the retention period in writing before launch.

## 6. Open risks

1. Apple Intelligence eligibility among Chinese students: older phones, phones bought on the mainland, and device language. On-device reach may be small, so measure it with an availability probe.
2. The Malay quality of Qwen and DeepSeek has not been benchmarked by us. Only Qwen publishes Malay support [9].
3. Model Studio retention period and DPA terms are unknown [17].
4. Reachability of Supabase and Model Studio from mainland China is unverified.
5. `SpeechTranscriber` locale coverage for ms-MY is unverified. `DictationTranscriber` is the fallback.
6. Model churn: Qwen and DeepSeek renamed or retired models during 2026; the `deepseek-v4-flash` legacy names already route to V4.1 [13]. Pin dated model IDs.
7. The China Interim Measures and PIPL interpretation for travelling users needs a lawyer.
8. The PCC model (32K) needs iOS 27 and an entitlement, and has daily quotas [8]. Not a v1 dependency.

## 7. Constraints implied

- AI provider calls go only through a Supabase Edge Function. **Reason:** keys never ship in the app (DeepSeek terms 2.2 forbid client exposure [18]).
- Default LLM: Qwen on the Model Studio **Singapore International** workspace endpoint. **Reason:** inference excludes the mainland, there is no training on data, and Malay is supported [2][9][17].
- Do not use the DeepSeek direct API (api.deepseek.com) for user content. **Reason:** data is stored in the PRC and PRC law governs [3][18]. Use DeepSeek through Model Studio Singapore if needed.
- Do not use the `dashscope-intl.aliyuncs.com` domain. **Reason:** no new features after 2026-09-30 [1].
- Show an explicit consent screen before the first cloud AI or cloud ASR call. It names the provider, the country and the purpose, and the consent is stored with a timestamp. **Reason:** Apple 5.1.2(i) and PDPA s.129(3)(a) / Guideline 7.2–7.3 [29][32].
- The AI writes only `draft` rows; publishing requires a user action. **Reason:** product rule, and AI output becomes UGC under 1.2.
- Moderate, report, block and publish contact info for every published task. **Reason:** Guideline 1.2 [32].
- Treat on-device Foundation Models as optional. Gate on `availability` plus `supportsLocale()`, and never route `ms` to it. **Reason:** no Malay, 4K context, device and region limits [6][10][11].
- Keep every on-device prompt and tool schema under about 1.5K tokens. **Reason:** the 4,096-token session includes schemas and outputs, at about 1 token per Chinese character [11].
- Voice uses `DictationTranscriber` first, with Qwen ASR as fallback. Do not use server-mode `SFSpeechRecognizer`. **Reason:** 1-minute cap, throttles, and Apple's "no sensitive info" rule [23][26].
- Pin dated model IDs and serve prompts and config from the server. **Reason:** model churn and OS model versions [13][21].
- Pin the Edge Function region to `ap-southeast-1`. **Reason:** data residency next to the database [34].
- Do not persist raw chat on the server by default; persist drafts and summaries only. **Reason:** PDPA minimisation and provider retention.
- Do not geo-target or market in mainland China. **Reason:** keeps Tapiro outside the Interim Measures Art. 2 and PIPL Art. 3 triggers [30][31].
- Build our own Swift Expo module (TapiroKit) for FoundationModels and Speech. **Reason:** Expo has no merged module [20].

## Sources

1. https://www.alibabacloud.com/help/en/model-studio/regions
2. https://help.aliyun.com/en/model-studio/singapore-regional-access-information ("International (global nodes excluding Chinese mainland)")
3. https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html (Last Update Feb 10, 2026)
4. https://www.alibabacloud.com/help/en/model-studio/model-pricing (deepseek rows, Singapore, International)
5. https://docs.z.ai/legal-agreement/privacy-policy (Sept 29, 2025)
6. https://support.apple.com/en-us/121115 (Published Sept 14, 2026)
7. https://www.apple.com/apple-intelligence/
8. https://developer.apple.com/documentation/foundationmodels/adding-server-side-intelligence-with-private-cloud-compute
9. https://qwenlm.github.io/blog/qwen3/
10. https://developer.apple.com/documentation/foundationmodels/supporting-languages-and-locales-with-foundation-models
11. https://developer.apple.com/documentation/foundationmodels/managing-the-context-window
12. https://www.alibabacloud.com/help/en/model-studio/model-pricing
13. https://api-docs.deepseek.com/quick_start/pricing
14. https://developer.apple.com/documentation/foundationmodels
15. https://developer.apple.com/documentation/foundationmodels/tool
16. https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling
17. https://www.alibabacloud.com/help/en/model-studio/privacy-notice
18. https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html (effective Apr 29, 2026)
19. https://developer.apple.com/forums/thread/787199 (forum, not docs)
20. https://github.com/expo/expo/pull/49998 (closed, not merged); third-party examples: https://github.com/SwiftyJunnos/expo-foundation-models
21. https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel and https://developer.apple.com/documentation/foundationmodels/updating-prompts-for-new-model-versions
22. https://www.apple.com/ios/feature-availability/ (Dictation and On-Device Dictation lists)
23. https://developer.apple.com/documentation/speech/dictationtranscriber
24. https://developer.apple.com/documentation/speech/speechtranscriber
25. https://developer.apple.com/documentation/speech/speechanalyzer
26. https://developer.apple.com/documentation/speech/sfspeechrecognizer
27. https://www.alibabacloud.com/help/en/model-studio/asr-model
28. https://docs.z.ai/guides/overview/pricing
29. https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2025/08/GP_CBPDT_EN-1.pdf (Guideline 3/2025)
30. https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm
31. http://www.npc.gov.cn/npc/c2/c30834/202108/t20210820_313088.html (PIPL)
32. https://developer.apple.com/app-store/review/guidelines/
33. https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions
34. https://supabase.com/docs/guides/functions/regional-invocation
35. https://supabase.com/docs/guides/functions/limits
