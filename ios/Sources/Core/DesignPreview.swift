#if DEBUG && targetEnvironment(simulator)
  import Foundation
  import SwiftUI

  /// Manual visual previews use the real screens with fictional, read-only data.
  /// This entry point is excluded from physical-device and release builds.
  struct DesignPreviewRoot: View {
    @State private var app = makeModel()
    @State private var path: [Route] = []

    var body: some View {
      AppNavigation(path: $path) {
        List {
          Text("Fictional data. No live backend requests or account changes.")
            .font(Theme.caption)
          destination("Profile overview", route: .developer("preview"))
          destination("Profile editor", route: .profile)
          destination("Private area", route: .area)
          destination("Account", route: .account)
          destination("Request editor", route: .newRequest, role: .requester)
          NavigationLink("Voice controls") { VoiceStudioView() }
        }.pageBackground().appNavigationTitle("Design preview")
      }.environment(app).environment(app.api)
    }

    private func destination(_ title: String, route: Route, role: Role = .developer) -> some View {
      Button(title) {
        app.member = Member(user: .init(id: "preview", name: "Preview Developer"), role: role)
        path.append(route)
      }
    }

    private static func makeModel() -> AppModel {
      let configuration = URLSessionConfiguration.ephemeral
      configuration.protocolClasses = [DesignPreviewProtocol.self]
      let api = APIClient(
        baseURL: URL(string: "https://design-preview.invalid")!,
        session: URLSession(configuration: configuration), restoreSession: false)
      let model = AppModel(api: api)
      model.member = Member(user: .init(id: "preview", name: "Preview Developer"), role: .developer)
      model.hasCheckedSession = true
      model.checkingSession = false
      return model
    }
  }

  private final class DesignPreviewProtocol: URLProtocol, @unchecked Sendable {
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
      let isProfile = request.url?.path.hasPrefix("/api/developers/") == true
      let readOnly = request.httpMethod == "GET"
      let status = readOnly ? (isProfile ? 200 : 404) : 405
      let body = readOnly && isProfile ? Self.profile : #"{"error":"Read-only design preview"}"#
      let response = HTTPURLResponse(
        url: request.url!, statusCode: status,
        httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
      client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
      client?.urlProtocol(self, didLoad: Data(body.utf8))
      client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}

    private static let profile = #"""
      {
        "id":"preview","revision":1,"name":"Preview Developer",
        "bio":"Fictional profile for local visual previews. Building useful tools for the community.",
        "city":"Calgary","skills":[{"name":"TypeScript","level":3}],
        "projects":[{"title":"Community garden map","description":"A small map that helps neighbours find shared growing spaces.","technologies":["React","Mapbox"]}],
        "interests":["Community","Environment"],"wantsToLearn":["SwiftUI"],
        "experienceLevel":3,"collaboration":"flexible","weeklyHours":8,
        "acceptsVolunteer":true,"available":true,"discoverable":false,
        "location":{"latitude":51.0447,"longitude":-114.0719,"radiusKm":25}
      }
      """#
  }
#endif
