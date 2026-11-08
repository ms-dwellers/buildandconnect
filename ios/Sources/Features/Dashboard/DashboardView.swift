import SwiftUI

struct DashboardView: View {
  @Environment(AppModel.self) private var app
  var body: some View {
    Group {
      switch app.role {
      case .developer: DeveloperHomeView()
      case .requester: RequesterHomeView()
      case nil: WelcomeView()
      }
    }
  }
}

struct OpportunityRow: View {
  let opportunity: Opportunity
  var body: some View {
    NavigationLink(value: Route.opportunity(opportunity.id)) {
      VStack(alignment: .leading, spacing: 10) {
        HStack {
          StatusBadge(text: opportunity.status)
          Text(opportunity.kind.capitalized).font(Theme.metadata)
        }
        IdeaRowContent(
          title: opportunity.title,
          detail: opportunity.remote
            ? "Remote · \(opportunity.city)" : opportunity.place ?? opportunity.city,
          category: opportunity.kind == "paid" ? .paid : .volunteer)
        Text(opportunity.description).lineLimit(2).foregroundStyle(Theme.muted)
      }.paperCard()
    }.buttonStyle(.plain)
  }
}

struct RequestRow: View {
  let request: CommunityRequest
  var body: some View {
    NavigationLink(value: Route.request(request.id)) {
      VStack(alignment: .leading, spacing: 10) {
        StatusBadge(text: request.status)
        IdeaRowContent(title: request.title, detail: request.place, category: .community)
        Text(request.description).lineLimit(2)
        if let name = request.claimantName { Text("Accepted by \(name)").font(Theme.caption) }
      }.paperCard()
    }.buttonStyle(.plain)
  }
}

struct DeveloperHomeView: View {
  @Environment(AppModel.self) private var app
  @Environment(APIClient.self) private var api
  @State private var profile = Resource<Developer>()
  @State private var nearby = Resource<Ranked<NearbyRequest>>()
  @State private var claimed = PageStore<CommunityRequest>()
  @State private var opportunities = PageStore<Opportunity>()
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        FeatureBanner(title: "Make something\nthat matters.", symbol: "bolt.fill")
        NavigationLink("Find projects for my goals", value: Route.career).buttonStyle(
          AppButtonStyle.primary)
        if profile.loading && profile.value == nil { ProgressView("Loading your work") }
        if (profile.error as? APIError)?.status == 404 {
          EmptyState(
            title: "Create your developer profile", symbol: "person.crop.circle",
            message: "Add skills and learning goals to find your fit.")
          NavigationLink("Create profile", value: Route.setupProfile).buttonStyle(
            AppButtonStyle.primary)
        } else if let error = profile.error {
          FailureView(error: error) { await load() }
        }
        if let developer = profile.value {
          Text("Ideas you've picked up").font(Theme.title(27))
          PageList(store: claimed, load: loadClaimed) { RequestRow(request: $0) }
          if claimed.loaded && claimed.items.isEmpty {
            EmptyState(
              title: "Nothing accepted yet", symbol: "hands.sparkles",
              message: "Choose a nearby request when you are ready.")
          }
          Text("Nearby requests").font(Theme.title(27))
          if developer.location == nil {
            NavigationLink("Set your private area", value: Route.area).buttonStyle(
              AppButtonStyle.primary)
          } else {
            if let error = nearby.error { FailureView(error: error) { await loadNearby() } }
            ForEach(nearby.value?.data ?? []) { request in
              NavigationLink(value: Route.request(request.id)) {
                VStack(alignment: .leading, spacing: 10) {
                  StatusBadge(text: "\(Int(request.score.rounded()))% fit")
                  Text(request.title).font(Theme.title(23))
                  Text("\(request.distanceKm.formatted()) km · \(request.place)").font(
                    Theme.metadata)
                  Text(request.explanation).foregroundStyle(Theme.muted)
                }.paperCard()
              }.buttonStyle(.plain)
            }
            if nearby.value?.data.isEmpty == true {
              EmptyState(title: "No open requests in your area", symbol: "map")
              NavigationLink("Adjust your radius", value: Route.area)
            }
            if let result = nearby.value, result.total > result.data.count {
              Text("Showing \(result.data.count) of \(result.total) ranked requests.").font(
                Theme.caption)
            }
          }
        }
        Text("Open opportunities").font(Theme.title(27))
        PageList(store: opportunities, load: loadOpportunities) { OpportunityRow(opportunity: $0) }
        if opportunities.loaded && opportunities.items.isEmpty {
          EmptyState(title: "No open opportunities", symbol: "briefcase")
        }
      }.padding(20)
    }.pageBackground().appNavigationTitle("My work")
      .task(id: app.revision) { await load() }.refreshable { await load() }
  }
  private func load() async {
    await profile.load(api, "/developers/me")
    await loadClaimed(true)
    await loadOpportunities(true)
    if profile.value?.location != nil { await loadNearby() }
  }
  private func loadNearby() async {
    await nearby.load(api, "/requests/nearby", query: ["limit": "100"])
  }
  private func loadClaimed(_ reset: Bool) async {
    await claimed.load(api, "/requests/claimed", reset: reset)
  }
  private func loadOpportunities(_ reset: Bool) async {
    await opportunities.load(api, "/opportunities", reset: reset)
  }
}

struct RequesterHomeView: View {
  @Environment(AppModel.self) private var app
  @Environment(APIClient.self) private var api
  @State private var requests = PageStore<CommunityRequest>()
  @State private var status = "all"
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        FeatureBanner(title: "Small ideas.\nReal possibilities.", symbol: "lightbulb.fill")
        NavigationLink("Start a project", value: Route.startProject).buttonStyle(
          AppButtonStyle.primary)
        ProjectDraftList()
        NavigationLink("Manage opportunities", value: Route.myOpportunities)
          .buttonStyle(AppButtonStyle(variant: .outline, fullWidth: true))
        NavigationLink("Post a short local request", value: Route.newRequest).buttonStyle(
          AppButtonStyle(variant: .ghost))
        AppSegmentedControl(
          title: "Status", selection: $status,
          options: [
            ("all", "All"), ("open", "Open"), ("claimed", "Claimed"), ("closed", "Closed"),
          ])
        PageList(store: requests, load: load) { request in
          if status == "all" || request.status == status { RequestRow(request: request) }
        }
        if requests.loaded && requests.items.isEmpty {
          EmptyState(
            title: "Bring an idea to your neighborhood", symbol: "hands.sparkles",
            message: "Post a local problem and pin where help is needed.")
        }
      }.padding(20)
    }.pageBackground().appNavigationTitle("My projects")
      .task(id: app.revision) { await load(true) }.refreshable { await load(true) }
  }
  private func load(_ reset: Bool) async { await requests.load(api, "/requests", reset: reset) }
}

struct RequesterOpportunitiesView: View {
  @Environment(AppModel.self) private var app
  @Environment(APIClient.self) private var api
  @State private var opportunities = PageStore<Opportunity>()
  @State private var status = "all"
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        FeatureBanner(title: "Build with\nthe right people.", symbol: "person.2.fill")
        NavigationLink("Start a project", value: Route.startProject).buttonStyle(
          AppButtonStyle.primary)
        AppSegmentedControl(
          title: "Status", selection: $status,
          options: [
            ("all", "All"), ("open", "Open"), ("closed", "Closed"),
          ])
        PageList(store: opportunities, load: load) { opportunity in
          if status == "all" || opportunity.status == status {
            OpportunityRow(opportunity: opportunity)
          }
        }
        if opportunities.loaded && opportunities.items.isEmpty {
          EmptyState(
            title: "Find someone to build with", symbol: "briefcase",
            message: "Post a paid or volunteer opportunity to see ranked candidates.")
        }
        NavigationLink("Browse discoverable developers", value: Route.discovery)
      }.padding(20)
    }.pageBackground().appNavigationTitle("Opportunities")
      .task(id: app.revision) { await load(true) }.refreshable { await load(true) }
  }
  private func load(_ reset: Bool) async {
    await opportunities.load(api, "/opportunities/mine", reset: reset)
  }
}

struct DiscoveryView: View {
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @State private var developers = PageStore<Developer>()
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 18) {
        FeatureBanner(title: "Find your\nnext collaborator.", symbol: "person.2.fill")
        Text("Only developers who chose to be visible appear here. Contact details are not shared.")
          .foregroundStyle(Theme.muted)
        PageList(store: developers, load: load) { developer in
          NavigationLink(value: Route.developer(developer.id)) {
            VStack(alignment: .leading, spacing: 10) {
              HStack(spacing: 14) {
                Image(systemName: "person.crop.square").font(.system(size: 25)).frame(
                  width: 50, height: 50
                )
                .background(Theme.softAccent, in: RoundedRectangle(cornerRadius: 16))
                .accessibilityHidden(
                  true)
                Text(developer.name).font(Theme.title(25))
                  .fixedSize(horizontal: false, vertical: true)
                  .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "arrow.up.right").accessibilityHidden(true)
              }
              Text("\(developer.city) · \(developer.weeklyHours) hrs / week").font(Theme.metadata)
              Text(developer.bio).lineLimit(3)
              Text(developer.skills.map(\.name).joined(separator: " / ")).font(Theme.metadata)
              StatusBadge(text: developer.available ? "Available" : "Not available")
            }.paperCard()
          }.buttonStyle(.plain)
        }
        if developers.loaded && developers.items.isEmpty {
          EmptyState(title: "No discoverable developers yet", symbol: "person.2")
        }
      }.padding(20)
    }.pageBackground().appNavigationTitle("Developers").task(
      id: app.revision
    ) { await load(true) }
    .refreshable {
      await load(true)
    }
  }
  private func load(_ reset: Bool) async { await developers.load(api, "/developers", reset: reset) }
}
