import SwiftUI
import UIKit

struct KeyboardDoneModifier: ViewModifier {
  let label: String

  func body(content: Content) -> some View {
    content.toolbar {
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
