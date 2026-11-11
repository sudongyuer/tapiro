import ActivityKit
import SwiftUI
import WidgetKit

@main
struct TapiroLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    TapiroLiveActivityWidget()
  }
}

struct TapiroLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TapiroActivityAttributes.self) { context in
      LockScreenView(state: context.state, stale: context.isStale)
        .activityBackgroundTint(Color(uiColor: .systemBackground).opacity(0.78))
        .activitySystemActionForegroundColor(.primary)
        .widgetURL(context.attributes.link.flatMap(URL.init(string:)))
    } dynamicIsland: { context in
      let state = context.state
      let stale = context.isStale
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          TapirHead(diameter: 40)
        }
        DynamicIslandExpandedRegion(.trailing) {
          BigMinutes(state: state, stale: stale)
        }
        DynamicIslandExpandedRegion(.center) {
          Sentence(state: state, stale: stale, titleLines: 1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          ProgressLine(state: state)
            .padding(.horizontal, 8)
            .padding(.top, 4)
        }
      } compactLeading: {
        TapirHead(diameter: 22)
      } compactTrailing: {
        CompactMinutes(state: state, stale: stale)
      } minimal: {
        TapirHead(diameter: 22)
          .accessibilityElement()
          .accessibilityLabel(Text(stale ? state.staleTitle : state.title))
      }
      .widgetURL(context.attributes.link.flatMap(URL.init(string:)))
    }
  }
}

private struct LockScreenView: View {
  let state: TapiroActivityAttributes.ContentState
  let stale: Bool

  var body: some View {
    VStack(spacing: 9) {
      HStack(spacing: 10) {
        TapirHead(diameter: 34)
        Sentence(state: state, stale: stale, titleLines: 2)
        BigMinutes(state: state, stale: stale)
      }
      ProgressLine(state: state)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
  }
}

private struct Sentence: View {
  let state: TapiroActivityAttributes.ContentState
  let stale: Bool
  let titleLines: Int

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(stale ? state.staleTitle : state.title)
        .font(.subheadline.weight(.bold))
        .lineLimit(titleLines)
      Text(stale ? state.staleNote : state.detail)
        .font(.caption)
        .foregroundStyle(.secondary)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
  }
}

private struct BigMinutes: View {
  let state: TapiroActivityAttributes.ContentState
  let stale: Bool

  var body: some View {
    if let minutes = state.minutes {
      HStack(alignment: .firstTextBaseline, spacing: 1) {
        Text(verbatim: "\(minutes)")
          .font(.system(.title2, design: .rounded).weight(.heavy))
        Text(state.unit)
          .font(.system(.caption, design: .rounded).weight(.bold))
      }
      .foregroundStyle(stale ? .secondary : .primary)
      .accessibilityHidden(true)
    }
  }
}

private struct CompactMinutes: View {
  let state: TapiroActivityAttributes.ContentState
  let stale: Bool

  var body: some View {
    Group {
      if let minutes = state.minutes {
        Text(verbatim: "\(minutes) \(state.unit)")
      } else {
        Image(systemName: "checkmark")
      }
    }
    .font(.system(.subheadline, design: .rounded).weight(.heavy))
    .foregroundStyle(stale ? .secondary : .primary)
    .accessibilityElement()
    .accessibilityLabel(
      Text(verbatim: stale ? "\(state.staleTitle), \(state.staleNote)" : "\(state.title), \(state.detail)")
    )
  }
}

private struct ProgressLine: View {
  let state: TapiroActivityAttributes.ContentState

  var body: some View {
    VStack(spacing: 4) {
      Capsule()
        .fill(.primary.opacity(0.18))
        .frame(height: 5)
        .overlay(alignment: .leading) {
          GeometryReader { proxy in
            Capsule()
              .fill(.primary)
              .frame(width: max(5, proxy.size.width * state.progress))
          }
        }
        .accessibilityHidden(true)
      HStack {
        Text(state.startLabel)
        Spacer(minLength: 8)
        Text(state.endLabel)
      }
      .font(.caption2)
      .foregroundStyle(.secondary)
      .lineLimit(1)
      .accessibilityElement(children: .combine)
    }
  }
}
