import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

enum Pipeline {
  static let context = CIContext(options: [.cacheIntermediates: false])

  static func dilatedSticker(subject: CIImage, radius: CGFloat) -> CGImage? {
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

  static func contourSticker(subject: CIImage, radius: CGFloat) -> CGImage? {
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
    cg.setShadow(offset: CGSize(width: 0, height: -radius * 0.35), blur: radius, color: CGColor(gray: 0, alpha: 0.28))
    cg.setFillColor(CGColor(gray: 1, alpha: 1))
    cg.setStrokeColor(CGColor(gray: 1, alpha: 1))
    cg.setLineWidth(radius * 2)
    cg.setLineJoin(.round)
    cg.addPath(outline)
    cg.drawPath(using: .fillStroke)
    cg.restoreGState()
    cg.draw(subjectImage, in: CGRect(x: pad, y: pad, width: extent.width, height: extent.height))
    return cg.makeImage()
  }

}

func ms(_ s: DispatchTime) -> Double { Double(DispatchTime.now().uptimeNanoseconds - s.uptimeNanoseconds) / 1_000_000 }

let outDir = URL(fileURLWithPath: CommandLine.arguments[1])
for path in CommandLine.arguments.dropFirst(2) {
  let url = URL(fileURLWithPath: path)
  let name = url.deletingPathExtension().lastPathComponent
  let source = CGImageSourceCreateWithURL(url as CFURL, nil)!
  let cg = CGImageSourceCreateThumbnailAtIndex(source, 0, [
    kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceCreateThumbnailWithTransform: true,
    kCGImageSourceThumbnailMaxPixelSize: 1024,
  ] as CFDictionary)!
  for run in 0..<3 {
    let t0 = DispatchTime.now()
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    do { try handler.perform([request]) } catch { print(name, "vision error", error); break }
    guard let obs = request.results?.first, !obs.allInstances.isEmpty else { print(name, "noSubject"); break }
    let buffer = try! obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: true)
    let visionMs = ms(t0)
    let subject = CIImage(cvPixelBuffer: buffer)
    let radius = max(6, (max(subject.extent.width, subject.extent.height) * 0.035).rounded())
    for border in ["dilate", "contour"] {
      let t1 = DispatchTime.now()
      let image = border == "dilate" ? Pipeline.dilatedSticker(subject: subject, radius: radius) : Pipeline.contourSticker(subject: subject, radius: radius)
      let out = outDir.appendingPathComponent("\(name)-\(border).png")
      let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil)!
      CGImageDestinationAddImage(dest, image!, nil)
      CGImageDestinationFinalize(dest)
      let renderMs = ms(t1)
      let bytes = (try? FileManager.default.attributesOfItem(atPath: out.path)[.size] as? Int) ?? 0
      print(String(format: "%@ run%d %@ input %dx%d instances %d vision %.0f ms render+png %.0f ms out %dx%d %d KB", name, run, border, cg.width, cg.height, obs.allInstances.count, visionMs, renderMs, image!.width, image!.height, bytes / 1024))
    }
  }
}
