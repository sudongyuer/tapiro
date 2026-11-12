import StoreKitTest
import XCTest

// No refund case: a refund made through SKTestSession never reaches the app (docs/plans/2026-11-11-iap-local.md,
// spike B).
@MainActor
final class StoreKitUITests: XCTestCase {
  private var session: SKTestSession!
  private var app: XCUIApplication!

  // Synchronous on purpose: a failed assertion with continueAfterFailure = false runs tear-down from inside the
  // interrupted setUp on the main thread, and XCTest then waits forever for an async @MainActor tearDown that can
  // never get the main actor (sampled 2026-11-12; the cause of the 3 h hang).
  // On a fresh install SKTestSession's catalog reaches the app only for sessions made after the app first ran, so
  // the first case read an empty shop even across relaunches; one launch before any session fixes it (2026-11-12).
  override class func setUp() {
    super.setUp()
    MainActor.assumeIsolated {
      let app = XCUIApplication()
      app.launch()
      app.terminate()
    }
  }

  override func setUpWithError() throws {
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

  override func tearDownWithError() throws {
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
    // A simulated cancel returns before one accessibility snapshot can see the spinner, so the case proves the
    // outcome (no transaction, no credit) and that the same button then buys exactly once.
    app.buttons["buy-coins-buy-5"].tap()
    XCTAssertFalse(app.descendants(matching: .any)["buy-coins-status"].waitForExistence(timeout: 5))
    XCTAssertTrue(session.allTransactions().isEmpty, "a cancelled purchase left a transaction")
    XCTAssertEqual(try balance(), start)
    try await session.setSimulatedError(nil, forAPI: .purchase)
    // Clearing the simulated error can lag (1 of 4 runs cancelled the next tap too); tap again only while StoreKit
    // has recorded nothing, so a second purchase can never be made.
    let status = app.descendants(matching: .any)["buy-coins-status"]
    for _ in 0..<3 where session.allTransactions().isEmpty {
      app.buttons["buy-coins-buy-5"].tap()
      if status.waitForExistence(timeout: 10) { break }
    }
    try waitStatus(containing: "5 coins added")
    try waitBalance(start + 5)
    XCTAssertEqual(session.allTransactions().count, 1, "the cancelled tap also bought")
  }

  func testUnfinishedPurchaseIsCreditedOnNextLaunch() throws {
    try openSheet()
    let start = try balance()
    app.buttons["Close"].tap()
    try openScene()
    app.buttons["store-e2e-buy-kept"].tap()
    let result = app.staticTexts["store-e2e-line"]
    XCTAssertTrue(waitLabel(result, timeout: 40) { $0.hasPrefix("purchase") }, "the kept purchase never returned")
    XCTAssertEqual(result.label, "purchase app.tapiro.coins.5 purchased, kept unfinished")
    XCTAssertEqual(session.allTransactions().count, 1)
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
    XCTAssertTrue(waitLabel(user, timeout: 20) { $0 != "checking" }, "the scene never read the session")
    if !user.label.hasPrefix("signed in") {
      app.buttons["store-e2e-sign-in"].tap()
      XCTAssertTrue(
        waitLabel(user, timeout: 20) { $0.hasPrefix("signed in") },
        "sign in failed: \(app.staticTexts["store-e2e-line"].label)")
    }
  }

  private func openSheet() throws {
    app.buttons["coins-buy"].tap()
    let pack = app.buttons["buy-coins-buy-5"]
    let empty = app.descendants(matching: .any)["buy-coins-empty"]
    let failed = app.descendants(matching: .any)["buy-coins-failed"]
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline, !pack.exists, !empty.exists, !failed.exists {
      RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    }
    XCTAssertFalse(empty.exists, "StoreKit returned no products")
    XCTAssertFalse(failed.exists, "the packs failed to load")
    XCTAssertTrue(pack.exists, "the packs never loaded")
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

  private func waitLabel(_ element: XCUIElement, timeout: TimeInterval, until done: (String) -> Bool) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      if element.exists, done(element.label) { return true }
      RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    }
    return false
  }
}
