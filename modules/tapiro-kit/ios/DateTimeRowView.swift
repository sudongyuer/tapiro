import ExpoModulesCore
import ExpoUI
import SwiftUI
import UIKit

struct DateTimeRowRange: Record {
  @Field var start: Date?
  @Field var end: Date?
}

final class DateTimeRowProps: UIBaseViewProps {
  @Field var title: String = ""
  @Field var selection: Date?
  @Field var range: DateTimeRowRange?
  var onDateChange = EventDispatcher()
}

struct DateTimeRowView: ExpoSwiftUI.View {
  @ObservedObject var props: DateTimeRowProps

  var body: some View {
    HStack(spacing: 8) {
      Text(props.title).fixedSize().accessibilityHidden(true)
      CompactDatePicker(
        date: props.selection ?? Date(),
        start: props.range?.start,
        end: props.range?.end,
        title: props.title
      ) { date in
        props.onDateChange(["date": date.timeIntervalSince1970 * 1000])
      }
    }
  }
}

// A compact UIDatePicker reports the fitting width of the text it showed before a new date reaches its label, so
// sized to fit it gets the narrower width of an earlier date, switches to its short style (「20/11/26」 beside
// 「2026年11月20日」, BP-13) and from then on measures that style. Given the whole width beside the title it never runs
// short of room, and it draws its buttons against the trailing edge as SwiftUI's DatePicker does.
private struct CompactDatePicker: UIViewRepresentable {
  let date: Date
  let start: Date?
  let end: Date?
  let title: String
  let onChange: (Date) -> Void

  func makeCoordinator() -> Coordinator {
    Coordinator(onChange: onChange)
  }

  func makeUIView(context: Context) -> UIDatePicker {
    let picker = UIDatePicker()
    picker.preferredDatePickerStyle = .compact
    picker.datePickerMode = .dateAndTime
    picker.minimumDate = start
    picker.maximumDate = end
    picker.setDate(date, animated: false)
    picker.addTarget(context.coordinator, action: #selector(Coordinator.valueChanged(_:)), for: .valueChanged)
    return picker
  }

  func updateUIView(_ picker: UIDatePicker, context: Context) {
    context.coordinator.onChange = onChange
    picker.minimumDate = start
    picker.maximumDate = end
    picker.isEnabled = context.environment.isEnabled
    picker.accessibilityLabel = title
    if picker.date != date {
      picker.setDate(date, animated: false)
    }
  }

  func sizeThatFits(_ proposal: ProposedViewSize, uiView: UIDatePicker, context: Context) -> CGSize? {
    let fitting = uiView.systemLayoutSizeFitting(
      UIView.layoutFittingCompressedSize,
      withHorizontalFittingPriority: .fittingSizeLevel,
      verticalFittingPriority: .fittingSizeLevel
    )
    let width = proposal.width.flatMap { $0.isFinite ? $0 : nil } ?? fitting.width
    return CGSize(width: width, height: fitting.height)
  }

  final class Coordinator: NSObject {
    var onChange: (Date) -> Void

    init(onChange: @escaping (Date) -> Void) {
      self.onChange = onChange
    }

    @objc func valueChanged(_ picker: UIDatePicker) {
      onChange(picker.date)
    }
  }
}
