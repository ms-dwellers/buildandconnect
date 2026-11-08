import SwiftUI

enum Theme {
  static let canvas = Color("LaunchCanvas")
  static let card = color(0xFCFCF8)
  static let ink = color(0x1B352C)
  static let muted = color(0x637069)
  static let accent = color(0xC7DEC6)
  static let accentStrong = color(0x315E48)
  static let softAccent = color(0xE4EBDD)
  static let highlight = color(0xDDE7D5)
  static let border = color(0xD7DDD2)
  static let shadow = color(0x1A342A)
  static let success = color(0x31604E)
  static let successSurface = color(0xE0EBDD)
  static let error = color(0xA33D3D)
  static let errorSurface = color(0xF4E4DF)
  static let mapLand = color(0x72D6A0)
  static let mapSurface = color(0xFFFFFF)
  static let mapBuildings = color(0xE5EBEE)
  static let mapGreenspace = color(0xF7FAFC)
  static let mapWater = color(0x75C8F2)
  static let mapRoads = color(0xFFFFFF)
  static let mapHighways = color(0x97ACBA)
  static let mapText = ink
  static let mapMuted = muted

  private static func color(_ hex: UInt32) -> Color {
    Color(
      .sRGB, red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: 1)
  }
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
      .foregroundStyle(Theme.card)
      .background(Theme.accentStrong, in: RoundedRectangle(cornerRadius: 18))
      .shadow(color: Theme.ink, radius: 0, y: configuration.isPressed && enabled ? 0 : 3)
      .offset(y: configuration.isPressed && enabled ? 3 : 0)
      .opacity(enabled ? 1 : 0.5)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.1), value: configuration.isPressed)
  }
}

extension View {
  func paperCard() -> some View {
    self.padding(22).frame(maxWidth: .infinity, alignment: .leading)
      .background(Theme.card, in: RoundedRectangle(cornerRadius: 24))
      .overlay(RoundedRectangle(cornerRadius: 24).stroke(Theme.border.opacity(0.8)))
      .shadow(color: Theme.shadow.opacity(0.06), radius: 12, y: 6)
  }
  func pageBackground() -> some View {
    self.scrollContentBackground(.hidden).scrollDismissesKeyboard(.interactively)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(Theme.canvas)
      .listRowSeparatorTint(Theme.border)
  }
  func mapControlSurface(cornerRadius: CGFloat = 24, mapOverlay: Bool = false) -> some View {
    modifier(LiquidSurface(cornerRadius: cornerRadius, mapOverlay: mapOverlay))
  }
}

private struct LiquidSurface: ViewModifier {
  let cornerRadius: CGFloat
  let mapOverlay: Bool
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @ViewBuilder func body(content: Content) -> some View {
    if mapOverlay {
      content.foregroundStyle(Theme.mapText)
        .background(Theme.mapSurface, in: RoundedRectangle(cornerRadius: cornerRadius))
        .overlay(
          RoundedRectangle(cornerRadius: cornerRadius).stroke(Theme.border)
        )
        .shadow(color: Theme.shadow.opacity(0.10), radius: 16, y: 8)
    } else if reduceTransparency {
      content.background(Theme.card, in: RoundedRectangle(cornerRadius: cornerRadius))
    } else if #available(iOS 26, *) {
      content.glassEffect(
        .regular.tint(Theme.card.opacity(0.75)), in: RoundedRectangle(cornerRadius: cornerRadius))
    } else {
      content.background(.regularMaterial, in: RoundedRectangle(cornerRadius: cornerRadius))
    }
  }
}

struct StatusBadge: View {
  let text: String
  private var positive: Bool {
    ["open", "available", "connected"].contains(text.lowercased())
  }
  var body: some View {
    Text(text.capitalized).font(Theme.metadata).padding(.horizontal, 10).padding(.vertical, 7)
      .foregroundStyle(positive ? Theme.success : Theme.ink)
      .background(
        positive
          ? Theme.successSurface
          : text.lowercased() == "claimed" ? Theme.highlight : Theme.softAccent,
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
    .padding(16)
    .background(Theme.errorSurface, in: RoundedRectangle(cornerRadius: 16))
    .accessibilityElement(children: .contain)
  }
}

struct EmptyState: View {
  let title: String
  let symbol: String
  var message: String?
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Image(systemName: symbol).font(.system(size: 25, weight: .medium))
        .foregroundStyle(Theme.accentStrong).frame(width: 52, height: 52)
        .background(Theme.softAccent, in: RoundedRectangle(cornerRadius: 16))
        .accessibilityHidden(true)
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
    HeroLandscape(compact: true).frame(height: 220)
      .clipShape(RoundedRectangle(cornerRadius: 24)).accessibilityHidden(true)
  }
}
