import CoreImage
import CoreImage.CIFilterBuiltins
import CoreML
import ExpoModulesCore
import UIKit
import Vision

struct PhotoStickerOptions: Record {
  @Field var uri: String = ""
  @Field var border: String = "dilate"
  @Field var maxSide: Int = 1024
  @Field var cpuOnly: Bool = false
}

enum PhotoSticker {
  private static let context = CIContext(options: [.cacheIntermediates: false])

  static func make(_ options: PhotoStickerOptions) -> [String: Any] {
    let started = DispatchTime.now()
    guard let url = URL(string: options.uri), let image = UIImage(contentsOfFile: url.path) else {
      return failure("decode", "cannot read \(options.uri)")
    }
    guard let source = downscaled(image, maxSide: CGFloat(options.maxSide)) else {
      return failure("decode", "cannot draw source")
    }

    let request = VNGenerateForegroundInstanceMaskRequest()
    if options.cpuOnly, let cpu = MLComputeDevice.allComputeDevices.first(where: { device in
      if case .cpu = device { return true }
      return false
    }) {
      request.setComputeDevice(cpu, for: .main)
    }
    let handler = VNImageRequestHandler(cgImage: source, options: [:])
    let visionStarted = DispatchTime.now()
    do {
      try handler.perform([request])
    } catch {
      return failure("vision", String(describing: error))
    }
    guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
      return failure("noSubject", "no foreground instance")
    }
    let subjectBuffer: CVPixelBuffer
    do {
      subjectBuffer = try observation.generateMaskedImage(
        ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: true)
    } catch {
      return failure("vision", String(describing: error))
    }
    let visionMs = elapsedMs(since: visionStarted)

    let subject = CIImage(cvPixelBuffer: subjectBuffer)
    let radius = max(6, (max(subject.extent.width, subject.extent.height) * 0.035).rounded())
    let rendered: CGImage?
    switch options.border {
    case "contour": rendered = contourSticker(subject: subject, radius: radius)
    default: rendered = dilatedSticker(subject: subject, radius: radius)
    }
    guard let cgImage = rendered, let png = UIImage(cgImage: cgImage).pngData() else {
      return failure("render", "cannot render sticker")
    }
    let out = FileManager.default.temporaryDirectory
      .appendingPathComponent("sticker-\(UUID().uuidString.prefix(8))-\(options.border).png")
    do {
      try png.write(to: out, options: .atomic)
    } catch {
      return failure("write", String(describing: error))
    }
    return [
      "status": "ok",
      "uri": out.absoluteString,
      "width": cgImage.width,
      "height": cgImage.height,
      "bytes": png.count,
      "instances": observation.allInstances.count,
      "visionMs": visionMs,
      "totalMs": elapsedMs(since: started),
      "inputWidth": source.width,
      "inputHeight": source.height,
    ]
  }

  private static func dilatedSticker(subject: CIImage, radius: CGFloat) -> CGImage? {
    let pad = radius * 3
    let alpha = subject.applyingFilter(
      "CIColorMatrix",
      parameters: [
        "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 1),
        "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 1),
        "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 1),
        "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1),
      ])
    let padded = alpha.composited(over: CIImage(color: .clear).cropped(to: subject.extent.insetBy(dx: -pad, dy: -pad)))
    // Premultiplied white: with R = G = B = A the dilated alpha mask is already the white die-cut layer.
    let border = padded
      .applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: radius])
      .applyingGaussianBlur(sigma: 1.2)
    let shadow = border
      .applyingFilter(
        "CIColorMatrix",
        parameters: [
          "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
          "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
          "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0),
          "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0.28),
        ]
      )
      .applyingGaussianBlur(sigma: radius * 0.5)
      .transformed(by: CGAffineTransform(translationX: 0, y: -radius * 0.35))
    let canvas = subject.extent.insetBy(dx: -pad, dy: -pad)
    let composed = subject.composited(over: border).composited(over: shadow).cropped(to: canvas)
    return context.createCGImage(composed, from: canvas, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB))
  }

  private static func contourSticker(subject: CIImage, radius: CGFloat) -> CGImage? {
    let extent = subject.extent
    let maskImage = subject.applyingFilter(
      "CIColorMatrix",
      parameters: [
        "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 1),
        "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 1),
        "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 1),
        "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 1),
      ])
    guard let mask = context.createCGImage(maskImage, from: extent),
      let subjectImage = context.createCGImage(subject, from: extent)
    else { return nil }

    let contours = VNDetectContoursRequest()
    contours.detectsDarkOnLight = false
    contours.maximumImageDimension = 512
    do {
      try VNImageRequestHandler(cgImage: mask, options: [:]).perform([contours])
    } catch {
      return nil
    }
    guard let observation = contours.results?.first else { return nil }

    let pad = radius * 3
    let width = Int(extent.width + pad * 2)
    let height = Int(extent.height + pad * 2)
    guard
      let cg = CGContext(
        data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return nil }
    var transform = CGAffineTransform(translationX: pad, y: pad).scaledBy(x: extent.width, y: extent.height)
    let outline = CGMutablePath()
    for contour in observation.topLevelContours {
      if let path = contour.normalizedPath.copy(using: &transform) { outline.addPath(path) }
    }
    cg.saveGState()
    cg.setShadow(offset: CGSize(width: 0, height: -radius * 0.35), blur: radius, color: UIColor(white: 0, alpha: 0.28).cgColor)
    cg.setFillColor(UIColor.white.cgColor)
    cg.setStrokeColor(UIColor.white.cgColor)
    cg.setLineWidth(radius * 2)
    cg.setLineJoin(.round)
    cg.addPath(outline)
    cg.drawPath(using: .fillStroke)
    cg.restoreGState()
    cg.draw(subjectImage, in: CGRect(x: pad, y: pad, width: extent.width, height: extent.height))
    return cg.makeImage()
  }

  private static func downscaled(_ image: UIImage, maxSide: CGFloat) -> CGImage? {
    let scale = min(1, maxSide / max(image.size.width, image.size.height))
    let size = CGSize(width: (image.size.width * scale).rounded(), height: (image.size.height * scale).rounded())
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: size))
    }.cgImage
  }

  private static func elapsedMs(since start: DispatchTime) -> Double {
    Double(DispatchTime.now().uptimeNanoseconds - start.uptimeNanoseconds) / 1_000_000
  }

  private static func failure(_ code: String, _ message: String) -> [String: Any] {
    ["status": "failed", "code": code, "message": message]
  }
}
