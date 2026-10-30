import UIKit

@MainActor
enum HandArtImages {
  private static let bundle: Bundle? = Bundle(for: BountyPinView.self)
    .url(forResource: "TapiroKitHandArt", withExtension: "bundle")
    .flatMap(Bundle.init(url:))
  private static var cache: [String: UIImage] = [:]

  static func image(_ id: String, side: CGFloat) -> UIImage? {
    guard !id.isEmpty else { return nil }
    if let cached = cache[id] { return cached }
    guard let full = UIImage(named: "hand-art-\(id)", in: bundle, with: nil) else { return nil }
    let pixels = side * UIScreen.main.scale
    let small = full.preparingThumbnail(of: CGSize(width: pixels, height: pixels)) ?? full
    cache[id] = small
    return small
  }
}
