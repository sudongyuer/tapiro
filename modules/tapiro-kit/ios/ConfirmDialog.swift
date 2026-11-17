import ExpoModulesCore
import UIKit

struct ConfirmOptions: Record {
  @Field var title: String = ""
  @Field var message: String? = nil
  @Field var confirm: String = ""
  @Field var keep: String = ""
  @Field var destructive: Bool = false
  @Field var anchorTag: Int = 0
  @Field var anchorBar: Bool = false
}

// Since iOS 26 an iPhone action sheet with a source is a popover from that source and drops its cancel-style action
// (a tap outside cancels); without a source it is centred like an alert with the two buttons side by side. Keep is
// therefore a default-style action, so it stays visible under the confirm button, and dismissing the popover counts
// as keep. Measured on the iOS 27.2 Simulator, 2026-11-17.
@MainActor
enum ConfirmDialog {
  private final class Outcome: NSObject, UIPopoverPresentationControllerDelegate {
    private var done: ((Bool) -> Void)?
    init(_ done: @escaping (Bool) -> Void) { self.done = done }

    func settle(_ confirmed: Bool) {
      done?(confirmed)
      done = nil
    }

    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
      settle(false)
    }
  }

  static func ask(_ options: ConfirmOptions, anchor: UIView?, done: @escaping (Bool) -> Void) {
    guard let window = anchor?.window ?? keyWindow(), let presenter = topController(window.rootViewController),
      !(presenter is UIAlertController), let host = presenter.view
    else { return done(false) }

    let source = anchor.map { $0.convert($0.bounds, to: host) } ?? (options.anchorBar ? barRect(in: host) : nil)
    let outcome = Outcome(done)
    let alert = UIAlertController(title: options.title, message: options.message, preferredStyle: .actionSheet)
    alert.addAction(
      UIAlertAction(title: options.confirm, style: options.destructive ? .destructive : .default) { _ in
        outcome.settle(true)
      })
    alert.addAction(UIAlertAction(title: options.keep, style: source == nil ? .cancel : .default) { _ in
      outcome.settle(false)
    })
    if let source, let popover = alert.popoverPresentationController {
      popover.sourceView = host
      popover.sourceRect = source
      popover.delegate = outcome
    }
    presenter.present(alert, animated: true)
  }

  private static func keyWindow() -> UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow }
      .first
  }

  private static func topController(_ root: UIViewController?) -> UIViewController? {
    var top = root
    while let next = top?.presentedViewController, !next.isBeingDismissed { top = next }
    return top
  }

  private static func barRect(in host: UIView) -> CGRect? {
    let bars = navigationBars(in: host).filter { bar in
      !bar.isHidden && bar.alpha > 0 && bar.window != nil && !(bar.topItem?.rightBarButtonItems ?? []).isEmpty
    }
    guard let items = bars.last?.topItem?.rightBarButtonItems else { return nil }
    let item = items.first { $0.menu != nil && !$0.isHidden } ?? items.first { !$0.isHidden } ?? items[0]
    let frame = item.frame(in: host)
    return frame.isNull || frame.isEmpty ? nil : frame
  }

  private static func navigationBars(in view: UIView) -> [UINavigationBar] {
    if let bar = view as? UINavigationBar { return [bar] }
    return view.subviews.flatMap { navigationBars(in: $0) }
  }
}
