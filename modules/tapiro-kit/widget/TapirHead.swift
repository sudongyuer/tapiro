import SwiftUI

// 小貘's front view from src/ui/Mascot.tsx (Front), redrawn with shapes because the extension cannot run the app's
// SVG. Coordinates are the same 96-unit art space; MascotPaint is generated from src/ui/theme/tokens.ts at prebuild.
struct TapirHead: View {
  let diameter: CGFloat

  var body: some View {
    Circle()
      .fill(MascotPaint.saddle)
      .frame(width: diameter, height: diameter)
      .overlay { TapirFace(box: diameter * 0.85) }
      .accessibilityHidden(true)
  }
}

private struct TapirFace: View {
  let box: CGFloat

  private var unit: CGFloat { box / 64 * 0.6 }

  var body: some View {
    ZStack {
      ForEach(Self.silhouette.indices, id: \.self) { index in
        Self.silhouette[index].shape(box).stroke(MascotPaint.line, style: line(6))
      }
      ArtOval(cx: 22, cy: 20, rx: 10, ry: 13, angle: -18).shape(box).fill(MascotPaint.ink)
      ArtOval(cx: 74, cy: 20, rx: 10, ry: 13, angle: 18).shape(box).fill(MascotPaint.ink)
      ArtOval(cx: 48, cy: 50, rx: 34, ry: 31).shape(box).fill(MascotPaint.ink)
      ArtOval(cx: 48, cy: 66, rx: 13, ry: 10).shape(box).fill(MascotPaint.snout)
      ArtOval(cx: 22, cy: 21, rx: 5, ry: 7.6, angle: -18).shape(box).stroke(MascotPaint.saddle, style: line(2.4))
      ArtOval(cx: 74, cy: 21, rx: 5, ry: 7.6, angle: 18).shape(box).stroke(MascotPaint.saddle, style: line(2.4))
      ArtOval(cx: 34, cy: 46, rx: 5.6, ry: 6.2).shape(box).fill(MascotPaint.eye)
      ArtOval(cx: 62, cy: 46, rx: 5.6, ry: 6.2).shape(box).fill(MascotPaint.eye)
      ArtOval(cx: 34.4, cy: 47, rx: 3.4, ry: 4).shape(box).fill(MascotPaint.line)
      ArtOval(cx: 61.6, cy: 47, rx: 3.4, ry: 4).shape(box).fill(MascotPaint.line)
      ArtOval(cx: 35.8, cy: 44.8, rx: 1.3, ry: 1.3).shape(box).fill(MascotPaint.eye)
      ArtOval(cx: 63, cy: 44.8, rx: 1.3, ry: 1.3).shape(box).fill(MascotPaint.eye)
      ArtOval(cx: 22, cy: 60, rx: 6.4, ry: 4.4).shape(box).fill(MascotPaint.blush.opacity(0.9))
      ArtOval(cx: 74, cy: 60, rx: 6.4, ry: 4.4).shape(box).fill(MascotPaint.blush.opacity(0.9))
      ArtOval(cx: 44, cy: 67, rx: 1.6, ry: 1.6).shape(box).fill(MascotPaint.saddle.opacity(0.75))
      ArtOval(cx: 52, cy: 67, rx: 1.6, ry: 1.6).shape(box).fill(MascotPaint.saddle.opacity(0.75))
    }
    .frame(width: box, height: box)
  }

  private func line(_ width: CGFloat) -> StrokeStyle {
    StrokeStyle(lineWidth: width * unit, lineJoin: .round)
  }

  private static let silhouette = [
    ArtOval(cx: 22, cy: 20, rx: 10, ry: 13, angle: -18),
    ArtOval(cx: 74, cy: 20, rx: 10, ry: 13, angle: 18),
    ArtOval(cx: 48, cy: 50, rx: 34, ry: 31),
    ArtOval(cx: 48, cy: 66, rx: 13, ry: 10),
  ]
}

private struct ArtOval {
  let cx: CGFloat
  let cy: CGFloat
  let rx: CGFloat
  let ry: CGFloat
  var angle: CGFloat = 0

  func shape(_ box: CGFloat) -> ArtOvalShape { ArtOvalShape(oval: self, box: box) }
}

private struct ArtOvalShape: Shape {
  let oval: ArtOval
  let box: CGFloat

  func path(in rect: CGRect) -> Path {
    let pixel = box / 64
    let transform = CGAffineTransform(rotationAngle: oval.angle * .pi / 180)
      .concatenating(CGAffineTransform(translationX: oval.cx, y: oval.cy))
      .concatenating(CGAffineTransform(scaleX: 0.6, y: 0.6))
      .concatenating(CGAffineTransform(translationX: 3.2, y: 6))
      .concatenating(CGAffineTransform(scaleX: pixel, y: pixel))
      .concatenating(CGAffineTransform(translationX: rect.minX, y: rect.minY))
    return Path(ellipseIn: CGRect(x: -oval.rx, y: -oval.ry, width: oval.rx * 2, height: oval.ry * 2))
      .applying(transform)
  }
}
