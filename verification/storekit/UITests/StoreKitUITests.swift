import StoreKitTest
import XCTest

// Runs against the Debug Tapiro.app that run.sh puts in the .xctestrun as UITargetAppPath, so SKTestSession
// configures StoreKit for app.tapiro. The app's StoreKit spike scene forwards each transaction to the local
// iap-verify and logs one line per step; the cases wait on those lines. No refund case: a refund made through
// SKTestSession never reaches the app (docs/plans/2026-11-11-iap-local.md, spike B).
@MainActor
final class StoreKitUITests: XCTestCase {
  private var session: SKTestSession!
  private var app: XCUIApplication!

  override func setUp() async throws {
    continueAfterFailure = false
    let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Tapiro", withExtension: "storekit"))
    session = try SKTestSession(contentsOf: url)
    session.resetToDefaultState()
    session.clearTransactions()
    session.disableDialogs = true
    app = XCUIApplication()
    app.launch()
    app.open(URL(string: "tapiro://debug/store-spike")!)
    let open = XCUIApplication(bundleIdentifier: "com.apple.springboard").buttons["Open"]
    if open.waitForExistence(timeout: 5) { open.tap() }
    let signIn = app.buttons["Sign in as Xiaolin"]
    XCTAssertTrue(signIn.waitForExistence(timeout: 60), "StoreKit spike scene did not open")
    signIn.tap()
    try wait(for: "signed in", timeout: 20)
  }

  override func tearDown() async throws {
    if let app {
      let shot = XCTAttachment(screenshot: app.screenshot())
      shot.name = name
      shot.lifetime = .keepAlways
      add(shot)
      app.terminate()
    }
    session?.resetToDefaultState()
  }

  func testCatalogFromConfiguration() throws {
    app.buttons["Load products"].tap()
    for pack in ["app.tapiro.coins.5", "app.tapiro.coins.11", "app.tapiro.coins.35"] {
      try wait(for: pack, timeout: 20)
    }
    try wait(for: "29.90", timeout: 1)
  }

  func testEachPackCreditsOnce() throws {
    for pack in ["5", "11", "35"] {
      app.buttons["Buy \(pack)"].tap()
      try wait(for: "forward app.tapiro.coins.\(pack) ", and: "\"status\":\"credited\"", timeout: 30)
    }
    XCTAssertEqual(session.allTransactions().count, 3)
  }

  func testAskToBuyArrivesThroughUpdates() throws {
    session.askToBuyEnabled = true
    app.buttons["Buy 11"].tap()
    try wait(for: "purchase app.tapiro.coins.11 pending", timeout: 30)
    let id = try XCTUnwrap(session.allTransactions().first { $0.pendingAskToBuyConfirmation }?.identifier)
    try session.approveAskToBuyTransaction(identifier: id)
    try wait(for: "tx updates", and: "app.tapiro.coins.11", timeout: 30)
    try wait(for: "forward app.tapiro.coins.11 ", and: "\"status\":\"credited\"", timeout: 30)
  }

  func testCancelCreditsNothing() async throws {
    try await session.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)
    app.buttons["Buy 5"].tap()
    try wait(for: "purchase app.tapiro.coins.5 cancelled", timeout: 30)
    XCTAssertFalse(exists("credited", timeout: 3))
    try await session.setSimulatedError(nil, forAPI: .purchase)
  }

  func testUnfinishedPurchaseIsCreditedOnNextLaunch() throws {
    app.buttons["Buy 5 without forwarding"].tap()
    try wait(for: "purchase app.tapiro.coins.5 purchased", timeout: 30)
    XCTAssertFalse(exists("forward app.tapiro.coins.5", timeout: 3))
    app.terminate()
    app.launch()
    app.open(URL(string: "tapiro://debug/store-spike")!)
    let open = XCUIApplication(bundleIdentifier: "com.apple.springboard").buttons["Open"]
    if open.waitForExistence(timeout: 5) { open.tap() }
    XCTAssertTrue(app.buttons["Forward unfinished"].waitForExistence(timeout: 60))
    if !exists("forward app.tapiro.coins.5", timeout: 10) {
      app.buttons["Forward unfinished"].tap()
    }
    try wait(for: "forward app.tapiro.coins.5 ", and: "\"status\":\"credited\"", timeout: 30)
  }

  private func line(_ text: String) -> XCUIElement {
    app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
  }

  private func exists(_ text: String, timeout: TimeInterval) -> Bool {
    line(text).waitForExistence(timeout: timeout)
  }

  private func wait(for text: String, timeout: TimeInterval) throws {
    XCTAssertTrue(exists(text, timeout: timeout), "No log line containing \(text)")
  }

  private func wait(for text: String, and other: String, timeout: TimeInterval) throws {
    let predicate = NSPredicate(format: "label CONTAINS %@ AND label CONTAINS %@", text, other)
    XCTAssertTrue(
      app.staticTexts.containing(predicate).firstMatch.waitForExistence(timeout: timeout),
      "No log line containing \(text) and \(other)"
    )
  }
}
