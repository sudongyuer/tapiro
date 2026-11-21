import ExpoModulesCore
import SwiftUI

final class PinnedBarProps: ExpoSwiftUI.ViewProps {
  @Field var header: Bool = false
}

// With `header`, the first child sits in a top safe-area bar with the system hard scroll edge, so rows scrolled under
// it are cut by the system edge instead of crossing its text. The last remaining child is the bottom bar when there
// are two or more; it is opaque down to the screen edge: text rows in it have no fill of their own, and the system
// scroll edge effect let scrolled content cross them (owner, 2026-11-06).
struct PinnedBarView: ExpoSwiftUI.View {
  @ObservedObject var props: PinnedBarProps

  init(props: PinnedBarProps) {
    self.props = props
  }

  var body: some View {
    let children = props.children ?? []
    let top = props.header ? children.first : nil
    let rest = top == nil ? children : Array(children.dropFirst())
    let bar = rest.count > 1 ? rest.last : nil
    let content = bar == nil ? rest : Array(rest.dropLast())
    ZStack {
      ForEach(content, id: \.id) { child in
        let view: any View = child.childView
        AnyView(view)
      }
    }
    .modifier(NavigationScrollEdgeModifier())
    .scrollEdgeEffectStyle(top == nil ? .automatic : .hard, for: .top)
    .safeAreaBar(edge: .top, spacing: 0) {
      if let top {
        let view: any View = top.childView
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
