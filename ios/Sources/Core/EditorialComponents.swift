import SwiftUI

struct BrandLockup: View {
  var compact = false
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  var body: some View {
    HStack(spacing: 12) {
      Image("BrandMark").resizable().scaledToFit()
        .frame(width: 40, height: 40)
      if !compact && !dynamicTypeSize.isAccessibilitySize {
        Text("Build & Connect").font(Theme.body(18).weight(.semibold))
      }
    }.accessibilityElement(children: .ignore).accessibilityLabel("Build & Connect")
  }
}

enum IdeaCategory: String, CaseIterable {
  case community, volunteer, paid
  var title: String { rawValue.capitalized }
  var symbol: String {
    switch self {
    case .community: "lightbulb"
    case .volunteer: "leaf"
    case .paid: "briefcase"
    }
  }
  var background: Color {
    switch self {
    case .community: Theme.softAccent
    case .volunteer: Theme.successSurface
    case .paid: Theme.wheat
    }
  }
  var accent: Color { self == .volunteer ? Theme.success : Theme.ink }
}

struct IdeaCategoryIcon: View {
  let category: IdeaCategory
  var size: CGFloat = 48
  var body: some View {
    Image(systemName: category.symbol).font(.system(size: size * 0.4, weight: .semibold))
      .foregroundStyle(category.accent).frame(width: size, height: size)
      .background(
        category.background, in: RoundedRectangle(cornerRadius: 12)
      )
      .accessibilityHidden(true)
  }
}

struct EditorialHeading: View {
  let title: String
  var subtitle: String?
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title).font(Theme.title(36)).tracking(-0.6).fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
      if let subtitle {
        Text(subtitle).font(Theme.body(17)).foregroundStyle(Theme.muted).lineSpacing(4)
      }
    }.frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct FeatureBanner: View {
  let title: String
  let symbol: String
  var body: some View {
    HStack(alignment: .top, spacing: 18) {
      Text(title).font(Theme.title(35)).tracking(-0.6)
        .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
      Spacer(minLength: 0)
      Image(systemName: symbol).font(.system(size: 30, weight: .medium))
        .foregroundStyle(Theme.accentStrong).padding(.top, 5).accessibilityHidden(true)
    }.frame(maxWidth: .infinity, alignment: .leading).foregroundStyle(Theme.ink)
  }
}

struct ProfileIdentity: View {
  let name: String
  let city: String
  let available: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      HStack(alignment: .top) {
        Text(initials).font(Theme.title(32)).lineLimit(1).minimumScaleFactor(0.5).frame(
          width: 76, height: 76
        )
        .foregroundStyle(Theme.ink)
        .background(Theme.canvas, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityHidden(true)
        Spacer()
        Image("HeroTree2").resizable().scaledToFit().frame(width: 64, height: 78)
          .accessibilityHidden(true)
      }
      VStack(alignment: .leading, spacing: 6) {
        Text(name).font(Theme.title(34)).tracking(-0.5)
        Label(city, systemImage: "mappin").font(Theme.body(16)).foregroundStyle(Theme.muted)
      }
      Label(
        available ? "Available for new projects" : "Not taking on new work",
        systemImage: available ? "circle.fill" : "pause.circle"
      )
      .font(Theme.body(15)).foregroundStyle(Theme.accentStrong)
    }.padding(24).frame(maxWidth: .infinity, alignment: .leading).foregroundStyle(Theme.ink)
      .background(Theme.softAccent, in: RoundedRectangle(cornerRadius: 20))
      .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.border))
  }
  private var initials: String {
    name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined().uppercased()
  }
}

struct IdeaRowContent: View {
  let title: String
  let detail: String
  let category: IdeaCategory
  var subtitle: String?
  var body: some View {
    HStack(alignment: .top, spacing: 14) {
      IdeaCategoryIcon(category: category)
      VStack(alignment: .leading, spacing: 7) {
        Text(title).font(Theme.body(18).weight(.semibold)).fixedSize(
          horizontal: false, vertical: true)
        Text(detail).font(Theme.body(15)).foregroundStyle(Theme.muted)
        if let subtitle {
          Text(subtitle).font(Theme.metadata).foregroundStyle(Theme.muted).lineLimit(2)
        }
      }
      Spacer(minLength: 0)
      Image(systemName: "arrow.up.right").font(.system(size: 13, weight: .medium)).padding(.top, 4)
        .accessibilityHidden(true)
    }.foregroundStyle(Theme.ink)
  }
}

struct SkillRow: View {
  let name: String
  let level: Int
  var body: some View {
    VStack(alignment: .leading, spacing: 9) {
      LabeledContent(name, value: "\(level) / 5").font(Theme.body(17))
      HStack(spacing: 5) {
        ForEach(0..<5) { index in
          RoundedRectangle(cornerRadius: 2).fill(index < level ? Theme.accent : Theme.border)
            .frame(height: 4)
        }
      }.accessibilityHidden(true)
    }.accessibilityElement(children: .combine)
  }
}

struct IdeaArtwork: View {
  let category: IdeaCategory
  var body: some View {
    ZStack {
      HeroLandscape(compact: true)
      Image(systemName: category.symbol).font(.system(size: 36, weight: .medium))
        .foregroundStyle(Theme.accentStrong).frame(width: 80, height: 80)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border))
    }.frame(height: 180).clipShape(RoundedRectangle(cornerRadius: 20)).accessibilityHidden(true)
  }
}
