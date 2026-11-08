import XCTest

final class OnboardingTests: XCTestCase {
  @MainActor func testNewDeveloperCreatesProfileAndDefersPrivateArea() async throws {
    continueAfterFailure = false
    var request = URLRequest(url: URL(string: "http://127.0.0.1:5199/__test/context")!)
    request.timeoutInterval = 2
    do {
      let (_, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200 else {
        throw URLError(.badServerResponse)
      }
    } catch { throw XCTSkip("Start the isolated native verification API for onboarding.") }

    let app = XCUIApplication()
    app.launchEnvironment["BUILD_CONNECT_TEST_API"] = "http://127.0.0.1:5199"
    app.launchEnvironment["BUILD_CONNECT_TEST_RESET_SESSION"] = "1"
    app.launch()
    XCTAssertTrue(app.buttons["welcome.signin"].waitForExistence(timeout: 15))
    app.buttons["welcome.signin"].tap()
    app.buttons["Create an account"].tap()
    let name = app.textFields["auth.name"]
    XCTAssertTrue(name.waitForExistence(timeout: 5))
    name.tap()
    name.typeText("City builder")
    let email = app.textFields["auth.email"]
    email.tap()
    email.typeText("builder-\(UUID().uuidString.lowercased())@example.test")
    let password = app.secureTextFields["auth.password"]
    password.tap()
    password.typeText(UUID().uuidString + "\n")
    guard app.buttons["role.developer"].waitForExistence(timeout: 15) else {
      let messages = app.staticTexts.allElementsBoundByIndex.map(\.label).filter {
        $0.hasPrefix("Enter ") || $0.hasPrefix("Use a password") || $0.hasPrefix("Unable ")
      }
      XCTFail("Registration did not reach role selection. \(messages.joined(separator: " "))")
      return
    }
    capture("Choose a role", app: app)
    app.buttons["role.developer"].tap()
    reveal(app.buttons["role.continue"], in: app)
    app.buttons["role.continue"].tap()
    let bio = app.descendants(matching: .any).matching(identifier: "onboarding.bio").firstMatch
    XCTAssertTrue(bio.waitForExistence(timeout: 15))
    capture("Developer onboarding", app: app)
    bio.tap()
    bio.typeText("I build accessible community websites with React and TypeScript.")
    continueSetup(in: app)
    let skill = app.textFields["onboarding.skill.0"]
    XCTAssertTrue(skill.waitForExistence(timeout: 5))
    skill.tap()
    skill.typeText("react")
    continueSetup(in: app)
    app.scrollViews.firstMatch.swipeUp()
    let consent = app.switches["Allow AI analysis for this save"].switches.firstMatch
    reveal(consent, in: app)
    capture("Developer preferences", app: app)
    consent.tap()
    let allowed = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "value == '1'"), object: consent)
    XCTAssertEqual(XCTWaiter.wait(for: [allowed], timeout: 5), .completed)
    continueSetup(in: app)
    let skipArea = app.buttons["Explore without an area"]
    XCTAssertTrue(skipArea.waitForExistence(timeout: 15))
    reveal(skipArea, in: app)
    skipArea.tap()
    XCTAssertTrue(app.tabBars.buttons["Profile"].waitForExistence(timeout: 10))
    app.tabBars.buttons["Profile"].tap()
    XCTAssertTrue(app.staticTexts["City builder"].waitForExistence(timeout: 10))
    XCTAssertTrue(app.buttons["Edit profile and preferences"].exists)
    capture("New developer profile", app: app)
  }

  @MainActor private func continueSetup(in app: XCUIApplication) {
    let button = app.buttons["onboarding.continue"]
    reveal(button, in: app)
    XCTAssertTrue(button.isEnabled)
    button.tap()
  }

  @MainActor private func reveal(_ element: XCUIElement, in app: XCUIApplication) {
    for _ in 0..<10 {
      if element.exists && element.isHittable { return }
      scrollContent(in: app)
    }
    XCTAssertTrue(element.exists && element.isHittable)
  }

  @MainActor private func scrollContent(in app: XCUIApplication) {
    app.scrollViews.firstMatch.swipeUp()
  }

  @MainActor private func capture(_ name: String, app: XCUIApplication) {
    let image = XCTAttachment(screenshot: app.screenshot())
    image.name = name
    image.lifetime = .keepAlways
    add(image)
  }
}
