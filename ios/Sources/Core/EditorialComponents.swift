import SwiftUI

struct BrandLockup: View {
  var compact = false
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  var body: some View {
    HStack(spacing: 12) {
      Image("BrandMark").resizable().scaledToFit()
        .frame(width: 34, height: 34).padding(5)
        .background(Theme.softAccent, in: RoundedRectangle(cornerRadius: 14))
      if !compact && !dynamicTypeSize.isAccessibilitySize {
        Text("Build & Connect").font(Theme.title(23))
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
    case .paid: Theme.highlight
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
        category.background, in: RoundedRectangle(cornerRadius: size * 0.31)
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
    ZStack(alignment: .trailing) {
      SparkShape().fill(Theme.accent.opacity(0.14)).frame(width: 210, height: 210).offset(x: 80)
      HStack(alignment: .top, spacing: 18) {
        Text(title).font(Theme.title(35)).tracking(-0.6)
          .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
        Spacer(minLength: 0)
        Image(systemName: symbol).font(.system(size: 30, weight: .medium))
          .foregroundStyle(Theme.accent).padding(.top, 5).accessibilityHidden(true)
      }.padding(26)
    }.frame(maxWidth: .infinity, alignment: .leading).foregroundStyle(Theme.card)
      .background(Theme.ink, in: RoundedRectangle(cornerRadius: 26))
      .clipShape(RoundedRectangle(cornerRadius: 26))
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
        .background(Theme.accent, in: RoundedRectangle(cornerRadius: 23))
        .accessibilityHidden(true)
        Spacer()
        SparkShape().fill(Theme.accent).frame(width: 66, height: 66)
          .rotationEffect(.degrees(12)).accessibilityHidden(true)
      }
      VStack(alignment: .leading, spacing: 6) {
        Text(name).font(Theme.title(34)).tracking(-0.5)
        Label(city, systemImage: "mappin").font(Theme.body(16)).foregroundStyle(Theme.softAccent)
      }
      Label(
        available ? "Available for new projects" : "Not taking on new work",
        systemImage: available ? "circle.fill" : "pause.circle"
      )
      .font(Theme.body(15)).foregroundStyle(Theme.card)
    }.padding(26).frame(maxWidth: .infinity, alignment: .leading).foregroundStyle(Theme.card)
      .background(Theme.ink, in: RoundedRectangle(cornerRadius: 28))
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
        Text(title).font(Theme.body(21).weight(.semibold)).fixedSize(
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
    GeometryReader { geometry in
      ZStack {
        Theme.softAccent
        Circle().fill(Theme.accent).frame(width: 210, height: 210)
          .position(x: geometry.size.width * 0.85, y: 28)
        SparkShape().fill(Theme.accentStrong).frame(width: 150, height: 150)
          .rotationEffect(.degrees(-12)).position(x: 24, y: 165)
        Image(systemName: category.symbol).font(.system(size: 43, weight: .medium))
          .foregroundStyle(Theme.ink).frame(width: 102, height: 102)
          .background(Theme.card, in: RoundedRectangle(cornerRadius: 29))
          .rotationEffect(.degrees(-8))
          .shadow(color: Theme.shadow.opacity(0.14), radius: 0, x: 5, y: 7)
      }
    }.frame(height: 180).clipShape(RoundedRectangle(cornerRadius: 26)).accessibilityHidden(true)
  }
}

struct SparkShape: Shape {
  func path(in rect: CGRect) -> Path {
    let radius = min(rect.width, rect.height) / 2
    return Path { path in
      for index in 0..<24 {
        let angle = Double(index) * .pi / 12
        let length = radius * (index.isMultiple(of: 2) ? 1 : 0.6)
        let point = CGPoint(
          x: rect.midX + cos(angle) * length, y: rect.midY + sin(angle) * length)
        if index == 0 { path.move(to: point) } else { path.addLine(to: point) }
      }
      path.closeSubpath()
    }
  }
}
