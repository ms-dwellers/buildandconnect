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
          destination("Voice controls", route: .voice)
          destination("New profile onboarding", route: .setupProfile)
          destination("Developer discovery", route: .discovery)
          destination("Explore map", route: .map(""), role: .requester)
        }.pageBackground().appNavigationTitle("Design preview")
      }.environment(app).environment(app.api)
    }

    private func destination(_ title: String, route: Route, role: Role = .developer) -> some View {
      Button(title) {
        app = Self.makeModel(newProfile: route == .setupProfile)
        app.member = Member(user: .init(id: app.identity, name: "Preview Developer"), role: role)
        path.append(route)
      }
    }

    private static func makeModel(newProfile: Bool = false) -> AppModel {
      let configuration = URLSessionConfiguration.ephemeral
      configuration.protocolClasses = [DesignPreviewProtocol.self]
      let api = APIClient(
        baseURL: URL(
          string: newProfile
            ? "https://new-profile.design-preview.invalid" : "https://design-preview.invalid")!,
        session: URLSession(configuration: configuration), restoreSession: false)
      let model = AppModel(api: api)
      model.member = Member(
        user: .init(id: newProfile ? "preview-onboarding" : "preview", name: "Preview Developer"),
        role: .developer)
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
      let isDiscovery = request.url?.path == "/api/developers"
      let isMap = request.url?.path == "/api/map"
      let newProfile = request.url?.host == "new-profile.design-preview.invalid"
      let readOnly = request.httpMethod == "GET"
      let success = readOnly && !newProfile && (isProfile || isDiscovery || isMap)
      let status = readOnly ? (success ? 200 : 404) : 405
      let body =
        success
        ? (isMap
          ? Self.mapFeed
          : isDiscovery ? "{\"data\":[\(Self.profile)],\"nextCursor\":null}" : Self.profile)
        : #"{"error":"Read-only design preview"}"#
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

    private static let mapFeed = #"""
      {"truncated":false,"listings":[
        {"id":"preview-garden","source":"request","title":"Map our community garden","organization":"Neighbourhood Garden Group","neighbourhood":"Beltline, Calgary","kind":"community","compensation":"Community","commitment":"A small weekend project","skills":["Maps","Web design"],"description":"Help neighbours discover shared garden plots and learn how to get involved. This fictional project is used only for local design previews.","status":"open","precise":true,"viewerIsOwner":true,"viewerHasClaimed":false,"latitude":51.037,"longitude":-114.071},
        {"id":"preview-volunteer","source":"opportunity","title":"Build an accessible events calendar","organization":"Calgary Community Collective","neighbourhood":"Downtown, Calgary","kind":"volunteer","compensation":"Volunteer","commitment":"4 hours per week","skills":["React","Accessibility"],"description":"Create a welcoming calendar that makes local events easier to find. Fictional preview content; no applications are submitted.","status":"open","precise":true,"viewerIsOwner":false,"viewerHasClaimed":false,"latitude":51.047,"longitude":-114.061},
        {"id":"preview-paid","source":"opportunity","title":"Improve a local nonprofit website","organization":"Community Learning Centre","neighbourhood":"Kensington, Calgary","kind":"paid","compensation":"Paid project","commitment":"6 hours per week","skills":["TypeScript","Design systems"],"description":"Help improve the clarity and accessibility of a small nonprofit website. Fictional local preview content.","status":"open","precise":true,"viewerIsOwner":false,"viewerHasClaimed":false,"latitude":51.054,"longitude":-114.087}
      ]}
      """#
  }
#endif
