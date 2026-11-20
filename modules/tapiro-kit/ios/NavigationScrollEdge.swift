import SwiftUI
import UIKit

// The navigation bar draws its top scroll edge effect over its controller's content scroll view. UIKit looks for that
// view only down the first-subview chain of the screen's controller, and react-native-screens does the same, so the
// collection view behind a SwiftUI Form inside an Expo UI Host is never found: the screen's content slid under the
// back button with no edge effect (audit S1, 2026-11-21). This anchor names that scroll view to the screen's
// controller with `setContentScrollView(_:for:)`.
struct NavigationScrollEdgeModifier: ViewModifier {
  func body(content: Content) -> some View {
    content.background(NavigationScrollEdgeAnchor())
  }
}

private struct NavigationScrollEdgeAnchor: UIViewRepresentable {
  func makeUIView(context: Context) -> NavigationScrollEdgeAnchorView {
    NavigationScrollEdgeAnchorView()
  }

  func updateUIView(_ view: NavigationScrollEdgeAnchorView, context: Context) {
    view.scheduleRegister()
  }
}

final class NavigationScrollEdgeAnchorView: UIView {
  private var pending = false

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    backgroundColor = .clear
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    scheduleRegister()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    scheduleRegister()
  }

  func scheduleRegister() {
    guard window != nil, !pending else { return }
    pending = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.pending = false
      self.register()
    }
  }

  private func register() {
    guard
      window != nil,
      let host = nearestController(),
      let screen = screenController(from: host),
      let scrollView = nearestScrollView(within: host.view)
    else { return }
    if screen.contentScrollView(for: .top) !== scrollView {
      screen.setContentScrollView(scrollView, for: .top)
    }
  }

  private func nearestController() -> UIViewController? {
    var responder: UIResponder? = self
    while let current = responder {
      if let controller = current as? UIViewController { return controller }
      responder = current.next
    }
    return nil
  }

  private func screenController(from controller: UIViewController) -> UIViewController? {
    var current = controller
    while let parent = current.parent {
      if parent is UINavigationController { return current }
      current = parent
    }
    return nil
  }

  private func nearestScrollView(within root: UIView?) -> UIScrollView? {
    guard let root else { return nil }
    var ancestor = superview
    while let current = ancestor {
      if let found = outermostScrollView(in: current) { return found }
      if current === root { return nil }
      ancestor = current.superview
    }
    return nil
  }

  private func outermostScrollView(in view: UIView) -> UIScrollView? {
    var queue = view.subviews
    var index = 0
    while index < queue.count {
      let candidate = queue[index]
      index += 1
      if candidate === self { continue }
      if let scrollView = candidate as? UIScrollView { return scrollView }
      queue.append(contentsOf: candidate.subviews)
    }
    return nil
  }
}
