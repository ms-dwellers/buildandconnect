import XCTest

final class MapFlowTests: XCTestCase {
  @MainActor func testLiveMapSelectsProjectIn3DAndReturnsToCityOverview() async throws {
    struct Context: Decodable { let opportunityTitle: String }
    let context: Context
    do {
      var request = URLRequest(url: URL(string: "http://127.0.0.1:5199/__test/context")!)
      request.timeoutInterval = 2
      let (data, _) = try await URLSession.shared.data(for: request)
      context = try JSONDecoder().decode(Context.self, from: data)
    } catch {
      throw XCTSkip("Start the isolated native verification API for the live map walkthrough.")
    }
    let app = XCUIApplication()
    app.launchEnvironment["BUILD_CONNECT_TEST_API"] = "http://127.0.0.1:5199"
    app.launchEnvironment["BUILD_CONNECT_TEST_RESET_SESSION"] = "1"
    app.launch()
    XCTAssertTrue(app.buttons["welcome.signin"].waitForExistence(timeout: 15))
    app.buttons["welcome.signin"].tap()
    app.buttons["welcome.explore"].tap()
    if app.staticTexts["The live map is not configured. Project lists remain available."].exists {
      throw XCTSkip(
        "Configure a native-compatible Mapbox public token to verify live map rendering.")
    }
    XCTAssertTrue(app.staticTexts["City overview"].waitForExistence(timeout: 25))
    app.buttons["explore.results"].tap()
    let title = app.staticTexts[context.opportunityTitle].firstMatch
    XCTAssertTrue(title.waitForExistence(timeout: 10))
    for _ in 0..<8 {
      if title.isHittable { break }
      app.swipeUp()
    }
    title.tap()
    XCTAssertTrue(app.buttons["Back to results"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["Sign in to respond"].isHittable)
    let detail = XCTAttachment(screenshot: app.screenshot())
    detail.name = "City idea with persistent action"
    detail.lifetime = .keepAlways
    add(detail)
    let done = app.buttons["Done"].firstMatch
    XCTAssertTrue(done.waitForExistence(timeout: 5))
    done.tap()
    XCTAssertTrue(app.staticTexts["3D view"].waitForExistence(timeout: 10))
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "Calgary native 3D map"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    app.buttons["All Calgary"].tap()
    XCTAssertTrue(app.staticTexts["City overview"].waitForExistence(timeout: 10))
    app.buttons["explore.results"].tap()
    XCTAssertTrue(title.waitForExistence(timeout: 5))
    title.tap()
    app.buttons["Sign in to respond"].tap()
    XCTAssertTrue(app.textFields["auth.email"].waitForExistence(timeout: 5))
    app.buttons["Close sign in"].tap()
    XCTAssertTrue(app.buttons["explore.results"].waitForExistence(timeout: 5))
  }
}
