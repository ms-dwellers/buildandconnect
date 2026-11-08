import SwiftUI

enum Theme {
  static let canvas = Color(red: 0.973, green: 0.969, blue: 0.871)
  static let card = Color(red: 0.997, green: 0.992, blue: 0.950)
  static let mint = Color(red: 0.800, green: 0.878, blue: 0.851)
  static let pine = Color(red: 0.090, green: 0.298, blue: 0.263)
  static let muted = Color(red: 0.275, green: 0.373, blue: 0.329)
  static let wheat = Color(red: 0.965, green: 0.875, blue: 0.702)
  static let coral = Color(red: 0.922, green: 0.341, blue: 0.341)
  static let teal = Color(red: 0.561, green: 0.702, blue: 0.675)
  static let apricot = Color(red: 0.941, green: 0.639, blue: 0.271)
  static let emerald = Color(red: 0.118, green: 0.388, blue: 0.282)
  static let error = Color(red: 0.620, green: 0.118, blue: 0.118)
  static let edge = Color(red: 0.047, green: 0.192, blue: 0.165)
  static func title(_ size: CGFloat = 32) -> Font {
    .custom("LeagueSpartan-Bold", size: size, relativeTo: .largeTitle)
  }
  static func body(_ size: CGFloat = 17) -> Font {
    .custom("LeagueSpartan-Regular", size: size, relativeTo: .body)
  }
  static let metadata = Font.custom("DMMono-Regular", size: 12, relativeTo: .caption)
}

struct RaisedButtonStyle: ButtonStyle {
  @Environment(\.isEnabled) private var enabled
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(Theme.body().weight(.semibold))
      .frame(maxWidth: .infinity, minHeight: 54)
      .padding(.horizontal, 20)
      .foregroundStyle(Theme.canvas)
      .background(Theme.pine, in: RoundedRectangle(cornerRadius: 18))
      .shadow(color: Theme.edge, radius: 0, y: configuration.isPressed && enabled ? 0 : 2)
      .offset(y: configuration.isPressed && enabled ? 2 : 0)
      .opacity(enabled ? 1 : 0.5)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.1), value: configuration.isPressed)
  }
}

extension View {
  func paperCard() -> some View {
    self.padding(20).frame(maxWidth: .infinity, alignment: .leading)
      .background(Theme.card, in: RoundedRectangle(cornerRadius: 24))
      .overlay(RoundedRectangle(cornerRadius: 24).stroke(Theme.pine.opacity(0.08)))
      .shadow(color: Theme.pine.opacity(0.045), radius: 8, y: 4)
  }
  func pageBackground() -> some View {
    self.scrollContentBackground(.hidden).scrollDismissesKeyboard(.interactively)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(Theme.canvas)
  }
  func mapControlSurface(cornerRadius: CGFloat = 24) -> some View {
    modifier(LiquidSurface(cornerRadius: cornerRadius))
  }
}

private struct LiquidSurface: ViewModifier {
  let cornerRadius: CGFloat
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @ViewBuilder func body(content: Content) -> some View {
    if reduceTransparency {
      content.background(Theme.card, in: RoundedRectangle(cornerRadius: cornerRadius))
    } else if #available(iOS 26, *) {
      content.glassEffect(.regular, in: RoundedRectangle(cornerRadius: cornerRadius))
    } else {
      content.background(.regularMaterial, in: RoundedRectangle(cornerRadius: cornerRadius))
    }
  }
}

struct StatusBadge: View {
  let text: String
  var body: some View {
    Text(text.capitalized).font(Theme.metadata).padding(.horizontal, 10).padding(.vertical, 7)
      .foregroundStyle(Theme.pine)
      .background(
        text.lowercased() == "claimed" ? Theme.wheat : Theme.mint.opacity(0.65),
        in: RoundedRectangle(cornerRadius: 8))
  }
}

struct FailureView: View {
  let error: Error
  var retry: (() async -> Void)?
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Label(error.localizedDescription, systemImage: "exclamationmark.circle")
        .foregroundStyle(Theme.error).accessibilityAddTraits(.updatesFrequently)
      if let apiError = error as? APIError {
        ForEach(Array(apiError.issues.enumerated()), id: \.offset) { _, issue in
          Text("\(issue.field): \(issue.message)").font(.footnote).foregroundStyle(Theme.error)
        }
      }
      if let retry { Button("Try again") { Task { await retry() } }.buttonStyle(.bordered) }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .contain)
  }
}

struct EmptyState: View {
  let title: String
  let symbol: String
  var message: String?
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Image(systemName: symbol).font(.title).foregroundStyle(Theme.pine).accessibilityHidden(true)
      Text(title).font(Theme.title(24))
      if let message { Text(message).foregroundStyle(Theme.muted) }
    }.paperCard()
  }
}

struct PageList<Item: Decodable & Identifiable, Content: View>: View where Item.ID: Hashable {
  let store: PageStore<Item>
  let load: (Bool) async -> Void
  @ViewBuilder let content: (Item) -> Content
  var body: some View {
    if let error = store.error { FailureView(error: error) { await load(true) } }
    ForEach(store.items) { item in content(item) }
    if store.loading {
      ProgressView().frame(maxWidth: .infinity).padding()
    } else if store.nextCursor != nil {
      Button("Load more") { Task { await load(false) } }.buttonStyle(.bordered)
    }
  }
}

struct ConfirmAction: View {
  let label: String
  let consequence: String
  var destructive = false
  var disabled = false
  let action: () async -> Void
  @State private var confirming = false
  var body: some View {
    Button(role: destructive ? .destructive : nil) {
      confirming = true
    } label: {
      Text(label).frame(minHeight: 44)
    }
    .disabled(disabled)
    .confirmationDialog(label + "?", isPresented: $confirming, titleVisibility: .visible) {
      Button(label, role: destructive ? .destructive : nil) { Task { await action() } }
      Button("Cancel", role: .cancel) {}
    } message: {
      Text(consequence)
    }
  }
}

struct GardenScene: View {
  var body: some View {
    Image("CommunityGarden").resizable().scaledToFit().padding(.top, 28)
      .background(Theme.mint, in: RoundedRectangle(cornerRadius: 24))
      .clipShape(RoundedRectangle(cornerRadius: 24)).accessibilityHidden(true)
  }
}
