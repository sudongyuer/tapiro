import AVFoundation
import Speech

protocol SpeechRecognizing: AnyObject {
  func append(_ buffer: AVAudioPCMBuffer)
  func finish() async -> String
  func cancel()
}

typealias SpeechTextHandler = @Sendable (String) -> Void
typealias SpeechErrorHandler = @Sendable (Error) -> Void

enum SpeechRecognizers {
  static func make(
    engine: SpeechEngine,
    locale: Locale,
    inputFormat: AVAudioFormat,
    onText: @escaping SpeechTextHandler,
    onError: @escaping SpeechErrorHandler
  ) async -> SpeechRecognizing? {
    switch engine {
    case .transcriber, .dictation:
      return await AnalyzerRecognizer.make(
        engine: engine, locale: locale, inputFormat: inputFormat, onText: onText, onError: onError)
    case .recognizer:
      return OnDeviceRecognizer.make(locale: locale, onText: onText, onError: onError)
    case .cloud:
      return nil
    }
  }
}

private final class Once<T>: @unchecked Sendable {
  private let lock = NSLock()
  private var continuation: CheckedContinuation<T, Never>?

  init(_ continuation: CheckedContinuation<T, Never>) {
    self.continuation = continuation
  }

  func resume(_ value: T) {
    let pending = lock.withLock { () -> CheckedContinuation<T, Never>? in
      defer { continuation = nil }
      return continuation
    }
    pending?.resume(returning: value)
  }
}

// Not a task group: a group waits for every child, so a finalisation that never returns would hold the deadline too.
func withDeadline<T: Sendable>(
  seconds: Double, fallback: T, _ work: @escaping @Sendable () async -> T
) async -> T {
  await withCheckedContinuation { continuation in
    let once = Once(continuation)
    Task { once.resume(await work()) }
    Task {
      try? await Task.sleep(for: .seconds(seconds))
      once.resume(fallback)
    }
  }
}

func convert(_ buffer: AVAudioPCMBuffer, with converter: AVAudioConverter) -> AVAudioPCMBuffer? {
  let format = converter.outputFormat
  let ratio = format.sampleRate / buffer.format.sampleRate
  let capacity = AVAudioFrameCount((Double(buffer.frameLength) * ratio).rounded(.up)) + 1
  guard let output = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else { return nil }
  var consumed = false
  var error: NSError?
  let status = converter.convert(to: output, error: &error) { _, inputStatus in
    if consumed {
      inputStatus.pointee = .noDataNow
      return nil
    }
    consumed = true
    inputStatus.pointee = .haveData
    return buffer
  }
  return status == .error || output.frameLength == 0 ? nil : output
}

final class AnalyzerRecognizer: SpeechRecognizing, @unchecked Sendable {
  private let analyzer: SpeechAnalyzer
  private let converter: AVAudioConverter
  private let input: AsyncStream<AnalyzerInput>.Continuation
  private let results: Task<String, Never>

  private init(
    analyzer: SpeechAnalyzer,
    converter: AVAudioConverter,
    input: AsyncStream<AnalyzerInput>.Continuation,
    results: Task<String, Never>
  ) {
    self.analyzer = analyzer
    self.converter = converter
    self.input = input
    self.results = results
  }

  static func make(
    engine: SpeechEngine,
    locale: Locale,
    inputFormat: AVAudioFormat,
    onText: @escaping SpeechTextHandler,
    onError: @escaping SpeechErrorHandler
  ) async -> AnalyzerRecognizer? {
    let module: any SpeechModule
    let read: @Sendable () async throws -> String
    if engine == .transcriber {
      guard SpeechTranscriber.isAvailable,
        let supported = await SpeechTranscriber.supportedLocale(equivalentTo: locale)
      else { return nil }
      let transcriber = SpeechTranscriber(locale: supported, preset: .progressiveTranscription)
      guard await ready(transcriber, locale: supported) else { return nil }
      module = transcriber
      read = {
        var transcript = SpeechTranscript()
        for try await result in transcriber.results {
          transcript.apply(String(result.text.characters), isFinal: result.isFinal)
          onText(transcript.text)
        }
        return transcript.text
      }
    } else {
      guard let supported = await DictationTranscriber.supportedLocale(equivalentTo: locale) else { return nil }
      let dictation = DictationTranscriber(locale: supported, preset: .progressiveShortDictation)
      guard await ready(dictation, locale: supported) else { return nil }
      module = dictation
      read = {
        var transcript = SpeechTranscript()
        for try await result in dictation.results {
          transcript.apply(String(result.text.characters), isFinal: result.isFinal)
          onText(transcript.text)
        }
        return transcript.text
      }
    }
    // A buffer straight from the microphone fails with "Audio format is not supported" (prototype, 2026-10-04).
    guard let format = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [module]),
      let converter = AVAudioConverter(from: inputFormat, to: format)
    else { return nil }
    let analyzer = SpeechAnalyzer(modules: [module])
    let (stream, input) = AsyncStream<AnalyzerInput>.makeStream()
    do {
      try await analyzer.prepareToAnalyze(in: format)
      try await analyzer.start(inputSequence: stream)
    } catch {
      input.finish()
      await analyzer.cancelAndFinishNow()
      return nil
    }
    let results = Task<String, Never> {
      do {
        return try await read()
      } catch {
        onError(error)
        return ""
      }
    }
    return AnalyzerRecognizer(analyzer: analyzer, converter: converter, input: input, results: results)
  }

  // Models are system-wide downloads; a missing one is fetched for next time rather than making the user wait now.
  private static func ready(_ module: any SpeechModule, locale: Locale) async -> Bool {
    switch await AssetInventory.status(forModules: [module]) {
    case .installed:
      _ = try? await AssetInventory.reserve(locale: locale)
      return true
    case .supported:
      if let request = try? await AssetInventory.assetInstallationRequest(supporting: [module]) {
        Task.detached { try? await request.downloadAndInstall() }
      }
      return false
    default:
      return false
    }
  }

  func append(_ buffer: AVAudioPCMBuffer) {
    guard let converted = convert(buffer, with: converter) else { return }
    input.yield(AnalyzerInput(buffer: converted))
  }

  func finish() async -> String {
    input.finish()
    let analyzer = analyzer
    let results = results
    return await withDeadline(seconds: 5, fallback: "") {
      try? await analyzer.finalizeAndFinishThroughEndOfInput()
      return await results.value
    }
  }

  func cancel() {
    input.finish()
    results.cancel()
    let analyzer = analyzer
    Task { await analyzer.cancelAndFinishNow() }
  }
}

final class OnDeviceRecognizer: SpeechRecognizing, @unchecked Sendable {
  private let request = SFSpeechAudioBufferRecognitionRequest()
  private let lock = NSLock()
  private var task: SFSpeechRecognitionTask?
  private var latest = ""
  private var done = false
  private var waiting: CheckedContinuation<Void, Never>?

  static func make(
    locale: Locale, onText: @escaping SpeechTextHandler, onError: @escaping SpeechErrorHandler
  ) -> OnDeviceRecognizer? {
    guard let recognizer = SFSpeechRecognizer(locale: locale), recognizer.isAvailable,
      recognizer.supportsOnDeviceRecognition
    else { return nil }
    let made = OnDeviceRecognizer()
    made.request.requiresOnDeviceRecognition = true
    made.request.shouldReportPartialResults = true
    made.request.addsPunctuation = true
    made.task = recognizer.recognitionTask(with: made.request) { [weak made] result, error in
      guard let made else { return }
      if let result {
        let text = result.bestTranscription.formattedString
        made.lock.withLock { made.latest = text }
        onText(text)
        if result.isFinal { made.settle() }
      }
      if let error {
        onError(error)
        made.settle()
      }
    }
    return made
  }

  private func settle() {
    let resume = lock.withLock { () -> CheckedContinuation<Void, Never>? in
      done = true
      defer { waiting = nil }
      return waiting
    }
    resume?.resume()
  }

  func append(_ buffer: AVAudioPCMBuffer) {
    request.append(buffer)
  }

  func finish() async -> String {
    request.endAudio()
    await withDeadline(seconds: 3, fallback: ()) {
      await withCheckedContinuation { continuation in
        let finished = self.lock.withLock { () -> Bool in
          if self.done { return true }
          self.waiting = continuation
          return false
        }
        if finished { continuation.resume() }
      }
    }
    task?.finish()
    return lock.withLock { latest }
  }

  func cancel() {
    task?.cancel()
    settle()
  }
}
