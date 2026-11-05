import ExpoModulesCore
import UIKit

struct ContextMenuActionRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var systemImage: String?
  @Field var destructive: Bool = false
  @Field var separate: Bool = false
}

// Not @expo/ui's ContextMenu: a SwiftUI bubble in a matchContents Host measured shorter than it drew for a long
// message, so the RN bubble keeps Yoga's measurement and only the interaction is native.
final class ContextMenuView: ExpoView, UIContextMenuInteractionDelegate {
  let onAction = EventDispatcher()
  private var actions: [ContextMenuActionRecord] = []
  private var cornerRadius: CGFloat = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addInteraction(UIContextMenuInteraction(delegate: self))
  }

  func setActions(_ actions: [ContextMenuActionRecord]) {
    self.actions = actions
  }

  func setCornerRadius(_ radius: Double) {
    cornerRadius = CGFloat(radius)
  }

  private func element(for record: ContextMenuActionRecord) -> UIMenuElement {
    let image = record.systemImage.flatMap { UIImage(systemName: $0) }
    let action = UIAction(title: record.title, image: image) { [weak self] _ in
      self?.onAction(["id": record.id])
    }
    if record.destructive { action.attributes = .destructive }
    return action
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    configurationForMenuAtLocation location: CGPoint
  ) -> UIContextMenuConfiguration? {
    guard !actions.isEmpty else { return nil }
    let leading = actions.filter { !$0.separate }.map(element(for:))
    let trailing = actions.filter { $0.separate }.map(element(for:))
    return UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { _ in
      var children: [UIMenuElement] = leading
      if !trailing.isEmpty {
        children.append(UIMenu(title: "", options: .displayInline, children: trailing))
      }
      return UIMenu(title: "", children: children)
    }
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    configuration: UIContextMenuConfiguration,
    highlightPreviewForItemWithIdentifier identifier: any NSCopying
  ) -> UITargetedPreview? {
    preview()
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    configuration: UIContextMenuConfiguration,
    dismissalPreviewForItemWithIdentifier identifier: any NSCopying
  ) -> UITargetedPreview? {
    preview()
  }

  private func preview() -> UITargetedPreview? {
    guard window != nil else { return nil }
    let parameters = UIPreviewParameters()
    parameters.backgroundColor = .clear
    parameters.visiblePath = UIBezierPath(roundedRect: bounds, cornerRadius: cornerRadius)
    return UITargetedPreview(view: self, parameters: parameters)
  }
}
