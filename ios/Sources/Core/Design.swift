import SwiftUI

enum Theme {
  static let canvas = Color("LaunchCanvas")
  static let cream = color(0xF8F7DE)
  static let card = canvas
  static let ink = color(0x123D37)
  static let muted = color(0x254139)
  static let accent = color(0xA9C8BD)
  static let accentStrong = color(0x174C43)
  static let softAccent = color(0xCCE0D9)
  static let highlight = color(0xEB5757)
  static let highlightText = color(0x10221D)
  static let wheat = color(0xF6DFB3)
  static let apricot = color(0xF0A345)
  static let border = accentStrong.opacity(0.2)
  static let inputBorder = color(0x3E5C53)
  static let shadow = accentStrong
  static let success = accentStrong
  static let successSurface = accentStrong.opacity(0.08)
  static let error = color(0x701A22)
  static let destructive = color(0xB52D35)
  static let errorSurface = destructive.opacity(0.08)
  static let primaryEdge = color(0x103E35)
  static let primaryHover = color(0x286556)
  static let highlightEdge = color(0xB84141)
  static let secondaryEdge = color(0x99713B)
  static let outlineEdge = color(0x7E9E91)
  static let destructiveEdge = color(0x7F1E27)
  static let mapLand = color(0xD7E5D8)
  static let mapSurface = canvas
  static let mapBuildings = color(0xC4D8C8)
  static let mapGreenspace = color(0xA4C2AD)
  static let mapWater = color(0x8FB3AC)
  static let mapRoads = cream
  static let mapHighways = color(0xDFC999)
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
  static let caption = Font.custom("LeagueSpartan-Regular", size: 13, relativeTo: .footnote)
  static let subheading = Font.custom("LeagueSpartan-SemiBold", size: 17, relativeTo: .headline)
}

extension View {
  func appNavigationTitle(_ title: String) -> some View {
    self.navigationTitle(title).navigationBarTitleDisplayMode(.inline)
      .toolbar {
        AppToolbarItem(placement: .principal) {
          Text(title).font(Theme.body(18).weight(.semibold)).foregroundStyle(Theme.ink)
        }
      }
  }
  func paperCard() -> some View {
    self.padding(24).frame(maxWidth: .infinity, alignment: .leading)
      .background {
        RoundedRectangle(cornerRadius: 20).fill(Theme.card)
          .shadow(color: Theme.shadow.opacity(0.08), radius: 0, y: 2)
          .shadow(color: Theme.shadow.opacity(0.04), radius: 7, y: 5)
      }
      .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.border))
  }
  func pageBackground() -> some View {
    self.scrollContentBackground(.hidden).scrollDismissesKeyboard(.interactively)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(Theme.canvas)
      .listRowSeparatorTint(Theme.border)
  }
  func controlSurface(cornerRadius: CGFloat = 12) -> some View {
    self.background {
      RoundedRectangle(cornerRadius: cornerRadius).fill(Theme.card)
        .shadow(color: Theme.shadow.opacity(0.08), radius: 0, y: 2)
        .shadow(color: Theme.shadow.opacity(0.04), radius: 7, y: 5)
    }
    .overlay(RoundedRectangle(cornerRadius: cornerRadius).stroke(Theme.border))
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
        in: RoundedRectangle(cornerRadius: 5))
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
          Text("\(issue.field): \(issue.message)").font(Theme.caption).foregroundStyle(Theme.error)
        }
      }
      if let retry { Button("Try again") { Task { await retry() } }.buttonStyle(AppButtonStyle()) }
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
        .background(Theme.softAccent, in: RoundedRectangle(cornerRadius: 12))
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
      Button("Load more") { Task { await load(false) } }.buttonStyle(AppButtonStyle())
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
    .buttonStyle(AppButtonStyle(variant: destructive ? .destructive : .outline))
    .disabled(disabled)
    .sheet(isPresented: $confirming) {
      AppDialog(title: label + "?", message: consequence) {
        Button(label, role: destructive ? .destructive : nil) {
          confirming = false
          Task { await action() }
        }.buttonStyle(
          AppButtonStyle(variant: destructive ? .destructive : .primary, fullWidth: true))
        Button("Cancel", role: .cancel) { confirming = false }
          .buttonStyle(AppButtonStyle(fullWidth: true))
      }
    }
  }
}

struct GardenScene: View {
  var body: some View {
    HeroLandscape(compact: true).frame(height: 220)
      .clipShape(RoundedRectangle(cornerRadius: 20)).accessibilityHidden(true)
  }
}
