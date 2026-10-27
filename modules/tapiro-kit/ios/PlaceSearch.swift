import MapKit

@MainActor
final class PlaceSearch {
  typealias Emit = ([String: Any]) -> Void
  typealias Reply = ([String: Any]) -> Void

  private static let malaysia = MKCoordinateRegion(
    center: CLLocationCoordinate2D(latitude: 4.1, longitude: 109.5),
    span: MKCoordinateSpan(latitudeDelta: 7.5, longitudeDelta: 20.5)
  )
  private static let radiusMeters = 5_000.0

  private var sessions: [String: Session] = [:]

  nonisolated init() {}

  func start(searchId: String, latitude: Double?, longitude: Double?, emit: @escaping Emit) {
    let region: MKCoordinateRegion
    if let latitude, let longitude, CLLocationCoordinate2DIsValid(CLLocationCoordinate2D(latitude: latitude, longitude: longitude)) {
      region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
        latitudinalMeters: Self.radiusMeters * 2,
        longitudinalMeters: Self.radiusMeters * 2
      )
    } else {
      region = Self.malaysia
    }
    sessions[searchId]?.cancel()
    sessions[searchId] = Session(searchId: searchId, region: region, emit: emit)
  }

  func update(searchId: String, requestId: String, query: String) {
    sessions[searchId]?.update(requestId: requestId, query: query)
  }

  func end(searchId: String) {
    sessions.removeValue(forKey: searchId)?.cancel()
  }

  func resolve(searchId: String, suggestionId: String, reply: @escaping Reply) {
    guard let completion = sessions[searchId]?.completion(for: suggestionId) else {
      reply(PlaceResult.notFound)
      return
    }
    let search = MKLocalSearch(request: MKLocalSearch.Request(completion: completion))
    sessions[searchId]?.track(search)
    search.start { response, error in
      if let error {
        reply(PlaceResult.from(error))
        return
      }
      guard let item = response?.mapItems.first else {
        reply(PlaceResult.notFound)
        return
      }
      reply(PlaceResult.ok(item, fallbackName: completion.title))
    }
  }

  func placeAt(latitude: Double, longitude: Double, reply: @escaping Reply) {
    guard let request = MKReverseGeocodingRequest(location: CLLocation(latitude: latitude, longitude: longitude)) else {
      reply(PlaceResult.notFound)
      return
    }
    request.getMapItems { items, error in
      _ = request
      if let error {
        reply(PlaceResult.from(error))
        return
      }
      guard let item = items?.first(where: { !($0.name ?? "").isEmpty }) else {
        reply(PlaceResult.notFound)
        return
      }
      reply(PlaceResult.ok(item, fallbackName: nil))
    }
  }
}

@MainActor
private final class Session: NSObject, MKLocalSearchCompleterDelegate {
  private static let keptResultSets = 4

  private let searchId: String
  private let emit: PlaceSearch.Emit
  private let completer = MKLocalSearchCompleter()
  private var requestId: String?
  private var resultSet = 0
  private var completions: [Int: [MKLocalSearchCompletion]] = [:]
  private var searches: [MKLocalSearch] = []

  init(searchId: String, region: MKCoordinateRegion, emit: @escaping PlaceSearch.Emit) {
    self.searchId = searchId
    self.emit = emit
    super.init()
    completer.resultTypes = [.pointOfInterest, .address]
    completer.region = region
    completer.delegate = self
  }

  func update(requestId: String, query: String) {
    self.requestId = requestId
    if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      completer.cancel()
      send(items: [])
    } else {
      completer.queryFragment = query
    }
  }

  // Suggestion ids carry the result set they came from: the completer can publish a newer set between the list
  // rendering and the tap, and an index alone would then resolve a different place.
  func completion(for suggestionId: String) -> MKLocalSearchCompletion? {
    let parts = suggestionId.split(separator: ".")
    guard parts.count == 2, let set = Int(parts[0]), let index = Int(parts[1]),
      let results = completions[set], results.indices.contains(index)
    else { return nil }
    return results[index]
  }

  func track(_ search: MKLocalSearch) {
    searches.removeAll { !$0.isSearching }
    searches.append(search)
  }

  func cancel() {
    completer.delegate = nil
    completer.cancel()
    searches.forEach { $0.cancel() }
    searches.removeAll()
  }

  nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    MainActor.assumeIsolated { send(items: completer.results) }
  }

  nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    MainActor.assumeIsolated {
      guard let requestId else { return }
      if PlaceResult.isNotFound(error) {
        send(items: [])
        return
      }
      emit(["searchId": searchId, "requestId": requestId, "status": "failed", "code": PlaceResult.code(for: error)])
    }
  }

  private func send(items: [MKLocalSearchCompletion]) {
    guard let requestId else { return }
    resultSet += 1
    completions[resultSet] = items
    completions.removeValue(forKey: resultSet - Self.keptResultSets)
    let set = resultSet
    emit([
      "searchId": searchId,
      "requestId": requestId,
      "status": "ok",
      "items": items.enumerated().map { index, item in
        ["id": "\(set).\(index)", "title": item.title, "subtitle": item.subtitle]
      },
    ])
  }
}

private enum PlaceResult {
  static let notFound: [String: Any] = ["status": "notFound"]

  static func ok(_ item: MKMapItem, fallbackName: String?) -> [String: Any] {
    guard let name = item.name ?? fallbackName, !name.isEmpty else { return notFound }
    let coordinate = item.location.coordinate
    let address = item.addressRepresentations?.fullAddress(includingRegion: false, singleLine: true)
      ?? item.address?.shortAddress
      ?? item.address?.fullAddress
    return [
      "status": "ok",
      "place": [
        "name": name,
        "latitude": coordinate.latitude,
        "longitude": coordinate.longitude,
        "address": address.map { $0 as Any } ?? NSNull(),
      ] as [String: Any],
    ]
  }

  static func from(_ error: Error) -> [String: Any] {
    if isNotFound(error) { return notFound }
    return ["status": "failed", "code": code(for: error)]
  }

  static func isNotFound(_ error: Error) -> Bool {
    (error as? MKError)?.code == .placemarkNotFound
  }

  static func code(for error: Error) -> String {
    if let mapKit = error as? MKError, [.serverFailure, .loadingThrottled].contains(mapKit.code) { return "network" }
    let nsError = error as NSError
    if nsError.domain == NSURLErrorDomain { return "network" }
    if let underlying = nsError.userInfo[NSUnderlyingErrorKey] as? NSError, underlying.domain == NSURLErrorDomain {
      return "network"
    }
    return "unknown"
  }
}
