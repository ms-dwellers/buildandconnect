import SwiftUI

@main
struct BuildConnectApp: App {
  @State private var app = AppModel()
  var body: some Scene {
    WindowGroup {
      RootView().environment(app).environment(app.api)
        .font(Theme.body()).foregroundStyle(Theme.ink).tint(Theme.accentStrong)
        .preferredColorScheme(.light)
        .controlSize(.large)
        .onOpenURL { app.open($0) }
    }
  }
}

enum Route: Hashable {
  case opportunity(String)
  case request(String)
  case developer(String)
  case profile, setupProfile, area, newRequest, newOpportunity
  case editRequest(String)
  case editOpportunity(String)
  case map(String)
  case account
}

enum AppTab: Hashable { case home, explore, connections, profile, account }
enum AuthMode: String, Identifiable {
  case signIn, signUp
  var id: String { rawValue }
}

@MainActor @Observable final class AppModel {
  let api: APIClient
  var member: Member?
  var checkingSession = true
  var hasCheckedSession = false
  var browsingAsGuest = false
  var needsProfileSetup = false
  var sessionError: Error?
  var selectedTab: AppTab = .home
  var homePath: [Route] = []
  var explorePath: [Route] = []
  var connectionsPath: [Route] = []
  var profilePath: [Route] = []
  var accountPath: [Route] = []
  var authMode: AuthMode?
  var pendingRoute: Route?
  var revision = 0
  var notice: String?
  var role: Role? { member?.role }
  var identity: String { member?.user.id ?? "guest" }
  var signedIn: Bool { member != nil }

  init(api: APIClient? = nil) {
    var address = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String ?? ""
    #if DEBUG
      if let override = ProcessInfo.processInfo.environment["BUILD_CONNECT_TEST_API"] {
        address = override
      }
    #endif
    let configuredURL = URL(string: address)
    let validURL = configuredURL.flatMap { url in
      url.host != nil && ["http", "https"].contains(url.scheme ?? "") ? url : nil
    }
    self.api =
      api ?? APIClient(baseURL: validURL ?? URL(string: "https://configuration-required.invalid")!)
    #if DEBUG
      if ProcessInfo.processInfo.environment["BUILD_CONNECT_TEST_RESET_SESSION"] == "1" {
        self.api.clearSession()
        DraftCache.clear()
      }
    #endif
  }

  func refreshSession(resumeNavigation: Bool = true) async {
    checkingSession = true
    defer {
      checkingSession = false
      hasCheckedSession = true
    }
    guard api.token != nil else {
      member = nil
      sessionError = nil
      return
    }
    do {
      if api.token != nil {
        let session: EmptyResponse? = try await api.get("/auth/get-session")
        guard session != nil else { throw APIError(status: 401, message: "Your session expired.") }
      }
      let wasGuest = member == nil
      member = try await api.get("/me")
      if wasGuest { selectedTab = .explore }
      if role == .developer {
        needsProfileSetup =
          DraftCache.load(Bool.self, key: "\(identity)/profile/onboarding") ?? needsProfileSetup
      }
      sessionError = nil
      if resumeNavigation && role != nil && !needsProfileSetup { resumePendingRoute() }
    } catch let error as APIError where error.status == 401 {
      if member != nil || api.token != nil {
        clearLocalSession(clearDrafts: false)
      } else {
        sessionError = nil
      }
    } catch is CancellationError {} catch { sessionError = error }
  }

  func clearLocalSession(clearDrafts: Bool = true) {
    if clearDrafts { DraftCache.clear() }
    api.clearSession()
    member = nil
    authMode = nil
    browsingAsGuest = false
    needsProfileSetup = false
    sessionError = nil
    homePath = []
    explorePath = []
    connectionsPath = []
    profilePath = []
    accountPath = []
    selectedTab = .home
    revision += 1
  }

  func signOut() async {
    do { try await api.mutate("/auth/sign-out", body: [String: String]()) } catch {
      notice =
        "Signed out on this device. Server revocation could not be confirmed. Sign in to revoke the session when connected."
    }
    pendingRoute = nil
    clearLocalSession()
  }

  func authenticate(for route: Route? = nil) {
    pendingRoute = route
    authMode = .signIn
  }

  func resumePendingRoute() {
    guard role != nil, let route = pendingRoute else { return }
    pendingRoute = nil
    selectedTab = .home
    homePath.append(route)
  }

  func changed() { revision += 1 }

  func open(_ url: URL) {
    guard url.host == api.baseURL.host, ["http", "https"].contains(url.scheme ?? "") else { return }
    let parts = url.pathComponents.filter { $0 != "/" }
    let route: Route?
    if parts.count == 2, parts[0] == "opportunities" {
      route = .opportunity(parts[1])
    } else if parts.first == "map",
      let id = URLComponents(url: url, resolvingAgainstBaseURL: false)?
        .queryItems?.first(where: { $0.name == "focus" })?.value
    {
      route = .map(id)
    } else {
      route = nil
    }
    guard let route else {
      selectedTab = .explore
      return
    }
    if signedIn {
      selectedTab = .home
      homePath.append(route)
    } else if case .map = route {
      browsingAsGuest = true
      selectedTab = .explore
      explorePath.append(route)
    } else {
      authenticate(for: route)
    }
  }
}

struct RootView: View {
  @Environment(AppModel.self) private var app
  @Environment(\.scenePhase) private var scenePhase
  var body: some View {
    @Bindable var app = app
    Group {
      if !app.hasCheckedSession && app.member == nil {
        VStack(spacing: 24) {
          BrandLockup()
          ProgressView()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.canvas)
      } else if app.signedIn && app.role == nil {
        NavigationStack { RoleSelectionView() }
      } else if app.signedIn && app.needsProfileSetup {
        NavigationStack { DeveloperOnboardingView() }
      } else if !app.signedIn && !app.browsingAsGuest {
        WelcomeView()
      } else if !app.signedIn {
        AppNavigation(path: $app.explorePath) { ExploreView() }
      } else {
        tabs
      }
    }
    .task { await app.refreshSession() }
    .onChange(of: scenePhase) { _, phase in
      if phase == .active && app.hasCheckedSession && !app.checkingSession {
        Task {
          await app.refreshSession()
          app.changed()
        }
      }
    }
    .onChange(of: app.api.sessionExpired) { _, expired in
      if expired {
        app.clearLocalSession(clearDrafts: false)
        app.notice = "Your session expired. Sign in again to continue."
      }
    }
    .sheet(
      item: Binding(get: { app.browsingAsGuest ? app.authMode : nil }, set: { app.authMode = $0 }),
      onDismiss: { if !app.signedIn { app.pendingRoute = nil } }
    ) {
      mode in
      ScrollView {
        VStack(spacing: 0) {
          HeroLandscape(compact: true).frame(height: 170)
          AuthView(initialMode: mode).padding(16).padding(.top, -24)
        }
      }.background(Theme.softAccent).presentationDragIndicator(.visible).preferredColorScheme(
        .light)
    }
    .alert(
      "Account",
      isPresented: Binding(get: { app.notice != nil }, set: { if !$0 { app.notice = nil } })
    ) {
      Button("Dismiss", role: .cancel) { app.notice = nil }
    } message: {
      Text(app.notice ?? "")
    }
  }

  private var tabs: some View {
    @Bindable var app = app
    return TabView(selection: $app.selectedTab) {
      AppNavigation(path: $app.explorePath) { ExploreView() }
        .tabItem { Label("Explore", systemImage: "map") }.tag(AppTab.explore)
      if app.signedIn {
        AppNavigation(path: $app.homePath) { DashboardView() }
          .tabItem {
            Label(
              homeTitle,
              systemImage: app.role == .developer ? "square.stack.3d.up" : "square.grid.2x2")
          }.tag(AppTab.home)
      }
      if app.role == .developer || app.role == .company {
        AppNavigation(path: $app.connectionsPath) { ConnectionsView() }
          .tabItem { Label("Connections", systemImage: "person.2") }.tag(AppTab.connections)
      }
      if app.role == .developer {
        AppNavigation(path: $app.profilePath) { OwnProfileView() }
          .tabItem { Label("Profile", systemImage: "person.crop.circle") }.tag(AppTab.profile)
      }
      if app.signedIn && app.role != .developer {
        AppNavigation(path: $app.accountPath) { AccountView() }
          .tabItem { Label("Account", systemImage: "person.crop.circle") }.tag(AppTab.account)
      }
    }.id(app.identity)
      .toolbarBackground(
        app.selectedTab == .explore ? Theme.mapSurface : Theme.canvas, for: .tabBar
      )
      .toolbarColorScheme(.light, for: .tabBar)
      .tint(Theme.accentStrong)
  }

  private var homeTitle: String {
    switch app.role {
    case .requester: "Requests"
    case .company: "Opportunities"
    case .recruiter: "Developers"
    default: "My work"
    }
  }
}

struct AppNavigation<Content: View>: View {
  @Binding var path: [Route]
  @ViewBuilder let content: () -> Content
  var body: some View {
    NavigationStack(path: $path) {
      content().toolbarBackground(Theme.canvas, for: .navigationBar)
        .navigationDestination(for: Route.self) { route in
          switch route {
          case .opportunity(let id): OpportunityDetailView(id: id)
          case .request(let id): RequestDetailView(id: id)
          case .developer(let id): DeveloperDetailView(id: id)
          case .profile: ProfileView()
          case .setupProfile: DeveloperOnboardingView()
          case .area: AreaEditorView()
          case .newRequest: RequestEditorView()
          case .newOpportunity: OpportunityEditorView()
          case .editRequest(let id): RequestEditorView(id: id)
          case .editOpportunity(let id): OpportunityEditorView(id: id)
          case .map(let id): ExploreView(focus: id)
          case .account: AccountView()
          }
        }
    }
  }
}
