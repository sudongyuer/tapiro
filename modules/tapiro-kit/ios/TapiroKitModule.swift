import ExpoModulesCore
import UIKit

public final class TapiroKitModule: Module {
  private let places = PlaceSearch()

  public func definition() -> ModuleDefinition {
    Name("TapiroKit")

    Events("onPlaceSuggestions")

    View(TitleHaloView.self) {}

    View(PinnedBarView.self)

    View(BountyMapView.self) {
      Events("onPinPress", "onMapPress", "onRegionChange", "onCameraChange", "onExpand")
      Prop("pins") { (view: BountyMapView, pins: [MapPinRecord]) in view.setPins(pins) }
      Prop("selectedId") { (view: BountyMapView, id: String?) in view.setSelectedId(id) }
      Prop("origin") { (view: BountyMapView, origin: MapOriginRecord?) in view.setOrigin(origin) }
      Prop("camera") { (view: BountyMapView, camera: MapCameraRecord) in view.setCamera(camera) }
      Prop("expandLabel") { (view: BountyMapView, label: String?) in view.setExpandLabel(label) }
      Prop("locateButton") { (view: BountyMapView, shown: Bool?) in view.setLocateButton(shown ?? false) }
    }

    // Errors become a null result so JS gets a typed outcome instead of an untyped exception.
    AsyncFunction("qrImageFile") { (payload: String, points: Int) -> String? in
      guard !payload.isEmpty, points > 0, points <= 1024 else { return nil }
      return try? QrImage.file(for: payload, points: points).absoluteString
    }

    Function("startPlaceSearch") { (latitude: Double?, longitude: Double?) -> String in
      let searchId = UUID().uuidString
      onMain { [weak self] places in
        places.start(searchId: searchId, latitude: latitude, longitude: longitude) { body in
          self?.sendEvent("onPlaceSuggestions", body)
        }
      }
      return searchId
    }

    Function("updatePlaceQuery") { (searchId: String, query: String) -> String in
      let requestId = UUID().uuidString
      onMain { places in places.update(searchId: searchId, requestId: requestId, query: query) }
      return requestId
    }

    Function("endPlaceSearch") { (searchId: String) in
      onMain { places in places.end(searchId: searchId) }
    }

    AsyncFunction("resolvePlace") { (searchId: String, suggestionId: String, promise: Promise) in
      MainActor.assumeIsolated {
        places.resolve(searchId: searchId, suggestionId: suggestionId) { promise.resolve($0) }
      }
    }.runOnQueue(.main)

    AsyncFunction("placeAt") { (latitude: Double, longitude: Double, promise: Promise) in
      MainActor.assumeIsolated {
        places.placeAt(latitude: latitude, longitude: longitude) { promise.resolve($0) }
      }
    }.runOnQueue(.main)

    AsyncFunction("flyToTab") { [weak self] (options: StickerFlightOptions, promise: Promise) in
      MainActor.assumeIsolated {
        guard let source = self?.appContext?.findView(withTag: options.viewTag, ofType: UIView.self) else {
          return promise.resolve(["landed": false])
        }
        let anchor = options.anchorTag == 0
          ? nil : self?.appContext?.findView(withTag: options.anchorTag, ofType: UIView.self)
        StickerFlight.fly(source: source, anchor: anchor, options: options) { promise.resolve(["landed": $0]) }
      }
    }.runOnQueue(.main)

  }

  // Sync functions run on the JS thread; ids are minted there so JS gets them synchronously, and the MapKit work is
  // queued FIFO on main so a query never overtakes the start of its own session.
  private func onMain(_ work: @escaping @MainActor (PlaceSearch) -> Void) {
    let places = places
    DispatchQueue.main.async { MainActor.assumeIsolated { work(places) } }
  }
}
