import SwiftUI

struct OpportunityDetailView: View {
  let id: String
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @State private var opportunity = Resource<Opportunity>()
  @State private var ownMatch = Resource<OwnMatch>()
  @State private var matches = Resource<Ranked<DeveloperMatch>>()
  @State private var interests = PageStore<Interest>()
  @State private var action = ActionState()
  @State private var changingInterest = false
  @State private var changingDeveloperId: String?
  var body: some View {
    Group {
      if !app.signedIn {
        AuthenticationRequired(route: .opportunity(id))
      } else {
        ScrollView {
          VStack(alignment: .leading, spacing: 20) {
            if let error = opportunity.error { FailureView(error: error) { await load() } }
            if let item = opportunity.value {
              IdeaArtwork(category: item.kind == "paid" ? .paid : .volunteer)
              summary(item)
              AnalysisCard(analysis: item.analysis)
              if item.ownerId == app.member?.user.id {
                ownerActions(item)
                candidates(item)
              } else if app.role == .developer {
                personalFit(item)
              }
              if item.latitude != nil && item.status == "open" {
                NavigationLink("View on Calgary map", value: Route.map(id))
              }
              if let error = action.error { FailureView(error: error) }
            } else if opportunity.loading {
              ProgressView("Loading opportunity")
            }
          }.padding(20)
        }.pageBackground().task(id: app.revision) { await load() }.refreshable { await load() }
      }
    }.appNavigationTitle("Opportunity")
  }

  private func summary(_ item: Opportunity) -> some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        StatusBadge(text: item.status)
        Text(item.kind.capitalized).font(Theme.metadata)
      }
      Text(item.title).font(Theme.title())
      Text(item.remote ? "Remote or \(item.city)" : item.place ?? item.city).foregroundStyle(
        Theme.muted)
      Text(item.description)
      Divider()
      LabeledContent("Compensation", value: item.compensation ?? item.kind.capitalized)
      LabeledContent(
        "Commitment", value: item.commitment ?? "\(item.minimumWeeklyHours)+ hrs / week")
      LabeledContent("Collaboration", value: item.collaboration)
      if !item.essentialTechnologies.isEmpty {
        Text("Essential: \(item.essentialTechnologies.joined(separator: ", "))")
      }
    }.paperCard()
  }

  @ViewBuilder private func ownerActions(_ item: Opportunity) -> some View {
    NavigationLink("Edit opportunity", value: Route.editOpportunity(id)).buttonStyle(
      AppButtonStyle())
    ConfirmAction(
      label: item.status == "open" ? "Close opportunity" : "Reopen opportunity",
      consequence: item.status == "open"
        ? "This stops matching and removes the pin. Existing connections remain."
        : "This makes the opportunity available for matching again.", disabled: action.busy
    ) {
      await action.run {
        try await api.mutate(
          "/opportunities/\(id)", method: "PATCH",
          body: ["status": item.status == "open" ? "closed" : "open"])
        await load()
        app.changed()
      }
    }
  }

  @ViewBuilder private func candidates(_ item: Opportunity) -> some View {
    Text("Ranked candidates").font(Theme.title(27))
    if item.status == "closed" {
      Text("Reopen this opportunity to see candidates. Existing interest remains in Connections.")
        .foregroundStyle(Theme.muted)
    } else {
      if let error = matches.error { FailureView(error: error) { await load() } }
      if let result = matches.value {
        Text(
          "\(result.total) eligible developers. Scores support your judgment; they do not predict success."
        ).font(Theme.caption).foregroundStyle(Theme.muted)
        if result.data.isEmpty {
          EmptyState(title: "No eligible developers yet", symbol: "person.2")
        }
        ForEach(result.data) { match in
          VStack(alignment: .leading, spacing: 14) {
            NavigationLink(match.name, value: Route.developer(match.developerId)).font(
              Theme.title(24))
            MatchBreakdown(match: match)
            interestControls(developerId: match.developerId, canExpress: true)
          }.paperCard()
        }
        if result.total > result.data.count {
          Text("Showing the first \(result.data.count) ranked candidates.").font(Theme.caption)
        }
      }
    }
  }

  @ViewBuilder private func personalFit(_ item: Opportunity) -> some View {
    Text("Your fit").font(Theme.title(27))
    if (ownMatch.error as? APIError)?.status == 404 {
      NavigationLink("Create profile to see your fit", value: Route.setupProfile).buttonStyle(
        AppButtonStyle.primary)
    } else if let error = ownMatch.error {
      FailureView(error: error) { await load() }
    }
    if let fit = ownMatch.value {
      VStack(alignment: .leading, spacing: 14) {
        if let match = fit.data {
          MatchBreakdown(match: match)
        } else {
          Text("Not eligible for this opportunity yet").font(Theme.subheading)
          ForEach(fit.ineligibleReasons, id: \.self) { Text($0) }
          NavigationLink("Review profile and preferences", value: Route.profile)
        }
        interestControls(developerId: nil, canExpress: fit.data != nil && item.status == "open")
      }.paperCard()
    }
  }

  @ViewBuilder private func interestControls(developerId: String?, canExpress: Bool) -> some View {
    let current = interests.items.first { developerId == nil || $0.developerId == developerId }
    let mine = current?.mine(app.role) ?? false
    if let error = interests.error { FailureView(error: error) { await loadInterests() } }
    if current?.connected == true {
      StatusBadge(text: "Connected")
    } else if current?.theirs(app.role) == true {
      StatusBadge(text: "Interest received")
    }
    if mine {
      ConfirmAction(
        label: "Withdraw interest",
        consequence: "This ends the connection if the other side is interested.",
        disabled: action.busy
      ) {
        await toggleInterest(developerId, false)
      }
    } else if canExpress && interests.loaded && interests.error == nil {
      Button("I'm interested") { Task { await toggleInterest(developerId, true) } }
        .buttonStyle(AppButtonStyle.primary)
        .buttonLoading(changingInterest && changingDeveloperId == developerId)
        .disabled(action.busy)
    }
  }

  private func toggleInterest(_ developerId: String?, _ interested: Bool) async {
    guard !action.busy else { return }
    changingInterest = true
    changingDeveloperId = developerId
    defer { changingInterest = false }
    await action.run {
      do {
        try await setInterest(
          api, opportunityId: id, developerId: developerId, interested: interested)
      } catch {
        await load()
        throw error
      }
      await loadInterests()
      app.changed()
    }
  }
  private func loadInterests() async {
    guard !interests.loading else { return }
    await interests.load(api, "/interests", query: ["opportunityId": id])
    while interests.nextCursor != nil && interests.error == nil && !Task.isCancelled {
      await interests.load(api, "/interests", reset: false, query: ["opportunityId": id])
    }
  }
  private func load() async {
    await opportunity.load(api, "/opportunities/\(id)")
    if app.role == .developer {
      await ownMatch.load(api, "/opportunities/\(id)/match")
      await loadInterests()
    } else if opportunity.value?.ownerId == app.member?.user.id {
      if opportunity.value?.status == "open" {
        await matches.load(api, "/opportunities/\(id)/matches", query: ["limit": "100"])
      }
      await loadInterests()
    }
  }
}

struct MatchBreakdown: View {
  let match: DeveloperMatch
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      StatusBadge(text: "\(Int(match.score.rounded()))% match")
      Text(match.explanation)
      DisclosureGroup("Match breakdown") {
        ForEach(match.scores.factors, id: \.0) { title, score in
          LabeledContent(title, value: "\(Int(score.rounded()))%").padding(.vertical, 5)
        }
        if !match.existingRelevantSkills.isEmpty {
          Text("Relevant skills: \(match.existingRelevantSkills.joined(separator: ", "))").padding(
            .vertical, 5)
        }
        if !match.skillsToDevelop.isEmpty {
          Text("Room to grow: \(match.skillsToDevelop.joined(separator: ", "))").padding(
            .vertical, 5)
        }
      }
    }
  }
}
