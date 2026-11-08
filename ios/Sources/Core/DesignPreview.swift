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
          destination("Dashboard", route: .dashboard)
          destination("Connections", route: .connections)
          destination("Opportunity detail", route: .opportunity("preview-opportunity"))
          destination(
            "Opportunity editor", route: .editOpportunity("preview-opportunity"), role: .requester)
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
        app.member = Member(
          user: .init(
            id: role == .requester ? "preview-requester" : app.identity, name: "Preview Developer"),
          role: role)
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
      let newProfile = request.url?.host == "new-profile.design-preview.invalid"
      let readOnly = request.httpMethod == "GET"
      let payload = readOnly && !newProfile ? Self.payload(path: request.url?.path ?? "") : nil
      let success = payload != nil
      let status = readOnly ? (success ? 200 : 404) : 405
      let body = payload ?? #"{"error":"Read-only design preview"}"#
      let response = HTTPURLResponse(
        url: request.url!, statusCode: status,
        httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
      client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
      client?.urlProtocol(self, didLoad: Data(body.utf8))
      client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}

    private static func payload(path: String) -> String? {
      switch path {
      case "/api/map": return mapFeed
      case "/api/developers": return page(profile)
      case "/api/requests", "/api/requests/claimed": return page(communityRequest)
      case "/api/requests/preview-request": return communityRequest
      case "/api/requests/nearby":
        return
          #"{"data":[{"requestId":"preview-request","title":"Map our community garden","description":"Help neighbours find shared garden plots.","place":"Beltline, Calgary","distanceKm":2.4,"score":86,"explanation":"A useful opportunity to practise your mapping skills."}],"total":1}"#
      case "/api/opportunities", "/api/opportunities/mine": return page(opportunity)
      case "/api/opportunities/preview-opportunity": return opportunity
      case "/api/opportunities/preview-opportunity/match":
        return "{\"data\":\(match),\"ineligibleReasons\":[],\"status\":\"eligible\"}"
      case "/api/opportunities/preview-opportunity/matches":
        return "{\"data\":[\(match)],\"total\":1}"
      case "/api/interests": return page(interest)
      default: return path.hasPrefix("/api/developers/") ? profile : nil
      }
    }

    private static func page(_ item: String) -> String {
      "{\"data\":[\(item)],\"nextCursor\":null}"
    }

    private static let analysis = #"""
      {"requiredTechnologies":["React"],"preferredTechnologies":["TypeScript"],"difficulty":2,"experienceLevel":"Early career","requiredSkills":["Web development"],"responsibilities":["Build accessible calendar views","Work with community volunteers"],"learningOpportunities":["Accessibility","Collaborative design"],"mentorshipAvailable":true}
      """#

    private static var opportunity: String {
      #"{"id":"preview-opportunity","revision":1,"ownerId":"preview-requester","title":"Build an accessible events calendar","description":"Help a community group create a welcoming calendar of local events. This is fictional content for visual previews.","city":"Calgary","remote":true,"kind":"volunteer","essentialTechnologies":["React"],"minimumWeeklyHours":4,"collaboration":"flexible","interests":["Community"],"place":"Downtown Calgary","latitude":51.047,"longitude":-114.061,"commitment":"4 hours per week","status":"open","analysis":"#
        + analysis + "}"
    }

    private static var communityRequest: String {
      #"{"id":"preview-request","revision":1,"ownerId":"preview-requester","ownerName":"Community Garden Group","title":"Map our community garden","description":"Help neighbours find shared garden plots and learn how to get involved. Fictional preview content.","place":"Beltline, Calgary","latitude":51.037,"longitude":-114.071,"status":"claimed","claimedBy":"preview","claimantName":"Preview Developer","analysis":"#
        + analysis + "}"
    }

    private static let match = #"""
      {"developerId":"preview","name":"Preview Developer","score":86,"scores":{"technicalReadiness":80,"growthPotential":92,"developerInterest":90,"collaborationCompatibility":85,"opportunityExposure":82},"existingRelevantSkills":["React","TypeScript"],"skillsToDevelop":["Accessibility"],"explanation":"Your existing skills fit this project, with room to practise accessible interaction design."}
      """#

    private static let interest = #"""
      {"id":"preview-interest","opportunityId":"preview-opportunity","developerId":"preview","title":"Build an accessible events calendar","developerName":"Preview Developer","companyName":"Calgary Community Collective","companyInterested":true,"developerInterested":true,"connected":true}
      """#

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
