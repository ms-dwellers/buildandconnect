import SwiftUI

struct HeroLandscape: View {
  var compact = false
  var body: some View {
    GeometryReader { geometry in
      let width = geometry.size.width
      let height = geometry.size.height
      ZStack(alignment: .bottom) {
        Theme.softAccent
        Circle().fill(Theme.accent).frame(width: width * 0.86, height: width * 0.86)
          .position(x: width * 0.85, y: compact ? height * 0.25 : height * 0.36)
        Circle().stroke(Theme.accentStrong.opacity(0.25), lineWidth: 1)
          .frame(width: width * 1.2, height: width * 1.2)
          .position(x: width * 0.85, y: height * 0.36)
        SparkShape().fill(Theme.accentStrong).frame(
          width: compact ? 34 : 54, height: compact ? 34 : 54
        )
        .position(x: width * 0.12, y: height * 0.62)
        HStack(alignment: .bottom, spacing: 7) {
          ForEach(0..<7) { index in
            let buildingHeight = height * (0.16 + Double((index * 3) % 5) * 0.035)
            VStack(spacing: 10) {
              ForEach(0..<3) { _ in
                HStack(spacing: 7) {
                  ForEach(0..<2) { _ in
                    RoundedRectangle(cornerRadius: 1).fill(Theme.softAccent.opacity(0.65))
                      .frame(width: 6, height: compact ? 5 : 10)
                  }
                }
              }
              Spacer(minLength: 0)
            }.padding(.top, 13).frame(width: width * 0.145, height: buildingHeight)
              .background(
                index.isMultiple(of: 2) ? Theme.ink : Theme.accentStrong,
                in: UnevenRoundedRectangle(topLeadingRadius: 7, topTrailingRadius: 7))
          }
        }.offset(y: 8)
      }.clipped()
    }.accessibilityHidden(true)
  }
}
