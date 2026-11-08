import SwiftUI

/// The actual website sprites, recomposed for portrait rather than a cropped web screenshot.
struct HeroLandscape: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  var compact = false
  @State private var drifting = false
  var body: some View {
    GeometryReader { geometry in
      let width = geometry.size.width
      let height = geometry.size.height
      ZStack(alignment: .bottom) {
        Theme.mint
        Image("HeroCloud2").resizable().scaledToFit().frame(width: width * 0.55)
          .position(x: width * 0.2 + (drifting ? 22 : -12), y: height * 0.25)
        Image("HeroCloud1").resizable().scaledToFit().frame(width: width * 0.43)
          .position(x: width * 0.86 + (drifting ? -18 : 10), y: height * 0.47)
        Image("HeroCloud3").resizable().scaledToFit().frame(width: width * 0.33)
          .position(x: width * 0.53 + (drifting ? 14 : -14), y: height * 0.65)
        Theme.teal.frame(height: height * 0.13)
        Rectangle().fill(Theme.canvas.opacity(0.45)).frame(width: 48, height: 1)
          .offset(x: -width * 0.27, y: -height * 0.065)
        Rectangle().fill(Theme.canvas.opacity(0.35)).frame(width: 68, height: 1)
          .offset(x: width * 0.22, y: -height * 0.035)
        Image("HeroTree1").resizable().interpolation(.none).scaledToFit().frame(
          height: height * 0.47
        )
        .position(x: -width * 0.02, y: height * 0.635)
        Image("HeroTree3").resizable().interpolation(.none).scaledToFit().frame(
          height: height * 0.44
        )
        .position(x: width * 1.03, y: height * 0.65)
        Image("HeroTree2").resizable().scaledToFit().frame(height: height * 0.30)
          .position(x: width * 0.80, y: height * 0.72)
        HStack(spacing: 0) {
          ForEach(0..<4) { _ in
            Image("HeroGround1").resizable().scaledToFill().frame(width: width / 4, height: 17)
              .clipped()
          }
        }.offset(y: -height * 0.13)
        ForEach(0..<5) { index in
          Image(index.isMultiple(of: 2) ? "HeroFlower2" : "HeroGrass1").resizable().scaledToFit()
            .frame(width: 22, height: compact ? 24 : 32)
            .position(x: width * (0.12 + Double(index) * 0.19), y: height * 0.87 - 27)
        }
      }.clipped()
    }.accessibilityHidden(true)
      .onAppear {
        guard !reduceMotion else { return }
        withAnimation(.easeOut(duration: 4)) {
          drifting = true
        }
      }
      .onChange(of: reduceMotion) { _, reduced in
        if reduced { withAnimation(.none) { drifting = false } }
      }
  }
}
