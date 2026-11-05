// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FerbyVisionCore",
    platforms: [
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "FerbyVisionCore",
            targets: ["FerbyVisionCore"]
        )
    ],
    targets: [
        .target(
            name: "FerbyVisionCore",
            dependencies: []
        ),
        .testTarget(
            name: "FerbyVisionCoreTests",
            dependencies: ["FerbyVisionCore"]
        )
    ]
)
