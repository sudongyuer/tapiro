import ExpoModulesCore
import UIKit

final class TitleHaloView: ExpoView {
  private weak var item: UINavigationItem?
  private var observations: [NSKeyValueObservation] = []

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      detach()
    } else {
      attach()
    }
  }

  deinit {
    observations.forEach { $0.invalidate() }
  }

  private func attach() {
    guard let navigationItem = owningController()?.navigationItem, navigationItem !== item else { return }
    detach()
    item = navigationItem
    TitleHalo.apply(to: navigationItem)
    // react-native-screens rebuilds the item's appearances whenever it reconfigures the header;
    // re-merge the halo after each rebuild.
    let reapply: (UINavigationItem, Any) -> Void = { observed, _ in
      DispatchQueue.main.async { TitleHalo.apply(to: observed) }
    }
    observations = [
      navigationItem.observe(\.standardAppearance) { item, change in reapply(item, change) },
      navigationItem.observe(\.compactAppearance) { item, change in reapply(item, change) },
      navigationItem.observe(\.scrollEdgeAppearance) { item, change in reapply(item, change) },
      navigationItem.observe(\.compactScrollEdgeAppearance) { item, change in reapply(item, change) },
    ]
  }

  private func detach() {
    observations.forEach { $0.invalidate() }
    observations = []
    item = nil
  }

  private func owningController() -> UIViewController? {
    var responder: UIResponder? = self
    while let current = responder {
      if let controller = current as? UIViewController { return controller }
      responder = current.next
    }
    return nil
  }
}

enum TitleHalo {
  private static let blur: CGFloat = 4

  private static let shadow: NSShadow = {
    let shadow = NSShadow()
    shadow.shadowColor = UIColor.white
    shadow.shadowOffset = .zero
    shadow.shadowBlurRadius = blur
    return shadow
  }()

  static func apply(to item: UINavigationItem) {
    if let next = haloed(item.standardAppearance) { item.standardAppearance = next }
    if let next = haloed(item.compactAppearance) { item.compactAppearance = next }
    if let next = haloed(item.scrollEdgeAppearance) { item.scrollEdgeAppearance = next }
    if let next = haloed(item.compactScrollEdgeAppearance) { item.compactScrollEdgeAppearance = next }
  }

  private static func isHalo(_ value: Any?) -> Bool {
    guard let current = value as? NSShadow else { return false }
    return current.shadowBlurRadius == blur && current.shadowOffset == .zero
  }

  private static func haloed(_ appearance: UINavigationBarAppearance?) -> UINavigationBarAppearance? {
    guard let appearance,
      !isHalo(appearance.titleTextAttributes[.shadow]) || !isHalo(appearance.largeTitleTextAttributes[.shadow])
    else { return nil }
    let copy = appearance.copy()
    copy.titleTextAttributes[.shadow] = shadow
    copy.largeTitleTextAttributes[.shadow] = shadow
    return copy
  }
}
