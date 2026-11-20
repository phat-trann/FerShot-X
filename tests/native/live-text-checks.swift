import AppKit
@main @MainActor struct LiveTextChecks {
    static func main() {
        testFitDoesNotDependOnPreviousMagnification()
        testViewportCoordinatesAndClipping()
        testWheelDirectionAndBounds()
        testCancellationDoesNotDiscardOtherPendingRequests()
        if #available(macOS 13.0, *) {
            testPointerAnchor(imageSize: NSSize(width: 2000, height: 1000), scales: [0.64, 1.6, 0.24])
            testPointerAnchor(imageSize: NSSize(width: 320, height: 240), scales: [0.75, 1.6, 0.5])
            print("6 Live Text native geometry, zoom and cancellation checks passed")
        } else {
            print("4 Live Text native geometry, zoom and cancellation checks passed")
        }
    }
    static func testFitDoesNotDependOnPreviousMagnification() {
        let image = NSSize(width: 2000, height: 1000), viewport = NSSize(width: 800, height: 600)
        for _ in 0..<20 { checkEqual(liveTextFitScale(image: image, viewport: viewport), 0.4) }
        checkEqual(liveTextFitScale(image: NSSize(width: 100, height: 100), viewport: viewport), 1)
    }
    static func testViewportCoordinatesAndClipping() {
        let bounds = NSRect(x: 0, y: 0, width: 900, height: 700), rect = NSRect(x: 350, y: 130, width: 500, height: 400)
        checkEqual(liveTextFrame(rect, in: bounds, flipped: false), NSRect(x: 350, y: 170, width: 500, height: 400))
        checkEqual(liveTextFrame(rect, in: bounds, flipped: true), rect)
        checkEqual(liveTextFrame(NSRect(x: 850, y: 600, width: 100, height: 200), in: bounds, flipped: false), NSRect(x: 850, y: 0, width: 50, height: 100))
    }
    static func testWheelDirectionAndBounds() {
        checkGreater(liveTextWheelScale(1, delta: 120, minimum: 0.05, maximum: 8), 1)
        checkLess(liveTextWheelScale(1, delta: -120, minimum: 0.05, maximum: 8), 1)
        checkEqual(liveTextWheelScale(8, delta: 240, minimum: 0.05, maximum: 8), 8)
        checkEqual(liveTextWheelScale(0.05, delta: -240, minimum: 0.05, maximum: 8), 0.05)
    }
    static func testCancellationDoesNotDiscardOtherPendingRequests() {
        var ledger = ClosedLiveTextRequests(); ledger.close("old-image")
        precondition(ledger.contains("old-image")); precondition(!ledger.contains("new-image"))
        for index in 0..<100 { ledger.close("request-\(index)") }
        precondition(ledger.contains("request-99")); precondition(!ledger.contains("old-image"))
    }

    @available(macOS 13.0, *)
    static func testPointerAnchor(imageSize: NSSize, scales: [CGFloat]) {
        // The AppKit hierarchy stays offscreen and uses no capture, input or recognition.
        let root = NSView(frame: NSRect(x: 0, y: 0, width: 920, height: 730))
        let scroll = LiveTextScroll(frame: NSRect(x: 184, y: 62, width: 640, height: 480))
        let image = NSImageView(frame: NSRect(origin: .zero, size: imageSize))
        root.addSubview(scroll)
        scroll.documentView = image
        scroll.fitImage()
        let pixel = NSPoint(x: imageSize.width * 0.37, y: imageSize.height * 0.68)
        let anchor = image.convert(pixel, to: nil)
        for scale in scales {
            scroll.zoom(to: scale, atWindowPoint: anchor)
            precondition(abs(scroll.magnification - scale) < 0.001)
            let actual = image.convert(pixel, to: nil)
            precondition(abs(actual.x - anchor.x) <= 1.5 && abs(actual.y - anchor.y) <= 1.5,
                         "Expected \(anchor) at \(scale), got \(actual)")
        }
        scroll.fitImage()
        let center = image.convert(NSPoint(x: image.bounds.midX, y: image.bounds.midY), to: nil)
        let expectedCenter = NSPoint(x: scroll.frame.midX, y: scroll.frame.midY)
        precondition(abs(center.x - expectedCenter.x) <= 1.5 && abs(center.y - expectedCenter.y) <= 1.5)
    }
}

func checkEqual<T: Equatable>(_ a: T, _ b: T) { precondition(a == b) }
func checkGreater<T: Comparable>(_ a: T, _ b: T) { precondition(a > b) }
func checkLess<T: Comparable>(_ a: T, _ b: T) { precondition(a < b) }
