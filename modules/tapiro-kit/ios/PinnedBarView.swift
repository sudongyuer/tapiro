import ExpoModulesCore
import SwiftUI

final class PinnedBarProps: ExpoSwiftUI.ViewProps {}

// The last child is the bar when there are two or more; it sits in a bottom safe-area bar so the scroll view in the
// content insets by its height. The bar is opaque down to the screen edge: text rows in it have no fill of their own,
// and the system scroll edge effect let scrolled content cross them (owner, 2026-11-06).
struct PinnedBarView: ExpoSwiftUI.View {
  @ObservedObject var props: PinnedBarProps

  init(props: PinnedBarProps) {
    self.props = props
  }

  var body: some View {
    let children = props.children ?? []
    let bar = children.count > 1 ? children.last : nil
    let content = bar == nil ? children : Array(children.dropLast())
    ZStack {
      ForEach(content, id: \.id) { child in
        let view: any View = child.childView
        AnyView(view)
      }
    }
    .safeAreaBar(edge: .bottom, spacing: 0) {
      if let bar {
        let view: any View = bar.childView
        AnyView(view)
          .background {
            Color(uiColor: .systemGroupedBackground).ignoresSafeArea(edges: .bottom)
          }
      }
    }
  }
}
