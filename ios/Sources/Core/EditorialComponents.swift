import SwiftUI

struct BrandLockup: View {
  var compact = false
  var body: some View {
    HStack(spacing: 10) {
      Image("BrandMark").resizable().scaledToFit().frame(
        width: compact ? 34 : 42, height: compact ? 34 : 42)
      if !compact { Text("Build & Connect").font(Theme.body(19).weight(.semibold)) }
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
  var background: Color { self == .paid ? Theme.wheat : Theme.mint }
  var accent: Color { self == .volunteer ? Theme.emerald : Theme.pine }
}

struct IdeaCategoryIcon: View {
  let category: IdeaCategory
  var size: CGFloat = 48
  var body: some View {
    Image(systemName: category.symbol).font(.system(size: size * 0.4, weight: .medium))
      .foregroundStyle(category.accent).frame(width: size, height: size)
      .background(
        category.background.opacity(0.65), in: RoundedRectangle(cornerRadius: size * 0.31)
      )
      .accessibilityHidden(true)
  }
}

struct EditorialHeading: View {
  let title: String
  var subtitle: String?
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title).font(Theme.title(34)).fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
      if let subtitle {
        Text(subtitle).font(Theme.body(17)).foregroundStyle(Theme.muted).lineSpacing(4)
      }
    }.frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct ProfileIdentity: View {
  let name: String
  let city: String
  let available: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      HStack(alignment: .top) {
        Text(initials).font(Theme.title(30)).frame(width: 74, height: 74)
          .background(Theme.card, in: Circle())
          .overlay(Circle().stroke(Theme.pine.opacity(0.1), lineWidth: 1))
          .accessibilityHidden(true)
        Spacer()
        Image("HeroTree2").resizable().scaledToFit().frame(width: 64, height: 78)
          .accessibilityHidden(true)
      }
      VStack(alignment: .leading, spacing: 6) {
        Text(name).font(Theme.title(32))
        Label(city, systemImage: "mappin").font(Theme.body(16)).foregroundStyle(Theme.muted)
      }
      Label(
        available ? "Open to something good" : "Not taking on new work",
        systemImage: available ? "circle.fill" : "pause.circle"
      )
      .font(Theme.body(15)).foregroundStyle(Theme.pine)
    }.padding(24).frame(maxWidth: .infinity, alignment: .leading)
      .background(Theme.mint.opacity(0.8), in: RoundedRectangle(cornerRadius: 28))
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
    }.foregroundStyle(Theme.pine)
  }
}

struct IdeaArtwork: View {
  let category: IdeaCategory
  var body: some View {
    ZStack {
      category.background
      HStack(alignment: .bottom) {
        Image("HeroTree1").resizable().scaledToFit().frame(width: 100, height: 150).offset(
          x: -20, y: 16)
        Spacer()
        Image("HeroTree2").resizable().scaledToFit().frame(width: 80, height: 100).offset(
          x: 10, y: 12)
      }
      Image("HeroCloud2").resizable().scaledToFit().frame(width: 170).offset(x: 30, y: -32)
      Image(systemName: category.symbol).font(.system(size: 38, weight: .light))
        .frame(width: 88, height: 88).background(Theme.card, in: RoundedRectangle(cornerRadius: 28))
        .rotationEffect(.degrees(-7))
        .shadow(color: Theme.pine.opacity(0.1), radius: 12, y: 8)
    }.frame(height: 180).clipShape(RoundedRectangle(cornerRadius: 26)).accessibilityHidden(true)
  }
}
