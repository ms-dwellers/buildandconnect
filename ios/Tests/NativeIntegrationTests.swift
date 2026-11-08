import XCTest

@testable import BuildConnect

final class NativeIntegrationTests: XCTestCase {
  private struct Account: Decodable {
    let email: String
    let password: String
    let id: String
  }
  private struct Context: Decodable {
    let developer: Account
    let requester: Account
    let company: Account
    let recruiter: Account
    let opportunityId: String
    let requestId: String
  }
  private let base = URL(string: "http://127.0.0.1:5199")!

  @MainActor private func context() async throws -> Context {
    var request = URLRequest(url: base.appending(path: "__test/context"))
    request.timeoutInterval = 2
    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200 else {
        throw URLError(.badServerResponse)
      }
      return try JSONDecoder().decode(Context.self, from: data)
    } catch {
      throw XCTSkip("Start the isolated native verification API to run integration tests.")
    }
  }

  @MainActor private func signIn(_ account: Account) async throws -> APIClient {
    let api = APIClient(baseURL: base, restoreSession: false)
    try await api.mutate(
      "/auth/sign-in/email", body: ["email": account.email, "password": account.password])
    XCTAssertNotNil(api.token)
    return api
  }

  @MainActor func testNativeBearerAndBrowserCookiesShareDataAndPrivacyRules() async throws {
    let context = try await context()
    let api = try await signIn(context.developer)
    let me: Member = try await api.get("/me")
    XCTAssertEqual(me.role, .developer)
    let browser = URLSession(configuration: .ephemeral)
    defer { browser.invalidateAndCancel() }
    var browserSignIn = URLRequest(url: base.appending(path: "api/auth/sign-in/email"))
    browserSignIn.httpMethod = "POST"
    browserSignIn.setValue("application/json", forHTTPHeaderField: "Content-Type")
    browserSignIn.setValue(
      base.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")),
      forHTTPHeaderField: "Origin")
    browserSignIn.httpBody = try JSONEncoder().encode([
      "email": context.developer.email, "password": context.developer.password,
    ])
    let (_, signInResponse) = try await browser.data(for: browserSignIn)
    XCTAssertEqual((signInResponse as? HTTPURLResponse)?.statusCode, 200)
    let (browserData, browserResponse) = try await browser.data(
      from: base.appending(path: "api/me"))
    XCTAssertEqual((browserResponse as? HTTPURLResponse)?.statusCode, 200)
    XCTAssertEqual(try JSONDecoder().decode(Member.self, from: browserData), me)
    let developerMap: MapFeed = try await api.get("/map")
    let guestMap: MapFeed = try await APIClient(baseURL: base, restoreSession: false).get("/map")
    XCTAssertTrue(developerMap.listings.first { $0.id == context.requestId }?.precise == true)
    XCTAssertFalse(guestMap.listings.first { $0.id == context.requestId }?.precise ?? true)
    let recruiter = try await signIn(context.recruiter)
    let profile: Developer = try await recruiter.get("/developers/\(context.developer.id)")
    XCTAssertNil(profile.location)
    try await api.mutate("/auth/sign-out", body: [String: String]())
    do {
      let _: Member = try await api.get("/me")
      XCTFail("Revoked native session was accepted")
    } catch let error as APIError { XCTAssertEqual(error.status, 401) }
  }

  @MainActor func testOpportunityInterestAndExclusiveClaimRoundTrip() async throws {
    let context = try await context()
    let developer = try await signIn(context.developer)
    let company = try await signIn(context.company)
    let requester = try await signIn(context.requester)
    try await setInterest(
      developer, opportunityId: context.opportunityId, developerId: nil, interested: true)
    try await setInterest(
      company, opportunityId: context.opportunityId, developerId: context.developer.id,
      interested: true)
    let connections: Page<Interest> = try await developer.get("/connections")
    XCTAssertTrue(
      connections.data.contains { $0.opportunityId == context.opportunityId && $0.connected })
    try await setInterest(
      developer, opportunityId: context.opportunityId, developerId: nil, interested: false)
    try await developer.mutate("/requests/\(context.requestId)/accept", body: [String: String]())
    let claimed: CommunityRequest = try await requester.get("/requests/\(context.requestId)")
    XCTAssertEqual(claimed.claimedBy, context.developer.id)
    let guest: MapFeed = try await APIClient(baseURL: base, restoreSession: false).get("/map")
    XCTAssertFalse(guest.listings.contains { $0.id == context.requestId })
    try await requester.mutate("/requests/\(context.requestId)/release", body: [String: String]())
    let reopened: CommunityRequest = try await developer.get("/requests/\(context.requestId)")
    XCTAssertEqual(reopened.status, "open")
  }

  @MainActor func testPublicationRetriesAndStaleEditsUseHTTPPreconditions() async throws {
    let context = try await context()
    let company = try await signIn(context.company)
    var input = OpportunityInput(
      title: "Retry-safe native posting",
      description: "Build a useful accessible calendar for local community volunteers.")
    let key = UUID().uuidString
    let first: Created = try await company.send("/opportunities", body: input, idempotencyKey: key)
    let retry: Created = try await company.send("/opportunities", body: input, idempotencyKey: key)
    XCTAssertEqual(first.id, retry.id)
    let initial: Opportunity = try await company.get("/opportunities/\(first.id)")
    input.title = "Revised native posting"
    try await company.mutate(
      "/opportunities/\(first.id)", method: "PUT", body: input, expectedRevision: initial.revision)
    do {
      try await company.mutate(
        "/opportunities/\(first.id)", method: "PUT", body: input, expectedRevision: initial.revision
      )
      XCTFail("A stale edit was accepted")
    } catch let error as APIError { XCTAssertEqual(error.status, 409) }
    try await company.mutate(
      "/opportunities/\(first.id)", method: "PATCH", body: ["status": "closed"])
  }
}
