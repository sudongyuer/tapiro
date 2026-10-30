import ExpoModulesCore
import MapKit
import UIKit

struct MapPointRecord: Record {
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
}

struct MapPinArt: Record {
  @Field var color: String = ""
  @Field var ink: String = ""
  @Field var symbol: String = ""
}

struct MapPinFan: Record {
  @Field var index: Int = 0
  @Field var of: Int = 1
}

struct MapPinRecord: Record {
  @Field var id: String = ""
  @Field var point: MapPointRecord = MapPointRecord()
  @Field var label: String = ""
  @Field var a11yLabel: String = ""
  @Field var art: MapPinArt = MapPinArt()
  @Field var fan: MapPinFan = MapPinFan()
}

final class BountyPinAnnotation: NSObject, MKAnnotation {
  @objc dynamic var coordinate: CLLocationCoordinate2D
  var pin: MapPinRecord

  init(pin: MapPinRecord) {
    self.pin = pin
    coordinate = CLLocationCoordinate2D(latitude: pin.point.latitude, longitude: pin.point.longitude)
  }
}

final class OriginAnnotation: NSObject, MKAnnotation {
  @objc dynamic var coordinate: CLLocationCoordinate2D
  let title: String?

  init(coordinate: CLLocationCoordinate2D, title: String) {
    self.coordinate = coordinate
    self.title = title
  }
}

@MainActor
final class BountyPinView: MKAnnotationView {
  static let reuseIdentifier = "BountyPin"

  private static let disc: CGFloat = 44
  private static let border: CGFloat = 3
  private static let farScale: CGFloat = 0.42
  private static let selectedScale: CGFloat = 1.12
  private static let fanRadius: CGFloat = 26
  private static let labelTilt: CGFloat = -4 * .pi / 180
  private static let labelOverlap: CGFloat = 6
  private static let labelPadding = CGSize(width: 7, height: 3)
  private static let labelMargin: CGFloat = 6

  private let content = UIView()
  private let discView = UIView()
  private let symbolView = UIImageView()
  private let labelCard = UIView()
  private let labelText = UILabel()

  private(set) var pinId = ""
  private var far = false
  private var chosen = false
  var onActivate: ((BountyPinView) -> Void)?

  override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
    super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
    canShowCallout = false
    displayPriority = .required
    collisionMode = .none
    clusteringIdentifier = nil

    discView.layer.borderWidth = Self.border
    discView.layer.borderColor = UIColor.white.cgColor
    discView.layer.cornerRadius = Self.disc / 2
    discView.layer.shadowColor = UIColor.black.cgColor
    discView.layer.shadowOpacity = 0.2
    discView.layer.shadowRadius = 5
    discView.layer.shadowOffset = CGSize(width: 0, height: 3)
    discView.layer.shadowPath = UIBezierPath(ovalIn: CGRect(x: 0, y: 0, width: Self.disc, height: Self.disc)).cgPath
    symbolView.contentMode = .center
    discView.addSubview(symbolView)

    labelCard.backgroundColor = .white
    labelCard.layer.cornerRadius = 7
    labelCard.layer.cornerCurve = .continuous
    labelCard.layer.shadowColor = UIColor.black.cgColor
    labelCard.layer.shadowOpacity = 0.16
    labelCard.layer.shadowRadius = 3
    labelCard.layer.shadowOffset = CGSize(width: 0, height: 1)
    labelText.font = UIFontMetrics(forTextStyle: .caption1)
      .scaledFont(for: .systemFont(ofSize: 12, weight: .bold))
    labelText.adjustsFontForContentSizeCategory = true
    labelCard.addSubview(labelText)

    content.addSubview(discView)
    content.addSubview(labelCard)
    addSubview(content)

    isAccessibilityElement = true
    accessibilityTraits = .button

    registerForTraitChanges([UITraitPreferredContentSizeCategory.self]) { (view: BountyPinView, _) in
      view.layoutPin()
    }
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  func configure(_ pin: MapPinRecord, far: Bool, selected: Bool) {
    pinId = pin.id
    discView.backgroundColor = UIColor(hex: pin.art.color)
    symbolView.image = UIImage(
      systemName: pin.art.symbol,
      withConfiguration: UIImage.SymbolConfiguration(pointSize: 18, weight: .semibold)
    )
    symbolView.tintColor = UIColor(hex: pin.art.ink)
    labelText.textColor = UIColor(hex: pin.art.ink)
    labelText.text = pin.label
    accessibilityLabel = pin.a11yLabel
    accessibilityIdentifier = "map-pin-\(pin.id)"
    layoutPin(fan: pin.fan)
    self.far = far
    chosen = selected
    zPriority = selected ? .max : .defaultUnselected
    applyLook()
  }

  private var fan = MapPinFan()

  private func layoutPin(fan: MapPinFan? = nil) {
    if let fan { self.fan = fan }
    let text = labelText.intrinsicContentSize
    let card = CGSize(
      width: ceil(text.width) + Self.labelPadding.width * 2,
      height: ceil(text.height) + Self.labelPadding.height * 2
    )
    let width = max(Self.disc, card.width) + Self.labelMargin * 2
    let height = Self.labelMargin + card.height - Self.labelOverlap + Self.disc
    let size = CGSize(width: width, height: height)

    content.transform = .identity
    labelCard.transform = .identity
    bounds = CGRect(origin: .zero, size: size)
    content.frame = bounds
    discView.frame = CGRect(x: (width - Self.disc) / 2, y: height - Self.disc, width: Self.disc, height: Self.disc)
    symbolView.frame = discView.bounds
    labelCard.frame = CGRect(x: (width - card.width) / 2, y: Self.labelMargin, width: card.width, height: card.height)
    labelText.frame = labelCard.bounds.insetBy(dx: Self.labelPadding.width, dy: Self.labelPadding.height)
    labelCard.layer.shadowPath = UIBezierPath(roundedRect: labelCard.bounds, cornerRadius: 7).cgPath
    labelCard.transform = CGAffineTransform(rotationAngle: Self.labelTilt)

    let ring = ringOffset(self.fan)
    centerOffset = CGPoint(x: ring.x, y: ring.y - (height - Self.disc) / 2)
    applyLook()
  }

  private func ringOffset(_ fan: MapPinFan) -> CGPoint {
    guard fan.of > 1 else { return .zero }
    let angle = 2 * CGFloat.pi * CGFloat(fan.index) / CGFloat(fan.of) - .pi / 2
    return CGPoint(x: Self.fanRadius * cos(angle), y: Self.fanRadius * sin(angle))
  }

  func setFar(_ value: Bool, animated: Bool) {
    guard value != far else { return }
    far = value
    animate(animated ? .zoom : nil)
  }

  func setChosen(_ value: Bool, animated: Bool) {
    guard value != chosen else { return }
    chosen = value
    zPriority = value ? .max : .defaultUnselected
    animate(animated ? .select : nil)
  }

  private enum Motion { case zoom, select }

  private func animate(_ motion: Motion?) {
    guard let motion, !UIAccessibility.isReduceMotionEnabled, window != nil else { return applyLook() }
    switch motion {
    case .zoom:
      UIView.animate(withDuration: 0.2, delay: 0, options: [.beginFromCurrentState, .allowUserInteraction]) {
        self.applyLook()
      }
    case .select:
      UIView.animate(
        springDuration: 0.35, bounce: 0.25, initialSpringVelocity: 0, delay: 0,
        options: [.beginFromCurrentState, .allowUserInteraction]
      ) {
        self.applyLook()
      }
    }
  }

  private func applyLook() {
    let scale = (far ? Self.farScale : 1) * (chosen ? Self.selectedScale : 1)
    let pivot = discView.center.y - bounds.midY
    content.transform = CGAffineTransform(translationX: 0, y: pivot).scaledBy(x: scale, y: scale)
      .translatedBy(x: 0, y: -pivot)
    labelCard.alpha = far ? 0 : 1
  }

  var topCenter: CGPoint {
    let frame = far ? discView.convert(discView.bounds, to: self) : content.frame
    return CGPoint(x: frame.midX, y: frame.minY)
  }

  override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
    guard far else { return super.point(inside: point, with: event) }
    let center = discView.convert(CGPoint(x: discView.bounds.midX, y: discView.bounds.midY), to: self)
    let half = Self.disc / 2
    return CGRect(x: center.x - half, y: center.y - half, width: Self.disc, height: Self.disc).contains(point)
  }

  override func accessibilityActivate() -> Bool {
    onActivate?(self)
    return true
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    onActivate = nil
    far = false
    chosen = false
  }
}

private extension UIColor {
  convenience init(hex: String) {
    var digits = hex.trimmingCharacters(in: .whitespaces)
    if digits.hasPrefix("#") { digits.removeFirst() }
    let value = UInt64(digits, radix: 16) ?? 0
    switch digits.count {
    case 8:
      self.init(
        red: CGFloat((value >> 24) & 0xFF) / 255, green: CGFloat((value >> 16) & 0xFF) / 255,
        blue: CGFloat((value >> 8) & 0xFF) / 255, alpha: CGFloat(value & 0xFF) / 255)
    case 6:
      self.init(
        red: CGFloat((value >> 16) & 0xFF) / 255, green: CGFloat((value >> 8) & 0xFF) / 255,
        blue: CGFloat(value & 0xFF) / 255, alpha: 1)
    default:
      self.init(white: 0.5, alpha: 1)
    }
  }
}
