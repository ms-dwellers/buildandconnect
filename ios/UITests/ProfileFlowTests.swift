import UIKit
import XCTest

final class ProfileFlowTests: XCTestCase {
  private var testAPI: String {
    ProcessInfo.processInfo.environment["BUILD_CONNECT_TEST_API"] ?? "http://127.0.0.1:5199"
  }

  private struct Context: Decodable {
    struct Account: Decodable {
      let email: String
      let password: String
    }
    let developer: Account
  }

  @MainActor private func signIn() async throws -> XCUIApplication {
    continueAfterFailure = false
    var request = URLRequest(url: URL(string: testAPI + "/__test/context")!)
    request.timeoutInterval = 2
    let (data, response): (Data, URLResponse)
    do {
      (data, response) = try await URLSession.shared.data(for: request)
    } catch {
      throw XCTSkip("Start the isolated native verification API for profile tests.")
    }
    XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200)
    let context = try JSONDecoder().decode(Context.self, from: data)
    let app = XCUIApplication()
    app.launchEnvironment["BUILD_CONNECT_TEST_API"] = testAPI
    app.launchEnvironment["BUILD_CONNECT_TEST_RESET_SESSION"] = "1"
    app.launch()
    XCTAssertTrue(app.buttons["welcome.signin"].waitForExistence(timeout: 15))
    app.buttons["welcome.signin"].tap()
    let email = app.textFields["auth.email"]
    XCTAssertTrue(email.waitForExistence(timeout: 5))
    email.tap()
    email.typeText(context.developer.email)
    let password = app.secureTextFields["auth.password"]
    password.tap()
    password.typeText(context.developer.password)
    app.buttons["auth.submit"].tap()
    XCTAssertTrue(app.tabBars.buttons["Profile"].waitForExistence(timeout: 15))
    return app
  }

  @MainActor private func nextProfileResponse(delayMs: Int = 0, status: Int? = nil) async throws {
    var request = URLRequest(url: URL(string: testAPI + "/__test/profile-response")!)
    request.httpMethod = "POST"
    var body = ["delayMs": delayMs]
    if let status { body["status"] = status }
    request.httpBody = try JSONEncoder().encode(body)
    let (_, response) = try await URLSession.shared.data(for: request)
    XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200)
  }

  @MainActor private func captureAndCheckCanvas(_ name: String, app: XCUIApplication) throws {
    let screenshot = app.screenshot()
    let attachment = XCTAttachment(screenshot: screenshot)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
    let image = try XCTUnwrap(screenshot.image.cgImage)
    for fraction in [0.1, 0.9] {
      var pixel = [UInt8](repeating: 0, count: 4)
      try pixel.withUnsafeMutableBytes { bytes in
        let context = try XCTUnwrap(
          CGContext(
            data: bytes.baseAddress, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
        context.draw(
          image,
          in: CGRect(
            x: -CGFloat(image.width) * fraction, y: -CGFloat(image.height) * 0.5,
            width: CGFloat(image.width), height: CGFloat(image.height)))
      }
      for (actual, expected) in zip(pixel.prefix(3), [244, 243, 238]) {
        XCTAssertEqual(Double(actual), Double(expected), accuracy: 3, "Canvas must fill both edges")
      }
    }
  }

  @MainActor func testLoadingFillsScreenThenShowsProfile() async throws {
    let app = try await signIn()
    try await nextProfileResponse(delayMs: 15000)
    app.tabBars.buttons["Profile"].tap()
    XCTAssertTrue(app.staticTexts["Loading your profile"].waitForExistence(timeout: 3))
    try captureAndCheckCanvas("Profile loading", app: app)
    XCTAssertTrue(app.buttons["Edit profile and preferences"].waitForExistence(timeout: 25))
    XCTAssertTrue(app.staticTexts["iPhone developer"].exists)
  }

  @MainActor func testFailureCanRetry() async throws {
    let app = try await signIn()
    try await nextProfileResponse(status: 503)
    app.tabBars.buttons["Profile"].tap()
    XCTAssertTrue(app.buttons["Try again"].waitForExistence(timeout: 10))
    try captureAndCheckCanvas("Profile load error", app: app)
    app.buttons["Try again"].tap()
    XCTAssertTrue(app.buttons["Edit profile and preferences"].waitForExistence(timeout: 15))
  }

  @MainActor func testReturningDuringLoadDoesNotLeaveProfileStuck() async throws {
    let app = try await signIn()
    try await nextProfileResponse(delayMs: 15000)
    app.tabBars.buttons["Profile"].tap()
    XCTAssertTrue(app.staticTexts["Loading your profile"].waitForExistence(timeout: 3))
    XCUIDevice.shared.press(.home)
    app.activate()
    XCTAssertTrue(app.buttons["Edit profile and preferences"].waitForExistence(timeout: 25))
  }
}
