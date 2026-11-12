import Foundation

enum SpeechEngine: String, CaseIterable {
  case transcriber, dictation, recognizer, cloud
}

enum SpeechEnd: String {
  case stopped, limit, interrupted, engineFailed, noSpeech, audioFailed
}

enum SpeechChain {
  static let onDevice: [SpeechEngine] = [.transcriber, .dictation, .recognizer]

  static func candidates(recognitionAllowed: Bool) -> [SpeechEngine] {
    recognitionAllowed ? onDevice : []
  }

  static func first(
    of candidates: [SpeechEngine],
    starting: (SpeechEngine) async -> Bool
  ) async -> SpeechEngine {
    for engine in candidates where await starting(engine) {
      return engine
    }
    return .cloud
  }

  static func keepsAudio(engine: SpeechEngine, end: SpeechEnd) -> Bool {
    engine == .cloud || end == .engineFailed
  }
}

// No speech API lists en-MY; supportedLocale(equivalentTo:) maps it to en-US (docs/research/2026-10-04-ai-on-device-prototype.md).
enum SpeechLocale {
  static func identifier(language: String, region: String?) -> String {
    switch language {
    case "zh-Hans": return "zh-CN"
    case "ms": return "ms-MY"
    default:
      guard let region, region.count == 2, region != "MY" else { return "en-US" }
      return "en-\(region.uppercased())"
    }
  }
}

enum SpeechFailure {
  static let assistantDomain = "kAFAssistantErrorDomain"
  static let noSpeechCodes: Set<Int> = [1110]
  static let cancelledCodes: Set<Int> = [216, 301]
  static let audioDomains: Set<String> = [NSOSStatusErrorDomain, "com.apple.coreaudio.avfaudio"]

  static func end(domain: String, code: Int) -> SpeechEnd {
    if domain == assistantDomain && noSpeechCodes.contains(code) { return .noSpeech }
    if domain == assistantDomain && cancelledCodes.contains(code) { return .stopped }
    if audioDomains.contains(domain) { return .audioFailed }
    return .engineFailed
  }
}

struct SpeechTranscript {
  private(set) var settled = ""
  private var volatile = ""

  var text: String { settled + volatile }

  mutating func apply(_ piece: String, isFinal: Bool) {
    if isFinal {
      settled += piece
      volatile = ""
    } else {
      volatile = piece
    }
  }

  mutating func replace(_ whole: String) {
    settled = whole
    volatile = ""
  }
}
