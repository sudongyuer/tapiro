import AVFoundation
import Speech

typealias SpeechEmit = @Sendable ([String: Any]) -> Void

final class SpeechRecording: @unchecked Sendable {
  let url: URL
  private var file: AVAudioFile?
  private let converter: AVAudioConverter

  // AAC at 16 kHz mono keeps a 60 s recording near 180 KB, well under the Edge Function's audio limit.
  init(inputFormat: AVAudioFormat) throws {
    url = FileManager.default.temporaryDirectory.appendingPathComponent("speech-\(UUID().uuidString).m4a")
    let settings: [String: Any] = [
      AVFormatIDKey: kAudioFormatMPEG4AAC,
      AVSampleRateKey: 16_000,
      AVNumberOfChannelsKey: 1,
      AVEncoderBitRateKey: 24_000,
    ]
    let file = try AVAudioFile(
      forWriting: url, settings: settings, commonFormat: .pcmFormatFloat32, interleaved: false)
    guard let converter = AVAudioConverter(from: inputFormat, to: file.processingFormat) else {
      throw CocoaError(.fileWriteUnknown)
    }
    self.file = file
    self.converter = converter
  }

  func write(_ buffer: AVAudioPCMBuffer) {
    guard let file, let converted = convert(buffer, with: converter) else { return }
    try? file.write(from: converted)
  }

  func close() {
    file?.close()
    file = nil
  }

  func base64() -> String? {
    guard let data = try? Data(contentsOf: url), !data.isEmpty else { return nil }
    return data.base64EncodedString()
  }

  func delete() {
    close()
    try? FileManager.default.removeItem(at: url)
  }
}

final class SpeechRun: @unchecked Sendable {
  let requestId: String
  let emit: SpeechEmit
  let audio: AVAudioEngine
  let recording: SpeechRecording
  private let lock = NSLock()
  private var recognizer: SpeechRecognizing?
  private var fellBack = false
  var engine = SpeechEngine.cloud
  var finishing = false
  var cancelled = false
  var limit: Task<Void, Never>?
  var interruption: NSObjectProtocol?

  init(requestId: String, emit: @escaping SpeechEmit, audio: AVAudioEngine, recording: SpeechRecording) {
    self.requestId = requestId
    self.emit = emit
    self.audio = audio
    self.recording = recording
  }

  var failedOver: Bool { lock.withLock { fellBack } }

  func attach(_ recognizer: SpeechRecognizing) {
    lock.withLock { self.recognizer = recognizer }
  }

  func feed(_ buffer: AVAudioPCMBuffer) {
    recording.write(buffer)
    lock.withLock { fellBack ? nil : recognizer }?.append(buffer)
  }

  func partial(_ text: String) {
    guard !lock.withLock({ fellBack }) else { return }
    emit(["requestId": requestId, "kind": "partial", "text": text])
  }

  // The engine stopped but the microphone keeps recording, so the whole recording can still go to the cloud.
  func fallBack() {
    let dropped = lock.withLock { () -> SpeechRecognizing? in
      guard !fellBack else { return nil }
      fellBack = true
      return recognizer
    }
    guard let dropped else { return }
    dropped.cancel()
    emit(["requestId": requestId, "kind": "fallback"])
  }

  func detach() -> SpeechRecognizing? {
    lock.withLock {
      defer { recognizer = nil }
      return fellBack ? nil : recognizer
    }
  }
}

@MainActor
final class SpeechSession {
  private static let limitSeconds = 60.0
  private var run: SpeechRun?

  nonisolated init() {}

  nonisolated static func permissions() -> [String: String] {
    let microphone: String
    switch AVAudioApplication.shared.recordPermission {
    case .granted: microphone = "granted"
    case .denied: microphone = "denied"
    default: microphone = "undetermined"
    }
    let recognition: String
    switch SFSpeechRecognizer.authorizationStatus() {
    case .authorized: recognition = "granted"
    case .denied: recognition = "denied"
    case .restricted: recognition = "restricted"
    default: recognition = "undetermined"
    }
    return ["microphone": microphone, "recognition": recognition]
  }

  nonisolated static func requestPermissions() async -> [String: String] {
    if permissions()["microphone"] == "undetermined" {
      _ = await AVAudioApplication.requestRecordPermission()
    }
    let now = permissions()
    if now["microphone"] == "granted" && now["recognition"] == "undetermined" {
      await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
        SFSpeechRecognizer.requestAuthorization { _ in continuation.resume() }
      }
    }
    return permissions()
  }

  func start(requestId: String, language: String, region: String?, emit: @escaping SpeechEmit) async
    -> [String: Any]
  {
    guard run == nil else { return Self.failed("busy") }
    let allowed = Self.permissions()
    guard allowed["microphone"] == "granted" else { return Self.failed("micDenied") }
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
      try session.setActive(true)
    } catch {
      return Self.failed("audio")
    }
    let audio = AVAudioEngine()
    let format = audio.inputNode.outputFormat(forBus: 0)
    guard format.sampleRate > 0, format.channelCount > 0,
      let recording = try? SpeechRecording(inputFormat: format)
    else {
      Self.release()
      return Self.failed("audio")
    }
    let run = SpeechRun(requestId: requestId, emit: emit, audio: audio, recording: recording)
    self.run = run
    let locale = Locale(identifier: SpeechLocale.identifier(language: language, region: region))
    let candidates = SpeechChain.candidates(recognitionAllowed: allowed["recognition"] == "granted")
    let engine = await SpeechChain.first(of: candidates) { engine in
      guard !run.cancelled else { return false }
      let made = await SpeechRecognizers.make(
        engine: engine, locale: locale, inputFormat: format,
        onText: { [weak run] text in run?.partial(text) },
        onError: { [weak self, weak run] error in
          Task { @MainActor in
            guard let self, let run else { return }
            self.recognizerFailed(error, run: run)
          }
        })
      guard let made else { return false }
      run.attach(made)
      return true
    }
    guard !run.cancelled, self.run === run else {
      run.detach()?.cancel()
      return Self.failed("cancelled")
    }
    run.engine = engine
    let input = run.audio.inputNode
    input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak run] buffer, _ in
      run?.feed(buffer)
    }
    do {
      run.audio.prepare()
      try run.audio.start()
    } catch {
      input.removeTap(onBus: 0)
      run.detach()?.cancel()
      recording.delete()
      self.run = nil
      Self.release()
      return Self.failed("audio")
    }
    run.limit = Task { [weak self, weak run] in
      try? await Task.sleep(for: .seconds(Self.limitSeconds))
      guard !Task.isCancelled, let self, let run else { return }
      await self.finish(run, end: .limit)
    }
    run.interruption = NotificationCenter.default.addObserver(
      forName: AVAudioSession.interruptionNotification, object: session, queue: .main
    ) { [weak self, weak run] note in
      let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
      guard raw == AVAudioSession.InterruptionType.began.rawValue else { return }
      Task { @MainActor in
        guard let self, let run else { return }
        await self.finish(run, end: .interrupted)
      }
    }
    return ["status": "started", "engine": engine.rawValue]
  }

  func stop(requestId: String) async {
    guard let run, run.requestId == requestId else { return }
    await finish(run, end: .stopped)
  }

  func cancel(requestId: String) {
    guard let run, run.requestId == requestId else { return }
    run.cancelled = true
    teardown(run)
    run.detach()?.cancel()
    run.recording.delete()
    self.run = nil
    Self.release()
  }

  private func recognizerFailed(_ error: Error, run: SpeechRun) {
    guard self.run === run, !run.finishing else { return }
    let nsError = error as NSError
    switch SpeechFailure.end(domain: nsError.domain, code: nsError.code) {
    case .stopped, .limit, .interrupted:
      return
    case .noSpeech:
      Task { await finish(run, end: .noSpeech) }
    case .audioFailed:
      Task { await finish(run, end: .audioFailed) }
    case .engineFailed:
      run.fallBack()
    }
  }

  private func finish(_ run: SpeechRun, end: SpeechEnd) async {
    guard self.run === run, !run.finishing else { return }
    run.finishing = true
    teardown(run)
    let recognizer = run.detach()
    let text = await recognizer?.finish() ?? ""
    run.recording.close()
    let reason: SpeechEnd = run.failedOver ? .engineFailed : (end == .noSpeech && !text.isEmpty ? .stopped : end)
    let audio = SpeechChain.keepsAudio(engine: run.engine, end: reason) ? run.recording.base64() : nil
    run.recording.delete()
    self.run = nil
    Self.release()
    var body: [String: Any] = [
      "requestId": run.requestId, "kind": "ended", "engine": run.engine.rawValue, "end": reason.rawValue,
      "text": reason == .engineFailed ? "" : text,
    ]
    if let audio { body["audio"] = audio }
    run.emit(body)
  }

  private func teardown(_ run: SpeechRun) {
    run.limit?.cancel()
    if let interruption = run.interruption { NotificationCenter.default.removeObserver(interruption) }
    run.interruption = nil
    run.audio.inputNode.removeTap(onBus: 0)
    run.audio.stop()
  }

  private static func release() {
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }

  private static func failed(_ code: String) -> [String: Any] {
    ["status": "failed", "code": code]
  }
}
