# Research: on-device AI + speech through one Expo local module (Tapiro)

Date: 2026-10-04. Host: MacBook M2 Max, macOS 26.5.2, Xcode 26.6 (17F113), iPhoneSimulator26.5.sdk, iOS 26.5 runtime (23F77), Expo SDK 57 (`expo@57.0.26`, `expo-modules-core@57.0.20`), RN 0.86.3.
Prototype: `proto-ai/` in this scratchpad (throwaway).

## Questions

1. Can a Swift Expo local module call Foundation Models (session, streaming, `@Generable` guided generation, one `Tool`) and return results and stream events to JS? What does `SystemLanguageModel.default.availability` return on this Mac's Simulator?
2. Can the same module do on-device STT (SpeechAnalyzer + SpeechTranscriber, or SFSpeechRecognizer as a fallback) for zh-CN, en-US/en-MY and ms-MY? Which locales does the runtime report, and do models have to be downloaded (AssetInventory)?

## Method

- `bun create expo proto --template blank-typescript@sdk-57 --yes`
- `npx create-expo-module@latest tapiro-kit --local --barrel --name TapiroKit --platform apple --features AsyncFunction Event` (non-interactive flags from `--help`). This produced `modules/tapiro-kit/{ios,src,index.ts,expo-module.config.json}`, and the module was autolinked (Podfile.lock lists `TapiroKit (from ../modules/tapiro-kit/ios)`).
- Podspec: `:ios => '26.0'` and `s.frameworks = 'FoundationModels', 'Speech', 'AVFAudio'`. app.json: `ios.deploymentTarget: "26.0"` (a key in `@expo/config-types`), `scheme`, and the `NSSpeechRecognitionUsageDescription` / `NSMicrophoneUsageDescription` strings.
- `CI=1 npx expo prebuild --platform ios --clean`, then a **Release** build: `xcodebuild -workspace proto.xcworkspace -scheme proto -configuration Release -destination id=<udid> -derivedDataPath ../../dd build`. Default simulator signing (`XCiPhoneSimulatorCodeSignContext`, sign to run locally). Signing was not touched.
- Dedicated simulator `TapiroProtoAI` (iPhone 17 Pro, iOS 26.5). It was created and then deleted (`xcrun simctl delete`).
- Test audio: macOS `say` with the voices Tingting (zh_CN), Samantha (en_US) and Amira (ms_MY), converted with `afconvert` to 16 kHz mono WAV and copied into the app's Documents.
- Each probe page was opened with a deep link (`proto://ai|aiforce|speech|stt|dictation|sf`). Results were read with `axe describe-ui` and saved as a screenshot with `xcrun simctl io <udid> screenshot`. The driver is `proto-ai/run.sh`.
- API names were checked against the SDK swiftinterfaces (`$(xcrun --sdk iphonesimulator --show-sdk-path)/System/Library/Frameworks/{FoundationModels,Speech}.framework/Modules/*.swiftmodule/arm64-apple-ios-simulator.swiftinterface`) and the Apple doc JSON (`developer.apple.com/tutorials/data/documentation/...`, saved as text in `proto-ai/docs/*.txt`).

## Results

### Q1 Foundation Models

| Item | Result |
|---|---|
| Module compiles and links FoundationModels with `@Generable`, `@Guide`, `Tool`, `streamResponse(generating:)` | **Yes.** Release build succeeded on the first try with no warnings in module files |
| `SystemLanguageModel.default.availability` on the Simulator | `unavailable(.appleIntelligenceNotEnabled)` |
| `supportedLanguages` (reported even when unavailable) | 23 languages: da, de, en-AU/GB/US, es-419/ES/US, fr-CA/FR, it, ja, ko, nb, nl, pt-BR/PT, sv, tr, vi, **zh-Hans-CN**, zh-Hant-HK/TW |
| `supportsLocale` | zh_CN **true**, en_MY **true**, **ms_MY false** (Malay is not supported by the model) |
| `respond(to:)` when unavailable | Throws. In JS it arrives as `Error: UnexpectedException: Apple Intelligence is not enabled.` |
| `streamResponse(generating: TaskDraft.self)` with a tool, when unavailable | Fails in 23 ms with `GenerationError.assetsUnavailable(... "Model is unavailable" ..., errorDescriptionOverride: "Apple Intelligence is not enabled.")` |
| Availability path + JS fallback | Works. The `ai` page shows the fallback ("server LLM / manual form") |

The real generation output for the sentence "帮我找人明天下午三点前去 Sunway Geo 取个快递，给 10 块" (and the Tool call) was **not observed**. It needs a device with Apple Intelligence enabled, or a host Mac with Apple Intelligence on (I assume the Simulator inherits that from the host; I did not verify it). The OS logs show the framework trying to load the asset `com.apple.fm.language.instruct_3b.fm_api_generic`, so the code path reaches the model manager.

### Q2 Speech

| API (Simulator, iOS 26.5) | zh-CN | en-US | en-MY | ms-MY |
|---|---|---|---|---|
| `SpeechTranscriber.isAvailable` | false (global) | | | |
| `SpeechTranscriber.supportedLocales` / `installedLocales` | **empty** | | | |
| `SpeechTranscriber.supportedLocale(equivalentTo:)` | zh-CN | en-US | **en-US** | ms-MY |
| `AssetInventory.status` for SpeechTranscriber | unsupported | unsupported | unsupported | unsupported |
| SpeechTranscriber file transcription | `SFSpeechErrorDomain 1 "...not subscribed to transcription.cmn"` (`.en`, `.ms` the same) | | | |
| `DictationTranscriber.supportedLocales` | yes (56 locales incl. zh-CN, zh-HK, zh-TW, yue-CN, ms-MY, en-SG, **no en-MY**) | | en-MY maps to en-US | |
| DictationTranscriber assets | `supported` → `downloadAndInstall()` succeeded → `installed` | same | same | same |
| DictationTranscriber transcription | `bestAvailableAudioFormat` returns nil, `availableCompatibleAudioFormats` is `[]`, `installedLocales` is `[]` (in the Simulator, assets install but the analyzer cannot run) | | | |
| `SFSpeechRecognizer.supportedLocales()` | 63 locales incl. zh-CN, ms-MY, en-SG, en-ID, en-PH, **no en-MY** | | | |
| `supportsOnDeviceRecognition` | false → **true** after the Dictation assets were installed | true | true | false → **true** |
| SF file transcription (authorized) | `kLSRErrorDomain 300 "Failed to initialize recognizer"` for all four locales | | | |
| `AssetInventory.maximumReservedLocales` | 5 | | | |

Conclusion: the module compiles and every capability/asset API returns data in JS. **No STT engine produced text in the iOS 26.5 Simulator.** Actual transcription quality has to be tested on a device.

Doc note: Apple's SpeechAnalyzer page names `AnalyzerInputConverter`, `AssetInputSequenceProvider` and `CaptureInputSequenceProvider`, but none of them exist in the iOS 26.5 SDK swiftinterface (they are newer than this SDK). The prototype converts audio itself with `AVAudioConverter` to `SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith:)`.

## Evidence

- Screenshots: `proto-ai/shots/ai-normal.png` (availability + fallback), `aiforce.png` (forced calls and exact errors), `speech.png` (capabilities after the asset download), `stt.png` (SpeechTranscriber errors), `dictation.png` (no compatible format), `sf-permission.png`, `sf.png` (kLSR 300).
- UI text dumps: `proto-ai/logs/*.txt` and `*.json`. Build logs: `proto-ai/build*.log`. Apple doc text: `proto-ai/docs/*.txt`.
- Code: `proto-ai/proto/modules/tapiro-kit/ios/{TapiroKitModule,TapiroAI,TapiroSpeech}.swift`, `proto-ai/proto/modules/tapiro-kit/src/*.ts`, `proto-ai/proto/App.tsx`.

## Facade shape that compiled and ran

Swift (`ExpoModulesCore` 57; `AsyncFunction` accepts Swift `async throws` closures through `ConcurrentFunctionDefinition`):

```swift
public class TapiroKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TapiroKit")
    Events("onAiText", "onAiDraftPartial", "onSpeechAssetProgress")
    Function("aiAvailability") { TapiroAI.availability() }
    AsyncFunction("aiRespond") { (prompt: String) async throws -> String in try await TapiroAI.respond(prompt) }
    AsyncFunction("aiStream") { (requestId: String, prompt: String) async throws -> String in
      try await TapiroAI.streamText(prompt) { self.sendEvent("onAiText", ["requestId": requestId, "text": $0]) }
    }
    AsyncFunction("aiDraftTask") { (requestId: String, sentence: String) async -> [String: Any] in ... }
    AsyncFunction("speechCapabilities") { () async -> [String: Any] in await TapiroSpeech.capabilities() }
    AsyncFunction("speechInstallAssets") { (locale: String) async -> [String: Any] in ... }
    AsyncFunction("speechTranscribeFile") { (path: String, locale: String, engine: String) async -> [String: Any] in ... }
    Constant("documentsPath") { ... }
  }
}

@Generable(description: "A structured draft of an errand request posted by a user")
struct TaskDraft {
  @Guide(description: "Short task title, in the same language as the request") var title: String
  @Guide(description: "Task category", .anyOf(["parcel_pickup","delivery","shopping","food","errand","other"])) var category: String
  @Guide(description: "Place name exactly as written in the request") var place: String
  @Guide(description: "Deadline as local ISO 8601 date-time ...") var deadline: String
  @Guide(description: "Reward in Malaysian Ringgit (RM); '块' means RM", .range(0...10000)) var rewardRM: Int
}
struct CurrentDateTimeTool: Tool {
  let name = "getCurrentDateTime"; let description = "..."
  @Generable struct Arguments {}
  func call(arguments: Arguments) async throws -> String { ... Asia/Kuala_Lumpur ... }
}
// LanguageModelSession(tools: [CurrentDateTimeTool()], instructions: ...)
// for try await snap in session.streamResponse(to: sentence, generating: TaskDraft.self) { snap.rawContent.jsonString -> event }
// tool usage read back from session.transcript (.toolCalls entries)
```

JS (`modules/tapiro-kit/src/TapiroKitModule.ts`):

```ts
declare class TapiroKitModule extends NativeModule<TapiroKitModuleEvents> {
  readonly documentsPath: string;
  aiAvailability(): AiAvailability;               // sync
  aiRespond(prompt: string): Promise<string>;
  aiStream(requestId: string, prompt: string): Promise<string>;      // + onAiText events
  aiDraftTask(requestId: string, sentence: string): Promise<DraftResult>; // + onAiDraftPartial
  speechCapabilities(): Promise<SpeechCapabilities>;
  speechInstallAssets(locale: string): Promise<{ locale: string; status?: string; error?: string }>; // + onSpeechAssetProgress
  speechTranscribeFile(path: string, locale: string, engine: 'analyzer' | 'dictation' | 'sf'): Promise<TranscribeResult>;
}
export default requireNativeModule<TapiroKitModule>('TapiroKit');
// subscribe: TapiroKit.addListener('onAiText', e => ...).remove()
```

## Constraints implied

- **Set the module podspec and the app to iOS 26.0** (`s.platforms :ios => '26.0'`, app.json `ios.deploymentTarget: "26.0"`). Then FoundationModels and SpeechAnalyzer need no `@available` gates.
- **Always gate on `SystemLanguageModel.default.availability` and ship a non-FM fallback** (server LLM or a manual form). Simulators and non-Apple-Intelligence devices return `unavailable(...)`, and calls fail with `assetsUnavailable`.
- **Do not depend on on-device FM for Malay.** `supportsLocale(ms_MY)` is false. zh-CN and en are supported. ms input needs the server path.
- **Map native errors to typed result codes in Swift instead of letting them throw.** A thrown error reaches JS as an untyped `UnexpectedException: <message>`.
- **Stream through `Events` + `sendEvent` with a `requestId` correlation key.** The Promise resolves with the final value. Partial `@Generable` snapshots should be sent as `rawContent.jsonString`.
- **Keep the deadline-resolution date Tool in the module**, because the model cannot know "明天" (tomorrow) without it. Whether the model actually calls the tool still has to be confirmed on a device (read `session.transcript` `.toolCalls`).
- **Validate STT only on a physical device.** In the iOS 26.5 Simulator, SpeechTranscriber reports `isAvailable == false` with no supported locales, DictationTranscriber installs assets but exposes no audio format, and SFSpeechRecognizer fails with kLSR 300.
- **Plan an STT cascade of SpeechTranscriber → DictationTranscriber → SFSpeechRecognizer.** Apple's docs suggest DictationTranscriber when SpeechTranscriber is unsupported (speechtranscriber doc), and DictationTranscriber covers ms-MY and zh-CN.
- **Normalize en-MY explicitly to en-US or en-SG.** No speech API lists en-MY, and `supportedLocale(equivalentTo:)` maps it to en-US.
- **Download speech models through AssetInventory before first use** (`assetInstallationRequest(supporting:)` → `downloadAndInstall()`, with progress through `progress.fractionCompleted`). Models are shared system-wide and limited to `maximumReservedLocales` = 5 reserved locales. Release unused locales.
- **Feed SpeechAnalyzer audio converted to `bestAvailableAudioFormat(compatibleWith:)`.** Passing a 16 kHz WAV straight to `start(inputAudioFile:)` failed with `SFSpeechErrorDomain 3 "Audio format is not supported"`. Do not rely on `AnalyzerInputConverter`, which is not in the 26.5 SDK.
- **SFSpeechRecognizer needs `NSSpeechRecognitionUsageDescription` and a runtime permission prompt.** `simctl privacy grant speech-recognition` is "Operation not permitted", so UI tests must tap Allow.

## Sources

- SDK swiftinterfaces: FoundationModels (`SystemLanguageModel.Availability.UnavailableReason {deviceNotEligible, appleIntelligenceNotEnabled, modelNotReady}`, `supportsLocale`, `streamResponse(to:generating:)`, `Tool` protocol, `GenerationError` cases) and Speech (`AssetInventory`, `SpeechTranscriber.isAvailable/supportedLocales/installedLocales`, `DictationTranscriber`, `SpeechAnalyzer.start(inputAudioFile:finishAfterFile:)`, `bestAvailableAudioFormat`).
- https://developer.apple.com/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models ; /foundationmodels/expanding-generation-with-tool-calling ; /foundationmodels/systemlanguagemodel/availability-swift.property
- https://developer.apple.com/documentation/speech/speechanalyzer ; /speech/speechtranscriber ; /speech/assetinventory
- WWDC25 "Meet the Foundation Models framework" (https://developer.apple.com/videos/play/wwdc2025/286/), WWDC25 "Bring advanced speech-to-text to your app with SpeechAnalyzer" (/wwdc2025/277/)
- https://docs.expo.dev/modules/get-started/ (local module), https://docs.expo.dev/modules/module-api/ (AsyncFunction, Events, sendEvent, addListener); `node_modules/expo-modules-core/ios/Core/Functions/ConcurrentFunctionDefinition.swift`
