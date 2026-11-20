import ExpoModulesCore
import ExpoUI
import SwiftUI

final class ChipRowProps: UIBaseViewProps {
  @Field var spacing: Double = 8
}

// Choice chips are never truncated: they share the row in equal columns when the widest fits a column, otherwise each
// takes its own width and the rest of a line is shared out, and a line that runs out wraps. Every chip on a line takes
// the line's tallest height.
struct ChipRowView: ExpoSwiftUI.View {
  @ObservedObject var props: ChipRowProps

  var body: some View {
    let children = props.children ?? []
    ChipRowLayout(spacing: props.spacing) {
      ForEach(children, id: \.id) { child in
        let view: any View = child.childView
        AnyView(view)
      }
    }
  }
}

struct ChipRowLayout: Layout {
  let spacing: CGFloat

  init(spacing: Double) {
    self.spacing = CGFloat(spacing)
  }

  struct Line {
    var items: [(index: Int, width: CGFloat)]
    var height: CGFloat
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? ideal(subviews).reduce(0, +) + spacing * CGFloat(max(subviews.count - 1, 0))
    let lines = arrange(width: width, subviews: subviews)
    let height = lines.map(\.height).reduce(0, +) + spacing * CGFloat(max(lines.count - 1, 0))
    return CGSize(width: width, height: height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for line in arrange(width: bounds.width, subviews: subviews) {
      var x = bounds.minX
      for item in line.items {
        subviews[item.index].place(
          at: CGPoint(x: x, y: y),
          proposal: ProposedViewSize(width: item.width, height: line.height)
        )
        x += item.width + spacing
      }
      y += line.height + spacing
    }
  }

  private func ideal(_ subviews: Subviews) -> [CGFloat] {
    subviews.map { ceil($0.sizeThatFits(.unspecified).width) }
  }

  private func arrange(width: CGFloat, subviews: Subviews) -> [Line] {
    guard !subviews.isEmpty else { return [] }
    let widths = ideal(subviews).map { min($0, width) }
    let count = CGFloat(subviews.count)
    let column = (width - spacing * (count - 1)) / count
    let equal = (widths.max() ?? 0) <= column
    let groups = equal ? [Array(subviews.indices)] : wrap(widths: widths, width: width)
    return groups.map { group in
      let used = group.map { widths[$0] }.reduce(0, +) + spacing * CGFloat(group.count - 1)
      let extra = (width - used) / CGFloat(group.count)
      let items = group.map { index in (index: index, width: equal ? column : widths[index] + extra) }
      let height = items.map { item in
        subviews[item.index].sizeThatFits(ProposedViewSize(width: item.width, height: nil)).height
      }.max() ?? 0
      return Line(items: items, height: ceil(height))
    }
  }

  private func wrap(widths: [CGFloat], width: CGFloat) -> [[Int]] {
    var groups: [[Int]] = []
    var current: [Int] = []
    var used: CGFloat = 0
    for (index, itemWidth) in widths.enumerated() {
      let next = current.isEmpty ? itemWidth : used + spacing + itemWidth
      if !current.isEmpty && next > width {
        groups.append(current)
        current = [index]
        used = itemWidth
      } else {
        current.append(index)
        used = next
      }
    }
    if !current.isEmpty { groups.append(current) }
    return groups
  }
}
