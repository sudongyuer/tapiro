import ActivityKit
import Foundation

// Compiled twice: into the kit pod and, through plugins/withLiveActivity.js, into the widget extension. ActivityKit
// matches the two copies by type name, so the name and the Codable shape must stay identical in both.
// Every string arrives already localized from the app: the extension cannot read the in-app language choice.
public struct TapiroActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var title: String
    public var detail: String
    public var minutes: Int?
    public var unit: String
    public var progress: Double
    public var startLabel: String
    public var endLabel: String
    public var staleNote: String

    public init(
      title: String,
      detail: String,
      minutes: Int?,
      unit: String,
      progress: Double,
      startLabel: String,
      endLabel: String,
      staleNote: String
    ) {
      self.title = title
      self.detail = detail
      self.minutes = minutes
      self.unit = unit
      self.progress = progress
      self.startLabel = startLabel
      self.endLabel = endLabel
      self.staleNote = staleNote
    }
  }

  public var kind: String
  public var link: String?

  public init(kind: String, link: String?) {
    self.kind = kind
    self.link = link
  }
}
