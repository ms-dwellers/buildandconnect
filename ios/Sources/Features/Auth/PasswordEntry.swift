import SwiftUI
import UIKit

/// One native field keeps input, selection and AutoFill intact across visibility changes.
struct PasswordEntry: UIViewRepresentable {
  @Binding var text: String
  @Binding var focused: Bool
  let revealed: Bool
  let creatingAccount: Bool
  let submit: () -> Void

  func makeUIView(context: Context) -> UITextField {
    let field = UITextField()
    field.delegate = context.coordinator
    field.addTarget(
      context.coordinator, action: #selector(Coordinator.changed(_:)), for: .editingChanged)
    field.autocapitalizationType = .none
    field.autocorrectionType = .no
    field.spellCheckingType = .no
    field.keyboardType = .asciiCapable
    field.returnKeyType = .go
    field.adjustsFontForContentSizeCategory = true
    field.font = UIFontMetrics(forTextStyle: .body).scaledFont(
      for: UIFont(name: "LeagueSpartan-Regular", size: 17) ?? .systemFont(ofSize: 17))
    field.textColor = UIColor(Theme.ink)
    field.tintColor = UIColor(Theme.accentStrong)
    field.attributedPlaceholder = NSAttributedString(
      string: "Password", attributes: [.foregroundColor: UIColor(Theme.muted)])
    field.accessibilityIdentifier = "auth.password"
    field.accessibilityLabel = "Password"
    field.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    return field
  }

  func updateUIView(_ field: UITextField, context: Context) {
    context.coordinator.parent = self
    context.coordinator.updating = true
    defer { context.coordinator.updating = false }
    let contentType: UITextContentType = creatingAccount ? .newPassword : .password
    if field.textContentType != contentType { field.textContentType = contentType }
    if field.isEnabled != context.environment.isEnabled {
      field.isEnabled = context.environment.isEnabled
    }
    if field.isSecureTextEntry == revealed {
      let content = text
      let selection = field.selectedTextRange.map {
        (
          field.offset(from: field.beginningOfDocument, to: $0.start),
          field.offset(from: field.beginningOfDocument, to: $0.end)
        )
      }
      field.isSecureTextEntry = !revealed
      // Reinsert through UIKit's input system to reset its secure-entry replacement state.
      field.text = ""
      field.insertText(content)
      field.clearsOnInsertion = false
      if let (start, end) = selection {
        let length = (content as NSString).length
        if let first = field.position(from: field.beginningOfDocument, offset: min(start, length)),
          let last = field.position(from: field.beginningOfDocument, offset: min(end, length))
        {
          field.selectedTextRange = field.textRange(from: first, to: last)
        }
      }
    } else if field.text != text {
      field.text = text
    }
    if focused != field.isFirstResponder {
      // Moving focus can synchronously update another SwiftUI field's FocusState.
      DispatchQueue.main.async { [weak field, weak coordinator = context.coordinator] in
        guard let field, let coordinator else { return }
        if coordinator.parent.focused && !field.isFirstResponder && field.window != nil {
          field.becomeFirstResponder()
        } else if !coordinator.parent.focused && field.isFirstResponder {
          field.resignFirstResponder()
        }
      }
    }
  }

  func sizeThatFits(_ proposal: ProposedViewSize, uiView: UITextField, context: Context) -> CGSize?
  {
    CGSize(width: proposal.width ?? 200, height: max(24, uiView.intrinsicContentSize.height))
  }

  func makeCoordinator() -> Coordinator { Coordinator(self) }

  final class Coordinator: NSObject, UITextFieldDelegate {
    var parent: PasswordEntry
    var updating = false
    init(_ parent: PasswordEntry) { self.parent = parent }
    @objc func changed(_ field: UITextField) {
      guard !updating else { return }
      let value = field.text ?? ""
      if parent.text != value { parent.text = value }
    }
    func textFieldDidBeginEditing(_ textField: UITextField) {
      guard !updating else { return }
      if !parent.focused { parent.focused = true }
    }
    func textFieldDidEndEditing(_ textField: UITextField) {
      guard !updating else { return }
      if parent.focused { parent.focused = false }
    }
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
      parent.submit()
      return false
    }
  }
}
