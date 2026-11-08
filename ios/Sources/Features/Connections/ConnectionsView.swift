import SwiftUI

struct ConnectionsView: View {
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @Environment(\.scenePhase) private var scenePhase
  @State private var interests = PageStore<Interest>()
  @State private var filter = "all"
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Picker("Interest", selection: $filter) {
          Text("All").tag("all")
          Text("Received").tag("received")
          Text("Sent").tag("sent")
          Text("Connected").tag("connected")
        }.pickerStyle(.segmented)
        PageList(store: interests, load: load) { interest in
          if matchesFilter(interest) { InterestCard(interest: interest) { await load(true) } }
        }
        if interests.loaded && interests.items.isEmpty {
          EmptyState(
            title: "No interest yet", symbol: "person.2",
            message:
              "A connection forms when a company and developer both express interest in an opportunity."
          )
          Button("Explore opportunities") { app.selectedTab = .explore }.buttonStyle(
            RaisedButtonStyle())
        }
        Text("Connections record mutual interest. Contact details and messaging are not available.")
          .font(.footnote).foregroundStyle(Theme.muted)
      }.padding(20)
    }.pageBackground().navigationTitle("Connections")
      .task(id: app.revision) { await load(true) }.refreshable { await load(true) }
      .task(id: scenePhase) {
        guard scenePhase == .active else { return }
        while !Task.isCancelled {
          do { try await Task.sleep(for: .seconds(25)) } catch { return }
          await load(true)
        }
      }
  }
  private func matchesFilter(_ interest: Interest) -> Bool {
    switch filter {
    case "received": interest.theirs(app.role) && !interest.connected
    case "sent": interest.mine(app.role) && !interest.connected
    case "connected": interest.connected
    default: true
    }
  }
  private func load(_ reset: Bool) async { await interests.load(api, "/interests", reset: reset) }
}

struct InterestCard: View {
  let interest: Interest
  let reload: () async -> Void
  @Environment(AppModel.self) private var app
  @Environment(APIClient.self) private var api
  @State private var action = ActionState()
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text(interest.title).font(Theme.title(24))
      Text(app.role == .company ? interest.developerName : interest.companyName).foregroundStyle(
        Theme.muted)
      StatusBadge(
        text: interest.connected
          ? "Connected" : interest.theirs(app.role) ? "Interest received" : "Waiting for a reply")
      NavigationLink("Open opportunity", value: Route.opportunity(interest.opportunityId))
      if app.role == .company {
        NavigationLink("View consenting profile", value: Route.developer(interest.developerId))
      }
      if interest.mine(app.role) {
        ConfirmAction(
          label: "Withdraw interest",
          consequence: "This ends the connection if both sides were interested.",
          disabled: action.busy
        ) {
          await action.run {
            try await setInterest(
              api, opportunityId: interest.opportunityId,
              developerId: app.role == .company ? interest.developerId : nil,
              interested: false)
            await reload()
          }
        }
      } else {
        Text("Open the opportunity to review your current eligibility before expressing interest.")
          .font(.footnote).foregroundStyle(Theme.muted)
      }
      if let error = action.error { FailureView(error: error) }
    }.paperCard()
  }
}

func setInterest(_ api: APIClient, opportunityId: String, developerId: String?, interested: Bool)
  async throws
{
  struct Input: Encodable {
    let developerId: String?
    let interested: Bool
  }
  try await api.mutate(
    "/opportunities/\(opportunityId)/interest", method: "PUT",
    body: Input(developerId: developerId, interested: interested))
}
