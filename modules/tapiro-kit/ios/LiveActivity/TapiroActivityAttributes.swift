import ActivityKit
import Foundation

// Compiled twice: into the kit pod and, through plugins/withLiveActivity.js, into the widget extension. ActivityKit
// matches the two copies by type name, so the name and the Codable shape must stay identical in both.
public struct TapiroActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var sentence: String
    public var progress: Double
    public var minutes: Int?

    public init(sentence: String, progress: Double, minutes: Int?) {
      self.sentence = sentence
      self.progress = progress
      self.minutes = minutes
    }
  }

  public var kind: String

  public init(kind: String) {
    self.kind = kind
  }
}
