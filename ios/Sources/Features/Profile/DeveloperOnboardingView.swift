import SwiftUI

struct DeveloperOnboardingView: View {
  @Environment(AppModel.self) private var app
  @Environment(APIClient.self) private var api
  @Environment(\.dismiss) private var dismiss
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @State private var draft = ProfileInput()
  @State private var step = 0
  @State private var initialized = false
  @State private var loadFailed = false
  @State private var profileSaved = false
  @State private var consent = false
  @State private var pin: Pin?
  @State private var radius = 25.0
  @State private var choosingPin = false
  @State private var action = ActionState()
  @State private var draftWarning: String?
  private var key: String { "\(app.identity)/profile/new" }
  private let titles = [
    "Tell us a little\nabout yourself.", "Bring what\nyou know.", "Make room\nto grow.",
    "Find your corner\nof the city.",
  ]
  private let subtitles = [
    "You don't have to know everything to make something useful.",
    "Your skills and projects help us find ideas that fit.",
    "Choose the work, causes and skills you'd like to explore.",
    "Your pin stays private. It helps us find ideas close to you.",
  ]
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        HStack {
          BrandLockup()
          Spacer()
          Text("\(step + 1) of 4").font(Theme.metadata).foregroundStyle(Theme.muted)
        }
        ProgressView(value: Double(step + 1), total: 4).tint(Theme.accentStrong).accessibilityLabel(
          "Profile setup")
        EditorialHeading(title: titles[step], subtitle: subtitles[step])
        if loadFailed {
          if let error = action.error { FailureView(error: error) { await load() } }
          Button("Explore city ideas") { finish() }
        } else if initialized {
          fields.disabled(action.busy)
          if step == 3 {
            Text(
              "You can browse without an area. Choosing one is required before picking up nearby community ideas."
            )
            .font(Theme.body(14)).foregroundStyle(Theme.muted)
          }
        } else {
          ProgressView("Opening your profile")
        }
      }.padding(24)
    }.clipped().id(step).safeAreaInset(edge: .bottom) {
      if initialized && !loadFailed { actionDock }
    }.pageBackground().appNavigationTitle("Create your profile")
      .navigationBarBackButtonHidden(action.busy)
      .toolbar(action.busy ? .hidden : .visible, for: .navigationBar)
      .task { await load() }
      .task(id: draft) { await preserve() }
      .onChange(of: step) { _, value in try? DraftCache.save(value, key: "\(key)/step") }
      .sheet(isPresented: $choosingPin) {
        PinPicker(
          latitude: pin?.latitude ?? 51.0447, longitude: pin?.longitude ?? -114.0719,
          radiusKm: radius
        ) { pin = $0 }
      }
  }

  private var actionDock: some View {
    VStack(spacing: 10) {
      if let error = action.error { FailureView(error: error) }
      if let draftWarning { Text(draftWarning).font(Theme.caption).foregroundStyle(Theme.error) }
      Button(
        step == 2 ? "Save my profile" : step == 3 ? "Save my area" : "Continue"
      ) {
        Task { await advance() }
      }.buttonStyle(AppButtonStyle.primary).buttonLoading(action.busy).disabled(!canContinue)
        .accessibilityIdentifier("onboarding.continue")
      let layout =
        dynamicTypeSize.isAccessibilitySize
        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
        : AnyLayout(HStackLayout())
      layout {
        if step > 0 && !profileSaved { Button("Previous step") { step -= 1 }.frame(minHeight: 44) }
        if !dynamicTypeSize.isAccessibilitySize { Spacer() }
        Button(profileSaved ? "Explore without an area" : "I'll finish this later") { finish() }
          .frame(minHeight: 44)
      }.buttonStyle(AppButtonStyle(variant: .ghost, size: .small))
        .foregroundStyle(Theme.muted).disabled(action.busy)
    }.padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 6).background(Theme.canvas)
  }

  @ViewBuilder private var fields: some View {
    switch step {
    case 0:
      VStack(alignment: .leading, spacing: 18) {
        Label("About you", systemImage: "person.crop.rectangle").font(
          Theme.body(20).weight(.semibold))
        VStack(alignment: .leading, spacing: 8) {
          Text("Bio").font(Theme.metadata)
          TextField(
            "Bio", text: $draft.bio,
            prompt: Text("What would you like to build?").foregroundStyle(Theme.muted),
            axis: .vertical
          ).lineLimit(
            3...6
          )
          .accessibilityLabel("Bio").accessibilityIdentifier("onboarding.bio")
          Text("At least 10 characters.").font(Theme.body(14)).foregroundStyle(Theme.muted)
        }
        VStack(alignment: .leading, spacing: 8) {
          Text("City").font(Theme.metadata)
          TextField("City", text: $draft.city, prompt: Text("Calgary").foregroundStyle(Theme.muted))
            .accessibilityLabel("City")
        }
        Divider()
        AppStepper(
          title: "\(draft.weeklyHours) hours a week", value: $draft.weeklyHours, range: 1...80)
        AppSelect(
          title: "Experience", selection: $draft.experienceLevel,
          options: [
            (1, "Beginner"), (2, "Comfortable"), (3, "Capable"), (4, "Strong"), (5, "Expert"),
          ])
      }.paperCard()
    case 1:
      VStack(alignment: .leading, spacing: 18) {
        Text("Your skills").font(Theme.body(21).weight(.semibold))
        ForEach(draft.skills.indices, id: \.self) { index in
          VStack(alignment: .leading, spacing: 10) {
            HStack {
              TextField(
                "Skill", text: $draft.skills[index].name,
                prompt: Text("A skill, like React or Swift").foregroundStyle(Theme.muted)
              )
              .textInputAutocapitalization(.never).autocorrectionDisabled()
              .accessibilityIdentifier("onboarding.skill.\(index)")
              if draft.skills.count > 1 {
                Button {
                  draft.skills.remove(at: index)
                } label: {
                  Image(systemName: "minus.circle")
                }
                .accessibilityLabel("Remove skill \(index + 1)")
              }
            }
            AppStepper(
              title: "Level \(draft.skills[index].level) of 5",
              value: $draft.skills[index].level, range: 1...5)
          }
          Divider()
        }
        Button("Add another skill", systemImage: "plus") { draft.skills.append(Skill()) }.disabled(
          draft.skills.count >= 30)
      }.paperCard()
      VStack(alignment: .leading, spacing: 16) {
        Text("Something you've built").font(Theme.body(21).weight(.semibold))
        Text("Optional. A class project or something you made for fun counts.").foregroundStyle(
          Theme.muted)
        ForEach(draft.projects.indices, id: \.self) { index in
          Text("Project title").font(Theme.metadata)
          TextField(
            "Project title", text: $draft.projects[index].title,
            prompt: Text("A community calendar").foregroundStyle(Theme.muted)
          ).accessibilityLabel(
            "Project title")
          Text("Description").font(Theme.metadata)
          TextField(
            "Project description", text: $draft.projects[index].description,
            prompt: Text("What did you build?").foregroundStyle(Theme.muted), axis: .vertical
          ).lineLimit(2...5).accessibilityLabel("Project description")
          Text("At least 10 characters.").font(Theme.body(14)).foregroundStyle(Theme.muted)
          TagField(
            title: "Technologies, separated by commas", values: $draft.projects[index].technologies)
          Button("Remove project", role: .destructive) { draft.projects.remove(at: index) }
          Divider()
        }
        Button("Add a project", systemImage: "plus") { draft.projects.append(Project()) }.disabled(
          draft.projects.count >= 10)
      }.paperCard()
    case 2:
      VStack(alignment: .leading, spacing: 18) {
        Text("What comes next").font(Theme.body(21).weight(.semibold))
        TagField(title: "Skills you want to learn", values: $draft.wantsToLearn)
        Divider()
        TagField(title: "Causes and interests", values: $draft.interests)
        CollaborationPicker(value: $draft.collaboration)
        Toggle("Open to volunteering", isOn: $draft.acceptsVolunteer)
      }.paperCard()
      VStack(alignment: .leading, spacing: 16) {
        Text("You're in control").font(Theme.body(21).weight(.semibold))
        Toggle("Available for new work", isOn: $draft.available)
        Toggle("Let requesters discover me", isOn: $draft.discoverable)
        Text(
          "Discovery shares your skills and project evidence, never your private pin or contact details."
        ).font(Theme.body(14)).foregroundStyle(Theme.muted)
        Divider()
        Toggle("Allow AI analysis for this save", isOn: $consent)
        Text(
          "Your profile text is analysed by server-side AI for matching. Nothing is saved if analysis fails."
        ).font(Theme.body(14)).foregroundStyle(Theme.muted)
      }.paperCard()
    default:
      VStack(alignment: .leading, spacing: 18) {
        IdeaArtwork(category: .community)
        Button(
          pin == nil ? "Choose a private pin" : "Adjust your pin", systemImage: "mappin.and.ellipse"
        ) { choosingPin = true }
        .frame(minHeight: 44)
        LabeledContent("Search radius", value: "\(Int(radius)) km")
        AppSlider(value: $radius, bounds: 1...100, step: 1, label: "Search radius in kilometres")
      }.paperCard()
    }
  }
  private var canContinue: Bool {
    switch step {
    case 0:
      draft.bio.trimmingCharacters(in: .whitespacesAndNewlines).count >= 10
        && !draft.city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    case 1:
      !draft.skills.isEmpty
        && draft.skills.allSatisfy {
          !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        && draft.projects.allSatisfy {
          !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && $0.description.trimmingCharacters(in: .whitespacesAndNewlines).count >= 10
        }
    case 2: consent
    default: pin != nil
    }
  }
  private func advance() async {
    guard canContinue, !action.busy, !loadFailed else { return }
    if step < 2 {
      step += 1
      return
    }
    await action.run {
      if step == 2 {
        try await api.mutate("/developers/me", method: "PUT", body: draft)
        profileSaved = true
        DraftCache.remove(key: key)
        consent = false
        step = 3
        app.changed()
      } else if let pin {
        try await api.mutate(
          "/developers/me/location", method: "PATCH",
          body: Area(latitude: pin.latitude, longitude: pin.longitude, radiusKm: radius))
        app.changed()
        finish()
      }
    }
  }
  private func load() async {
    guard !initialized || loadFailed else { return }
    initialized = false
    loadFailed = false
    action.error = nil
    do {
      let profile: Developer = try await api.get("/developers/me")
      draft = profile.input
      profileSaved = true
      step = 3
      if let area = profile.location {
        pin = Pin(latitude: area.latitude, longitude: area.longitude)
        radius = area.radiusKm
      }
    } catch let error as APIError where error.status == 404 {
      draft = DraftCache.load(ProfileInput.self, key: key) ?? ProfileInput()
      if draft.skills.isEmpty { draft.skills = [Skill()] }
      step = min(2, max(0, DraftCache.load(Int.self, key: "\(key)/step") ?? 0))
    } catch {
      action.error = error
      loadFailed = true
    }
    initialized = true
  }
  private func preserve() async {
    guard initialized, !profileSaved, !loadFailed else { return }
    do {
      try await Task.sleep(for: .milliseconds(350))
      guard !profileSaved else { return }
      try DraftCache.save(draft, key: key)
      draftWarning = nil
    } catch is CancellationError {} catch {
      draftWarning = "This draft couldn't be saved on this device."
    }
  }
  private func finish() {
    if initialized && !profileSaved && !loadFailed {
      do { try DraftCache.save(draft, key: key) } catch {
        draftWarning = "This draft couldn't be saved. Try again before leaving."
        return
      }
    }
    DraftCache.remove(key: "\(app.identity)/profile/onboarding")
    DraftCache.remove(key: "\(key)/step")
    let initialSetup = app.needsProfileSetup
    app.needsProfileSetup = false
    if initialSetup {
      app.selectedTab = .explore
      app.resumePendingRoute()
    }
    dismiss()
  }
}
