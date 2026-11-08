import SwiftUI

struct WelcomeView: View {
  @Environment(AppModel.self) private var app
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  private var expanded: Bool { app.authMode != nil }
  var body: some View {
    GeometryReader { geometry in
      let compactWelcome =
        dynamicTypeSize.isAccessibilitySize || geometry.size.height < 650
        || geometry.size.width < 350
      ScrollView {
        VStack(spacing: 0) {
          ZStack(alignment: .topLeading) {
            HeroLandscape(compact: expanded)
            BrandLockup().padding(.horizontal, 24).padding(.top, 14)
            if !expanded && !compactWelcome {
              VStack(alignment: .leading, spacing: 10) {
                Text("Big ideas.\nLocal energy.").font(Theme.title(52)).tracking(-1.5).lineSpacing(
                  -2
                )
                .accessibilityAddTraits(.isHeader)
                Text("Find your people. Build your thing.").font(Theme.body(19)).foregroundStyle(
                  Theme.ink)
              }.padding(.horizontal, 28).frame(
                maxWidth: .infinity, maxHeight: .infinity, alignment: .center
              )
              .offset(y: -36)
            }
          }.frame(
            height: expanded
              ? 170
              : compactWelcome ? 200 : max(310, geometry.size.height * 0.63))
          if let mode = app.authMode {
            AuthView(initialMode: mode) {
              withAnimation(reduceMotion ? nil : .spring(response: 0.5, dampingFraction: 0.86)) {
                app.authMode = nil
              }
            }.padding(.horizontal, 16).padding(.top, -18).padding(.bottom, 24)
              .transition(.offset(y: 24).combined(with: .opacity))
          } else {
            VStack(alignment: .leading, spacing: 20) {
              Text(
                compactWelcome
                  ? "Big ideas. Local energy." : "Make your next move."
              ).font(Theme.title(33))
              Text("Real projects. Good people. A little spark to get you started.")
                .font(Theme.body(18)).foregroundStyle(Theme.muted).lineSpacing(3)
              if let error = app.sessionError {
                FailureView(error: error) { await app.refreshSession() }.disabled(
                  app.checkingSession)
              }
              Spacer(minLength: 8)
              Button {
                withAnimation(reduceMotion ? nil : .spring(response: 0.5, dampingFraction: 0.86)) {
                  app.authMode = .signIn
                }
              } label: {
                HStack {
                  Text("Sign in")
                  Spacer()
                  Image(systemName: "arrow.right")
                }
              }.buttonStyle(RaisedButtonStyle()).accessibilityIdentifier("welcome.signin")
            }.padding(.horizontal, 28).padding(.top, 24).padding(.bottom, 22)
              .frame(minHeight: geometry.size.height * 0.37, alignment: .top)
              .background(
                Theme.canvas,
                in: UnevenRoundedRectangle(topLeadingRadius: 30, topTrailingRadius: 30)
              )
              .padding(.top, -10)
          }
        }.frame(minHeight: geometry.size.height, alignment: .top)
      }.scrollIndicators(.hidden).scrollDismissesKeyboard(.interactively)
        .clipped()
        .background {
          VStack(spacing: 0) {
            Theme.softAccent
            Theme.canvas
          }.ignoresSafeArea()
        }
    }.background(Theme.softAccent.ignoresSafeArea()).toolbar(.hidden, for: .navigationBar)
  }
}
