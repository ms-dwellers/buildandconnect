import SwiftUI

struct OpportunityEditorView: View {
  var id: String?
  var initialPin: Pin?
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @Environment(\.dismiss) private var dismiss
  @State private var resource = Resource<Opportunity>()
  @State private var draft = OpportunityInput()
  @State private var initialized = false
  @State private var choosingPin = false
  @State private var consent = false
  @State private var action = ActionState()
  @State private var createdID: String?
  @State private var confirmDiscard = false
  @State private var submissionKey = UUID().uuidString
  @State private var draftWarning: String?
  private var draftKey: String { "\(app.identity)/opportunity/new" }
  var body: some View {
    Group {
      if app.role != .company {
        WrongRoleView(message: "Only company accounts can post opportunities.")
      } else if !initialized {
        ProgressView().task { await load() }
      } else if let error = resource.error {
        FailureView(error: error) { await load() }.padding(20)
      } else if let item = resource.value, item.ownerId != app.member?.user.id {
        WrongRoleView(message: "Only the opportunity owner can edit it.")
      } else if let createdID {
        VStack(spacing: 20) {
          EmptyState(title: "Opportunity posted", symbol: "checkmark.circle")
          NavigationLink("View candidates", value: Route.opportunity(createdID)).buttonStyle(
            RaisedButtonStyle())
        }.padding(20)
      } else {
        form
      }
    }.pageBackground().navigationTitle(id == nil ? "Post an opportunity" : "Edit opportunity")
      .navigationBarTitleDisplayMode(.inline)
      .task(id: draft) { await preserveDraft() }
      .sheet(isPresented: $choosingPin) {
        PinPicker(latitude: draft.latitude ?? 51.0447, longitude: draft.longitude ?? -114.0719) {
          pin in
          draft.latitude = pin.latitude
          draft.longitude = pin.longitude
          if draft.place?.isEmpty != false { draft.place = pin.place }
        }
      }
  }
  private var form: some View {
    Form {
      Section("The project") {
        TextField("Title", text: $draft.title).accessibilityIdentifier("opportunity.title")
        TextField("Description", text: $draft.description, axis: .vertical).lineLimit(5...12)
          .accessibilityIdentifier("opportunity.description")
        Text("At least 30 characters. Describe the work, technologies, and mentorship.").font(
          .footnote
        ).foregroundStyle(Theme.muted)
        Picker("Opportunity type", selection: $draft.kind) {
          Text("Volunteer").tag("volunteer")
          Text("Paid").tag("paid")
        }
        if draft.kind == "paid" { TextField("Compensation", text: optionalText(\.compensation)) }
        TextField("Expected commitment", text: optionalText(\.commitment))
      }
      Section {
        TagField(title: "Essential technologies", values: $draft.essentialTechnologies)
        TagField(title: "Causes and interests", values: $draft.interests)
        Stepper(
          "\(draft.minimumWeeklyHours)+ hours per week", value: $draft.minimumWeeklyHours,
          in: 1...80)
        CollaborationPicker(value: $draft.collaboration)
      } header: {
        Text("Who it suits")
      } footer: {
        Text(
          "Essential technologies exclude developers who do not meet them. Leave this empty to consider transferable skills."
        )
      }
      Section {
        TextField("City", text: $draft.city)
        Toggle("Open to remote developers", isOn: $draft.remote)
        Button(
          draft.latitude == nil ? "Add map pin" : "Adjust map pin",
          systemImage: "mappin.and.ellipse"
        ) { choosingPin = true }
        if draft.latitude != nil {
          TextField("Place name", text: optionalText(\.place))
          Button("Remove map pin", role: .destructive) {
            draft.latitude = nil
            draft.longitude = nil
            draft.place = nil
          }
        }
      } header: {
        Text("Location")
      } footer: {
        Text(
          "A pin is optional. Only open, pinned Calgary opportunities appear on the city map; others remain in opportunity lists."
        )
      }
      AIConsentSection(allowed: $consent)
      if let error = action.error { Section { FailureView(error: error) } }
      if (action.error as? APIError)?.status == 409, id != nil {
        Section {
          ConfirmAction(
            label: "Reload latest opportunity",
            consequence: "This replaces your unsaved changes with the latest opportunity."
          ) {
            await load()
            consent = false
            action.error = nil
          }
        }
      }
      if let draftWarning { Section { Text(draftWarning).foregroundStyle(Theme.error) } }
      Section {
        Button(
          action.busy ? "Analyzing and saving…" : id == nil ? "Post opportunity" : "Save changes"
        ) { Task { await save() } }
        .buttonStyle(RaisedButtonStyle()).listRowBackground(Color.clear)
        .disabled(action.busy || !consent || draft.title.isEmpty || draft.description.count < 30)
        .accessibilityIdentifier("opportunity.save")
        Button("Discard changes", role: .destructive) { confirmDiscard = true }
      }
    }.pageBackground().disabled(action.busy)
      .confirmationDialog(
        "Discard changes?", isPresented: $confirmDiscard, titleVisibility: .visible
      ) {
        Button("Discard changes", role: .destructive) {
          DraftCache.remove(key: draftKey)
          dismiss()
        }
        Button("Keep editing", role: .cancel) {}
      }
  }
  private func optionalText(_ path: WritableKeyPath<OpportunityInput, String?>) -> Binding<String> {
    Binding(
      get: { draft[keyPath: path] ?? "" }, set: { draft[keyPath: path] = $0.isEmpty ? nil : $0 })
  }
  private func load() async {
    if let id {
      await resource.load(api, "/opportunities/\(id)")
      if let opportunity = resource.value { draft = opportunity.input }
    } else if let saved = DraftCache.load(PostingDraft<OpportunityInput>.self, key: draftKey) {
      draft = saved.input
      submissionKey = saved.submissionKey
    }
    if id == nil, let initialPin {
      draft.latitude = initialPin.latitude
      draft.longitude = initialPin.longitude
      draft.place = initialPin.place
    }
    initialized = true
  }
  private func save() async {
    await action.run {
      var payload = draft
      if payload.kind != "paid" { payload.compensation = nil }
      let created: Created = try await api.send(
        id.map { "/opportunities/\($0)" } ?? "/opportunities",
        method: id == nil ? "POST" : "PUT", body: payload,
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
        PostingDraft(
          input: draft, submissionKey: submissionKey, selectedPin: draft.latitude != nil),
        key: draftKey)
      draftWarning = nil
    } catch is CancellationError {} catch {
      draftWarning =
        "This draft could not be saved on your device. Keep this screen open until you publish."
    }
  }
}
