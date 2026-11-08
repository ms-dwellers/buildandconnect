import XCTest

@testable import BuildConnect

final class ModelTests: XCTestCase {
  func testDraftsRoundTripWithAccountIsolation() throws {
    let key = "test/\(UUID().uuidString)"
    defer { DraftCache.remove(key: key) }
    let input = RequestInput(
      title: "Local draft", description: "A useful community request", place: "Calgary")
    let draft = PostingDraft(input: input, submissionKey: UUID().uuidString, selectedPin: true)
    try DraftCache.save(draft, key: key)
    let restored = try XCTUnwrap(DraftCache.load(PostingDraft<RequestInput>.self, key: key))
    XCTAssertEqual(restored.input, input)
    XCTAssertEqual(restored.submissionKey, draft.submissionKey)
    XCTAssertNil(DraftCache.load(PostingDraft<RequestInput>.self, key: key + "/another-account"))
  }

  func testTagsAreTrimmedNormalizedAndUnique() {
    XCTAssertEqual(parseTags(" React, Swift, react, , SWIFT "), ["react", "swift"])
  }

  func testProfileConsentIsOffByDefault() {
    XCTAssertFalse(ProfileInput().discoverable)
  }

  func testVisibilityChangesCannotRebaseOverOtherProfileEdits() {
    let baseline = ProfileInput(bio: "Original profile")
    var changed = baseline
    changed.available = false
    changed.discoverable = true
    XCTAssertTrue(baseline.differsOnlyInVisibility(from: changed))
    changed.bio = "Changed on another device"
    XCTAssertFalse(baseline.differsOnlyInVisibility(from: changed))
  }

  func testPublicDeveloperDoesNotRequirePrivateLocation() throws {
    let input = ProfileInput(bio: "Community developer", skills: [Skill(name: "swift")])
    var object = try XCTUnwrap(
      JSONSerialization.jsonObject(with: JSONEncoder().encode(input)) as? [String: Any])
    object["id"] = "developer-id"
    object["name"] = "Developer"
    let developer = try JSONDecoder().decode(
      Developer.self, from: JSONSerialization.data(withJSONObject: object))
    XCTAssertNil(developer.location)
    XCTAssertEqual(developer.input, input)
  }

  @MainActor func testUntrustedLinksCannotChangeNavigation() {
    let app = AppModel(
      api: APIClient(baseURL: URL(string: "https://example.test")!, restoreSession: false))
    app.open(URL(string: "https://attacker.test/opportunities/id")!)
    XCTAssertTrue(app.homePath.isEmpty)
    XCTAssertNil(app.authMode)
  }

  @MainActor func testOpportunityLinkPreservesDestinationThroughSignIn() {
    let app = AppModel(
      api: APIClient(baseURL: URL(string: "https://example.test")!, restoreSession: false))
    app.open(URL(string: "https://example.test/opportunities/project-id")!)
    XCTAssertEqual(app.pendingRoute, .opportunity("project-id"))
    XCTAssertEqual(app.authMode, .signIn)
    app.member = Member(user: .init(id: "user-id", name: "Developer"), role: .developer)
    app.resumePendingRoute()
    XCTAssertEqual(app.homePath, [.opportunity("project-id")])
    XCTAssertNil(app.pendingRoute)
  }
}
