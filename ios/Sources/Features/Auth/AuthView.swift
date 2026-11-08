import SwiftUI

struct AuthView: View {
  let initialMode: AuthMode
  var onClose: (() -> Void)?
  @Environment(AppModel.self) private var app
  @Environment(\.dismiss) private var dismiss
  @State private var mode: AuthMode = .signIn
  @State private var name = ""
  @State private var email = ""
  @State private var password = ""
  @State private var action = ActionState()
  @State private var showRecovery = false
  @State private var revealPassword = false
  @State private var passwordFocused = false
  @State private var validationMessage: String?
  @State private var authTask: Task<Void, Never>?
  @FocusState private var focused: Field?
  private enum Field { case name, email }
  var body: some View {
    VStack(alignment: .leading, spacing: 22) {
      HStack(alignment: .top) {
        Text(mode == .signUp ? "Your next chapter." : "Welcome back.").font(Theme.title(32))
          .accessibilityAddTraits(.isHeader)
        Spacer(minLength: 4)
        Button(action: close) {
          Image(systemName: "xmark").font(.system(size: 14, weight: .semibold))
            .frame(width: 24, height: 24)
        }.buttonStyle(AppButtonStyle(variant: .ghost, size: .icon))
          .accessibilityLabel("Close sign in")
      }
      VStack(spacing: 15) {
        if mode == .signUp {
          field("Your name", symbol: "person", isFocused: focused == .name) {
            TextField("Name", text: $name, prompt: Text("Name").foregroundStyle(Theme.muted))
              .textContentType(.name).focused($focused, equals: .name)
              .accessibilityLabel("Your name")
              .submitLabel(.next).onSubmit { focused = .email }.accessibilityIdentifier("auth.name")
          }
        }
        field("Email address", symbol: "envelope", isFocused: focused == .email) {
          TextField(
            "Email address", text: $email,
            prompt: Text(verbatim: "you@example.com").foregroundStyle(Theme.muted)
          ).textContentType(.emailAddress).keyboardType(
            .emailAddress
          )
          .textInputAutocapitalization(.never).autocorrectionDisabled().focused(
            $focused, equals: .email
          )
          .submitLabel(.next).onSubmit {
            focused = nil
            passwordFocused = true
          }.accessibilityIdentifier("auth.email")
          .accessibilityLabel("Email address")
        }
        field("Password", symbol: "lock", isFocused: passwordFocused) {
          PasswordEntry(
            text: $password, focused: $passwordFocused, revealed: revealPassword,
            creatingAccount: mode == .signUp, submit: submit)
          Button {
            revealPassword.toggle()
            focused = nil
            passwordFocused = true
          } label: {
            Image(systemName: revealPassword ? "eye.slash" : "eye").font(.system(size: 18)).frame(
              width: 44, height: 44)
          }.buttonStyle(AppButtonStyle(variant: .ghost, size: .icon))
            .accessibilityLabel(revealPassword ? "Hide password" : "Show password")
        }
        if mode == .signUp {
          Text("Use at least 12 characters.").font(Theme.body(14)).foregroundStyle(Theme.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }.disabled(action.busy)
      if let validationMessage {
        Label(validationMessage, systemImage: "exclamationmark.circle").font(Theme.body(15))
          .foregroundStyle(Theme.error)
      }
      if let error = action.error { FailureView(error: error) }
      Button(action: submit) {
        HStack(spacing: 12) {
          Text(mode == .signUp ? "Create account" : "Sign in")
          Image(systemName: "arrow.right")
        }
      }.buttonStyle(AppButtonStyle.primary).buttonLoading(action.busy)
        .accessibilityIdentifier("auth.submit")
      VStack(spacing: 18) {
        Button(mode == .signIn ? "Create an account" : "Sign in instead") {
          mode = mode == .signIn ? .signUp : .signIn
          action.error = nil
          validationMessage = nil
        }.font(Theme.body(17).weight(.semibold)).disabled(action.busy)
        ViewThatFits(in: .horizontal) {
          HStack {
            if mode == .signIn {
              Button("Forgot password?") { showRecovery = true }.disabled(action.busy)
            }
            Spacer()
            exploreButton
          }
          VStack(spacing: 16) {
            if mode == .signIn {
              Button("Forgot password?") { showRecovery = true }.disabled(action.busy)
            }
            exploreButton
          }
        }
        .font(Theme.body(14)).foregroundStyle(Theme.muted)
      }.frame(maxWidth: .infinity).buttonStyle(AppButtonStyle(variant: .link))
    }.paperCard()
      .onAppear { mode = initialMode }
      .onChange(of: focused) { _, field in if field != nil { passwordFocused = false } }
      .onDisappear { if !app.signedIn { cancelPending() } }
      .sheet(isPresented: $showRecovery) {
        AppDialog(
          title: "Password recovery",
          message:
            "Password-reset email is not configured on this service yet. No reset email has been sent."
        ) {
          Button("Dismiss") { showRecovery = false }.buttonStyle(AppButtonStyle.primary)
        }
      }
  }
  private var exploreButton: some View {
    Button("Explore city ideas") {
      cancelPending()
      app.pendingRoute = nil
      app.authMode = nil
      app.browsingAsGuest = true
      app.selectedTab = .explore
      dismiss()
    }.accessibilityIdentifier("welcome.explore")
  }
  private func field<Content: View>(
    _ title: String, symbol: String, isFocused: Bool, @ViewBuilder content: () -> Content
  ) -> some View {
    VStack(alignment: .leading, spacing: 7) {
      Text(title).font(Theme.metadata)
      HStack(spacing: 12) {
        Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(Theme.muted).frame(
          width: 20
        ).accessibilityHidden(true)
        content().textFieldStyle(.plain)
      }.padding(.horizontal, 12).frame(minHeight: 44)
        .modifier(AppInputSurface(focused: isFocused))
    }
  }
  private func cancelPending() {
    authTask?.cancel()
    authTask = nil
    if action.busy && !app.signedIn { app.api.clearSession() }
    password = ""
  }
  private func close() {
    focused = nil
    passwordFocused = false
    cancelPending()
    app.pendingRoute = nil
    if let onClose {
      onClose()
    } else {
      app.authMode = nil
      dismiss()
    }
  }
  private func submit() {
    guard !action.busy else { return }
    if mode == .signUp && name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      validationMessage = "Enter your name."
      focused = .name
      return
    }
    if !email.trimmingCharacters(in: .whitespacesAndNewlines).contains("@") {
      validationMessage = "Enter an email address, like name@example.com."
      focused = .email
      return
    }
    if password.isEmpty || (mode == .signUp && password.count < 12) {
      validationMessage =
        mode == .signUp ? "Use a password with at least 12 characters." : "Enter your password."
      focused = nil
      passwordFocused = true
      return
    }
    validationMessage = nil
    focused = nil
    passwordFocused = false
    authTask = Task {
      await action.run {
        var payload = [
          "email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password,
        ]
        if mode == .signUp {
          payload["name"] = name.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        try await app.api.mutate(
          "/auth/\(mode == .signUp ? "sign-up" : "sign-in")/email", body: payload)
        try Task.checkCancellation()
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
        app.authMode = nil
        dismiss()
      }
      authTask = nil
    }
  }
}

struct RoleSelectionView: View {
  @Environment(AppModel.self) private var app
  @State private var selected: Role?
  @State private var action = ActionState()
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        BrandLockup()
        EditorialHeading(
          title: "What brings you here?",
          subtitle: "Every good idea starts with someone. Choose how you'd like to take part.")
        ForEach([Role.developer, .requester]) { role in
          Button {
            selected = role
          } label: {
            HStack(alignment: .top, spacing: 14) {
              Image(systemName: role.symbol).font(.title2).frame(width: 48, height: 48)
                .background(
                  selected == role ? Theme.accent : Theme.canvas,
                  in: RoundedRectangle(cornerRadius: 15))
              VStack(alignment: .leading, spacing: 6) {
                Text(role.title).font(Theme.body(21).weight(.semibold))
                Text(role.purpose).foregroundStyle(Theme.muted)
              }
              Spacer(minLength: 0)
              Image(systemName: selected == role ? "checkmark.circle.fill" : "circle")
            }.paperCard().overlay(
              RoundedRectangle(cornerRadius: 20).stroke(
                selected == role ? Theme.accentStrong : .clear, lineWidth: 2))
          }.buttonStyle(.plain).accessibilityIdentifier("role.\(role.rawValue)")
            .accessibilityAddTraits(selected == role ? .isSelected : [])
            .disabled(action.busy)
        }
        if let error = action.error { FailureView(error: error) }
      }.padding(20)
    }.clipped().safeAreaInset(edge: .bottom) {
      VStack(spacing: 12) {
        Text("Your account type can't be changed later.").font(Theme.body(14)).foregroundStyle(
          Theme.muted)
        Button("Continue") { Task { await choose() } }
          .buttonStyle(AppButtonStyle.primary).buttonLoading(action.busy).disabled(selected == nil)
          .accessibilityIdentifier("role.continue")
        Button("Sign out") { Task { await app.signOut() } }.frame(minHeight: 44).disabled(
          action.busy)
      }.padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 6).background(Theme.canvas)
    }.pageBackground()
  }
  private func choose() async {
    guard let selected else { return }
    await action.run {
      var assigned = false
      do {
        try await app.api.mutate("/me/role", method: "PUT", body: ["role": selected.rawValue])
        assigned = true
      } catch let error as APIError where error.status == 409 {}
      if assigned && selected == .developer {
        app.needsProfileSetup = true
        try? DraftCache.save(true, key: "\(app.identity)/profile/onboarding")
      }
      await app.refreshSession(resumeNavigation: false)
      if let error = app.sessionError { throw error }
      if !app.needsProfileSetup {
        app.selectedTab = .explore
        app.resumePendingRoute()
      }
    }
  }
}

struct AuthenticationRequired: View {
  let route: Route
  @Environment(AppModel.self) private var app
  var body: some View {
    VStack(spacing: 20) {
      EmptyState(title: "Sign in to continue", symbol: "person.crop.circle")
      Button("Sign in") { app.authenticate(for: route) }.buttonStyle(AppButtonStyle.primary)
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
      Button("Explore projects") { app.selectedTab = .explore }.buttonStyle(AppButtonStyle.primary)
    }.padding(20).pageBackground()
  }
}

struct AccountView: View {
  @Environment(AppModel.self) private var app
  @State private var signingOut = false
  var body: some View {
    List {
      Section {
        HStack(spacing: 16) {
          Image(systemName: "person.crop.square.fill").font(.system(size: 30))
            .foregroundStyle(Theme.ink).frame(width: 60, height: 60)
            .background(Theme.accent, in: RoundedRectangle(cornerRadius: 19))
            .accessibilityHidden(true)
          VStack(alignment: .leading, spacing: 5) {
            Text(app.member?.user.name ?? "Account").font(Theme.title(27))
            if let role = app.role { Text(role.title).foregroundStyle(Theme.muted) }
          }
        }.padding(.vertical, 8)
      }
      AppSection("Privacy") {
        Text(
          "Profiles and postings are processed by server-side AI for analysis and matching. Mapbox supplies the map."
        )
        Text(
          "Your saved developer area is not shared with requesters. Open community-request pins are visible to developers."
        )
        Text("No payment or messaging service is included.")
      }
      AppSection("Account deletion") {
        Text(
          "Account deletion is not available on the service yet. Closing a posting does not delete your account."
        )
        .foregroundStyle(Theme.muted)
      }
      #if DEBUG
        AppSection("Labs") { NavigationLink("Voice studio", value: Route.voice) }
      #endif
      Section {
        Button("Sign out", role: .destructive) {
          signingOut = true
          Task {
            await app.signOut()
            signingOut = false
          }
        }.buttonLoading(signingOut).accessibilityIdentifier("account.signOut")
      }
    }.pageBackground().appNavigationTitle("Account")
  }
}
