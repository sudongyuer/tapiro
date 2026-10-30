import ExpoModulesCore
import MapKit
import UIKit

struct MapOriginRecord: Record {
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
  @Field var kind: String = "me"
  @Field var title: String = ""
}

struct MapCameraRecord: Record {
  @Field var originKey: String = ""
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
  @Field var radiusM: Double = 2000
}

final class BountyMapView: ExpoView, MKMapViewDelegate, UIGestureRecognizerDelegate {
  private static let farRadiusM: Double = 3000

  let onPinPress = EventDispatcher()
  let onMapPress = EventDispatcher()
  let onRegionChange = EventDispatcher()

  private let map = MKMapView()
  private var annotations: [String: BountyPinAnnotation] = [:]
  private var originAnnotation: OriginAnnotation?
  private var selectedId: String?
  private var far = false
  private var appliedOriginKey: String?
  private var pendingCamera: MapCameraRecord?
  private weak var mapTap: UITapGestureRecognizer?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true

    let configuration = MKStandardMapConfiguration(elevationStyle: .flat, emphasisStyle: .muted)
    configuration.pointOfInterestFilter = .excludingAll
    map.preferredConfiguration = configuration
    map.showsCompass = false
    map.showsScale = false
    map.isPitchEnabled = false
    map.isRotateEnabled = false
    map.delegate = self
    map.register(BountyPinView.self, forAnnotationViewWithReuseIdentifier: BountyPinView.reuseIdentifier)
    map.register(
      MKMarkerAnnotationView.self,
      forAnnotationViewWithReuseIdentifier: MKMapViewDefaultAnnotationViewReuseIdentifier)
    addSubview(map)

    let tap = UITapGestureRecognizer(target: self, action: #selector(tapped(_:)))
    let pan = UIPanGestureRecognizer(target: self, action: #selector(moved(_:)))
    let pinch = UIPinchGestureRecognizer(target: self, action: #selector(moved(_:)))
    let doubleTap = UITapGestureRecognizer(target: self, action: #selector(moved(_:)))
    doubleTap.numberOfTapsRequired = 2
    mapTap = tap
    for recognizer in [tap, pan, pinch, doubleTap] {
      recognizer.delegate = self
      recognizer.cancelsTouchesInView = false
      map.addGestureRecognizer(recognizer)
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    map.frame = bounds
    if let camera = pendingCamera, bounds.width > 0, bounds.height > 0 {
      pendingCamera = nil
      move(to: camera, animated: appliedOriginKey != nil)
      appliedOriginKey = camera.originKey
    }
  }

  func setPins(_ pins: [MapPinRecord]) {
    let incoming = Dictionary(pins.map { ($0.id, $0) }, uniquingKeysWith: { _, last in last })
    let gone = annotations.filter { incoming[$0.key] == nil }
    map.removeAnnotations(Array(gone.values))
    gone.keys.forEach { annotations.removeValue(forKey: $0) }

    var added: [BountyPinAnnotation] = []
    for pin in pins {
      if let existing = annotations[pin.id] {
        existing.pin = pin
        existing.coordinate = CLLocationCoordinate2D(latitude: pin.point.latitude, longitude: pin.point.longitude)
        if let view = map.view(for: existing) as? BountyPinView {
          configure(view, for: existing)
        }
      } else {
        let annotation = BountyPinAnnotation(pin: pin)
        annotations[pin.id] = annotation
        added.append(annotation)
      }
    }
    map.addAnnotations(added)
  }

  func setSelectedId(_ id: String?) {
    let previous = selectedId
    selectedId = id
    for key in [previous, id].compactMap({ $0 }) {
      guard let annotation = annotations[key], let view = map.view(for: annotation) as? BountyPinView else {
        continue
      }
      view.setChosen(key == id, animated: true)
    }
  }

  func setOrigin(_ origin: MapOriginRecord?) {
    if let originAnnotation {
      map.removeAnnotation(originAnnotation)
      self.originAnnotation = nil
    }
    map.showsUserLocation = origin?.kind == "me"
    guard let origin, origin.kind == "place" else { return }
    let annotation = OriginAnnotation(
      coordinate: CLLocationCoordinate2D(latitude: origin.latitude, longitude: origin.longitude),
      title: origin.title)
    originAnnotation = annotation
    map.addAnnotation(annotation)
  }

  func setCamera(_ camera: MapCameraRecord) {
    guard camera.originKey != appliedOriginKey else { return }
    pendingCamera = camera
    setNeedsLayout()
  }

  private func move(to camera: MapCameraRecord, animated: Bool) {
    let diameter = max(camera.radiusM, 1) * 2
    let region = MKCoordinateRegion(
      center: CLLocationCoordinate2D(latitude: camera.latitude, longitude: camera.longitude),
      latitudinalMeters: diameter,
      longitudinalMeters: diameter)
    map.setRegion(map.regionThatFits(region), animated: animated)
    updateZoomLevel(animated: false)
  }

  private func configure(_ view: BountyPinView, for annotation: BountyPinAnnotation) {
    view.configure(annotation.pin, far: far, selected: annotation.pin.id == selectedId)
    view.onActivate = { [weak self] view in self?.report(view) }
  }

  private func report(_ view: BountyPinView) {
    let top = view.convert(view.topCenter, to: self)
    onPinPress(["id": view.pinId, "x": top.x, "y": top.y])
  }

  private func shortEdgeMeters() -> Double {
    let rect = map.visibleMapRect
    let width = MKMapPoint(x: rect.minX, y: rect.midY).distance(to: MKMapPoint(x: rect.maxX, y: rect.midY))
    let height = MKMapPoint(x: rect.midX, y: rect.minY).distance(to: MKMapPoint(x: rect.midX, y: rect.maxY))
    return min(width, height)
  }

  private func updateZoomLevel(animated: Bool) {
    guard bounds.width > 0 else { return }
    let next = shortEdgeMeters() / 2 > Self.farRadiusM
    guard next != far else { return }
    far = next
    for annotation in annotations.values {
      (map.view(for: annotation) as? BountyPinView)?.setFar(next, animated: animated)
    }
  }

  @objc private func tapped(_ recognizer: UITapGestureRecognizer) {
    guard recognizer.state == .ended else { return }
    onMapPress([:])
  }

  @objc private func moved(_ recognizer: UIGestureRecognizer) {
    let started = recognizer is UITapGestureRecognizer ? recognizer.state == .ended : recognizer.state == .began
    if started { onRegionChange([:]) }
  }

  func gestureRecognizer(_ recognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
    guard recognizer === mapTap else { return true }
    var view = touch.view
    while let current = view, current !== map {
      if current is MKAnnotationView { return false }
      view = current.superview
    }
    return true
  }

  func gestureRecognizer(
    _ recognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer
  ) -> Bool {
    true
  }

  func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
    if let pin = annotation as? BountyPinAnnotation {
      let view = mapView.dequeueReusableAnnotationView(
        withIdentifier: BountyPinView.reuseIdentifier, for: pin)
      guard let view = view as? BountyPinView else { return view }
      configure(view, for: pin)
      return view
    }
    if annotation is OriginAnnotation {
      let view = mapView.dequeueReusableAnnotationView(
        withIdentifier: MKMapViewDefaultAnnotationViewReuseIdentifier, for: annotation)
      if let marker = view as? MKMarkerAnnotationView {
        marker.glyphImage = UIImage(systemName: "mappin")
        marker.titleVisibility = .visible
        marker.displayPriority = .required
        marker.canShowCallout = false
        marker.zPriority = .min
      }
      return view
    }
    return nil
  }

  func mapView(_ mapView: MKMapView, didSelect annotation: MKAnnotation) {
    defer { mapView.deselectAnnotation(annotation, animated: false) }
    guard annotation is BountyPinAnnotation, let view = mapView.view(for: annotation) as? BountyPinView else {
      return
    }
    report(view)
  }

  func mapViewDidChangeVisibleRegion(_ mapView: MKMapView) {
    updateZoomLevel(animated: true)
  }

  func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
    updateZoomLevel(animated: true)
  }
}
