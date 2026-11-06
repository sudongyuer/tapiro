import UIKit

let text = CommandLine.arguments.dropFirst().joined(separator: " ")
let large = UITraitCollection(preferredContentSizeCategory: .large)
let font = UIFont.preferredFont(forTextStyle: .footnote, compatibleWith: large)
print((text as NSString).size(withAttributes: [.font: font]).width)
