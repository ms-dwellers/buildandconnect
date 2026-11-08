import SwiftUI

struct OwnProfileView: View {
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @State private var profile = Resource<Developer>()
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        if let developer = profile.value {
          ProfileIdentity(
            name: developer.name, city: developer.city, available: developer.available)
          HStack(spacing: 12) {
            profileFact("Projects", value: "\(developer.projects.count)")
            profileFact("Hours / week", value: "\(developer.weeklyHours)")
            profileFact("Experience", value: "\(developer.experienceLevel) / 5")
          }
          Label(
            developer.discoverable ? "Discoverable to companies and recruiters" : "Private profile",
            systemImage: developer.discoverable ? "eye" : "lock"
          )
          .font(Theme.body(15)).foregroundStyle(Theme.muted)
          Text(developer.bio).font(Theme.body(19)).lineSpacing(4)
          NavigationLink("Edit profile and preferences", value: Route.profile).buttonStyle(
            AppButtonStyle.primary)
          VStack(alignment: .leading, spacing: 16) {
            Text("Skills & interests").font(Theme.title(26))
            ForEach(developer.skills) { skill in
              SkillRow(name: skill.name, level: skill.level)
            }
            if !developer.wantsToLearn.isEmpty {
              Text("Next up: \(developer.wantsToLearn.joined(separator: ", "))").foregroundStyle(
                Theme.muted)
            }
            if !developer.interests.isEmpty {
              Text(developer.interests.joined(separator: " · ")).font(Theme.metadata)
            }
          }.paperCard()
          NavigationLink(value: Route.area) {
            IdeaRowContent(
              title: "Your private area",
              detail: developer.location.map { "Ideas within \(Int($0.radiusKm)) km" }
                ?? "Choose where you'd like to help", category: .community
            )
            .paperCard()
          }.buttonStyle(.plain)
          if !developer.projects.isEmpty {
            Text("Things you've built").font(Theme.title(27))
            ForEach(Array(developer.projects.enumerated()), id: \.offset) { _, project in
              VStack(alignment: .leading, spacing: 10) {
                Text(project.title).font(Theme.title(24))
                Text(project.description).foregroundStyle(Theme.muted)
                Text(project.technologies.joined(separator: " / ")).font(Theme.metadata)
              }.paperCard()
            }
          }
        } else if (profile.error as? APIError)?.status == 404 {
          ProfileIdentity(
            name: app.member?.user.name ?? "Your profile", city: "Calgary", available: false)
          EditorialHeading(
            title: "A little experience.\nA lot to offer.",
            subtitle: "Share what you know and what you'd like to learn.")
          NavigationLink("Create your profile", value: Route.setupProfile).buttonStyle(
            AppButtonStyle.primary)
        } else if let error = profile.error {
          FailureView(error: error) { await load() }
        } else {
          ProgressView("Loading your profile")
        }
      }.padding(20)
    }.pageBackground().appNavigationTitle("Your profile")
      .toolbar {
        AppToolbarItem(placement: .topBarTrailing) {
          NavigationLink(value: Route.account) {
            Image(systemName: "gearshape").accessibilityLabel("Account settings")
          }
        }
      }
      .task(id: app.revision) { await load() }.refreshable { await load() }
  }
  private func profileFact(_ title: String, value: String) -> some View {
    VStack(spacing: 6) {
      Text(value).font(Theme.title(29)).monospacedDigit().foregroundStyle(Theme.accentStrong)
      Text(title).font(Theme.body(12)).foregroundStyle(Theme.muted)
    }.frame(maxWidth: .infinity).padding(.vertical, 16)
      .background(Theme.card, in: RoundedRectangle(cornerRadius: 12))
      .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border))
  }
  private func load() async { await profile.load(api, "/developers/me") }
}
