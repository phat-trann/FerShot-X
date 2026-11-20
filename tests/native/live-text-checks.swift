import AppKit
@main struct LiveTextChecks {
    static func main() { testFitDoesNotDependOnPreviousMagnification(); testViewportCoordinatesAndClipping(); testWheelDirectionAndBounds(); testCancellationDoesNotDiscardOtherPendingRequests(); print("4 Live Text native geometry/zoom/cancellation checks passed") }
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
}

func checkEqual<T: Equatable>(_ a: T, _ b: T) { precondition(a == b) }
func checkGreater<T: Comparable>(_ a: T, _ b: T) { precondition(a > b) }
func checkLess<T: Comparable>(_ a: T, _ b: T) { precondition(a < b) }
