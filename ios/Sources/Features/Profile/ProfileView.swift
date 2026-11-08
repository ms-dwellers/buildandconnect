import SwiftUI

struct TagField: View {
  let title: String
  @Binding var values: [String]
  @State private var text = ""
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title).font(Theme.metadata)
      TextField(
        title, text: $text,
        prompt: Text("Separate entries with commas").foregroundStyle(Theme.muted), axis: .vertical
      )
      .textInputAutocapitalization(.never).autocorrectionDisabled()
      .onAppear { text = values.joined(separator: ", ") }
      .onChange(of: text) { _, value in values = parseTags(value) }
      .accessibilityLabel(title).accessibilityHint("Separate entries with commas")
    }
  }
}

struct AIConsentSection: View {
  @Binding var allowed: Bool
  var body: some View {
    Section {
      Toggle("Allow AI analysis for this save", isOn: $allowed)
      Text(
        "Your text is sent to server-side Workers AI to analyze requirements or experience and calculate matches. Nothing is published if analysis fails."
      )
      .font(.footnote).foregroundStyle(Theme.muted)
    }
  }
}

struct ProfileView: View {
  @Environment(AppModel.self) private var app
  @Environment(APIClient.self) private var api
  @State private var profile = Resource<Developer>()
  @State private var draft = ProfileInput()
  @State private var initialized = false
  @State private var consent = false
  @State private var action = ActionState()
  @State private var saved = false
  @State private var baselineRevision: Int?
  @State private var baselineInput: ProfileInput?
  @State private var draftWarning: String?
  private var draftKey: String { "\(app.identity)/profile/new" }
  var body: some View {
    Group {
      if app.role != .developer {
        WrongRoleView(message: "Only developer accounts have a developer profile.")
      } else if !initialized {
        ProgressView("Loading profile").task { await load() }
      } else if let error = profile.error, (error as? APIError)?.status != 404 {
        FailureView(error: error) { await load() }.padding(20)
      } else {
        editor
      }
    }.appNavigationTitle("Profile").pageBackground()
      .task(id: draft) {
        guard initialized, profile.value == nil, !saved else { return }
        do {
          try await Task.sleep(for: .milliseconds(350))
          guard profile.value == nil, !saved else { return }
          try DraftCache.save(draft, key: draftKey)
          draftWarning = nil
        } catch is CancellationError {} catch {
          draftWarning = "This draft could not be saved on your device."
        }
      }
      .toolbar {
        AppToolbarItem(placement: .topBarTrailing) {
          NavigationLink(value: Route.account) {
            Image(systemName: "gearshape").accessibilityLabel("Account")
          }
        }
      }
  }

  private var editor: some View {
    Form {
      if let error = profile.error, (error as? APIError)?.status != 404 {
        Section { FailureView(error: error) { await load() } }
      }
      Section("About you") {
        AppField(title: "Bio") {
          TextField("Bio", text: $draft.bio, axis: .vertical).lineLimit(3...8)
        }
        AppField(title: "City") { TextField("City", text: $draft.city) }
        AppStepper(
          title: "\(draft.weeklyHours) hours per week", value: $draft.weeklyHours, range: 1...80)
        AppSelect(
          title: "Experience", selection: $draft.experienceLevel,
          options: (1...5).map { ($0, "\($0) of 5") })
      }
      Section {
        ForEach(draft.skills.indices, id: \.self) { index in
          VStack(alignment: .leading) {
            AppField(title: "Skill") {
              TextField("Skill", text: $draft.skills[index].name).textInputAutocapitalization(
                .never
              )
              .autocorrectionDisabled()
            }
            AppStepper(
              title: "Level \(draft.skills[index].level) of 5",
              value: $draft.skills[index].level, range: 1...5)
          }
        }.onDelete { draft.skills.remove(atOffsets: $0) }
        Button("Add skill", systemImage: "plus") { draft.skills.append(Skill()) }.disabled(
          draft.skills.count >= 30)
      } header: {
        Text("Skills")
      } footer: {
        Text("Add at least one skill. Swipe a row to remove it.")
      }
      Section("Projects") {
        ForEach(draft.projects.indices, id: \.self) { index in
          VStack(alignment: .leading, spacing: 12) {
            AppField(title: "Project title") {
              TextField("Project title", text: $draft.projects[index].title)
            }
            AppField(title: "Description") {
              TextField(
                "Project description", text: $draft.projects[index].description, axis: .vertical
              )
              .lineLimit(2...5)
            }
            TagField(
              title: "Technologies, separated by commas",
              values: $draft.projects[index].technologies)
          }
        }.onDelete { draft.projects.remove(atOffsets: $0) }
        Button("Add project", systemImage: "plus") { draft.projects.append(Project()) }.disabled(
          draft.projects.count >= 10)
      }
      Section("Goals and collaboration") {
        TagField(title: "Interests, separated by commas", values: $draft.interests)
        TagField(title: "What you want to learn", values: $draft.wantsToLearn)
        CollaborationPicker(value: $draft.collaboration)
        Toggle("Open to volunteering", isOn: $draft.acceptsVolunteer)
      }
      Section {
        Toggle("Available for new work", isOn: flagBinding(\.available, "available"))
        Toggle(
          "Visible to companies and recruiters", isOn: flagBinding(\.discoverable, "discoverable"))
      } header: {
        Text("Visibility")
      } footer: {
        Text(
          "Discovery shares your profile and projects, never your private area or contact details. Existing profiles update these settings without AI."
        )
      }
      if profile.value != nil {
        Section("Private area") {
          NavigationLink(value: Route.area) {
            Label(
              profile.value?.location.map { "Requests within \(Int($0.radiusKm)) km" }
                ?? "Set your area", systemImage: "map")
          }
        }
      }
      AIConsentSection(allowed: $consent)
      if let error = action.error { Section { FailureView(error: error) } }
      if (action.error as? APIError)?.status == 409 {
        Section {
          ConfirmAction(
            label: "Reload latest profile",
            consequence: "This replaces your unsaved changes with the latest profile."
          ) {
            await load()
            consent = false
            action.error = nil
          }
        }
      }
      if let draftWarning { Section { Text(draftWarning).foregroundStyle(Theme.error) } }
      Section {
        Button(action.busy ? "Saving…" : "Save profile") { Task { await save() } }
          .buttonStyle(AppButtonStyle.primary).listRowBackground(Color.clear)
          .disabled(action.busy || !consent || draft.bio.count < 10 || draft.skills.isEmpty)
          .accessibilityIdentifier("profile.save")
        if saved {
          Label("Profile saved", systemImage: "checkmark.circle")
          NavigationLink("Set your private area", value: Route.area)
        }
      }
    }.disabled(action.busy).pageBackground()
  }

  private func flagBinding(_ keyPath: WritableKeyPath<ProfileInput, Bool>, _ field: String)
    -> Binding<Bool>
  {
    Binding(
      get: { draft[keyPath: keyPath] },
      set: { value in
        guard profile.value != nil else {
          draft[keyPath: keyPath] = value
          return
        }
        Task {
          await action.run {
            let baseline = baselineInput
            try await api.mutate("/developers/me", method: "PATCH", body: [field: value])
            let refreshed: Developer = try await api.get("/developers/me")
            draft.available = refreshed.available
            draft.discoverable = refreshed.discoverable
            profile.value = refreshed
            guard baseline?.differsOnlyInVisibility(from: refreshed.input) == true else {
              throw APIError(
                status: 409,
                message:
                  "Visibility was updated, but your profile changed elsewhere. Reload the latest profile before saving other edits."
              )
            }
            baselineRevision = refreshed.revision
            baselineInput = refreshed.input
            app.changed()
          }
        }
      })
  }

  private func load() async {
    await profile.load(api, "/developers/me")
    if let developer = profile.value {
      draft = developer.input
      baselineRevision = developer.revision
      baselineInput = developer.input
    } else if (profile.error as? APIError)?.status == 404,
      let saved = DraftCache.load(ProfileInput.self, key: draftKey)
    {
      draft = saved
    }
    initialized = true
  }

  private func save() async {
    await action.run {
      try await api.mutate(
        "/developers/me", method: "PUT", body: draft, expectedRevision: baselineRevision)
      await profile.load(api, "/developers/me")
      baselineRevision = profile.value?.revision
      baselineInput = profile.value?.input
      saved = true
      DraftCache.remove(key: draftKey)
      consent = false
      app.changed()
    }
  }
}

struct CollaborationPicker: View {
  @Binding var value: String
  var body: some View {
    AppSelect(
      title: "Collaboration", selection: $value,
      options: [
        ("flexible", "Flexible"), ("async", "Mostly async"), ("sync", "Live sessions"),
      ])
  }
}

struct AreaEditorView: View {
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @Environment(\.dismiss) private var dismiss
  @State private var profile = Resource<Developer>()
  @State private var area = Area()
  @State private var picker = false
  @State private var selected = false
  @State private var action = ActionState()
  var body: some View {
    Form {
      if let error = profile.error {
        Section {
          FailureView(error: error) { await load() }
          if (error as? APIError)?.status == 404 {
            NavigationLink("Create profile", value: Route.setupProfile)
          }
        }
      }
      Section("Search area") {
        Button(selected ? "Adjust your pin" : "Choose a pin", systemImage: "mappin.and.ellipse") {
          picker = true
        }
        LabeledContent("Radius", value: "\(Int(area.radiusKm)) km")
        Slider(value: $area.radiusKm, in: 1...100, step: 1).accessibilityLabel(
          "Search radius in kilometers")
        Text("Your area is private. Companies and recruiters cannot see your saved pin.").font(
          .footnote
        ).foregroundStyle(Theme.muted)
      }
      if let error = action.error { Section { FailureView(error: error) } }
      Section {
        Button(action.busy ? "Saving…" : "Save area") {
          Task {
            await action.run {
              try await api.mutate("/developers/me/location", method: "PATCH", body: area)
              app.changed()
              dismiss()
            }
          }
        }.buttonStyle(AppButtonStyle.primary).listRowBackground(Color.clear)
          .disabled(!selected || profile.value == nil || action.busy)
      }
    }.pageBackground().appNavigationTitle("Private area").task { await load() }
      .sheet(isPresented: $picker) {
        PinPicker(latitude: area.latitude, longitude: area.longitude, radiusKm: area.radiusKm) {
          pin in
          area.latitude = pin.latitude
          area.longitude = pin.longitude
          selected = true
        }
      }
  }
  private func load() async {
    await profile.load(api, "/developers/me")
    if let location = profile.value?.location {
      area = location
      selected = true
    }
  }
}

struct DeveloperDetailView: View {
  let id: String
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @State private var profile = Resource<Developer>()
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        if let error = profile.error { FailureView(error: error) { await load() } }
        if let developer = profile.value {
          ProfileIdentity(
            name: developer.name, city: developer.city, available: developer.available)
          Text(developer.bio).font(Theme.body(19)).lineSpacing(4)
          LabeledContent("Weekly availability", value: "\(developer.weeklyHours) hours")
          VStack(alignment: .leading, spacing: 12) {
            Text("Skills").font(Theme.title(24))
            ForEach(developer.skills) { skill in
              SkillRow(name: skill.name, level: skill.level)
            }
            Text("Wants to learn").font(.headline)
            Text(developer.wantsToLearn.joined(separator: ", "))
            Text("Interests").font(.headline)
            Text(developer.interests.joined(separator: ", "))
            Text("Experience \(developer.experienceLevel) of 5 · \(developer.collaboration)")
            if developer.acceptsVolunteer { Text("Open to volunteering") }
          }.paperCard()
          ForEach(Array(developer.projects.enumerated()), id: \.offset) { _, project in
            VStack(alignment: .leading, spacing: 10) {
              Text(project.title).font(Theme.title(24))
              Text(project.description)
              Text(project.technologies.joined(separator: " / ")).font(Theme.metadata)
            }.paperCard()
          }
        } else if profile.loading {
          ProgressView()
        }
      }.padding(20)
    }.pageBackground().appNavigationTitle("Developer")
      .task(id: app.revision) { await load() }.refreshable { await load() }
  }
  private func load() async {
    profile.value = nil
    await profile.load(api, "/developers/\(id)")
  }
}
