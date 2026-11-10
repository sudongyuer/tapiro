import ActivityKit
import SwiftUI
import WidgetKit

// PLACEHOLDER visuals for the spike. The look is open question 276; nothing here is the design.
@main
struct TapiroLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    TapiroLiveActivityWidget()
  }
}

struct TapiroLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TapiroActivityAttributes.self) { context in
      LockScreenPlaceholder(state: context.state, stale: context.isStale)
        .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: "figure.walk")
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(minutesText(context.state.minutes))
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading) {
            Text(context.state.sentence).lineLimit(1)
            ProgressView(value: context.state.progress)
            Text(verbatim: "PLACEHOLDER 276").font(.caption2).foregroundStyle(.secondary)
          }
        }
      } compactLeading: {
        Image(systemName: "figure.walk")
      } compactTrailing: {
        Text(minutesText(context.state.minutes))
      } minimal: {
        Image(systemName: "figure.walk")
      }
    }
  }
}

private struct LockScreenPlaceholder: View {
  let state: TapiroActivityAttributes.ContentState
  let stale: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Image(systemName: "figure.walk")
        Text(state.sentence).lineLimit(2)
        Spacer()
        Text(minutesText(state.minutes))
      }
      ProgressView(value: state.progress)
      Text(verbatim: stale ? "PLACEHOLDER 276 · stale" : "PLACEHOLDER 276")
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }
}

private func minutesText(_ minutes: Int?) -> String {
  minutes.map { "\($0)′" } ?? "–"
}
