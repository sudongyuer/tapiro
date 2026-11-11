import StoreKitTest
import XCTest

// No refund case: a refund made through SKTestSession never reaches the app (docs/plans/2026-11-11-iap-local.md,
// spike B).
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
    app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_MY"]
    app.launch()
    try openCoins()
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
    try openSheet()
    for coins in ["5", "11", "35"] {
      XCTAssertTrue(app.buttons["buy-coins-buy-\(coins)"].waitForExistence(timeout: 20), "pack \(coins) missing")
    }
    XCTAssertTrue(app.buttons["buy-coins-buy-35"].label.contains("29.90"), app.buttons["buy-coins-buy-35"].label)
  }

  func testEachPackCreditsOnce() throws {
    try openSheet()
    let start = try balance()
    var expected = start
    for coins in [5, 11, 35] {
      app.buttons["buy-coins-buy-\(coins)"].tap()
      try waitStatus(containing: "\(coins) coins added")
      expected += coins
      try waitBalance(expected)
    }
    XCTAssertEqual(session.allTransactions().count, 3)
  }

  func testAskToBuyArrivesThroughUpdates() throws {
    session.askToBuyEnabled = true
    try openSheet()
    let start = try balance()
    app.buttons["buy-coins-buy-11"].tap()
    try waitStatus(containing: "Waiting for approval")
    let id = try XCTUnwrap(session.allTransactions().first { $0.pendingAskToBuyConfirmation }?.identifier)
    try session.approveAskToBuyTransaction(identifier: id)
    try waitStatus(containing: "11 coins added")
    try waitBalance(start + 11)
  }

  func testCancelCreditsNothing() async throws {
    try await session.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)
    try openSheet()
    let start = try balance()
    app.buttons["buy-coins-buy-5"].tap()
    let busy = app.descendants(matching: .any)["buy-coins-busy-5"]
    XCTAssertTrue(busy.waitForExistence(timeout: 10), "the purchase never started")
    XCTAssertTrue(busy.waitForNonExistence(timeout: 30), "the cancelled purchase never returned")
    XCTAssertFalse(app.descendants(matching: .any)["buy-coins-status"].waitForExistence(timeout: 3))
    XCTAssertEqual(try balance(), start)
    try await session.setSimulatedError(nil, forAPI: .purchase)
  }

  func testUnfinishedPurchaseIsCreditedOnNextLaunch() throws {
    try openSheet()
    let start = try balance()
    app.buttons["Close"].tap()
    try openScene()
    let kept = app.buttons["Buy 5 without forwarding"]
    XCTAssertTrue(kept.waitForExistence(timeout: 20))
    kept.tap()
    XCTAssertTrue(line(containing: "purchase app.tapiro.coins.5 purchased").waitForExistence(timeout: 30))
    app.buttons["store-e2e-open-coins"].tap()
    try openSheet()
    RunLoop.current.run(until: Date().addingTimeInterval(5))
    XCTAssertEqual(try balance(), start, "the kept purchase was credited before the relaunch")
    app.terminate()
    app.launch()
    try openCoins()
    try openSheet()
    try waitBalance(start + 5)
  }

  private func openCoins() throws {
    try openScene()
    app.buttons["store-e2e-open-coins"].tap()
    XCTAssertTrue(app.buttons["coins-buy"].waitForExistence(timeout: 30), "the coins page has no 买貘币")
  }

  private func openScene() throws {
    app.open(URL(string: "tapiro://debug/store-e2e")!)
    let open = XCUIApplication(bundleIdentifier: "com.apple.springboard").buttons["Open"]
    if open.waitForExistence(timeout: 5) { open.tap() }
    let user = app.staticTexts["store-e2e-user"]
    XCTAssertTrue(user.waitForExistence(timeout: 60), "StoreKit scene did not open")
    if !user.label.hasPrefix("signed in") {
      app.buttons["Sign in as Xiaolin"].tap()
      XCTAssertTrue(waitLabel(user, prefix: "signed in", timeout: 20), "sign in failed")
    }
  }

  private func openSheet() throws {
    app.buttons["coins-buy"].tap()
    XCTAssertTrue(app.buttons["buy-coins-buy-5"].waitForExistence(timeout: 30), "the packs never loaded")
  }

  private func balance() throws -> Int {
    let text = app.staticTexts["buy-coins-balance"]
    XCTAssertTrue(text.waitForExistence(timeout: 20), "no balance line in the sheet")
    return try parse(text.label)
  }

  private func parse(_ label: String) throws -> Int {
    let digits = label.drop { !$0.isNumber && $0 != "-" }.prefix { $0.isNumber || $0 == "-" || $0 == "," }
    return try XCTUnwrap(Int(digits.replacingOccurrences(of: ",", with: "")), "unreadable balance: \(label)")
  }

  private func waitBalance(_ expected: Int) throws {
    let text = app.staticTexts["buy-coins-balance"]
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline {
      if text.exists, (try? parse(text.label)) == expected { return }
      RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    }
    XCTFail("balance never reached \(expected): \(text.exists ? text.label : "missing")")
  }

  private func waitStatus(containing text: String) throws {
    let status = app.descendants(matching: .any)["buy-coins-status"]
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline {
      if status.exists, status.label.contains(text) { return }
      RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    }
    XCTFail("status never read \(text): \(status.exists ? status.label : "missing")")
  }

  private func waitLabel(_ element: XCUIElement, prefix: String, timeout: TimeInterval) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      if element.label.hasPrefix(prefix) { return true }
      RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    }
    return false
  }

  private func line(containing text: String) -> XCUIElement {
    app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
  }
}
