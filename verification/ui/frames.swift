import AVFoundation
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers

let arguments = CommandLine.arguments
guard arguments.count == 4, let minGap = Double(arguments[3]) else {
    FileHandle.standardError.write("usage: frames <video> <out-dir> <min-gap-seconds>\n".data(using: .utf8)!)
    exit(2)
}
let asset = AVURLAsset(url: URL(fileURLWithPath: arguments[1]))
let outDir = URL(fileURLWithPath: arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let semaphore = DispatchSemaphore(value: 0)
var loaded: [AVAssetTrack] = []
var loadError: Error?
Task {
    do { loaded = try await asset.loadTracks(withMediaType: .video) } catch { loadError = error }
    semaphore.signal()
}
semaphore.wait()
guard let track = loaded.first else {
    FileHandle.standardError.write("no video track: \(String(describing: loadError))\n".data(using: .utf8)!)
    exit(1)
}

let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(
    track: track,
    outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
)
reader.add(output)
reader.startReading()

let context = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
var written: [[String: Any]] = []
var last = -Double.infinity
while let sample = output.copyNextSampleBuffer() {
    let seconds = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample))
    guard seconds - last >= minGap, let buffer = CMSampleBufferGetImageBuffer(sample),
          let image = context.createCGImage(
              CIImage(cvPixelBuffer: buffer), from: CIImage(cvPixelBuffer: buffer).extent, format: .RGBA8, colorSpace: srgb)
    else { continue }
    let url = outDir.appendingPathComponent(String(format: "frame-%04d.png", written.count))
    guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
    else { exit(1) }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { exit(1) }
    written.append(["path": url.path, "t": seconds])
    last = seconds
}
guard reader.status == .completed else {
    FileHandle.standardError.write("reader ended with \(reader.status.rawValue): \(String(describing: reader.error))\n".data(using: .utf8)!)
    exit(1)
}
FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: written))
