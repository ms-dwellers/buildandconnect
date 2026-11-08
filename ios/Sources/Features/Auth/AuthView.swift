import SwiftUI

struct AuthView: View {
  let initialMode: AuthMode
  @Environment(AppModel.self) private var app
  @Environment(\.dismiss) private var dismiss
  @State private var mode: AuthMode = .signIn
  @State private var name = ""
  @State private var email = ""
  @State private var password = ""
  @State private var action = ActionState()
  @State private var showRecovery = false
  var body: some View {
    Form {
      Section {
        if mode == .signUp {
          TextField("Name", text: $name).textContentType(.name).accessibilityIdentifier("auth.name")
        }
        TextField("Email", text: $email).textContentType(.emailAddress).keyboardType(.emailAddress)
          .textInputAutocapitalization(.never).autocorrectionDisabled().accessibilityIdentifier(
            "auth.email")
        SecureField("Password", text: $password).textContentType(
          mode == .signUp ? .newPassword : .password
        )
        .accessibilityIdentifier("auth.password")
        if mode == .signUp {
          Text("At least 12 characters.").font(.footnote).foregroundStyle(Theme.muted)
        }
      }
      if let error = action.error { Section { FailureView(error: error) } }
      Section {
        Button(action.busy ? "Signing in…" : mode == .signUp ? "Create account" : "Sign in") {
          Task { await submit() }
        }.buttonStyle(RaisedButtonStyle()).listRowBackground(Color.clear)
          .disabled(
            action.busy || email.isEmpty || password.isEmpty
              || (mode == .signUp && (name.isEmpty || password.count < 12))
          )
          .accessibilityIdentifier("auth.submit")
        Button(mode == .signIn ? "Create an account" : "Sign in instead") {
          mode = mode == .signIn ? .signUp : .signIn
          action.error = nil
        }.disabled(action.busy)
        if mode == .signIn { Button("Forgot password?") { showRecovery = true } }
      }
    }.pageBackground().navigationTitle(mode == .signUp ? "Create account" : "Welcome back")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }.disabled(action.busy)
        }
      }
      .onAppear { mode = initialMode }
      .alert("Password recovery", isPresented: $showRecovery) {
        Button("Dismiss", role: .cancel) {}
      } message: {
        Text(
          "Password-reset email is not configured on this service yet. No reset email has been sent."
        )
      }
  }
  private func submit() async {
    await action.run {
      var payload = [
        "email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password,
      ]
      if mode == .signUp { payload["name"] = name.trimmingCharacters(in: .whitespacesAndNewlines) }
      try await app.api.mutate(
        "/auth/\(mode == .signUp ? "sign-up" : "sign-in")/email", body: payload)
      guard app.api.token != nil else {
        throw APIError(
          status: 503,
          message:
            "This server does not support native sessions yet. Update its authentication configuration before signing in here."
        )
      }
      await app.refreshSession()
      if let error = app.sessionError { throw error }
      guard app.signedIn else {
        throw APIError(status: 401, message: "The session could not be restored. Sign in again.")
      }
      password = ""
      dismiss()
    }
  }
}

struct RoleSelectionView: View {
  @Environment(AppModel.self) private var app
  @State private var selected: Role?
  @State private var action = ActionState()
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        Text("How will you use Build & Connect?").font(Theme.title())
        Text("Your account type cannot be changed later.").foregroundStyle(Theme.muted)
        ForEach(Role.allCases) { role in
          Button {
            selected = role
          } label: {
            HStack(alignment: .top, spacing: 14) {
              Image(systemName: role.symbol).font(.title2).frame(width: 30)
              VStack(alignment: .leading, spacing: 6) {
                Text(role.title).font(Theme.body(21).weight(.semibold))
                Text(role.purpose).foregroundStyle(Theme.muted)
              }
              Spacer(minLength: 0)
              Image(systemName: selected == role ? "checkmark.circle.fill" : "circle")
            }.paperCard()
          }.buttonStyle(.plain).accessibilityIdentifier("role.\(role.rawValue)")
            .accessibilityAddTraits(selected == role ? .isSelected : [])
        }
        if let error = action.error { FailureView(error: error) }
        Button(action.busy ? "Saving…" : "Continue") { Task { await choose() } }
          .buttonStyle(RaisedButtonStyle()).disabled(selected == nil || action.busy)
          .accessibilityIdentifier("role.continue")
        Button("Sign out") { Task { await app.signOut() } }.disabled(action.busy)
      }.padding(20)
    }.pageBackground()
  }
  private func choose() async {
    guard let selected else { return }
    await action.run {
      do {
        try await app.api.mutate("/me/role", method: "PUT", body: ["role": selected.rawValue])
      } catch let error as APIError where error.status == 409 {}
      await app.refreshSession()
      if let error = app.sessionError { throw error }
      if app.role == .developer && app.homePath.isEmpty { app.homePath = [.profile] }
    }
  }
}

struct AuthenticationRequired: View {
  let route: Route
  @Environment(AppModel.self) private var app
  var body: some View {
    VStack(spacing: 20) {
      EmptyState(title: "Sign in to continue", symbol: "person.crop.circle")
      Button("Sign in") { app.authenticate(for: route) }.buttonStyle(RaisedButtonStyle())
    }.padding(20).frame(maxHeight: .infinity).pageBackground()
  }
}

struct WrongRoleView: View {
  let message: String
  @Environment(AppModel.self) private var app
  var body: some View {
    VStack(spacing: 20) {
      EmptyState(
        title: "Different account type", symbol: "person.crop.circle.badge.exclamationmark",
        message: message)
      Button("Explore projects") { app.selectedTab = .explore }.buttonStyle(RaisedButtonStyle())
    }.padding(20).pageBackground()
  }
}

struct AccountView: View {
  @Environment(AppModel.self) private var app
  @State private var signingOut = false
  var body: some View {
    List {
      Section {
        Text(app.member?.user.name ?? "Account").font(Theme.title(24))
        if let role = app.role { Text(role.title).foregroundStyle(Theme.muted) }
      }
      Section("Privacy") {
        Text(
          "Profiles and postings are processed by server-side AI for analysis and matching. Mapbox supplies the map."
        )
        Text(
          "Your saved developer area is not shared with companies or recruiters. Open community-request pins are visible to developers."
        )
        Text("No payment or messaging service is included.")
      }
      Section("Account deletion") {
        Text(
          "Account deletion is not available on the service yet. Closing a posting does not delete your account."
        )
        .foregroundStyle(Theme.muted)
      }
      #if DEBUG
        Section("Labs") { NavigationLink("Voice studio") { VoiceStudioView() } }
      #endif
      Section {
        Button(signingOut ? "Signing out…" : "Sign out", role: .destructive) {
          signingOut = true
          Task {
            await app.signOut()
            signingOut = false
          }
        }.disabled(signingOut).accessibilityIdentifier("account.signOut")
      }
    }.pageBackground().navigationTitle("Account")
  }
}
