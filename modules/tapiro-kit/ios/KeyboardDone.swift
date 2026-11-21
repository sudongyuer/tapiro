import SwiftUI
import UIKit

// Since iOS 26 the keyboard toolbar floats as a glass capsule above the keyboard, outside the keyboard safe area, so the
// Form scrolled a focused field only to the keyboard's top edge and the capsule covered the field's trailing end (the
// right-aligned reward digits sat under 完成; iOS 27.2 Simulator, 2026-11-21). The inset lifts the focused row above it.
private let toolbarClearance: CGFloat = 56

struct KeyboardDoneModifier: ViewModifier {
  let label: String
  @State private var keyboardShown = false

  func body(content: Content) -> some View {
    content
      .safeAreaInset(edge: .bottom, spacing: 0) {
        Color.clear.frame(height: keyboardShown ? toolbarClearance : 0)
      }
      .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in
        keyboardShown = true
      }
      .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
        keyboardShown = false
      }
      .toolbar {
        ToolbarItemGroup(placement: .keyboard) {
          Spacer()
          Button(label) {
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
          }
          .accessibilityIdentifier("keyboard-done")
        }
      }
  }
}
