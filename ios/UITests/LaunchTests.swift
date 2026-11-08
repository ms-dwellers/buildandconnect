import XCTest

final class LaunchTests: XCTestCase {
  @MainActor func testLaunchOffersRealNavigation() {
    let app = XCUIApplication()
    app.launchEnvironment["BUILD_CONNECT_TEST_API"] = "http://127.0.0.1:5199"
    app.launchEnvironment["BUILD_CONNECT_TEST_RESET_SESSION"] = "1"
    app.launch()
    XCTAssertTrue(app.buttons["welcome.signin"].waitForExistence(timeout: 15))
    XCTAssertFalse(app.textFields["auth.email"].exists)
    capture("Illustrated welcome", app: app)
    app.buttons["welcome.signin"].tap()
    XCTAssertTrue(app.textFields["auth.email"].waitForExistence(timeout: 5))
    capture("Expanded sign in - empty", app: app)
    app.buttons["Create an account"].tap()
    XCTAssertTrue(app.textFields["auth.name"].waitForExistence(timeout: 5))
    capture("Registration - empty", app: app)
    app.secureTextFields["auth.password"].tap()
    capture("Registration keyboard - empty", app: app)
    app.buttons["Close sign in"].tap()
    XCTAssertTrue(app.buttons["welcome.signin"].waitForExistence(timeout: 5))
    app.buttons["welcome.signin"].tap()
    app.buttons["welcome.explore"].tap()
    XCTAssertTrue(app.buttons["explore.results"].waitForExistence(timeout: 15))
    app.buttons["explore.results"].tap()
    XCTAssertTrue(app.textFields["explore.search"].waitForExistence(timeout: 5))
    capture("City ideas results", app: app)
  }

  @MainActor func testAuthenticationValidationAndPasswordVisibility() {
    let app = XCUIApplication()
    app.launchEnvironment["BUILD_CONNECT_TEST_API"] = "http://127.0.0.1:5199"
    app.launchEnvironment["BUILD_CONNECT_TEST_RESET_SESSION"] = "1"
    app.launch()
    XCTAssertTrue(app.buttons["welcome.signin"].waitForExistence(timeout: 15))
    app.buttons["welcome.signin"].tap()
    app.buttons["auth.submit"].tap()
    XCTAssertTrue(
      app.staticTexts["Enter an email address, like name@example.com."].waitForExistence(timeout: 5)
    )
    app.buttons["Show password"].tap()
    XCTAssertTrue(app.textFields["auth.password"].exists)
    app.buttons["Hide password"].tap()
    XCTAssertTrue(app.secureTextFields["auth.password"].exists)
  }

  @MainActor func testWelcomeAndAuthenticationAtLargestTextSize() {
    let app = XCUIApplication()
    app.launchArguments = [
      "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL",
    ]
    app.launchEnvironment["BUILD_CONNECT_TEST_API"] = "http://127.0.0.1:5199"
    app.launchEnvironment["BUILD_CONNECT_TEST_RESET_SESSION"] = "1"
    app.launch()
    let signIn = app.buttons["welcome.signin"]
    XCTAssertTrue(signIn.waitForExistence(timeout: 15))
    reveal(signIn, app: app)
    signIn.tap()
    let submit = app.buttons["auth.submit"]
    XCTAssertTrue(submit.waitForExistence(timeout: 5))
    reveal(submit, app: app)
    capture("Large text authentication - empty", app: app)
    let explore = app.buttons["welcome.explore"]
    reveal(explore, app: app)
    explore.tap()
    let results = app.buttons["explore.results"]
    XCTAssertTrue(results.waitForExistence(timeout: 15))
    XCTAssertTrue(results.isHittable)
    capture("Large text city ideas map", app: app)
  }

  @MainActor private func reveal(_ element: XCUIElement, app: XCUIApplication) {
    for _ in 0..<10 {
      if element.isHittable { return }
      app.swipeUp()
    }
    XCTAssertTrue(element.isHittable)
  }

  @MainActor private func capture(_ name: String, app: XCUIApplication) {
    let image = XCTAttachment(screenshot: app.screenshot())
    image.name = name
    image.lifetime = .keepAlways
    add(image)
  }
}
