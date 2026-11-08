import SwiftUI

/// Native equivalents of components/ui/button.tsx and app/globals.css.
struct AppButtonStyle: ButtonStyle {
  enum Variant { case primary, highlight, secondary, outline, ghost, link, destructive }
  enum GroupPosition { case first, middle, last }
  enum Size {
    case regular, large, icon, small
    var height: CGFloat { self == .large ? 48 : 44 }
    var depth: CGFloat { self == .large ? 4 : self == .small ? 2 : 3 }
  }
  var variant: Variant = .outline
  var size: Size = .regular
  var fullWidth = false
  var selected = false
  var groupPosition: GroupPosition?
  static var primary: Self { .init(variant: .primary, size: .large, fullWidth: true) }
  static var highlight: Self { .init(variant: .highlight, size: .large, fullWidth: true) }
  @Environment(\.isEnabled) private var enabled
  @Environment(\.isFocused) private var focused
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @State private var hovering = false

  private var raised: Bool { variant != .ghost && variant != .link }
  private var shape: UnevenRoundedRectangle {
    let leading: CGFloat = groupPosition == nil || groupPosition == .first ? 10 : 0
    let trailing: CGFloat = groupPosition == nil || groupPosition == .last ? 10 : 0
    return UnevenRoundedRectangle(
      topLeadingRadius: leading, bottomLeadingRadius: leading,
      bottomTrailingRadius: trailing, topTrailingRadius: trailing)
  }
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
    case .highlight: Theme.highlight
    case .secondary: Theme.softAccent
    case .destructive: Theme.destructive
    case .ghost, .link: hovering && enabled ? Theme.accent : .clear
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
        shape.fill(configuration.role == .destructive ? Theme.destructive : fill)
          .shadow(
            color: configuration.role == .destructive ? Theme.destructiveEdge : edge,
            radius: 0, y: depth)
      }
      .overlay(shape.stroke(raised ? (variant == .outline ? Theme.inputBorder : edge) : .clear))
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

private struct AppFieldSurface: ViewModifier {
  @FocusState private var focused: Bool
  @Environment(\.isEnabled) private var enabled
  func body(content: Content) -> some View {
    content.focused($focused).font(Theme.body(16)).padding(.horizontal, 12).padding(.vertical, 10)
      .frame(minHeight: 44)
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
    HStack(spacing: 16) {
      configuration.label.font(Theme.body(16))
      Spacer(minLength: 0)
      Button {
        configuration.isOn.toggle()
      } label: {
        RoundedRectangle(cornerRadius: 11)
          .fill(configuration.isOn ? Theme.accentStrong : Theme.inputBorder)
          .frame(width: 38, height: 22)
          .overlay(alignment: configuration.isOn ? .trailing : .leading) {
            Circle().fill(Theme.canvas).frame(width: 20, height: 20).padding(1)
          }
          .frame(width: 44, height: 44)
      }.buttonStyle(.plain)
    }
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
        HStack {
          Text(options.first { $0.0 == selection }?.1 ?? title)
          Spacer()
          Image(systemName: "chevron.down").font(.system(size: 12, weight: .semibold))
        }
      }.buttonStyle(AppButtonStyle(fullWidth: true))
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
