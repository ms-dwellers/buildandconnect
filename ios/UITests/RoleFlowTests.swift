import XCTest

final class RoleFlowTests: XCTestCase {
  private struct Account: Decodable {
    let email: String
    let password: String
  }
  private struct Context: Decodable {
    let opportunityTitle: String
    let requestTitle: String
    let developer: Account
    let requester: Account
    let company: Account
    let recruiter: Account
  }

  @MainActor private func context() async throws -> Context {
    var request = URLRequest(url: URL(string: "http://127.0.0.1:5199/__test/context")!)
    request.timeoutInterval = 2
    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200 else {
        throw URLError(.badServerResponse)
      }
      return try JSONDecoder().decode(Context.self, from: data)
    } catch {
      throw XCTSkip("Start the isolated native verification API to run role walkthroughs.")
    }
  }

  @MainActor private func signIn(
    _ account: Account, workspace: String, testPasswordReveal: Bool = false
  ) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchEnvironment["BUILD_CONNECT_TEST_API"] = "http://127.0.0.1:5199"
    app.launchEnvironment["BUILD_CONNECT_TEST_RESET_SESSION"] = "1"
    app.launch()
    XCTAssertTrue(app.buttons["welcome.signin"].waitForExistence(timeout: 15))
    app.buttons["welcome.signin"].tap()
    let email = app.textFields["auth.email"]
    XCTAssertTrue(email.waitForExistence(timeout: 5))
    email.tap()
    email.typeText(account.email)
    let password = app.secureTextFields["auth.password"]
    password.tap()
    if testPasswordReveal {
      let middle = account.password.index(
        account.password.startIndex, offsetBy: account.password.count / 2)
      password.typeText(String(account.password[..<middle]))
      app.buttons["Show password"].tap()
      XCTAssertTrue(
        app.textFields["auth.password"].value as? String == String(account.password[..<middle]),
        "Revealing must preserve the typed password")
      app.buttons["Hide password"].tap()
      password.typeText(String(account.password[middle...]))
      app.buttons["Show password"].tap()
      XCTAssertTrue(
        app.textFields["auth.password"].value as? String == account.password,
        "Editing after hiding must preserve every password character")
      app.buttons["Hide password"].tap()
    } else {
      password.typeText(account.password)
    }
    app.buttons["auth.submit"].tap()
    let destination = app.buttons["tab.\(workspace)"]
    XCTAssertTrue(destination.waitForExistence(timeout: 15))
    destination.tap()
    return app
  }

  @MainActor private func reveal(_ element: XCUIElement, in app: XCUIApplication) {
    for _ in 0..<8 {
      if element.exists && element.isHittable { return }
      app.swipeUp()
    }
    XCTAssertTrue(element.exists && element.isHittable)
  }

  @MainActor private func confirm(_ label: String, in app: XCUIApplication) {
    let button = app.sheets.buttons[label].firstMatch
    XCTAssertTrue(button.waitForExistence(timeout: 5))
    button.tap()
  }

  @MainActor private func capture(_ name: String, app: XCUIApplication) {
    let image = XCTAttachment(screenshot: app.screenshot())
    image.name = name
    image.lifetime = .keepAlways
    add(image)
  }

  @MainActor func testCompanyClosesAndReopensOpportunity() async throws {
    let context = try await context()
    let app = signIn(context.company, workspace: "Opportunities")
    let title = app.staticTexts[context.opportunityTitle].firstMatch
    XCTAssertTrue(title.waitForExistence(timeout: 15))
    title.tap()
    let close = app.buttons["Close opportunity"]
    reveal(close, in: app)
    close.tap()
    confirm("Close opportunity", in: app)
    XCTAssertTrue(app.staticTexts["Closed"].waitForExistence(timeout: 10))
    let reopen = app.buttons["Reopen opportunity"]
    reveal(reopen, in: app)
    reopen.tap()
    confirm("Reopen opportunity", in: app)
    XCTAssertTrue(app.staticTexts["Open"].waitForExistence(timeout: 10))
    capture("Company opportunity", app: app)
  }

  @MainActor func testDeveloperAcceptsRequestAndFormsMutualConnection() async throws {
    let context = try await context()
    let app = signIn(context.developer, workspace: "My work", testPasswordReveal: true)
    let request = app.staticTexts[context.requestTitle].firstMatch
    XCTAssertTrue(request.waitForExistence(timeout: 15))
    reveal(request, in: app)
    request.tap()
    let accept = app.buttons["Pick up this idea"]
    reveal(accept, in: app)
    accept.tap()
    confirm("Pick up this idea", in: app)
    XCTAssertTrue(app.staticTexts["Claimed"].waitForExistence(timeout: 10))
    capture("Accepted community request", app: app)
    let release = app.buttons["Release request"]
    reveal(release, in: app)
    release.tap()
    confirm("Release request", in: app)
    XCTAssertTrue(app.staticTexts["Open"].waitForExistence(timeout: 10))
    let acceptAgain = app.buttons["Pick up this idea"]
    reveal(acceptAgain, in: app)
    acceptAgain.tap()
    confirm("Pick up this idea", in: app)
    XCTAssertTrue(app.staticTexts["Claimed"].waitForExistence(timeout: 10))
    app.navigationBars.buttons.firstMatch.tap()
    let opportunity = app.staticTexts[context.opportunityTitle].firstMatch
    reveal(opportunity, in: app)
    opportunity.tap()
    let interested = app.buttons["I'm interested"]
    reveal(interested, in: app)
    interested.tap()
    XCTAssertTrue(app.buttons["Withdraw interest"].waitForExistence(timeout: 10))
    app.buttons["tab.Connections"].tap()
    XCTAssertTrue(app.staticTexts["Connected"].waitForExistence(timeout: 10))
    capture("Mutual connection", app: app)
  }

  @MainActor func testRecruiterBrowsesConsentingProfileWithoutWriteActions() async throws {
    let context = try await context()
    let app = signIn(context.recruiter, workspace: "Developers")
    let developer = app.staticTexts["iPhone developer"].firstMatch
    XCTAssertTrue(developer.waitForExistence(timeout: 15))
    developer.tap()
    XCTAssertTrue(app.staticTexts["Skills"].waitForExistence(timeout: 10))
    XCTAssertFalse(app.buttons["I'm interested"].exists)
    XCTAssertFalse(app.buttons["Pick up this idea"].exists)
    capture("Recruiter developer profile", app: app)
  }

  @MainActor func testRequesterClosesClaimedRequestAndSeesClosedStatus() async throws {
    let context = try await context()
    var claim = URLRequest(url: URL(string: "http://127.0.0.1:5199/__test/claim")!)
    claim.httpMethod = "POST"
    let (_, response) = try await URLSession.shared.data(for: claim)
    XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200)
    let app = signIn(context.requester, workspace: "Requests")
    let request = app.staticTexts[context.requestTitle].firstMatch
    XCTAssertTrue(request.waitForExistence(timeout: 15))
    request.tap()
    XCTAssertTrue(app.staticTexts["Claimed"].waitForExistence(timeout: 10))
    let close = app.buttons["Close request"]
    reveal(close, in: app)
    close.tap()
    confirm("Close request", in: app)
    XCTAssertTrue(app.staticTexts["Closed"].waitForExistence(timeout: 10))
    XCTAssertFalse(app.buttons["Edit request"].exists)
    capture("Closed community request", app: app)
  }

  @MainActor func testRequesterPostsFromMapAndReturnsToItsPin() async throws {
    let context = try await context()
    let app = signIn(context.requester, workspace: "Requests")
    XCTAssertTrue(app.buttons["tab.Explore"].waitForExistence(timeout: 15))
    app.buttons["tab.Explore"].tap()
    if !app.staticTexts["The live map is not configured. Project lists remain available."].exists {
      XCTAssertTrue(app.staticTexts["City overview"].waitForExistence(timeout: 25))
    }
    app.buttons["Post"].tap()
    let downtown = app.buttons["Use downtown Calgary"]
    XCTAssertTrue(downtown.waitForExistence(timeout: 10))
    reveal(downtown, in: app)
    downtown.tap()
    let pin = app.buttons["pin.confirm"]
    reveal(pin, in: app)
    pin.tap()
    let title = app.textFields["request.title"]
    XCTAssertTrue(title.waitForExistence(timeout: 10))
    title.tap()
    title.typeText("A native map posting")
    let description = app.descendants(matching: .any).matching(identifier: "request.description")
      .firstMatch
    description.tap()
    description.typeText("Build an accessible volunteer calendar for our local community garden.")
    let consent = app.switches["Allow AI analysis for this save"].switches.firstMatch
    XCTAssertTrue(consent.waitForExistence(timeout: 5))
    consent.tap()
    XCTAssertEqual(consent.value as? String, "1")
    let publish = app.buttons["request.save"]
    reveal(publish, in: app)
    XCTAssertTrue(publish.isEnabled)
    publish.tap()
    XCTAssertTrue(app.staticTexts["Request posted"].waitForExistence(timeout: 15))
    app.buttons["View request"].tap()
    let map = app.buttons["View on map"]
    reveal(map, in: app)
    map.tap()
    XCTAssertTrue(app.buttons["Manage posting"].waitForExistence(timeout: 15))
    capture("Map posting connected flow", app: app)
  }
}
