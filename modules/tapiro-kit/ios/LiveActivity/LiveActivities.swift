import ActivityKit
import ExpoModulesCore
import Foundation

struct LiveActivityStateRecord: Record {
  @Field var title: String = ""
  @Field var staleTitle: String = ""
  @Field var detail: String = ""
  @Field var minutes: Int?
  @Field var unit: String = ""
  @Field var progress: Double = 0
  @Field var startLabel: String = ""
  @Field var endLabel: String = ""
  @Field var staleNote: String = ""
  @Field var staleAfterSeconds: Double?
}

@MainActor
enum LiveActivities {
  typealias Activities = Activity<TapiroActivityAttributes>

  static func start(kind: String, link: String?, state: LiveActivityStateRecord) -> [String: Any] {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return ["status": "disabled"] }
    do {
      let activity = try Activities.request(
        attributes: TapiroActivityAttributes(kind: kind, link: link),
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

  static func end(id: String, state: LiveActivityStateRecord?, dismissAfterSeconds: Double) async -> [String: Any] {
    guard let activity = Activities.activities.first(where: { $0.id == id }) else { return ["status": "notFound"] }
    let policy: ActivityUIDismissalPolicy =
      dismissAfterSeconds > 0 ? .after(Date().addingTimeInterval(dismissAfterSeconds)) : .immediate
    await activity.end(state.map(content), dismissalPolicy: policy)
    return ["status": "ok"]
  }

  static func enabled() -> Bool {
    ActivityAuthorizationInfo().areActivitiesEnabled
  }

  static func list() -> [[String: Any]] {
    Activities.activities.map {
      ["id": $0.id, "kind": $0.attributes.kind, "link": $0.attributes.link as Any, "state": state($0.activityState)]
    }
  }

  private static func state(_ state: ActivityState) -> String {
    switch state {
    case .active: return "active"
    case .stale: return "stale"
    case .ended: return "ended"
    case .dismissed: return "dismissed"
    case .pending: return "pending"
    @unknown default: return "unknown"
    }
  }

  private static func content(_ state: LiveActivityStateRecord) -> ActivityContent<TapiroActivityAttributes.ContentState> {
    ActivityContent(
      state: .init(
        title: state.title,
        staleTitle: state.staleTitle,
        detail: state.detail,
        minutes: state.minutes,
        unit: state.unit,
        progress: min(max(state.progress, 0), 1),
        startLabel: state.startLabel,
        endLabel: state.endLabel,
        staleNote: state.staleNote
      ),
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
