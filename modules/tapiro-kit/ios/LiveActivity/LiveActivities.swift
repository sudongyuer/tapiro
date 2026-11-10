import ActivityKit
import ExpoModulesCore
import Foundation

struct LiveActivityStateRecord: Record {
  @Field var sentence: String = ""
  @Field var progress: Double = 0
  @Field var minutes: Int?
  @Field var staleAfterSeconds: Double?
}

@MainActor
enum LiveActivities {
  typealias Activities = Activity<TapiroActivityAttributes>

  static func start(kind: String, state: LiveActivityStateRecord) -> [String: Any] {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return ["status": "disabled"] }
    do {
      let activity = try Activities.request(
        attributes: TapiroActivityAttributes(kind: kind),
        content: content(state),
        pushType: nil
      )
      return ["status": "ok", "id": activity.id]
    } catch {
      return ["status": "failed", "code": code(for: error)]
    }
  }

  static func update(id: String, state: LiveActivityStateRecord) async -> [String: Any] {
    guard let activity = Activities.activities.first(where: { $0.id == id }) else { return ["status": "notFound"] }
    await activity.update(content(state))
    return ["status": "ok"]
  }

  static func end(id: String, state: LiveActivityStateRecord?, immediately: Bool) async -> [String: Any] {
    guard let activity = Activities.activities.first(where: { $0.id == id }) else { return ["status": "notFound"] }
    await activity.end(state.map(content), dismissalPolicy: immediately ? .immediate : .default)
    return ["status": "ok"]
  }

  static func list() -> [[String: Any]] {
    Activities.activities.map { ["id": $0.id, "kind": $0.attributes.kind, "state": String(describing: $0.activityState)] }
  }

  private static func content(_ state: LiveActivityStateRecord) -> ActivityContent<TapiroActivityAttributes.ContentState> {
    ActivityContent(
      state: .init(sentence: state.sentence, progress: min(max(state.progress, 0), 1), minutes: state.minutes),
      staleDate: state.staleAfterSeconds.map { Date().addingTimeInterval($0) }
    )
  }

  private static func code(for error: Error) -> String {
    guard let error = error as? ActivityAuthorizationError else { return "unknown" }
    switch error {
    case .unsupported, .unsupportedTarget: return "unsupported"
    case .denied, .visibility: return "disabled"
    case .globalMaximumExceeded, .targetMaximumExceeded: return "tooMany"
    case .attributesTooLarge: return "tooLarge"
    case .unentitled: return "unentitled"
    default: return "failed"
    }
  }
}
