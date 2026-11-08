import XCTest

@testable import BuildConnect

final class ModelTests: XCTestCase {
  func testPrivateDraftPreservesIncompleteFieldsAndExplicitNullPin() throws {
    let content = ProjectDraftContent()
    XCTAssertFalse(content.readyToPublish)
    let data = try JSONEncoder().encode(content)
    let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    XCTAssertTrue(json["pin"] is NSNull)
    XCTAssertEqual(try JSONDecoder().decode(ProjectDraftContent.self, from: data), content)
  }

  func testDraftPublicationRequiresExplicitTypeHoursAndDetails() {
    var content = ProjectDraftContent()
    content.title = "Community calendar"
    content.description = "Build an accessible calendar for a local community group."
    content.city = "Calgary"
    XCTAssertFalse(content.readyToPublish)
    content.kind = "volunteer"
    content.minimumWeeklyHours = "4"
    XCTAssertTrue(content.readyToPublish)
    content.minimumWeeklyHours = "0"
    XCTAssertFalse(content.readyToPublish)
  }
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

  @MainActor func testMissingConvexConfigurationFailsBeforeNetworking() async throws {
    let api = APIClient(
      baseURL: URL(string: "https://configuration-required.invalid")!, restoreSession: false)
    do {
      let _: Member = try await api.get("/me")
      XCTFail("An unconfigured API address was accepted")
    } catch let error as APIError {
      XCTAssertEqual(error.status, 0)
      XCTAssertTrue(error.message.contains("Convex HTTP site"))
    }
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

  @MainActor func testMapLinkOpensGuestBrowsingWithoutRequiringSignIn() {
    let app = AppModel(
      api: APIClient(baseURL: URL(string: "https://example.test")!, restoreSession: false))
    app.open(URL(string: "https://example.test/map?focus=city-idea")!)
    XCTAssertTrue(app.browsingAsGuest)
    XCTAssertEqual(app.explorePath, [.map("city-idea")])
    XCTAssertNil(app.authMode)
  }

  @MainActor func testWelcomeDoesNotNeedNetworkToOpenWithoutSession() async {
    let app = AppModel(
      api: APIClient(
        baseURL: URL(string: "https://configuration-required.invalid")!, restoreSession: false))
    await app.refreshSession()
    XCTAssertTrue(app.hasCheckedSession)
    XCTAssertFalse(app.checkingSession)
    XCTAssertFalse(app.signedIn)
    XCTAssertNil(app.sessionError)
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
