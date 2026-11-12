import Foundation

var failures = 0

func check(_ condition: Bool, _ name: String) {
  if condition {
    print("ok - \(name)")
  } else {
    failures += 1
    print("not ok - \(name)")
  }
}

check(
  SpeechChain.candidates(recognitionAllowed: true) == [.transcriber, .dictation, .recognizer],
  "the chain tries SpeechTranscriber, then DictationTranscriber, then SFSpeechRecognizer")
check(
  SpeechChain.candidates(recognitionAllowed: false).isEmpty,
  "without speech recognition permission no on-device engine is tried")

var tried: [SpeechEngine] = []
let dictation = await SpeechChain.first(of: SpeechChain.onDevice) { engine in
  tried.append(engine)
  return engine == .dictation
}
check(dictation == .dictation && tried == [.transcriber, .dictation], "the first engine that starts wins and later ones are not tried")

tried = []
let cloud = await SpeechChain.first(of: SpeechChain.onDevice) { engine in
  tried.append(engine)
  return false
}
check(cloud == .cloud && tried == SpeechChain.onDevice, "when no on-device engine starts the chain ends in the cloud")
check(await SpeechChain.first(of: []) { _ in true } == .cloud, "no candidates goes straight to the cloud")

check(SpeechChain.keepsAudio(engine: .cloud, end: .stopped), "a cloud recording keeps its audio")
check(SpeechChain.keepsAudio(engine: .dictation, end: .engineFailed), "an on-device engine that failed keeps the audio for the cloud")
check(!SpeechChain.keepsAudio(engine: .dictation, end: .stopped), "an on-device transcript drops the audio")
check(!SpeechChain.keepsAudio(engine: .recognizer, end: .noSpeech), "silence on device drops the audio")

check(SpeechLocale.identifier(language: "en", region: "MY") == "en-US", "en-MY maps to en-US")
check(SpeechLocale.identifier(language: "en", region: nil) == "en-US", "English with no region is en-US")
check(SpeechLocale.identifier(language: "en", region: "sg") == "en-SG", "English keeps another region")
check(SpeechLocale.identifier(language: "zh-Hans", region: "MY") == "zh-CN", "Simplified Chinese is zh-CN")
check(SpeechLocale.identifier(language: "ms", region: nil) == "ms-MY", "Malay is ms-MY")

check(SpeechFailure.end(domain: "kAFAssistantErrorDomain", code: 1110) == .noSpeech, "no speech detected is noSpeech")
check(SpeechFailure.end(domain: "kAFAssistantErrorDomain", code: 216) == .stopped, "a cancelled request is a stop")
check(SpeechFailure.end(domain: NSOSStatusErrorDomain, code: -50) == .audioFailed, "an audio status error is audioFailed")
check(SpeechFailure.end(domain: "com.apple.coreaudio.avfaudio", code: 1) == .audioFailed, "an AVFAudio error is audioFailed")
check(SpeechFailure.end(domain: "kLSRErrorDomain", code: 300) == .engineFailed, "a recognizer that cannot start is engineFailed")
check(SpeechFailure.end(domain: "SFSpeechErrorDomain", code: 1) == .engineFailed, "an unknown speech error is engineFailed")

var transcript = SpeechTranscript()
transcript.apply("明天", isFinal: false)
check(transcript.text == "明天", "a volatile piece shows at once")
transcript.apply("明天帮我", isFinal: true)
transcript.apply("去 Pyramid", isFinal: false)
check(transcript.text == "明天帮我去 Pyramid", "a settled piece stays and the next volatile follows it")
transcript.apply("去 Pyramid 取快递", isFinal: false)
check(transcript.text == "明天帮我去 Pyramid 取快递", "a newer volatile piece replaces the older one")
transcript.replace("whole")
check(transcript.text == "whole", "a cumulative result replaces everything")

if failures > 0 {
  print("\(failures) failed")
  exit(1)
}
print("all passed")
