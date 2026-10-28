import Foundation
import ImageIO
import Vision

let arguments = CommandLine.arguments
guard arguments.count >= 2,
      let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: arguments[1]) as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    FileHandle.standardError.write("usage: ocr <png>\n".data(using: .utf8)!)
    exit(2)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "en-US"]
request.usesLanguageCorrection = false
try VNImageRequestHandler(cgImage: image).perform([request])

let width = Double(image.width)
let height = Double(image.height)
var lines: [[String: Any]] = []
for observation in request.results ?? [] {
    guard let best = observation.topCandidates(1).first else { continue }
    let box = observation.boundingBox
    lines.append([
        "text": best.string,
        "x": box.minX * width,
        "y": (1 - box.maxY) * height,
        "width": box.width * width,
        "height": box.height * height,
    ])
}
let data = try JSONSerialization.data(withJSONObject: lines)
FileHandle.standardOutput.write(data)
