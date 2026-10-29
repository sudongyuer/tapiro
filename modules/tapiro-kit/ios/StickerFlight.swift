import ExpoModulesCore
import UIKit

struct StickerFlightOptions: Record {
  @Field var viewTag: Int = 0
  @Field var tabId: String = ""
  @Field var reduceMotion: Bool = false
}

@MainActor
enum StickerFlight {
  private struct Curve {
    let c1: CGPoint
    let c2: CGPoint
    init(_ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat) {
      c1 = CGPoint(x: x1, y: y1)
      c2 = CGPoint(x: x2, y: y2)
    }
  }

  // Values match the payee celebration's flight (src/features/payment/celebration/timeline.ts: flyX, flyY).
  private static let peel = (duration: 0.16, scale: 1.06 as CGFloat, curve: Curve(0.2, 0.8, 0.3, 1))
  private static let arc = (duration: 0.52, x: Curve(0.25, 0.6, 0.35, 1), y: Curve(0.55, 0, 0.75, 0.6))
  private static let settle = 0.12
  private static let reducedFade = 0.2
  private static let landedSide: CGFloat = 24

  private static var inFlight = false

  // The source view stays hidden after a landing: the caller removes the card it sits on.
  static func fly(source: UIView, options: StickerFlightOptions, done: @escaping (Bool) -> Void) {
    guard !inFlight, let window = source.window,
      let snapshot = source.snapshotView(afterScreenUpdates: false)
    else { return done(false) }
    let start = source.convert(source.bounds, to: window)

    if options.reduceMotion || UIAccessibility.isReduceMotionEnabled {
      let overlay = makeOverlay(in: window)
      snapshot.frame = start
      overlay.addSubview(snapshot)
      source.alpha = 0
      inFlight = true
      let haptic = UIImpactFeedbackGenerator(style: .light, view: overlay)
      haptic.prepare()
      animator(reducedFade, Curve(0, 0, 0.58, 1)) { snapshot.alpha = 0 } completion: {
        haptic.impactOccurred()
        overlay.removeFromSuperview()
        inFlight = false
        done(true)
      }
      return
    }

    guard let target = tabTarget(for: source, options: options, in: window) else { return done(false) }
    inFlight = true

    let overlay = makeOverlay(in: window)
    let xLayer = UIView(frame: window.bounds)
    let yLayer = UIView(frame: window.bounds)
    overlay.addSubview(xLayer)
    xLayer.addSubview(yLayer)
    snapshot.frame = start
    yLayer.addSubview(snapshot)
    snapshot.layer.shadowColor = UIColor.black.cgColor
    snapshot.layer.shadowOffset = CGSize(width: 0, height: 6)
    snapshot.layer.shadowRadius = 10
    source.alpha = 0

    let haptic = UIImpactFeedbackGenerator(style: .light, view: overlay)
    haptic.prepare()
    let landScale = landedSide / max(start.width, start.height, 1)
    let dx = target.midX - start.midX
    let dy = target.midY - start.midY

    animator(peel.duration, peel.curve) {
      snapshot.transform = CGAffineTransform(scaleX: peel.scale, y: peel.scale)
      snapshot.layer.shadowOpacity = 0.18
    } completion: {
      animator(arc.duration, arc.y) { yLayer.transform = CGAffineTransform(translationX: 0, y: dy) }
      animator(arc.duration, arc.x) {
        xLayer.transform = CGAffineTransform(translationX: dx, y: 0)
        snapshot.transform = CGAffineTransform(scaleX: landScale, y: landScale)
        snapshot.layer.shadowOpacity = 0
      } completion: {
        haptic.impactOccurred()
        done(true)
        animator(settle, Curve(0, 0, 0.58, 1)) { snapshot.alpha = 0 } completion: {
          overlay.removeFromSuperview()
          inFlight = false
        }
      }
    }
  }

  private static func makeOverlay(in window: UIWindow) -> UIView {
    let overlay = UIView(frame: window.bounds)
    overlay.isUserInteractionEnabled = false
    overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(overlay)
    return overlay
  }

  private static func animator(
    _ duration: TimeInterval, _ curve: Curve, _ animations: @escaping () -> Void,
    completion: (() -> Void)? = nil
  ) {
    let animator = UIViewPropertyAnimator(
      duration: duration, controlPoint1: curve.c1, controlPoint2: curve.c2, animations: animations)
    if let completion { animator.addCompletion { _ in completion() } }
    animator.startAnimation()
  }

  private static func tabTarget(for source: UIView, options: StickerFlightOptions, in window: UIWindow) -> CGRect? {
    guard let tabBar = tabBarController(for: source, in: window)?.tabBar, isShowing(tabBar) else { return nil }
    guard !options.tabId.isEmpty, let item = descendant(of: tabBar, identifier: options.tabId), isShowing(item)
    else { return nil }
    let icon = largestImage(in: item) ?? item
    return icon.convert(icon.bounds, to: window)
  }

  private static func tabBarController(for source: UIView, in window: UIWindow) -> UITabBarController? {
    var responder: UIResponder? = source
    while let current = responder {
      if let controller = current as? UIViewController, let tabs = controller.tabBarController { return tabs }
      responder = current.next
    }
    return window.rootViewController.flatMap(findTabBarController)
  }

  private static func findTabBarController(_ controller: UIViewController) -> UITabBarController? {
    if let tabs = controller as? UITabBarController, tabs.viewIfLoaded?.window != nil { return tabs }
    for child in controller.children {
      if let found = findTabBarController(child) { return found }
    }
    return controller.presentedViewController.flatMap(findTabBarController)
  }

  private static func isShowing(_ view: UIView) -> Bool {
    var current: UIView? = view
    while let node = current {
      if node.isHidden || node.alpha < 0.01 { return false }
      current = node.superview
    }
    return view.window != nil && !view.bounds.isEmpty
  }

  private static func descendant(of root: UIView, identifier: String) -> UIView? {
    for child in root.subviews {
      if child.accessibilityIdentifier == identifier { return child }
      if let found = descendant(of: child, identifier: identifier) { return found }
    }
    return nil
  }

  private static func largestImage(in root: UIView) -> UIImageView? {
    var best: UIImageView?
    var stack = root.subviews
    while let view = stack.popLast() {
      if let image = view as? UIImageView, !image.isHidden, image.image != nil,
        image.bounds.width * image.bounds.height > (best.map { $0.bounds.width * $0.bounds.height } ?? 0)
      {
        best = image
      }
      stack.append(contentsOf: view.subviews)
    }
    return best
  }
}
