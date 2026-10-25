import CoreImage
import CoreImage.CIFilterBuiltins
import CryptoKit
import UIKit

enum QrImage {
  static func file(for payload: String, points: Int) throws -> URL {
    let digest = SHA256.hash(data: Data(payload.utf8)).map { String(format: "%02x", $0) }.joined()
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("qr-\(digest.prefix(24))-\(points).png")
    if FileManager.default.fileExists(atPath: url.path) { return url }

    let filter = CIFilter.qrCodeGenerator()
    filter.message = Data(payload.utf8)
    filter.correctionLevel = "M"
    guard let output = filter.outputImage else { throw QrImageError.encodeFailed }

    let quietZone = 4.0
    let modules = output.extent.width + quietZone * 2
    let scale = (CGFloat(points) * 3 / modules).rounded(.down)
    let scaled = output.transformed(by: CGAffineTransform(scaleX: max(scale, 1), y: max(scale, 1)))
    guard let cgImage = CIContext().createCGImage(scaled, from: scaled.extent) else {
      throw QrImageError.encodeFailed
    }

    let side = scaled.extent.width + quietZone * 2 * max(scale, 1)
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    let image = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format).image { context in
      UIColor.white.setFill()
      context.fill(CGRect(x: 0, y: 0, width: side, height: side))
      context.cgContext.interpolationQuality = .none
      let inset = (side - scaled.extent.width) / 2
      UIImage(cgImage: cgImage).draw(in: CGRect(x: inset, y: inset, width: scaled.extent.width, height: scaled.extent.height))
    }
    guard let data = image.pngData() else { throw QrImageError.encodeFailed }
    try data.write(to: url, options: .atomic)
    return url
  }
}

enum QrImageError: Error {
  case encodeFailed
}
