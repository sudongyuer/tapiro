import ExpoModulesCore
import UIKit

struct StickerFlightOptions: Record {
  @Field var viewTag: Int = 0
  @Field var anchorTag: Int = 0
  @Field var tabId: String = ""
  @Field var reduceMotion: Bool = false
  @Field var badge: String = ""
  @Field var badgeColor: String = ""
  @Field var badgeInk: String = ""
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

  private static let lift = (side: 120 as CGFloat, duration: 0.3, damping: 0.72 as CGFloat, hold: 0.25)
  private static let arc = (duration: 0.6, rise: 110 as CGFloat, turn: CGFloat.pi * 11 / 6)
  private static let settle = 0.08
  private static let reducedFade = 0.2
  private static let landedSide: CGFloat = 24
  private static let pop = (press: 0.76 as CGFloat, pressDuration: 0.13, springDuration: 0.4, damping: 0.45 as CGFloat)
  private static let badgeTiming = (appear: 0.25, stay: 0.75, leave: 0.3)

  private static var inFlight = false

  // The source view stays hidden after a landing: the caller removes the card it sits on.
  static func fly(source: UIView, anchor: UIView?, options: StickerFlightOptions, done: @escaping (Bool) -> Void) {
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

    guard let hit = tabTarget(for: source, options: options, in: window) else { return done(false) }
    let (target, icon) = hit
    inFlight = true

    let overlay = makeOverlay(in: window)
    let sticker = UIImageView(image: render(source, scale: lift.side / max(start.width, start.height, 1)))
    sticker.frame = start
    sticker.layer.shadowColor = UIColor.black.cgColor
    sticker.layer.shadowOffset = CGSize(width: 0, height: 10)
    sticker.layer.shadowRadius = 18
    overlay.addSubview(sticker)
    source.alpha = 0

    let haptic = UIImpactFeedbackGenerator(style: .light, view: overlay)
    haptic.prepare()
    let liftScale = lift.side / max(start.width, start.height, 1)
    let landScale = landedSide / max(start.width, start.height, 1)
    let liftedAt = anchor.map { $0.convert(CGPoint(x: $0.bounds.midX, y: $0.bounds.midY), to: window) }
      ?? CGPoint(x: start.midX, y: start.midY)

    fade(sticker.layer, shadowTo: 0.28, duration: lift.duration)
    UIView.animate(
      withDuration: lift.duration, delay: 0, usingSpringWithDamping: lift.damping, initialSpringVelocity: 0
    ) {
      sticker.center = liftedAt
      sticker.transform = CGAffineTransform(scaleX: liftScale, y: liftScale)
    } completion: { _ in
      DispatchQueue.main.asyncAfter(deadline: .now() + lift.hold) {
        throwArc(sticker, from: liftedAt, to: CGPoint(x: target.midX, y: target.midY), lift: liftScale, land: landScale) {
          haptic.impactOccurred()
          inFlight = false
          done(true)
          press(icon)
          let badge = showBadge(options, over: target, in: overlay)
          animator(settle, Curve(0, 0, 0.58, 1)) { sticker.alpha = 0 } completion: {
            if !badge { overlay.removeFromSuperview() }
          }
        }
      }
    }
  }

  private static func throwArc(
    _ sticker: UIView, from: CGPoint, to: CGPoint, lift: CGFloat, land: CGFloat, landed: @escaping () -> Void
  ) {
    // A quadratic Bézier from `from` to `to` peaks `arc.rise` above `from` when its control point sits this far up.
    let drop = max(to.y - from.y, 0)
    let control = arc.rise + (arc.rise * arc.rise + arc.rise * drop).squareRoot()
    let path = UIBezierPath()
    path.move(to: from)
    path.addQuadCurve(
      to: to, controlPoint: CGPoint(x: from.x + (to.x - from.x) * 0.3, y: from.y - control))

    let position = CAKeyframeAnimation(keyPath: "position")
    position.path = path.cgPath
    let scale = CAKeyframeAnimation(keyPath: "transform.scale")
    scale.values = [lift, lift * 0.85, land]
    scale.keyTimes = [0, 0.45, 1]
    let spin = CAKeyframeAnimation(keyPath: "transform.rotation.z")
    spin.values = [0, arc.turn * 0.42, arc.turn]
    spin.keyTimes = [0, 0.45, 1]
    let shadow = CABasicAnimation(keyPath: "shadowOpacity")
    shadow.fromValue = 0.28
    shadow.toValue = 0
    let group = CAAnimationGroup()
    group.animations = [position, scale, spin, shadow]
    group.duration = arc.duration
    group.timingFunction = CAMediaTimingFunction(controlPoints: 0.4, 0, 0.6, 1)

    CATransaction.begin()
    CATransaction.setCompletionBlock(landed)
    sticker.center = to
    sticker.transform = CGAffineTransform(rotationAngle: arc.turn).scaledBy(x: land, y: land)
    sticker.layer.shadowOpacity = 0
    sticker.layer.add(group, forKey: "throw")
    CATransaction.commit()
  }

  private static func press(_ icon: UIView) {
    let rest = icon.transform
    animator(pop.pressDuration, Curve(0.2, 0.8, 0.3, 1)) {
      icon.transform = rest.scaledBy(x: pop.press, y: pop.press)
    } completion: {
      UIView.animate(
        withDuration: pop.springDuration, delay: 0, usingSpringWithDamping: pop.damping, initialSpringVelocity: 0
      ) { icon.transform = rest }
    }
  }

  private static func showBadge(_ options: StickerFlightOptions, over target: CGRect, in overlay: UIView) -> Bool {
    guard !options.badge.isEmpty, let fill = color(options.badgeColor), let ink = color(options.badgeInk)
    else { return false }
    let label = UILabel()
    label.text = options.badge
    label.font = .systemFont(ofSize: 12, weight: .heavy)
    label.textColor = ink
    label.textAlignment = .center
    label.backgroundColor = fill
    label.layer.cornerRadius = 10
    label.layer.masksToBounds = true
    label.isAccessibilityElement = false
    let width = max(26, label.intrinsicContentSize.width + 12)
    label.frame = CGRect(x: target.midX + 4, y: target.minY - 10, width: width, height: 20)
    label.alpha = 0
    label.transform = CGAffineTransform(translationX: 0, y: 4).scaledBy(x: 0.4, y: 0.4)
    overlay.addSubview(label)
    UIView.animate(
      withDuration: badgeTiming.appear, delay: 0, usingSpringWithDamping: 0.6, initialSpringVelocity: 0
    ) {
      label.alpha = 1
      label.transform = .identity
    } completion: { _ in
      UIView.animate(withDuration: badgeTiming.leave, delay: badgeTiming.stay, options: .curveEaseIn) {
        label.alpha = 0
        label.transform = CGAffineTransform(translationX: 0, y: -8)
      } completion: { _ in
        overlay.removeFromSuperview()
      }
    }
    return true
  }

  private static func render(_ view: UIView, scale: CGFloat) -> UIImage {
    let format = UIGraphicsImageRendererFormat.preferred()
    format.scale = (view.window?.screen.scale ?? 3) * max(scale, 1)
    format.opaque = false
    return UIGraphicsImageRenderer(bounds: view.bounds, format: format).image { context in
      view.layer.render(in: context.cgContext)
    }
  }

  private static func fade(_ layer: CALayer, shadowTo opacity: Float, duration: TimeInterval) {
    let animation = CABasicAnimation(keyPath: "shadowOpacity")
    animation.fromValue = layer.shadowOpacity
    animation.toValue = opacity
    animation.duration = duration
    layer.shadowOpacity = opacity
    layer.add(animation, forKey: "shadow")
  }

  private static func color(_ hex: String) -> UIColor? {
    let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard digits.count == 6, let value = UInt32(digits, radix: 16) else { return nil }
    return UIColor(
      red: CGFloat((value >> 16) & 0xFF) / 255, green: CGFloat((value >> 8) & 0xFF) / 255,
      blue: CGFloat(value & 0xFF) / 255, alpha: 1)
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

  private static func tabTarget(for source: UIView, options: StickerFlightOptions, in window: UIWindow)
    -> (CGRect, UIView)?
  {
    guard let tabBar = tabBarController(for: source, in: window)?.tabBar, isShowing(tabBar) else { return nil }
    guard !options.tabId.isEmpty, let item = descendant(of: tabBar, identifier: options.tabId), isShowing(item)
    else { return nil }
    let icon = largestImage(in: item) ?? item
    return (icon.convert(icon.bounds, to: window), icon)
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
