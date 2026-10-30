import ImagePlayground
import UIKit

enum ImagePlaygroundProbe {
  static func run(prompt: String, style: String, imageUri: String?) async -> [String: Any] {
    let started = DispatchTime.now()
    let creator: ImageCreator
    do {
      creator = try await ImageCreator()
    } catch {
      return failure("init", error, started)
    }
    let styles = creator.availableStyles.map(\.id)
    let wanted: ImagePlaygroundStyle =
      switch style {
      case "animation": .animation
      case "sketch": .sketch
      default: .illustration
      }
    guard creator.availableStyles.contains(where: { $0.id == wanted.id }) else {
      return ["status": "failed", "code": "styleUnavailable", "styles": styles, "ms": elapsedMs(since: started)]
    }
    var concepts: [ImagePlaygroundConcept] = [.text(prompt)]
    if let imageUri, let url = URL(string: imageUri), let concept = ImagePlaygroundConcept.image(url) {
      concepts.append(concept)
    }
    do {
      var out: [String] = []
      for try await created in creator.images(for: concepts, style: wanted, limit: 1) {
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("playground-\(UUID().uuidString.prefix(8)).png")
        if let png = UIImage(cgImage: created.cgImage).pngData() {
          try png.write(to: file, options: .atomic)
          out.append(file.absoluteString)
        }
      }
      return ["status": "ok", "uris": out, "styles": styles, "ms": elapsedMs(since: started)]
    } catch {
      var body = failure("images", error, started)
      body["styles"] = styles
      return body
    }
  }

  private static func failure(_ stage: String, _ error: Error, _ started: DispatchTime) -> [String: Any] {
    ["status": "failed", "code": stage, "message": String(describing: error), "ms": elapsedMs(since: started)]
  }

  private static func elapsedMs(since start: DispatchTime) -> Double {
    Double(DispatchTime.now().uptimeNanoseconds - start.uptimeNanoseconds) / 1_000_000
  }
}
