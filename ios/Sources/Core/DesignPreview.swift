#if DEBUG && targetEnvironment(simulator)
  import Foundation
  import SwiftUI

  /// Manual visual previews use the real screens with fictional, read-only data.
  /// This entry point is excluded from physical-device and release builds.
  struct DesignPreviewRoot: View {
    @State private var app = makeModel()
    @State private var path: [Route] = []
    @State private var showRequesterShell = false
    @State private var showAuth = false
    @State private var showControls = false

    var body: some View {
      Group {
        if showRequesterShell {
          RootView(restoresSession: false)
        } else {
          menu
        }
      }.environment(app).environment(app.api)
        .sheet(isPresented: $showAuth) {
          AuthView(initialMode: .signIn).environment(app).environment(app.api)
            .presentationBackground(Theme.canvas).presentationDetents([.large])
        }
        .sheet(isPresented: $showControls) {
          DesignControlStatesPreview()
            .presentationBackground(Theme.canvas).presentationDetents([.large])
        }
    }

    private var menu: some View {
      AppNavigation(path: $path) {
        List {
          Text("Fictional data. No live backend requests or account changes.")
            .font(Theme.caption)
          Button("Control states") { showControls = true }
          Button("Authentication states") { showAuth = true }
          Button("Requester tabs") {
            app = Self.makeModel(role: .requester)
            app.selectedTab = .home
            showRequesterShell = true
          }
          destination("Requester dashboard", route: .dashboard, role: .requester)
          destination("Requester connections", route: .connections, role: .requester)
          destination(
            "Opportunity owner", route: .opportunity("preview-opportunity"), role: .requester)
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
      }
    }

    private func destination(_ title: String, route: Route, role: Role = .developer) -> some View {
      Button(title) {
        app = Self.makeModel(newProfile: route == .setupProfile, role: role)
        path.append(route)
      }
    }

    private static func makeModel(newProfile: Bool = false, role: Role = .developer) -> AppModel {
      let configuration = URLSessionConfiguration.ephemeral
      configuration.protocolClasses = [DesignPreviewProtocol.self]
      let api = APIClient(
        baseURL: URL(
          string: newProfile
            ? "https://new-profile.design-preview.invalid"
            : role == .requester
              ? "https://requester.design-preview.invalid" : "https://design-preview.invalid")!,
        session: URLSession(configuration: configuration), restoreSession: false)
      let model = AppModel(api: api)
      model.member = Member(
        user: .init(
          id: newProfile
            ? "preview-onboarding" : role == .requester ? "preview-requester" : "preview",
          name: role == .requester ? "Preview Requester" : "Preview Developer"),
        role: role)
      model.hasCheckedSession = true
      model.checkingSession = false
      return model
    }
  }

  private struct DesignControlStatesPreview: View {
    @Environment(\.dismiss) private var dismiss
    @State private var activations = 0
    @State private var text = "Disabled field"
    var body: some View {
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          HStack {
            Text("Control states").font(Theme.title(28))
            Spacer()
            Button("Done") { dismiss() }.buttonStyle(AppButtonStyle(variant: .ghost))
          }
          Text("Fictional actions. Activations: \(activations)").font(Theme.caption)
          Button("Primary action") { activations += 1 }
            .buttonStyle(AppButtonStyle.primary).accessibilityIdentifier("preview.primary")
          Button("Disabled action") { activations += 1 }
            .buttonStyle(AppButtonStyle.primary).disabled(true)
          Button("Loading action") { activations += 1 }
            .buttonStyle(AppButtonStyle.primary).buttonLoading(true)
          Button("Outline action") { activations += 1 }
            .buttonStyle(AppButtonStyle(fullWidth: true))
          Button("Destructive action", role: .destructive) { activations += 1 }
            .buttonStyle(AppButtonStyle(variant: .destructive, fullWidth: true))
          TextField("Disabled field", text: $text).textFieldStyle(AppTextFieldStyle()).disabled(
            true)
          ConfirmAction(
            label: "Discard changes", consequence: "This removes the fictional draft.",
            destructive: true
          ) {}
        }.padding(24)
      }.pageBackground()
    }
  }

  private final class DesignPreviewProtocol: URLProtocol, @unchecked Sendable {
    private var responseWork: DispatchWorkItem?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
      let newProfile = request.url?.host == "new-profile.design-preview.invalid"
      let readOnly = request.httpMethod == "GET"
      let payload =
        readOnly && !newProfile
        ? Self.payload(
          path: request.url?.path ?? "",
          requester: request.url?.host == "requester.design-preview.invalid") : nil
      let success = payload != nil
      let status = readOnly ? (success ? 200 : 404) : 405
      let body = payload ?? #"{"error":"Read-only design preview"}"#
      let response = HTTPURLResponse(
        url: request.url!, statusCode: status,
        httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
      let work = DispatchWorkItem { [weak self] in
        guard let self else { return }
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(body.utf8))
        client?.urlProtocolDidFinishLoading(self)
      }
      responseWork = work
      DispatchQueue.main.asyncAfter(deadline: .now() + (readOnly ? 0 : 5), execute: work)
    }
    override func stopLoading() { responseWork?.cancel() }

    private static func payload(path: String, requester: Bool) -> String? {
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
        let received = match.replacingOccurrences(of: "\"preview\"", with: "\"preview-received\"")
          .replacingOccurrences(of: "Preview Developer", with: "Alex Chen")
        let sent = match.replacingOccurrences(of: "\"preview\"", with: "\"preview-sent\"")
          .replacingOccurrences(of: "Preview Developer", with: "Sam Rivera")
        return "{\"data\":[\(received),\(sent),\(match)],\"total\":3}"
      case "/api/interests":
        return requester
          ? "{\"data\":[\(receivedInterest),\(sentInterest),\(interest)],\"nextCursor\":null}"
          : page(interest)
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
      {"id":"preview-interest","opportunityId":"preview-opportunity","developerId":"preview","title":"Build an accessible events calendar","developerName":"Preview Developer","requesterName":"Calgary Community Collective","requesterInterested":true,"developerInterested":true,"connected":true}
      """#

    private static let receivedInterest = #"""
      {"id":"preview-received","opportunityId":"preview-opportunity","developerId":"preview-received","title":"Build an accessible events calendar","developerName":"Alex Chen","requesterName":"Calgary Community Collective","requesterInterested":false,"developerInterested":true,"connected":false}
      """#

    private static let sentInterest = #"""
      {"id":"preview-sent","opportunityId":"preview-opportunity","developerId":"preview-sent","title":"Build an accessible events calendar","developerName":"Sam Rivera","requesterName":"Calgary Community Collective","requesterInterested":true,"developerInterested":false,"connected":false}
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
