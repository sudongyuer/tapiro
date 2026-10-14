import ExpoModulesCore

public final class TapiroKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TapiroKit")

    View(TitleHaloView.self) {}
  }
}
