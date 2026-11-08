import SwiftUI

struct DeveloperOnboardingView: View {
  var returnTo: ProfileReturn? = nil
  @Environment(AppModel.self) private var app
  @Environment(APIClient.self) private var api
  @Environment(\.dismiss) private var dismiss
  @State private var draft = ProfileInput()
  @State private var step = 0
  @State private var initialized = false
  @State private var loadFailed = false
  @State private var consent = false
  @State private var action = ActionState()
  @State private var draftWarning: String?
  @State private var finished = false
  private var key: String { "\(app.identity)/profile/new" }
  private let titles = [
    "Bring what you know.", "Tell us about yourself.", "Make room to contribute.",
    "Choose what comes next.",
  ]

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        Text(titles[step]).font(Theme.title())
        Text("Step \(step + 1) of 4").font(Theme.caption).foregroundStyle(Theme.muted)
        ProgressView(value: Double(step + 1), total: 4).tint(Theme.accentStrong)
          .accessibilityLabel("Profile setup")
        if loadFailed {
          if let error = action.error { FailureView(error: error) { await load() } }
        } else if initialized {
          fields.disabled(action.busy)
        } else {
          ProgressView("Opening your profile")
        }
      }.padding(24)
    }.pageBackground().appNavigationTitle("Create your profile")
      .toolbar(action.busy ? .hidden : .visible, for: .navigationBar)
      .interactiveDismissDisabled(action.busy)
      .safeAreaInset(edge: .bottom) {
        if initialized && !loadFailed { actionDock }
      }
      .task { await load() }
      .task(id: draft) { await preserve() }
  }

  private var actionDock: some View {
    VStack(spacing: 10) {
      if let error = action.error { FailureView(error: error) }
      if let draftWarning { Text(draftWarning).font(Theme.caption).foregroundStyle(Theme.error) }
      Button(step == 3 ? "Save and continue" : "Continue") { Task { await advance() } }
        .buttonStyle(AppButtonStyle.primary).buttonLoading(action.busy).disabled(!canContinue)
        .accessibilityIdentifier("onboarding.continue")
      HStack {
        if step > 0 { Button("Previous step") { step -= 1 } }
        Spacer()
        Button("I'll finish this later") { leaveWithoutSaving() }
      }.buttonStyle(AppButtonStyle(variant: .ghost, size: .small)).disabled(action.busy)
    }.padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 6).background(Theme.canvas)
  }

  @ViewBuilder private var fields: some View {
    switch step {
    case 0:
      VStack(alignment: .leading, spacing: 18) {
        Text("Start with the skills you already use. You can add project evidence later.")
          .foregroundStyle(Theme.muted)
        ForEach(draft.skills.indices, id: \.self) { index in
          VStack(alignment: .leading, spacing: 10) {
            HStack {
              TextField(
                "Skill", text: $draft.skills[index].name,
                prompt: Text("React, Swift, or another skill").foregroundStyle(Theme.muted)
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
              title: "Level \(draft.skills[index].level) of 5", value: $draft.skills[index].level,
              range: 1...5)
          }
        }
        Button("Add another skill", systemImage: "plus") { draft.skills.append(Skill()) }
          .disabled(draft.skills.count >= 30)
      }.paperCard()
    case 1:
      VStack(alignment: .leading, spacing: 18) {
        AppField(title: "Bio") {
          TextField(
            "Bio", text: $draft.bio,
            prompt: Text("What would you like to build?").foregroundStyle(Theme.muted),
            axis: .vertical
          )
          .lineLimit(3...6).accessibilityIdentifier("onboarding.bio")
        }
        Text("At least 10 characters. Class projects and personal learning count.")
          .font(Theme.caption).foregroundStyle(Theme.muted)
        AppSelect(
          title: "Experience", selection: $draft.experienceLevel,
          options: [
            (1, "Beginner"), (2, "Comfortable"), (3, "Capable"), (4, "Strong"), (5, "Expert"),
          ])
      }.paperCard()
    case 2:
      VStack(alignment: .leading, spacing: 18) {
        AppField(title: "City") {
          TextField("City", text: $draft.city, prompt: Text("Calgary").foregroundStyle(Theme.muted))
            .accessibilityIdentifier("onboarding.city")
        }
        AppStepper(
          title: "\(draft.weeklyHours) hours a week", value: $draft.weeklyHours, range: 1...80)
        Text("You can choose a private search area later. A pin is not required to finish setup.")
          .font(Theme.caption).foregroundStyle(Theme.muted)
      }.paperCard()
    default:
      VStack(alignment: .leading, spacing: 18) {
        TagField(title: "Skills you want to learn (optional)", values: $draft.wantsToLearn)
        TagField(title: "Causes and interests (optional)", values: $draft.interests)
        Toggle("Available for new work", isOn: $draft.available)
        Toggle("Open to volunteering", isOn: $draft.acceptsVolunteer)
          .accessibilityIdentifier("onboarding.volunteer")
        Toggle("Let requesters discover me", isOn: $draft.discoverable)
          .accessibilityIdentifier("onboarding.discoverable")
        Text(
          "Visibility and volunteering are off by default. Collaboration starts flexible; change it later in your profile."
        )
        .font(Theme.caption).foregroundStyle(Theme.muted)
        Toggle("Allow AI analysis for this save", isOn: $consent)
          .accessibilityIdentifier("onboarding.consent")
        Text(
          "Your profile is saved only when you confirm. No location or contact details are shared by enabling discovery."
        )
        .font(Theme.caption).foregroundStyle(Theme.muted)
      }.paperCard()
    }
  }

  private var canContinue: Bool {
    switch step {
    case 0:
      !draft.skills.isEmpty
        && draft.skills.allSatisfy {
          !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    case 1: draft.bio.trimmingCharacters(in: .whitespacesAndNewlines).count >= 10
    case 2: !draft.city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    default: consent
    }
  }

  private func advance() async {
    guard canContinue, !action.busy, !loadFailed else { return }
    if step < 3 {
      step += 1
      return
    }
    await action.run {
      try await api.mutate("/developers/me", method: "PUT", body: draft)
      DraftCache.remove(key: key)
      DraftCache.remove(key: "\(key)/step")
      app.changed()
      finish()
    }
  }

  private func load() async {
    guard !initialized || loadFailed else { return }
    loadFailed = false
    action.error = nil
    do {
      let _: Developer = try await api.get("/developers/me")
      // Existing profiles never need to be rewritten just to reach a project.
      finish()
    } catch let error as APIError where error.status == 404 {
      draft = DraftCache.load(ProfileInput.self, key: key) ?? ProfileInput()
      if draft.skills.isEmpty { draft.skills = [Skill()] }
    } catch {
      action.error = error
      loadFailed = true
    }
    initialized = true
  }

  private func preserve() async {
    guard initialized, !loadFailed, !finished else { return }
    do {
      try await Task.sleep(for: .milliseconds(350))
      try Task.checkCancellation()
      guard !finished else { return }
      try DraftCache.save(draft, key: key)
    } catch is CancellationError {} catch {
      draftWarning = "This draft could not be saved on this device."
    }
  }

  private func leaveWithoutSaving() {
    do { try DraftCache.save(draft, key: key) } catch {
      draftWarning = "This draft could not be saved. Try again before leaving."
      return
    }
    finish()
  }

  private func finish() {
    finished = true
    let initialSetup = app.needsProfileSetup
    app.needsProfileSetup = false
    DraftCache.remove(key: "\(app.identity)/profile/onboarding")
    if initialSetup {
      app.selectedTab = .home
      if app.pendingRoute == nil { app.pendingRoute = .career }
      app.resumePendingRoute()
    } else {
      dismiss()
    }
  }
}
