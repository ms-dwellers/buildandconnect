import XCTest

final class LaunchTests: XCTestCase {
  @MainActor func testLaunchOffersRealNavigation() {
    let app = XCUIApplication()
    app.launchEnvironment["BUILD_CONNECT_TEST_API"] = "http://127.0.0.1:5199"
    app.launchEnvironment["BUILD_CONNECT_TEST_RESET_SESSION"] = "1"
    app.launch()
    XCTAssertTrue(app.buttons["Find a project"].waitForExistence(timeout: 15))
    app.buttons["Find a project"].tap()
    XCTAssertTrue(app.navigationBars["Explore"].waitForExistence(timeout: 5))
  }
}
