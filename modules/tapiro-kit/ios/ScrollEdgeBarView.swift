import ExpoModulesCore
import UIKit

// A bar of React Native views pinned over the bottom of a sibling scroll view. The system draws the hard bottom scroll
// edge effect, a cutoff with a dividing line, under the bar's labels and controls, so a status line pinned over a
// scrolled timeline reads as a bar instead of one more line of text (audit S3, 2026-11-21).
final class ScrollEdgeBarView: ExpoView {
  private weak var scrollView: UIScrollView?
  private var interaction: UIScrollEdgeElementContainerInteraction?

  override func didMoveToWindow() {
    super.didMoveToWindow()
    attach()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    attach()
  }

  private func attach() {
    guard window != nil, let found = siblingScrollView(), found !== scrollView else { return }
    if let interaction { removeInteraction(interaction) }
    let container = UIScrollEdgeElementContainerInteraction()
    container.scrollView = found
    container.edge = .bottom
    addInteraction(container)
    found.bottomEdgeEffect.style = .hard
    interaction = container
    scrollView = found
  }

  private func siblingScrollView() -> UIScrollView? {
    guard let superview else { return nil }
    var queue = superview.subviews.filter { $0 !== self }
    var index = 0
    while index < queue.count {
      let candidate = queue[index]
      index += 1
      if let scrollView = candidate as? UIScrollView { return scrollView }
      queue.append(contentsOf: candidate.subviews)
    }
    return nil
  }
}
