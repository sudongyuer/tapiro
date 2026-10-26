import ExpoModulesCore

public final class TapiroKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TapiroKit")

    View(TitleHaloView.self) {}

    // Errors become a null result so JS gets a typed outcome instead of an untyped exception.
    AsyncFunction("qrImageFile") { (payload: String, points: Int) -> String? in
      guard !payload.isEmpty, points > 0, points <= 1024 else { return nil }
      return try? QrImage.file(for: payload, points: points).absoluteString
    }
  }
}
