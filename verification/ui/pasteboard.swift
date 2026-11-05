import UIKit

let text = CommandLine.arguments.dropFirst().joined(separator: " ")
UIPasteboard.general.string = text
// The write reaches pasted asynchronously; a process that exits right after it leaves the pasteboard unchanged.
guard UIPasteboard.general.hasStrings else { exit(1) }
