// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "FerShotLiveText", platforms: [.macOS(.v12)], products: [.library(name: "FerShotLiveText", type: .static, targets: ["FerShotLiveText"])], targets: [.target(name: "FerShotLiveText", linkerSettings: [.unsafeFlags(["-Xlinker", "-weak_framework", "-Xlinker", "VisionKit"])])])
