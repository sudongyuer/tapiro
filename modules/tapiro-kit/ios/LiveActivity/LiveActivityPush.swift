import ActivityKit
import Foundation
import Security

// iOS wakes the app for a push-started activity without connecting a scene, so React Native never starts. The update
// tokens are therefore sent from here, with the device key, to an RPC that needs no session.
@MainActor
final class LiveActivityPush {
  static let shared = LiveActivityPush()

  private static let endpointKey = "tapiro.liveActivity.endpoint"
  private static let anonKeyKey = "tapiro.liveActivity.anonKey"
  private static let keychainService = "app.tapiro.liveActivity"
  private static let keychainAccount = "deviceKey"

  private var observing = false
  private var watched = Set<String>()
  private var unattached: [String: String] = [:]
  private var latest: [String: String] = [:]
  private(set) var startToken: String?
  var onStartToken: ((String) -> Void)?

  func setUp(url: String, anonKey: String) -> [String: Any] {
    UserDefaults.standard.set(url, forKey: Self.endpointKey)
    UserDefaults.standard.set(anonKey, forKey: Self.anonKeyKey)
    observe()
    var answer: [String: Any] = [:]
    if let key = Self.deviceKey() { answer["deviceKey"] = key }
    if let startToken { answer["startToken"] = startToken }
    return answer
  }

  func observe() {
    guard !observing else { return }
    observing = true
    Task { @MainActor in
      for await data in Activity<TapiroActivityAttributes>.pushToStartTokenUpdates {
        let token = Self.hex(data)
        startToken = token
        onStartToken?(token)
      }
    }
    Task { @MainActor in
      for await activity in Activity<TapiroActivityAttributes>.activityUpdates {
        watch(activity)
      }
    }
    for activity in Activity<TapiroActivityAttributes>.activities {
      watch(activity)
    }
  }

  // A token that arrives before the device is registered (first sign-in, or offline) is kept and sent again by flush.
  func flush() async {
    for (token, link) in unattached {
      if await Self.attach(token: token, link: link) { unattached[token] = nil }
    }
  }

  private func watch(_ activity: Activity<TapiroActivityAttributes>) {
    guard let link = activity.attributes.link, watched.insert(activity.id).inserted else { return }
    let id = activity.id
    Task { @MainActor in
      for await data in activity.pushTokenUpdates {
        let token = Self.hex(data)
        if let previous = latest[id] { unattached[previous] = nil }
        latest[id] = token
        if !(await Self.attach(token: token, link: link)) { unattached[token] = link }
      }
    }
    Task { @MainActor in
      for await state in activity.activityStateUpdates where state == .dismissed || state == .ended {
        guard let token = latest[id] else { continue }
        unattached[token] = nil
        _ = await Self.call("detach_live_activity_token", ["token": token])
      }
    }
  }

  private static func attach(token: String, link: String) async -> Bool {
    await call("attach_live_activity_token", ["token": token, "link": link]) == "true"
  }

  private static func call(_ name: String, _ body: [String: String]) async -> String? {
    guard
      let base = UserDefaults.standard.string(forKey: endpointKey),
      let anonKey = UserDefaults.standard.string(forKey: anonKeyKey),
      let deviceKey = deviceKey(),
      let url = URL(string: "\(base)/rest/v1/rpc/\(name)")
    else { return nil }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue(anonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try? JSONSerialization.data(withJSONObject: body.merging(["device_key": deviceKey]) { a, _ in a })
    for attempt in 0..<3 {
      if attempt > 0 { try? await Task.sleep(for: .seconds(2 * attempt)) }
      guard let (data, response) = try? await URLSession.shared.data(for: request),
        let status = (response as? HTTPURLResponse)?.statusCode
      else { continue }
      if status >= 500 { continue }
      guard status < 300 else { return nil }
      return String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    return nil
  }

  private static func hex(_ data: Data) -> String {
    data.map { String(format: "%02x", $0) }.joined()
  }

  // Readable after the first unlock, so a push-start that wakes the app on a locked phone can still attach its token.
  private static func deviceKey() -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: keychainAccount,
      kSecReturnData as String: true,
    ]
    var item: CFTypeRef?
    if SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
      let data = item as? Data, let key = String(data: data, encoding: .utf8)
    {
      return key
    }
    var bytes = [UInt8](repeating: 0, count: 32)
    guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { return nil }
    let key = hex(Data(bytes))
    let add: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: keychainAccount,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
      kSecValueData as String: Data(key.utf8),
    ]
    return SecItemAdd(add as CFDictionary, nil) == errSecSuccess ? key : nil
  }
}
