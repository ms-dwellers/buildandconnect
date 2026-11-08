import SwiftUI

struct StartProjectView: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @State private var action = ActionState()
  @State private var draftID = UUID().uuidString.lowercased()
  @State private var createdID: String?
  var body: some View {
    Group {
      if let createdID {
        ProjectDraftEditorView(id: createdID)
      } else if app.role != .requester {
        WrongRoleView(message: "Requester accounts can start projects.")
      } else {
        ScrollView {
          VStack(alignment: .leading, spacing: 24) {
            Text("Start a project").font(Theme.title())
            Text("Start privately. Review the details before you publish anything.")
              .foregroundStyle(Theme.muted)
            VStack(alignment: .leading, spacing: 16) {
              Text("Write it yourself").font(Theme.title(24))
              Text(
                "Save an incomplete draft, come back on another device, and publish when you're ready."
              )
              Button("Create private draft") { Task { await create() } }
                .buttonStyle(AppButtonStyle.primary).buttonLoading(action.busy)
                .accessibilityIdentifier("project.createDraft")
            }.paperCard()
            NavigationLink("Post a short local volunteer request instead", value: Route.newRequest)
              .buttonStyle(AppButtonStyle(variant: .ghost, fullWidth: true))
            if let error = action.error { FailureView(error: error) }
          }.padding(20)
        }.pageBackground()
      }
    }.appNavigationTitle(createdID == nil ? "Start project" : "Project draft")
      .toolbar {
        if createdID == nil {
          AppToolbarItem(placement: .topBarLeading) {
            Button("Back", systemImage: "chevron.left") { dismiss() }.disabled(action.busy)
          }
        }
      }
  }
  private func create() async {
    struct Create: Encodable {
      let id: String
      let content: ProjectDraftContent
    }
    await action.run {
      let result: ProjectDraft = try await api.send(
        "/project-drafts", body: Create(id: draftID, content: ProjectDraftContent()))
      createdID = result.id
      app.changed()
    }
  }
}

struct ProjectDraftList: View {
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @State private var drafts = Resource<[ProjectDraft]>()
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      if let error = drafts.error { FailureView(error: error) { await load() } }
      if drafts.loading && drafts.value == nil { ProgressView("Loading private drafts") }
      if let items = drafts.value, !items.isEmpty {
        Text("Private drafts").font(Theme.title(26))
        ForEach(items) { draft in
          NavigationLink(value: Route.projectDraft(draft.id)) {
            VStack(alignment: .leading, spacing: 8) {
              Text(draft.content.title.isEmpty ? "Untitled project" : draft.content.title).font(
                Theme.title(23))
              Text("Saved privately. Not published.").font(Theme.caption).foregroundStyle(
                Theme.muted)
              if !draft.content.description.isEmpty { Text(draft.content.description).lineLimit(2) }
            }.paperCard()
          }.buttonStyle(.plain)
        }
      }
    }.task(id: app.revision) { await load() }
  }
  private func load() async { await drafts.load(api, "/project-drafts") }
}

struct ProjectDraftEditorView: View {
  let id: String
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  var body: some View {
    if app.role == .requester {
      ProjectDraftEditorContent(id: id, api: api).id(id)
    } else {
      WrongRoleView(message: "Only the requester who owns a draft can edit it.")
    }
  }
}

private struct ProjectDraftEditorContent: View {
  @Environment(AppModel.self) private var app
  @Environment(\.dismiss) private var dismiss
  @State private var store: ProjectDraftStore
  @State private var consent = false
  @State private var choosingPin = false
  @State private var confirmDiscard = false
  @State private var publishedID: String?
  @State private var exiting = false
  @State private var publishing = false

  init(id: String, api: APIClient) {
    _store = State(initialValue: ProjectDraftStore(id: id, api: api))
  }

  var body: some View {
    @Bindable var store = store
    Group {
      if let publishedID = publishedID ?? store.publishedID {
        VStack(alignment: .leading, spacing: 20) {
          Text("Project published").font(Theme.title())
          Text(
            "Your saved draft is linked to this opportunity. Publishing again will not create another one."
          )
          NavigationLink("Review published project", value: Route.opportunity(publishedID))
            .buttonStyle(AppButtonStyle.primary)
          Button("Back to my projects") {
            app.changed()
            dismiss()
          }.buttonStyle(AppButtonStyle())
        }.padding(24)
      } else if store.record == nil {
        VStack(spacing: 20) {
          if store.loading { ProgressView("Opening private draft") }
          if let error = store.error { FailureView(error: error) { await store.load() } }
        }.padding(24)
      } else {
        Form {
          Section {
            Text(
              store.saving
                ? "Saving privately…" : store.dirty ? "Unsaved changes" : "Saved privately"
            )
            .font(Theme.caption).foregroundStyle(Theme.muted)
            .accessibilityIdentifier("project.saveStatus")
            Text(
              "Drafts are private and can be resumed on another device. Saving is not publishing."
            )
            .font(Theme.caption)
          }
          ProjectDraftFields(content: $store.content, choosingPin: $choosingPin)
            .disabled(store.performingAction || store.conflict || exiting)
          if let error = store.error { Section { FailureView(error: error) } }
          if store.conflict {
            Section {
              Text(
                "Another device changed this draft. Your edits are still shown; reload only when you are ready to replace them."
              )
              ConfirmAction(
                label: "Reload saved draft",
                consequence: "This replaces your unsaved edits with the server version."
              ) {
                await store.load()
                consent = false
              }
            }
          } else if store.error != nil && store.dirty {
            Section {
              Button("Retry saving") { Task { _ = await store.saveNow() } }.disabled(
                store.performingAction)
            }
          }
          if store.error != nil && store.dirty {
            Section {
              ConfirmAction(
                label: "Leave without saving",
                consequence:
                  "Edits not acknowledged by the server will be lost. Your last saved draft stays available."
              ) { dismiss() }
            }
          }
          Section {
            Toggle("Allow AI analysis when I publish", isOn: $consent)
            Text(
              "Publishing makes this an open opportunity. If analysis fails, your private draft remains saved."
            )
            .font(Theme.caption).foregroundStyle(Theme.muted)
            Button("Publish opportunity") { Task { await publish() } }
              .buttonStyle(AppButtonStyle.primary).buttonLoading(publishing)
              .disabled(!consent || !store.content.readyToPublish || store.conflict || exiting)
              .accessibilityIdentifier("project.publish")
            Button("Save and exit") { Task { await saveAndExit() } }
              .buttonStyle(AppButtonStyle(fullWidth: true)).buttonLoading(exiting)
              .disabled(store.performingAction || store.conflict)
              .accessibilityIdentifier("project.saveExit")
            Button("Discard private draft", role: .destructive) { confirmDiscard = true }
              .disabled(store.performingAction || store.conflict || exiting)
          }
        }.pageBackground()
      }
    }.pageBackground().appNavigationTitle("Project draft")
      .toolbar {
        AppToolbarItem(placement: .topBarLeading) {
          Button("Back", systemImage: "chevron.left") { Task { await saveAndExit() } }
            .disabled(store.performingAction || exiting)
        }
      }
      .task { await store.load() }
      .onChange(of: store.content) { _, _ in store.scheduleSave() }
      .onDisappear { store.saveOnDeparture() }
      .interactiveDismissDisabled(store.dirty || store.saving || store.performingAction)
      .sheet(isPresented: $choosingPin) {
        PinPicker(
          latitude: store.content.pin?.latitude ?? 51.0447,
          longitude: store.content.pin?.longitude ?? -114.0719
        ) { pin in
          store.content.pin = .init(
            latitude: pin.latitude, longitude: pin.longitude, place: pin.place)
          store.content.place = pin.place
        }
      }
      .sheet(isPresented: $confirmDiscard) {
        AppDialog(
          title: "Discard private draft?",
          message:
            "This permanently removes the saved draft. It does not close a published opportunity."
        ) {
          Button("Discard draft", role: .destructive) {
            confirmDiscard = false
            Task {
              if await store.discard() {
                app.changed()
                dismiss()
              }
            }
          }.buttonStyle(AppButtonStyle(variant: .destructive, fullWidth: true))
          Button("Keep editing") { confirmDiscard = false }.buttonStyle(
            AppButtonStyle(fullWidth: true))
        }
      }
  }

  private func saveAndExit() async {
    guard !exiting else { return }
    exiting = true
    defer { exiting = false }
    if store.publishedID != nil || store.record == nil {
      app.changed()
      dismiss()
    } else if await store.saveNow() {
      app.changed()
      dismiss()
    }
  }
  private func publish() async {
    publishing = true
    defer { publishing = false }
    publishedID = await store.publish()
    if publishedID != nil { app.changed() }
  }
}

private struct ProjectDraftFields: View {
  @Binding var content: ProjectDraftContent
  @Binding var choosingPin: Bool
  var body: some View {
    AppSection("The project") {
      AppField(title: "Title") {
        TextField("Title", text: $content.title, prompt: Text("Title").foregroundStyle(Theme.muted))
          .accessibilityLabel("Project title").accessibilityIdentifier("project.title")
      }
      AppField(title: "Description") {
        TextField(
          "Description", text: $content.description,
          prompt: Text("What help do you need?").foregroundStyle(Theme.muted), axis: .vertical
        )
        .lineLimit(4...12).accessibilityLabel("Project description").accessibilityIdentifier(
          "project.description")
      }
      AppSelect(
        title: "Opportunity type", selection: $content.kind,
        options: [("", "Choose a type"), ("volunteer", "Volunteer"), ("paid", "Paid")])
      if content.kind == "paid" {
        AppField(title: "Compensation") {
          TextField(
            "Compensation", text: $content.compensation,
            prompt: Text("Compensation").foregroundStyle(Theme.muted)
          ).accessibilityLabel("Compensation")
        }
      }
      AppField(title: "Expected commitment") {
        TextField(
          "Expected commitment", text: $content.commitment,
          prompt: Text("Expected commitment").foregroundStyle(Theme.muted)
        ).accessibilityLabel("Expected commitment")
      }
    }
    AppSection("Who it suits") {
      AppField(title: "Essential technologies, separated by commas") {
        TextField(
          "Essential technologies", text: $content.essentialTechnologies,
          prompt: Text("Optional").foregroundStyle(Theme.muted)
        ).accessibilityLabel("Essential technologies")
      }
      AppField(title: "Causes and interests, separated by commas") {
        TextField(
          "Causes and interests", text: $content.interests,
          prompt: Text("Optional").foregroundStyle(Theme.muted)
        ).accessibilityLabel("Causes and interests")
      }
      AppField(title: "Minimum hours per week") {
        TextField(
          "Minimum hours per week", text: $content.minimumWeeklyHours,
          prompt: Text("1 to 80").foregroundStyle(Theme.muted)
        ).keyboardType(.numberPad)
          .accessibilityLabel("Minimum hours per week").accessibilityIdentifier("project.hours")
      }
      AppSelect(
        title: "Collaboration", selection: $content.collaboration,
        options: [("flexible", "Flexible"), ("async", "Mostly async"), ("sync", "Live sessions")])
    }
    AppSection("Location") {
      AppField(title: "City") {
        TextField("City", text: $content.city, prompt: Text("City").foregroundStyle(Theme.muted))
          .accessibilityLabel("City").accessibilityIdentifier("project.city")
      }
      Toggle("Open to remote developers", isOn: $content.remote)
      Button(content.pin == nil ? "Add optional map pin" : "Adjust map pin") { choosingPin = true }
      if content.pin != nil {
        AppField(title: "Place name") {
          TextField(
            "Place name", text: $content.place,
            prompt: Text("Place name").foregroundStyle(Theme.muted)
          ).accessibilityLabel("Place name")
        }
        Button("Remove map pin", role: .destructive) {
          content.pin = nil
          content.place = ""
        }
      }
    }
  }
}
