import SwiftUI
import UIKit

/// Native equivalents of components/ui/button.tsx and app/globals.css.
struct AppButtonStyle: ButtonStyle {
  enum Variant { case primary, highlight, secondary, outline, ghost, link, destructive }
  enum Size {
    case regular, large, icon, small
    var height: CGFloat { self == .large ? 48 : 44 }
    var depth: CGFloat { self == .large ? 4 : self == .small ? 2 : 3 }
  }
  var variant: Variant = .outline
  var size: Size = .regular
  var fullWidth = false
  var selected = false
  static var primary: Self { .init(variant: .primary, size: .large, fullWidth: true) }
  static var highlight: Self { .init(variant: .highlight, size: .large, fullWidth: true) }
  @Environment(\.isEnabled) private var enabled
  @Environment(\.isFocused) private var focused
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @State private var hovering = false

  private var raised: Bool { variant != .ghost && variant != .link }
  private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: 10) }
  private var foreground: Color {
    switch variant {
    case .primary: Theme.cream
    case .highlight: Theme.highlightText
    case .destructive: .white
    default: Theme.ink
    }
  }
  private var fill: Color {
    switch variant {
    case .primary: hovering && enabled ? Theme.primaryHover : Theme.accentStrong
    case .highlight: hovering && enabled ? Theme.highlightHover : Theme.highlight
    case .secondary: hovering && enabled ? Theme.softAccent.opacity(0.9) : Theme.softAccent
    case .destructive: hovering && enabled ? Theme.destructive.opacity(0.9) : Theme.destructive
    case .ghost: hovering && enabled ? Theme.accent : .clear
    case .link: .clear
    case .outline: hovering && enabled ? Theme.accent.opacity(0.5) : Theme.card
    }
  }
  private var edge: Color {
    switch variant {
    case .primary: Theme.primaryEdge
    case .highlight: Theme.highlightEdge
    case .secondary: Theme.secondaryEdge
    case .destructive: Theme.destructiveEdge
    default: Theme.outlineEdge
    }
  }

  func makeBody(configuration: Configuration) -> some View {
    let pressed = enabled && (configuration.isPressed || selected)
    let depth = raised && enabled && !pressed ? size.depth : 0
    configuration.label
      .font(Theme.body(size == .large ? 16 : 14).weight(.semibold))
      .lineLimit(dynamicTypeSize.isAccessibilitySize && fullWidth ? nil : 1)
      .underline(variant == .link && (hovering || pressed))
      .padding(.horizontal, size == .icon ? 0 : size == .large ? 20 : size == .small ? 10 : 16)
      .frame(
        minWidth: size == .icon ? 44 : nil, maxWidth: fullWidth ? .infinity : nil,
        minHeight: size.height
      )
      .fixedSize(horizontal: !fullWidth, vertical: false)
      .foregroundStyle(configuration.role == .destructive ? Color.white : foreground)
      .background {
        shape.fill(
          configuration.role == .destructive
            ? Theme.destructive
            : variant == .ghost && pressed ? Theme.accent : fill
        )
        .shadow(
          color: configuration.role == .destructive ? Theme.destructiveEdge : edge,
          radius: 0, y: depth)
      }
      .overlay(
        shape.stroke(
          raised
            ? (configuration.role == .destructive
              ? Theme.destructiveEdge
              : variant == .outline ? Theme.inputBorder : edge) : .clear)
      )
      .overlay {
        if focused {
          RoundedRectangle(cornerRadius: 13).stroke(Theme.accentStrong, lineWidth: 2).padding(-3)
        }
      }
      .offset(y: raised && pressed ? size.depth : 0)
      .opacity(enabled ? 1 : 0.64)
      .contentShape(shape)
      .onHover { hovering = $0 }
      .animation(reduceMotion ? nil : .easeOut(duration: 0.1), value: pressed)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: hovering)
  }
}

struct AppTextFieldStyle: TextFieldStyle {
  func _body(configuration: TextField<Self._Label>) -> some View {
    configuration.modifier(AppFieldSurface())
  }
}

struct AppField<Content: View>: View {
  let title: String
  @ViewBuilder let content: () -> Content
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title).font(Theme.metadata).accessibilityHidden(true)
      content()
    }.listRowBackground(Theme.card)
  }
}

struct AppSection<Content: View>: View {
  let title: String
  @ViewBuilder let content: () -> Content

  init(_ title: String, @ViewBuilder content: @escaping () -> Content) {
    self.title = title
    self.content = content
  }

  var body: some View {
    Section {
      content()
    } header: {
      Text(title).font(Theme.metadata).foregroundStyle(Theme.muted).textCase(nil)
    }
  }
}

private struct AppFieldSurface: ViewModifier {
  @FocusState private var focused: Bool
  nonisolated init() {}
  func body(content: Content) -> some View {
    content.focused($focused).font(Theme.body(16)).padding(.horizontal, 12).padding(.vertical, 10)
      .frame(minHeight: 44)
      .modifier(AppInputSurface(focused: focused))
  }
}

struct AppInputSurface: ViewModifier {
  var focused = false
  @Environment(\.isEnabled) private var enabled
  func body(content: Content) -> some View {
    content
      .background(Theme.canvas, in: RoundedRectangle(cornerRadius: 12))
      .overlay(
        RoundedRectangle(cornerRadius: 12).stroke(focused ? Theme.accentStrong : Theme.inputBorder)
      )
      .overlay {
        if focused {
          RoundedRectangle(cornerRadius: 15).stroke(Theme.accentStrong.opacity(0.24), lineWidth: 3)
            .padding(-2)
        }
      }
      .opacity(enabled ? 1 : 0.64)
  }
}

struct AppSwitchStyle: ToggleStyle {
  @Environment(\.isEnabled) private var enabled
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  func makeBody(configuration: Configuration) -> some View {
    Button {
      configuration.isOn.toggle()
    } label: {
      HStack(spacing: 16) {
        configuration.label.font(Theme.body(16)).multilineTextAlignment(.leading)
        Spacer(minLength: 0)
        RoundedRectangle(cornerRadius: 11)
          .fill(configuration.isOn ? Theme.accentStrong : Theme.inputBorder)
          .frame(width: 38, height: 22)
          .overlay(alignment: configuration.isOn ? .trailing : .leading) {
            Circle().fill(Theme.canvas).frame(width: 20, height: 20).padding(1)
          }
          .frame(width: 44, height: 44)
      }.contentShape(Rectangle())
    }.buttonStyle(.plain)
      .opacity(enabled ? 1 : 0.64)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: configuration.isOn)
      .accessibilityRepresentation {
        Toggle(isOn: configuration.$isOn) { configuration.label }.toggleStyle(.switch)
      }
  }
}

struct AppSegmentedControl<Value: Hashable>: View {
  let title: String
  @Binding var selection: Value
  let options: [(Value, String)]
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  var body: some View {
    let layout =
      dynamicTypeSize.isAccessibilitySize
      ? AnyLayout(VStackLayout(spacing: 8)) : AnyLayout(AppFlowLayout())
    layout {
      ForEach(options.indices, id: \.self) { index in
        let option = options[index]
        Button {
          selection = option.0
        } label: {
          Text(option.1).font(Theme.body(14).weight(.semibold))
            .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
        }
        .buttonStyle(
          AppButtonStyle(
            variant: selection == option.0 ? .primary : .outline,
            size: .small, fullWidth: dynamicTypeSize.isAccessibilitySize,
            selected: selection == option.0)
        )
        .accessibilityAddTraits(selection == option.0 ? .isSelected : [])
      }
    }.accessibilityElement(children: .contain).accessibilityLabel(title)
  }
}

/// Wrap whole controls onto another row rather than compressing their labels.
private struct AppFlowLayout: Layout {
  var spacing: CGFloat = 8

  private func arrangement(proposal: ProposedViewSize, subviews: Subviews) -> (CGSize, [CGPoint]) {
    let width = proposal.width ?? .infinity
    var positions: [CGPoint] = []
    var x: CGFloat = 0
    var y: CGFloat = 0
    var rowHeight: CGFloat = 0
    var usedWidth: CGFloat = 0
    for subview in subviews {
      let size = subview.sizeThatFits(.unspecified)
      if x > 0 && x + size.width > width {
        x = 0
        y += rowHeight + spacing
        rowHeight = 0
      }
      positions.append(CGPoint(x: x, y: y))
      usedWidth = max(usedWidth, x + size.width)
      x += size.width + spacing
      rowHeight = max(rowHeight, size.height)
    }
    return (CGSize(width: usedWidth, height: y + rowHeight), positions)
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    arrangement(proposal: proposal, subviews: subviews).0
  }

  func placeSubviews(
    in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()
  ) {
    let positions = arrangement(
      proposal: ProposedViewSize(width: bounds.width, height: nil), subviews: subviews
    ).1
    for (index, subview) in subviews.enumerated() {
      subview.place(
        at: CGPoint(x: bounds.minX + positions[index].x, y: bounds.minY + positions[index].y),
        proposal: .unspecified)
    }
  }
}

struct AppSelect<Value: Hashable>: View {
  let title: String
  @Binding var selection: Value
  let options: [(Value, String)]
  @State private var expanded = false
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title).font(Theme.metadata)
      Button {
        expanded = true
      } label: {
        HStack(spacing: 8) {
          Text(options.first { $0.0 == selection }?.1 ?? title).lineLimit(1)
          Spacer()
          Image(systemName: "chevron.up.chevron.down").font(.system(size: 12, weight: .medium))
        }.font(Theme.body(16)).foregroundStyle(Theme.ink)
          .padding(.horizontal, 12).frame(minHeight: 44)
          .modifier(AppInputSurface(focused: expanded))
          .contentShape(RoundedRectangle(cornerRadius: 12))
      }.buttonStyle(.plain)
        .accessibilityLabel(title).accessibilityValue(options.first { $0.0 == selection }?.1 ?? "")
    }.sheet(isPresented: $expanded) {
      VStack(alignment: .leading, spacing: 16) {
        HStack {
          Text(title).font(Theme.title(24))
          Spacer()
          Button("Done") { expanded = false }.buttonStyle(AppButtonStyle(variant: .ghost))
        }
        ScrollView {
          VStack(spacing: 8) {
            ForEach(options.indices, id: \.self) { index in
              Button {
                selection = options[index].0
                expanded = false
              } label: {
                HStack {
                  Text(options[index].1)
                  Spacer()
                  if selection == options[index].0 { Image(systemName: "checkmark") }
                }
              }.buttonStyle(
                AppButtonStyle(
                  variant: selection == options[index].0 ? .secondary : .ghost,
                  fullWidth: true))
            }
          }
        }
      }.padding(24).foregroundStyle(Theme.ink)
        .presentationDetents([.medium]).presentationBackground(Theme.canvas)
        .presentationCornerRadius(20)
    }
  }
}

struct AppStepper: View {
  let title: String
  @Binding var value: Int
  let range: ClosedRange<Int>
  var body: some View {
    HStack(spacing: 12) {
      Text(title).font(Theme.body(16))
      Spacer(minLength: 4)
      Button {
        value -= 1
      } label: {
        Image(systemName: "minus")
      }
      .buttonStyle(AppButtonStyle(size: .icon)).disabled(value <= range.lowerBound)
      .accessibilityLabel("Decrease \(title)")
      Button {
        value += 1
      } label: {
        Image(systemName: "plus")
      }
      .buttonStyle(AppButtonStyle(size: .icon)).disabled(value >= range.upperBound)
      .accessibilityLabel("Increase \(title)")
    }
  }
}

/// Keep native slider input and accessibility with the web's opaque track and thumb.
struct AppSlider: UIViewRepresentable {
  @Binding var value: Double
  let bounds: ClosedRange<Double>
  let step: Double
  let label: String

  func makeUIView(context: Context) -> NativeSlider {
    let slider = NativeSlider()
    for (minimum, color) in [(true, Theme.accentStrong), (false, Theme.inputBorder)] {
      let image = UIGraphicsImageRenderer(size: CGSize(width: 4, height: 4)).image { _ in
        UIColor(color).setFill()
        UIBezierPath(roundedRect: CGRect(x: 0, y: 0, width: 4, height: 4), cornerRadius: 2).fill()
      }.resizableImage(withCapInsets: UIEdgeInsets(top: 0, left: 2, bottom: 0, right: 2))
      if minimum {
        slider.setMinimumTrackImage(image, for: .normal)
      } else {
        slider.setMaximumTrackImage(image, for: .normal)
      }
    }
    for (state, size) in [(UIControl.State.normal, CGFloat(20)), (.highlighted, CGFloat(24))] {
      let image = UIGraphicsImageRenderer(size: CGSize(width: size, height: size)).image { _ in
        let circle = UIBezierPath(ovalIn: CGRect(x: 0.5, y: 0.5, width: size - 1, height: size - 1))
        UIColor(Theme.card).setFill()
        circle.fill()
        UIColor(Theme.inputBorder).setStroke()
        circle.stroke()
      }
      slider.setThumbImage(image, for: state)
    }
    slider.addTarget(
      context.coordinator, action: #selector(Coordinator.changed(_:)), for: .valueChanged)
    return slider
  }

  func updateUIView(_ slider: NativeSlider, context: Context) {
    context.coordinator.parent = self
    slider.minimumValue = Float(bounds.lowerBound)
    slider.maximumValue = Float(bounds.upperBound)
    slider.value = Float(value)
    slider.increment = Float(step)
    slider.isEnabled = context.environment.isEnabled
    slider.alpha = slider.isEnabled ? 1 : 0.64
    slider.accessibilityLabel = label
    slider.accessibilityValue = value.formatted(.number.precision(.fractionLength(0...2)))
  }

  func sizeThatFits(_ proposal: ProposedViewSize, uiView: NativeSlider, context: Context) -> CGSize?
  {
    CGSize(width: proposal.width ?? 200, height: 44)
  }

  func makeCoordinator() -> Coordinator { Coordinator(self) }

  final class NativeSlider: UISlider {
    var increment: Float = 1
    override func accessibilityIncrement() { adjust(by: increment) }
    override func accessibilityDecrement() { adjust(by: -increment) }
    private func adjust(by delta: Float) {
      guard isEnabled else { return }
      value = min(maximumValue, max(minimumValue, value + delta))
      sendActions(for: .valueChanged)
    }
  }

  @MainActor
  final class Coordinator: NSObject {
    var parent: AppSlider
    init(_ parent: AppSlider) { self.parent = parent }
    @objc func changed(_ slider: UISlider) {
      let offset = ((Double(slider.value) - parent.bounds.lowerBound) / parent.step).rounded()
      parent.value = min(
        parent.bounds.upperBound,
        max(
          parent.bounds.lowerBound,
          parent.bounds.lowerBound + offset * parent.step))
      slider.value = Float(parent.value)
    }
  }
}

struct AppDialog<Actions: View>: View {
  let title: String
  let message: String
  @ViewBuilder let actions: () -> Actions
  var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      Text(title).font(Theme.title(26)).accessibilityAddTraits(.isHeader)
      Text(message).font(Theme.body(17)).foregroundStyle(Theme.muted)
      actions()
    }.padding(24).frame(maxWidth: .infinity, alignment: .leading)
      .foregroundStyle(Theme.ink).presentationBackground(Theme.canvas)
      .presentationDetents([.medium]).presentationCornerRadius(20)
  }
}

struct AppToolbarItem<Content: View>: ToolbarContent {
  let placement: ToolbarItemPlacement
  @ViewBuilder var content: () -> Content
  @ToolbarContentBuilder var body: some ToolbarContent {
    if #available(iOS 26, *) {
      ToolbarItem(placement: placement) {
        content().buttonStyle(AppButtonStyle(variant: .ghost))
      }.sharedBackgroundVisibility(.hidden)
    } else {
      ToolbarItem(placement: placement) {
        content().buttonStyle(AppButtonStyle(variant: .ghost))
      }
    }
  }
}
