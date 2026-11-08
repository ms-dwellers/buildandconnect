import SwiftUI

struct CareerView: View {
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @State private var target = Resource<CareerTarget?>()
  @State private var projects = Resource<CareerRecommendations>()
  @State private var editing = false
  @State private var requirement = ""

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        Text("Find projects for your goals").font(Theme.title())
        Text(
          "Turn the requirements of a job you want into useful practice. Your target stays private."
        )
        .foregroundStyle(Theme.muted)
        if let error = target.error { FailureView(error: error) { await load() } }
        if target.loading && target.value == nil { ProgressView("Loading your target") }
        if let current = target.value ?? nil {
          VStack(alignment: .leading, spacing: 14) {
            Text(current.title).font(Theme.title(24))
            Text(
              "Requirements come from your saved job description, not a prediction of your qualifications."
            )
            .font(Theme.caption).foregroundStyle(Theme.muted)
            Button("Edit job target") { editing = true }.buttonStyle(AppButtonStyle())
            AppSelect(
              title: "Requirement", selection: $requirement,
              options: [("", "All requirements")]
                + current.requirements.map { ($0.id, $0.description) })
            ForEach(current.requirements.filter { requirement.isEmpty || $0.id == requirement }) {
              item in
              VStack(alignment: .leading, spacing: 8) {
                Text(item.description).font(Theme.subheading)
                Text("“\(item.sourceQuote)”").font(Theme.caption).foregroundStyle(Theme.muted)
              }
            }
          }.paperCard()
          if let error = projects.error {
            FailureView(error: error) { await loadProjects() }
            if (error as? APIError)?.status == 404 {
              NavigationLink("Create your developer profile", value: Route.setupProfile)
                .buttonStyle(AppButtonStyle.primary)
            }
          }
          if projects.loading && projects.value == nil { ProgressView("Finding relevant projects") }
          if let result = projects.value {
            if result.targetUpdatedAt != current.updatedAt {
              Text("Your target changed. Refresh to see its latest recommendations.")
              Button("Refresh recommendations") { Task { await load() } }
            } else {
              Text(
                "\(filteredProjects.count) \(filteredProjects.count == 1 ? "project" : "projects") to explore"
              ).font(Theme.title(24))
              if !result.nearbyRequestsAvailable {
                NavigationLink("Set your private area to include local requests", value: Route.area)
                  .buttonStyle(AppButtonStyle())
              }
              ForEach(filteredProjects, id: \.stableId) { project in projectCard(project) }
              if filteredProjects.isEmpty {
                EmptyState(
                  title: "No related projects yet", symbol: "leaf",
                  message: "Try another requirement or return when more projects are available.")
              }
              if result.total > result.data.count {
                Text("Showing the first \(result.data.count) of \(result.total) recommendations.")
                  .font(Theme.caption)
              }
            }
          }
        } else if !target.loading && target.error == nil {
          Button("Add a job description") { editing = true }.buttonStyle(AppButtonStyle.primary)
        }
      }.padding(20)
    }.pageBackground().appNavigationTitle("Find projects")
      .task(id: app.revision) { await load() }.refreshable { await load() }
      .sheet(isPresented: $editing) {
        CareerTargetEditor(initial: target.value ?? nil) { await load() }
      }
  }

  private var filteredProjects: [CareerProject] {
    (projects.value?.data ?? []).filter { project in
      requirement.isEmpty || project.requirementLinks.contains { $0.requirementId == requirement }
    }
  }

  private func projectCard(_ project: CareerProject) -> some View {
    VStack(alignment: .leading, spacing: 14) {
      Text(project.title).font(Theme.title(24))
      Text(project.description)
      let links = project.requirementLinks.filter {
        requirement.isEmpty || $0.requirementId == requirement
      }
      let activityIds = Set(links.flatMap { $0.activityLinks.map(\.activityId) })
      let activities = project.activities.filter { activityIds.contains($0.id) }
      if activities.isEmpty {
        Text("No specific activities have been extracted for this project yet.")
          .font(Theme.caption).foregroundStyle(Theme.muted)
      } else {
        Text("What you could practice").font(Theme.subheading)
        ForEach(activities) { activity in
          Text(activity.description)
          Text(activity.skills.joined(separator: ", ")).font(Theme.caption).foregroundStyle(
            Theme.muted)
        }
      }
      if !project.actionIneligibleReasons.isEmpty {
        Text(project.actionIneligibleReasons.joined(separator: ". "))
          .font(Theme.caption).foregroundStyle(Theme.muted)
      }
      Text("Practice is not proof of mastery. Review the project before committing.")
        .font(Theme.caption).foregroundStyle(Theme.muted)
      NavigationLink(
        "Review project",
        value: project.source == "request"
          ? Route.request(project.id) : Route.opportunity(project.id)
      )
      .buttonStyle(AppButtonStyle.primary)
      if let pin = project.listing {
        NavigationLink("View map pin", value: Route.map(pin.id)).buttonStyle(AppButtonStyle())
      }
    }.paperCard()
  }

  private func load() async {
    await target.load(api, "/developers/me/career-target")
    if let current = target.value ?? nil {
      if !current.requirements.contains(where: { $0.id == requirement }) { requirement = "" }
      await loadProjects()
    }
  }
  private func loadProjects() async {
    await projects.load(api, "/developers/me/career-projects", query: ["limit": "100"])
  }
}

private struct CareerTargetEditor: View {
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @Environment(\.dismiss) private var dismiss
  @State private var sourceText: String
  @State private var sourceUrl: String
  @State private var expectedUpdatedAt: Int
  @State private var consent = false
  @State private var action = ActionState()
  let onSaved: () async -> Void

  init(initial: CareerTarget?, onSaved: @escaping () async -> Void) {
    _sourceText = State(initialValue: initial?.sourceText ?? "")
    _sourceUrl = State(initialValue: initial?.sourceUrl ?? "")
    _expectedUpdatedAt = State(initialValue: initial?.updatedAt ?? 0)
    self.onSaved = onSaved
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Text("Your target job").font(Theme.title())
        Button("Cancel") { dismiss() }.buttonStyle(AppButtonStyle(variant: .ghost)).disabled(
          action.busy)
        Text(
          "Paste the job description. The link is kept as a reference; we do not fetch the page.")
        AppField(title: "Job description") {
          TextField("Paste the job description", text: $sourceText, axis: .vertical)
            .textFieldStyle(AppTextFieldStyle()).lineLimit(8...20)
        }
        AppField(title: "Source URL (optional)") {
          TextField("https://", text: $sourceUrl).textFieldStyle(AppTextFieldStyle())
            .textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL)
        }
        Toggle("I agree to AI analysis of this private job target", isOn: $consent)
          .toggleStyle(AppSwitchStyle())
        Text(
          "Do not include passwords or sensitive personal information. Failed analysis leaves your saved target unchanged."
        )
        .font(Theme.caption).foregroundStyle(Theme.muted)
        if let error = action.error { FailureView(error: error) }
        if (action.error as? APIError)?.status == 409 {
          ConfirmAction(
            label: "Reload saved target", consequence: "This replaces your unsaved edits."
          ) {
            await action.run {
              let latest: CareerTarget? = try await api.get("/developers/me/career-target")
              sourceText = latest?.sourceText ?? ""
              sourceUrl = latest?.sourceUrl ?? ""
              expectedUpdatedAt = latest?.updatedAt ?? 0
              consent = false
            }
          }
        }
        Button("Save and find projects") { Task { await save() } }
          .buttonStyle(AppButtonStyle.primary).buttonLoading(action.busy)
          .disabled(
            !consent || sourceText.trimmingCharacters(in: .whitespacesAndNewlines).count < 30
              || sourceText.count > 6000)
      }.padding(24)
    }.pageBackground().presentationBackground(Theme.canvas).interactiveDismissDisabled(action.busy)
  }

  private func save() async {
    struct Input: Encodable {
      let sourceText: String
      let sourceUrl: String?
      let expectedUpdatedAt: Int
    }
    await action.run {
      let url = sourceUrl.trimmingCharacters(in: .whitespacesAndNewlines)
      let _: CareerTarget = try await api.send(
        "/developers/me/career-target", method: "PUT",
        body: Input(
          sourceText: sourceText, sourceUrl: url.isEmpty ? nil : url,
          expectedUpdatedAt: expectedUpdatedAt))
      await onSaved()
      app.changed()
      dismiss()
    }
  }
}
