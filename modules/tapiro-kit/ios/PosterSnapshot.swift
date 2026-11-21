import UIKit

@MainActor
enum PosterSnapshot {
  static let scale: CGFloat = 3

  static func file(of view: UIView) -> [String: Any] {
    let size = view.bounds.size
    guard size.width > 0, size.height > 0, view.window != nil else { return failed("notShown") }
    let format = UIGraphicsImageRendererFormat()
    format.scale = scale
    format.opaque = true
    let image = UIGraphicsImageRenderer(size: size, format: format).image { context in
      if !view.drawHierarchy(in: view.bounds, afterScreenUpdates: true) {
        view.layer.render(in: context.cgContext)
      }
    }
    guard let data = image.pngData() else { return failed("encode") }
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("poster-\(UUID().uuidString).png")
    do {
      try data.write(to: url, options: .atomic)
    } catch {
      return failed("write")
    }
    return [
      "status": "ok",
      "uri": url.absoluteString,
      "width": Int(size.width * scale),
      "height": Int(size.height * scale),
    ]
  }

  private static func failed(_ code: String) -> [String: Any] {
    ["status": "failed", "code": code]
  }
}
