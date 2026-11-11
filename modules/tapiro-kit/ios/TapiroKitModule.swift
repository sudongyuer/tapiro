import ExpoModulesCore
import UIKit

public final class TapiroKitModule: Module {
  private let places = PlaceSearch()
  private let store = Store()

  public func definition() -> ModuleDefinition {
    Name("TapiroKit")

    Events("onPlaceSuggestions", "onStoreTransaction")

    View(TitleHaloView.self) {}

    AsyncFunction("liveActivityStart") { (kind: String, link: String?, state: LiveActivityStateRecord) -> [String: Any] in
      MainActor.assumeIsolated { LiveActivities.start(kind: kind, link: link, state: state) }
    }.runOnQueue(.main)

    AsyncFunction("liveActivityUpdate") { (id: String, state: LiveActivityStateRecord) async -> [String: Any] in
      await LiveActivities.update(id: id, state: state)
    }

    AsyncFunction("liveActivityEnd") { (id: String, state: LiveActivityStateRecord?, dismissAfterSeconds: Double) async -> [String: Any] in
      await LiveActivities.end(id: id, state: state, dismissAfterSeconds: dismissAfterSeconds)
    }

    AsyncFunction("liveActivityEnabled") { () -> Bool in
      MainActor.assumeIsolated { LiveActivities.enabled() }
    }.runOnQueue(.main)

    AsyncFunction("liveActivityList") { () -> [[String: Any]] in
      MainActor.assumeIsolated { LiveActivities.list() }
    }.runOnQueue(.main)

    AsyncFunction("storeProducts") { (ids: [String]) async -> [String: Any] in
      await self.store.products(ids: ids)
    }

    AsyncFunction("storePurchase") { (productId: String, accountToken: String) async -> [String: Any] in
      await self.store.purchase(productId: productId, accountToken: accountToken)
    }

    AsyncFunction("storeUnfinished") { () async -> [[String: Any]] in
      await self.store.unfinished()
    }

    AsyncFunction("storeRevoked") { () async -> [[String: Any]] in
      await self.store.revoked()
    }

    AsyncFunction("storeFinish") { (transactionId: String) async -> Bool in
      await self.store.finish(transactionId: transactionId)
    }

    AsyncFunction("storeStartUpdates") { [weak self] () async in
      guard let self else { return }
      await self.store.startUpdates { [weak self] body in self?.sendEvent("onStoreTransaction", body) }
    }

    AsyncFunction("storeStopUpdates") { () async in
      await self.store.stopUpdates()
    }

    View(PinnedBarView.self)

    View(ContextMenuView.self) {
      Events("onAction")
      Prop("actions") { (view: ContextMenuView, actions: [ContextMenuActionRecord]) in view.setActions(actions) }
      Prop("cornerRadius") { (view: ContextMenuView, radius: Double?) in view.setCornerRadius(radius ?? 0) }
    }

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

    // Forced, on every window: a polite resign can be refused, and a SwiftUI field resigned later, while React removes
    // its Form rows, re-enters the list's batch update and trips UICollectionView's first-responder assertion.
    // Resolving on the next main turn lets SwiftUI apply the focus change before JS mutates the tree.
    AsyncFunction("resignFocus") { (promise: Promise) in
      MainActor.assumeIsolated {
        for scene in UIApplication.shared.connectedScenes {
          (scene as? UIWindowScene)?.windows.forEach { $0.endEditing(true) }
        }
        DispatchQueue.main.async { promise.resolve() }
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
