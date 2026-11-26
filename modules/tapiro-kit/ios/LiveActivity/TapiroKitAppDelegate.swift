import ExpoModulesCore
import UIKit

public class TapiroKitAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    MainActor.assumeIsolated { LiveActivityPush.shared.observe() }
    return true
  }
}
