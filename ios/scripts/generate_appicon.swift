import AppKit
import Foundation

let root = URL(fileURLWithPath: "/Users/narnitz/privat/waslaeuftin/ios/WasLaeuftIn/Sources/Assets.xcassets")
let appIcon = root.appendingPathComponent("AppIcon.appiconset", isDirectory: true)

try FileManager.default.createDirectory(at: appIcon, withIntermediateDirectories: true)

let rootContents = """
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
"""
try rootContents.write(to: root.appendingPathComponent("Contents.json"), atomically: true, encoding: .utf8)

func renderIcon(to url: URL, size: Int) throws {
  guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ) else {
    throw NSError(domain: "IconGeneration", code: 1)
  }

  guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    throw NSError(domain: "IconGeneration", code: 2)
  }

  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context

  let side = CGFloat(size)
  let rect = NSRect(x: 0, y: 0, width: side, height: side)

  let gradient = NSGradient(colors: [
    NSColor(calibratedRed: 0.04, green: 0.08, blue: 0.16, alpha: 1),
    NSColor(calibratedRed: 0.05, green: 0.53, blue: 0.83, alpha: 1)
  ])!
  gradient.draw(in: rect, angle: 40)

  NSColor(calibratedWhite: 1, alpha: 0.12).setFill()
  NSBezierPath(
    ovalIn: NSRect(
      x: side * 0.684,
      y: side * 0.674,
      width: side * 0.352,
      height: side * 0.352
    )
  ).fill()

  let text = "w" as NSString
  let attributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: side * 0.547, weight: .heavy),
    .foregroundColor: NSColor.white,
  ]
  let textSize = text.size(withAttributes: attributes)
  let textRect = NSRect(
    x: (side - textSize.width) / 2 - (side * 0.01),
    y: (side - textSize.height) / 2 - (side * 0.04),
    width: textSize.width,
    height: textSize.height
  )
  text.draw(in: textRect, withAttributes: attributes)

  NSColor(calibratedRed: 0.40, green: 0.91, blue: 0.98, alpha: 1).setFill()
  NSBezierPath(
    ovalIn: NSRect(
      x: side * 0.601,
      y: side * 0.322,
      width: side * 0.107,
      height: side * 0.107
    )
  ).fill()

  NSGraphicsContext.restoreGraphicsState()

  guard let png = bitmap.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "IconGeneration", code: 3)
  }
  try png.write(to: url)
}

let outputs: [(String, Int)] = [
    ("Icon-App-20x20@2x.png", 40),
    ("Icon-App-20x20@3x.png", 60),
    ("Icon-App-29x29@2x.png", 58),
    ("Icon-App-29x29@3x.png", 87),
    ("Icon-App-40x40@2x.png", 80),
    ("Icon-App-40x40@3x.png", 120),
    ("Icon-App-60x60@2x.png", 120),
    ("Icon-App-60x60@3x.png", 180),
    ("Icon-App-20x20@1x.png", 20),
    ("Icon-App-29x29@1x.png", 29),
    ("Icon-App-40x40@1x.png", 40),
    ("Icon-App-76x76@1x.png", 76),
    ("Icon-App-76x76@2x.png", 152),
    ("Icon-App-83.5x83.5@2x.png", 167),
    ("Icon-App-1024x1024@1x.png", 1024),
]

for (name, size) in outputs {
  try renderIcon(to: appIcon.appendingPathComponent(name), size: size)
}

let appIconContents = """
{
  "images" : [
    { "idiom" : "iphone", "size" : "20x20", "scale" : "2x", "filename" : "Icon-App-20x20@2x.png" },
    { "idiom" : "iphone", "size" : "20x20", "scale" : "3x", "filename" : "Icon-App-20x20@3x.png" },
    { "idiom" : "iphone", "size" : "29x29", "scale" : "2x", "filename" : "Icon-App-29x29@2x.png" },
    { "idiom" : "iphone", "size" : "29x29", "scale" : "3x", "filename" : "Icon-App-29x29@3x.png" },
    { "idiom" : "iphone", "size" : "40x40", "scale" : "2x", "filename" : "Icon-App-40x40@2x.png" },
    { "idiom" : "iphone", "size" : "40x40", "scale" : "3x", "filename" : "Icon-App-40x40@3x.png" },
    { "idiom" : "iphone", "size" : "60x60", "scale" : "2x", "filename" : "Icon-App-60x60@2x.png" },
    { "idiom" : "iphone", "size" : "60x60", "scale" : "3x", "filename" : "Icon-App-60x60@3x.png" },

    { "idiom" : "ipad", "size" : "20x20", "scale" : "1x", "filename" : "Icon-App-20x20@1x.png" },
    { "idiom" : "ipad", "size" : "20x20", "scale" : "2x", "filename" : "Icon-App-20x20@2x.png" },
    { "idiom" : "ipad", "size" : "29x29", "scale" : "1x", "filename" : "Icon-App-29x29@1x.png" },
    { "idiom" : "ipad", "size" : "29x29", "scale" : "2x", "filename" : "Icon-App-29x29@2x.png" },
    { "idiom" : "ipad", "size" : "40x40", "scale" : "1x", "filename" : "Icon-App-40x40@1x.png" },
    { "idiom" : "ipad", "size" : "40x40", "scale" : "2x", "filename" : "Icon-App-40x40@2x.png" },
    { "idiom" : "ipad", "size" : "76x76", "scale" : "1x", "filename" : "Icon-App-76x76@1x.png" },
    { "idiom" : "ipad", "size" : "76x76", "scale" : "2x", "filename" : "Icon-App-76x76@2x.png" },
    { "idiom" : "ipad", "size" : "83.5x83.5", "scale" : "2x", "filename" : "Icon-App-83.5x83.5@2x.png" },

    { "idiom" : "ios-marketing", "size" : "1024x1024", "scale" : "1x", "filename" : "Icon-App-1024x1024@1x.png" }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
"""
try appIconContents.write(to: appIcon.appendingPathComponent("Contents.json"), atomically: true, encoding: .utf8)

print("ICONS_CREATED")
