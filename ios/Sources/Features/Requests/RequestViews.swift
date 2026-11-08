import SwiftUI

struct RequestDetailView: View {
  let id: String
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @State private var request = Resource<CommunityRequest>()
  @State private var profile = Resource<Developer>()
  @State private var action = ActionState()
  var body: some View {
    Group {
      if !app.signedIn {
        AuthenticationRequired(route: .request(id))
      } else if app.role != .developer && app.role != .requester {
        WrongRoleView(
          message:
            "Developer accounts can respond to community requests. Requesters can manage only their own requests."
        )
      } else {
        ScrollView {
          VStack(alignment: .leading, spacing: 20) {
            if let error = request.error { FailureView(error: error) { await load() } }
            if let item = request.value {
              IdeaArtwork(category: .community)
              VStack(alignment: .leading, spacing: 14) {
                StatusBadge(text: item.status)
                Text(item.title).font(Theme.title())
                Text(item.place).font(Theme.metadata)
                Text(item.ownerName).foregroundStyle(Theme.muted)
                Text(item.description)
                if let name = item.claimantName {
                  Text("Accepted by \(name)").font(Theme.subheading)
                }
              }.paperCard()
              AnalysisCard(analysis: item.analysis)
              actions(item)
              if item.status != "closed" {
                NavigationLink("View on map", value: Route.map(item.id))
              }
            } else if request.loading {
              ProgressView("Loading request")
            }
            if let error = action.error { FailureView(error: error) }
          }.padding(20)
        }.pageBackground().task(id: app.revision) { await load() }.refreshable { await load() }
      }
    }.appNavigationTitle("Community request")
  }

  @ViewBuilder private func actions(_ item: CommunityRequest) -> some View {
    if item.ownerId == app.member?.user.id {
      if item.status == "open" {
        NavigationLink("Edit request", value: Route.editRequest(id)).buttonStyle(AppButtonStyle())
      }
      if item.status == "claimed" {
        ConfirmAction(
          label: "Release request",
          consequence: "The developer is unassigned and the request reopens.", disabled: action.busy
        ) {
          await mutate("/requests/\(id)/release")
        }
      }
      if item.status != "closed" {
        ConfirmAction(
          label: "Close request",
          consequence:
            "This removes it from the map. Closed requests cannot be reopened or edited.",
          destructive: true, disabled: action.busy
        ) {
          await mutate("/requests/\(id)", method: "PATCH", body: ["status": "closed"])
        }
      }
    } else if app.role == .developer {
      if item.claimedBy == app.member?.user.id {
        ConfirmAction(
          label: "Release request", consequence: "This request reopens for other developers.",
          disabled: action.busy
        ) {
          await mutate("/requests/\(id)/release")
        }
      } else if item.status == "open" {
        if (profile.error as? APIError)?.status == 404 {
          NavigationLink("Create a profile to pick up ideas", value: Route.setupProfile)
            .buttonStyle(
              AppButtonStyle.primary)
        } else if let error = profile.error {
          FailureView(error: error) { await load() }
        } else if let developer = profile.value {
          if developer.location == nil {
            NavigationLink("Set your area to pick up ideas", value: Route.area).buttonStyle(
              AppButtonStyle.primary)
          } else {
            ConfirmAction(
              label: "Pick up this idea",
              consequence:
                "The requester will see your name. The server checks your area and eligibility before assigning it exclusively to you.",
              disabled: action.busy
            ) {
              await mutate("/requests/\(id)/accept")
            }.buttonStyle(AppButtonStyle.primary)
          }
        }
      }
    }
  }
  private func load() async {
    await request.load(api, "/requests/\(id)")
    if app.role == .developer { await profile.load(api, "/developers/me") }
  }
  private func mutate(_ path: String, method: String = "POST", body: [String: String] = [:]) async {
    await action.run {
      do { try await api.mutate(path, method: method, body: body) } catch {
        await load()
        throw error
      }
      await load()
      app.changed()
    }
  }
}

struct RequestEditorView: View {
  var id: String?
  var initialPin: Pin?
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @Environment(\.dismiss) private var dismiss
  @State private var resource = Resource<CommunityRequest>()
  @State private var draft = RequestInput()
  @State private var initialized = false
  @State private var selectedPin = false
  @State private var choosingPin = false
  @State private var consent = false
  @State private var action = ActionState()
  @State private var createdID: String?
  @State private var confirmDiscard = false
  @State private var submissionKey = UUID().uuidString
  @State private var draftWarning: String?
  private var draftKey: String { "\(app.identity)/request/new" }
  var body: some View {
    Group {
      if app.role != .requester {
        WrongRoleView(message: "Only requester accounts can publish community requests.")
      } else if !initialized {
        ProgressView().task { await load() }
      } else if let error = resource.error {
        FailureView(error: error) { await load() }.padding(20)
      } else if let item = resource.value,
        item.ownerId != app.member?.user.id || item.status != "open"
      {
        EmptyState(
          title: "This request cannot be edited", symbol: "lock",
          message: "Only the owner can edit an open request. Release a claim before editing."
        ).padding(20)
      } else if let createdID {
        VStack(spacing: 20) {
          EmptyState(title: "Request posted", symbol: "checkmark.circle")
          NavigationLink("View request", value: Route.request(createdID)).buttonStyle(
            AppButtonStyle.primary)
        }.padding(20)
      } else {
        form
      }
    }.pageBackground().appNavigationTitle(id == nil ? "Post a request" : "Edit request")
      .navigationBarTitleDisplayMode(.inline)
      .task(id: draft) { await preserveDraft() }
      .sheet(isPresented: $choosingPin) {
        PinPicker(latitude: draft.latitude, longitude: draft.longitude) { pin in
          draft.latitude = pin.latitude
          draft.longitude = pin.longitude
          selectedPin = true
          if draft.place.isEmpty { draft.place = pin.place }
        }
      }
  }
  private var form: some View {
    Form {
      AppSection("What do you need?") {
        AppField(title: "Title") {
          TextField("Title", text: $draft.title, prompt: Text("Title").foregroundStyle(Theme.muted))
            .accessibilityIdentifier("request.title")
        }
        AppField(title: "Description") {
          TextField(
            "Description", text: $draft.description,
            prompt: Text("Description").foregroundStyle(Theme.muted), axis: .vertical
          ).lineLimit(5...12)
            .accessibilityIdentifier("request.description")
        }
        Text("Describe the work in at least 30 characters.").font(Theme.caption).foregroundStyle(
          Theme.muted)
      }
      Section {
        Button(selectedPin ? "Adjust map pin" : "Choose map pin", systemImage: "mappin.and.ellipse")
        { choosingPin = true }
        AppField(title: "Place name") {
          TextField(
            "Place name", text: $draft.place,
            prompt: Text("Place name").foregroundStyle(Theme.muted)
          ).accessibilityIdentifier("request.place")
        }
        Text(
          "Guests see an approximate area. Developers see your exact pin while the request is open. Choose a landmark, not a home address."
        )
        .font(Theme.caption).foregroundStyle(Theme.muted)
      } header: {
        Text("Where is help needed?").font(Theme.metadata).textCase(nil)
      }
      AIConsentSection(allowed: $consent)
      if let error = action.error { Section { FailureView(error: error) } }
      if (action.error as? APIError)?.status == 409, id != nil {
        Section {
          ConfirmAction(
            label: "Reload latest request",
            consequence: "This replaces your unsaved changes with the latest request."
          ) {
            await load()
            consent = false
            action.error = nil
          }
        }
      }
      if let draftWarning { Section { Text(draftWarning).foregroundStyle(Theme.error) } }
      Section {
        Button(id == nil ? "Post request" : "Save changes") { Task { await save() } }
          .buttonStyle(AppButtonStyle.primary).buttonLoading(action.busy).listRowBackground(
            Color.clear
          )
          .disabled(
            action.busy || !consent || !selectedPin || draft.title.isEmpty || draft.place.isEmpty
              || draft.description.count < 30
          )
          .accessibilityIdentifier("request.save")
        Button("Discard changes", role: .destructive) { confirmDiscard = true }
      }
    }.pageBackground().disabled(action.busy)
      .sheet(isPresented: $confirmDiscard) {
        AppDialog(title: "Discard changes?", message: "Your unsaved edits will be removed.") {
          Button("Discard changes", role: .destructive) {
            DraftCache.remove(key: draftKey)
            confirmDiscard = false
            dismiss()
          }.buttonStyle(AppButtonStyle(variant: .destructive, fullWidth: true))
          Button("Keep editing") { confirmDiscard = false }.buttonStyle(
            AppButtonStyle(fullWidth: true))
        }
      }
  }
  private func load() async {
    if let id {
      await resource.load(api, "/requests/\(id)")
      if let request = resource.value {
        draft = request.input
        selectedPin = true
      }
    } else if let saved = DraftCache.load(PostingDraft<RequestInput>.self, key: draftKey) {
      draft = saved.input
      submissionKey = saved.submissionKey
      selectedPin = saved.selectedPin
    }
    if id == nil, let initialPin {
      draft.latitude = initialPin.latitude
      draft.longitude = initialPin.longitude
      draft.place = initialPin.place
      selectedPin = true
    }
    initialized = true
  }
  private func save() async {
    await action.run {
      let created: Created = try await api.send(
        id.map { "/requests/\($0)" } ?? "/requests",
        method: id == nil ? "POST" : "PUT", body: draft,
        idempotencyKey: id == nil ? submissionKey : nil,
        expectedRevision: id == nil ? nil : resource.value?.revision)
      DraftCache.remove(key: draftKey)
      app.changed()
      if id != nil { dismiss() } else { createdID = created.id }
    }
  }
  private func preserveDraft() async {
    guard initialized, id == nil, createdID == nil else { return }
    do {
      try await Task.sleep(for: .milliseconds(350))
      guard createdID == nil else { return }
      try DraftCache.save(
        PostingDraft(input: draft, submissionKey: submissionKey, selectedPin: selectedPin),
        key: draftKey)
      draftWarning = nil
    } catch is CancellationError {} catch {
      draftWarning =
        "This draft could not be saved on your device. Keep this screen open until you publish."
    }
  }
}

struct AnalysisCard: View {
  let analysis: Analysis
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("Project snapshot").font(Theme.title(24))
      LabeledContent(
        "Difficulty", value: "\(analysis.difficulty) / 5 · \(analysis.experienceLevel)")
      if !analysis.requiredTechnologies.isEmpty {
        Text(analysis.requiredTechnologies.joined(separator: " / ")).font(Theme.metadata)
      }
      if !analysis.responsibilities.isEmpty {
        DisclosureGroup("Responsibilities") {
          ForEach(analysis.responsibilities, id: \.self) { Text($0).padding(.vertical, 4) }
        }
      }
      if !analysis.learningOpportunities.isEmpty {
        Text("You could learn").font(Theme.subheading)
        Text(analysis.learningOpportunities.joined(separator: ", "))
      }
      if analysis.mentorshipAvailable { Label("Mentorship offered", systemImage: "person.2") }
      Text("AI-estimated requirements. Review them before acting on a match.").font(Theme.caption)
        .foregroundStyle(Theme.muted)
    }.paperCard()
  }
}
