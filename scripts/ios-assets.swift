// Generates the iOS app icon and launch image from src/assets/logo.png.
//
// The Mac icon is an .icns with transparent corners, which iOS rejects, so
// both assets are drawn on the app's own background colour and written without
// an alpha channel. Re-run after changing the logo:
//
//     npm run assets:ios
//
// Uses CoreGraphics rather than AppKit so it runs headlessly from a shell.

import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let logoURL = root.appendingPathComponent("src/assets/logo.png")
let iconURL = root.appendingPathComponent(
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
let splashDir = root.appendingPathComponent("ios/App/App/Assets.xcassets/Splash.imageset")

// --bg-color from src/index.css
let background = CGColor(srgbRed: 11 / 255, green: 14 / 255, blue: 17 / 255, alpha: 1)

func fail(_ message: String) -> Never {
    FileHandle.standardError.write("\(message)\n".data(using: .utf8)!)
    exit(1)
}

guard let source = CGImageSourceCreateWithURL(logoURL as CFURL, nil),
      let logo = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fail("Cannot read \(logoURL.path)")
}

/// Draws `logo` centred on an opaque background, occupying `fraction` of the
/// shorter edge.
func render(size: Int, logoFraction: CGFloat) -> CGImage {
    guard let space = CGColorSpace(name: CGColorSpace.sRGB),
          let ctx = CGContext(
            data: nil,
            width: size,
            height: size,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: space,
            // noneSkipLast: opaque output, which the App Store requires.
            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
          ) else {
        fail("Cannot create a \(size)px context")
    }

    let side = CGFloat(size)
    ctx.setFillColor(background)
    ctx.fill(CGRect(x: 0, y: 0, width: side, height: side))

    let target = side * logoFraction
    let scale = min(target / CGFloat(logo.width), target / CGFloat(logo.height))
    let width = CGFloat(logo.width) * scale
    let height = CGFloat(logo.height) * scale
    ctx.interpolationQuality = .high
    ctx.draw(logo, in: CGRect(
        x: (side - width) / 2,
        y: (side - height) / 2,
        width: width,
        height: height
    ))

    guard let image = ctx.makeImage() else { fail("Cannot render \(size)px image") }
    return image
}

func write(_ image: CGImage, to url: URL) {
    guard let dest = CGImageDestinationCreateWithURL(
        url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        fail("Cannot open \(url.path) for writing")
    }
    CGImageDestinationAddImage(dest, image, nil)
    guard CGImageDestinationFinalize(dest) else { fail("Cannot write \(url.path)") }
    print("wrote \(url.path)")
}

// 1024 icon: iOS masks the corners itself, so no rounding here.
write(render(size: 1024, logoFraction: 0.72), to: iconURL)

// 2732 launch image: the storyboard scales it to fit, so a small centred mark
// looks the same in any orientation.
let splash = render(size: 2732, logoFraction: 0.28)
for name in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"] {
    write(splash, to: splashDir.appendingPathComponent(name))
}
