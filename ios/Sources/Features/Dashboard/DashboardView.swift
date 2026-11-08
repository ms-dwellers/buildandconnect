import SwiftUI

struct DashboardView: View {
  @Environment(AppModel.self) private var app
  var body: some View {
    Group {
      switch app.role {
      case .developer: DeveloperHomeView()
      case .requester: RequesterHomeView()
      case .company: CompanyHomeView()
      case .recruiter: DiscoveryView()
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
        Text(opportunity.title).font(Theme.title(23))
        Text(
          opportunity.remote
            ? "Remote · \(opportunity.city)" : opportunity.place ?? opportunity.city
        )
        .font(Theme.metadata).foregroundStyle(Theme.muted)
        Text(opportunity.description).lineLimit(2).foregroundStyle(Theme.muted)
        Label("View opportunity", systemImage: "arrow.up.right").font(.footnote)
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
        Text(request.title).font(Theme.title(23))
        Text(request.place).font(Theme.metadata).foregroundStyle(Theme.muted)
        Text(request.description).lineLimit(2)
        if let name = request.claimantName { Text("Accepted by \(name)").font(.footnote) }
        Label("View request", systemImage: "arrow.up.right").font(.footnote)
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
        if profile.loading && profile.value == nil { ProgressView("Loading your work") }
        if (profile.error as? APIError)?.status == 404 {
          EmptyState(
            title: "Create your developer profile", symbol: "person.crop.circle",
            message: "Add skills and learning goals to find your fit.")
          NavigationLink("Create profile", value: Route.profile).buttonStyle(RaisedButtonStyle())
        } else if let error = profile.error {
          FailureView(error: error) { await load() }
        }
        if let developer = profile.value {
          VStack(alignment: .leading, spacing: 12) {
            Text(developer.name).font(Theme.title(26))
            Text(developer.bio).lineLimit(2).foregroundStyle(Theme.muted)
            HStack {
              StatusBadge(text: developer.available ? "Available" : "Unavailable")
              StatusBadge(text: developer.discoverable ? "Discoverable" : "Private")
            }
            NavigationLink("Edit profile and visibility", value: Route.profile)
          }.paperCard()
          Text("Accepted requests").font(Theme.title(27))
          PageList(store: claimed, load: loadClaimed) { RequestRow(request: $0) }
          if claimed.loaded && claimed.items.isEmpty {
            EmptyState(
              title: "Nothing accepted yet", symbol: "hands.sparkles",
              message: "Choose a nearby request when you are ready.")
          }
          Text("Nearby requests").font(Theme.title(27))
          if developer.location == nil {
            NavigationLink("Set your private area", value: Route.area).buttonStyle(
              RaisedButtonStyle())
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
                .footnote)
            }
          }
        }
        Text("Open opportunities").font(Theme.title(27))
        PageList(store: opportunities, load: loadOpportunities) { OpportunityRow(opportunity: $0) }
        if opportunities.loaded && opportunities.items.isEmpty {
          EmptyState(title: "No open opportunities", symbol: "briefcase")
        }
      }.padding(20)
    }.pageBackground().navigationTitle("Good work starts here")
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
        NavigationLink("Post a request", value: Route.newRequest).buttonStyle(RaisedButtonStyle())
        Picker("Status", selection: $status) {
          Text("All").tag("all")
          Text("Open").tag("open")
          Text("Claimed").tag("claimed")
          Text("Closed").tag("closed")
        }.pickerStyle(.segmented)
        PageList(store: requests, load: load) { request in
          if status == "all" || request.status == status { RequestRow(request: request) }
        }
        if requests.loaded && requests.items.isEmpty {
          EmptyState(
            title: "Bring an idea to your neighborhood", symbol: "hands.sparkles",
            message: "Post a local problem and pin where help is needed.")
        }
      }.padding(20)
    }.pageBackground().navigationTitle("My requests")
      .task(id: app.revision) { await load(true) }.refreshable { await load(true) }
  }
  private func load(_ reset: Bool) async { await requests.load(api, "/requests", reset: reset) }
}

struct CompanyHomeView: View {
  @Environment(AppModel.self) private var app
  @Environment(APIClient.self) private var api
  @State private var opportunities = PageStore<Opportunity>()
  @State private var status = "all"
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        NavigationLink("Post an opportunity", value: Route.newOpportunity).buttonStyle(
          RaisedButtonStyle())
        Picker("Status", selection: $status) {
          Text("All").tag("all")
          Text("Open").tag("open")
          Text("Closed").tag("closed")
        }.pickerStyle(.segmented)
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
        NavigationLink("Browse discoverable developers") { DiscoveryView() }
      }.padding(20)
    }.pageBackground().navigationTitle("Opportunities")
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
        Text("Only developers who chose to be visible appear here. Contact details are not shared.")
          .foregroundStyle(Theme.muted)
        PageList(store: developers, load: load) { developer in
          NavigationLink(value: Route.developer(developer.id)) {
            VStack(alignment: .leading, spacing: 10) {
              Text(developer.name).font(Theme.title(25))
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
    }.pageBackground().navigationTitle("Developers").task(id: app.revision) { await load(true) }
      .refreshable {
        await load(true)
      }
  }
  private func load(_ reset: Bool) async { await developers.load(api, "/developers", reset: reset) }
}
