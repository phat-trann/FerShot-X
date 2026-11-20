import AppKit
import VisionKit

// Live Text is the only Swift bridge. Image payloads and analysis never leave memory.
@MainActor private var hosts: [ObjectIdentifier: AnyObject] = [:]
@MainActor private var activeAnalyses = 0
struct ClosedLiveTextRequests {
    private var ids: [String] = []
    mutating func close(_ id: String) { ids.append(id); if ids.count > 64 { ids.removeFirst(ids.count - 64) } }
    func contains(_ id: String) -> Bool { ids.contains(id) }
}
func liveTextFrame(_ rect: NSRect, in bounds: NSRect, flipped: Bool) -> NSRect {
    NSRect(x: rect.minX, y: flipped ? rect.minY : bounds.height - rect.maxY, width: rect.width, height: rect.height).intersection(bounds)
}
func liveTextWheelScale(_ scale: Double, delta: Double, minimum: Double, maximum: Double) -> Double {
    max(minimum, min(maximum, scale * exp(max(-240, min(240, delta)) * 0.002)))
}
func liveTextFitScale(image: NSSize, viewport: NSSize) -> Double {
    guard image.width > 0, image.height > 0, viewport.width > 0, viewport.height > 0 else { return 1 }
    return min(1, viewport.width / image.width, viewport.height / image.height)
}
@MainActor private var cancelledRequests = ClosedLiveTextRequests()

private final class CenteredClip: NSClipView {
    override func constrainBoundsRect(_ proposedBounds: NSRect) -> NSRect {
        var rect = super.constrainBoundsRect(proposedBounds)
        let size = documentRect.size
        if rect.width > size.width { rect.origin.x = (size.width - rect.width) / 2 }
        if rect.height > size.height { rect.origin.y = (size.height - rect.height) / 2 }
        return rect
    }
}

@available(macOS 13.0, *)
@MainActor private final class LiveTextScroll: NSScrollView {
    private var lastPan = -Double.infinity
    var fitScale: Double = 1
    override func keyDown(with event: NSEvent) {
        guard event.modifierFlags.intersection([.command, .control, .option]).isEmpty, let key = event.charactersIgnoringModifiers, ["+", "=", "-", "0"].contains(key), let documentView else { super.keyDown(with: event); return }
        let center = documentView.convert(NSPoint(x: contentView.bounds.midX, y: contentView.bounds.midY), from: contentView)
        let scale = key == "0" ? fitScale : max(minMagnification, min(maxMagnification, magnification * (key == "-" ? 1 / 1.2 : 1.2)))
        setMagnification(scale, centeredAt: center)
    }
    override func scrollWheel(with event: NSEvent) {
        let modified = !event.modifierFlags.intersection([.command, .control]).isEmpty
        if event.hasPreciseScrollingDeltas && !modified { lastPan = event.timestamp; super.scrollWheel(with: event); return }
        if !modified && event.timestamp - lastPan < 0.3 { super.scrollWheel(with: event); return }
        guard let documentView else { return }
        let point = documentView.convert(event.locationInWindow, from: nil)
        let delta = event.scrollingDeltaY * (event.hasPreciseScrollingDeltas ? 1 : 16)
        setMagnification(liveTextWheelScale(magnification, delta: delta, minimum: minMagnification, maximum: maxMagnification), centeredAt: point)
    }
}

@available(macOS 13.0, *)
@MainActor private final class LiveTextHost: NSObject {
    let id: String
    weak var webview: NSView?
    let scroll = LiveTextScroll(frame: .zero)
    let imageView = NSImageView(frame: .zero)
    let overlay = ImageAnalysisOverlayView(frame: .zero)
    var task: Task<Void, Never>?
    var status: Int32 = 1 // analyzing, ready=2, no text=3, error=-2
    var fitted = false
    var closing = false
    let imageSize: NSSize
    init(id: String, webview: NSView, image: NSImage) {
        self.id = id; self.webview = webview; self.imageSize = image.size
        super.init()
        imageView.frame = NSRect(origin: .zero, size: image.size)
        imageView.image = image; imageView.imageScaling = .scaleNone
        imageView.setAccessibilityLabel("Live Text image"); scroll.setAccessibilityLabel("Live Text preview")
        scroll.contentView = CenteredClip(); scroll.documentView = imageView; scroll.drawsBackground = false
        scroll.hasVerticalScroller = true; scroll.hasHorizontalScroller = true
        scroll.scrollerStyle = .overlay; scroll.allowsMagnification = true
        scroll.minMagnification = 0.01; scroll.maxMagnification = 8
        overlay.frame = imageView.bounds; overlay.autoresizingMask = [.width, .height]
        overlay.trackingImageView = imageView; overlay.preferredInteractionTypes = .textSelection
        overlay.isSupplementaryInterfaceHidden = true
        imageView.addSubview(overlay)
        // A sibling avoids mixing VisionKit gestures into WebKit's gesture tree.
        if let container = webview.superview { container.addSubview(scroll, positioned: .above, relativeTo: webview) } else { webview.addSubview(scroll) }
    }
    func layout(_ rect: NSRect, visible: Bool) {
        guard !closing, let webview else { return }
        let bounded = liveTextFrame(rect, in: webview.bounds, flipped: webview.isFlipped)
        scroll.isHidden = !visible || bounded.isNull || bounded.width < 1 || bounded.height < 1
        if scroll.isHidden { restoreResponder() }
        guard !scroll.isHidden else { return }
        let frame = webview.convert(bounded, to: scroll.superview)
        let changed = scroll.frame.size != frame.size
        scroll.frame = frame
        if changed || !fitted {
            let fit = liveTextFitScale(image: imageSize, viewport: bounded.size)
            scroll.minMagnification = min(0.05, fit); scroll.fitScale = fit
            scroll.setMagnification(fit, centeredAt: NSPoint(x: imageView.bounds.midX, y: imageView.bounds.midY))
            fitted = true
        }
    }
    func analyze(_ image: NSImage) {
        activeAnalyses += 1
        task = Task { [weak self] in
            defer { activeAnalyses -= 1 }
            do {
                let result = try await ImageAnalyzer().analyze(image, orientation: .up, configuration: .init(.text))
                try Task.checkCancellation()
                guard let self, let view = self.webview, hosts[ObjectIdentifier(view)] === self else { return }
                self.overlay.analysis = result
                self.status = result.hasResults(for: .text) ? 2 : 3
            } catch {
                if !Task.isCancelled { self?.status = -2 }
            }
        }
    }
    private func restoreResponder() {
        if let responder = scroll.window?.firstResponder as? NSView, responder === scroll || responder.isDescendant(of: scroll) { scroll.window?.makeFirstResponder(webview) }
    }
    func close() {
        guard !closing else { return }; closing = true
        restoreResponder(); task?.cancel(); task = nil
        // AppKit/VisionKit may still be cancelling a gesture on this run loop.
        // Hide now; detach outside event tracking and retain through timer cleanup.
        scroll.isHidden = true
        RunLoop.main.perform(inModes: [.default]) { [self] in
            MainActor.assumeIsolated {
                overlay.analysis = nil; scroll.removeFromSuperview()
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [self] in _ = scroll }
            }
        }
    }
}

@_cdecl("fershot_live_text_supported")
@MainActor public func liveTextSupported() -> Int32 {
    if #available(macOS 13.0, *) { return ImageAnalyzer.isSupported ? 1 : 0 }
    return 0
}

@_cdecl("fershot_live_text_open")
@MainActor public func liveTextOpen(_ pointer: UnsafeMutableRawPointer?, _ request: UnsafePointer<CChar>?, _ bytes: UnsafePointer<UInt8>?, _ count: Int, _ x: Double, _ y: Double, _ width: Double, _ height: Double) -> Int32 {
    guard #available(macOS 13.0, *), ImageAnalyzer.isSupported else { return -1 }
    guard let pointer, let request, let bytes, count > 0 else { return -2 }
    let id = String(cString: request)
    guard !cancelledRequests.contains(id) else { return 0 }
    let view = Unmanaged<NSView>.fromOpaque(pointer).takeUnretainedValue(), key = ObjectIdentifier(Unmanaged<NSView>.fromOpaque(pointer).takeUnretainedValue())
    if let old = hosts.removeValue(forKey: key) as? LiveTextHost { old.close() }
    guard activeAnalyses < 2 else { return -3 }
    guard let image = NSImage(data: Data(bytes: bytes, count: count)), let representation = image.representations.first, representation.pixelsWide > 0, representation.pixelsHigh > 0 else { return -2 }
    image.size = NSSize(width: representation.pixelsWide, height: representation.pixelsHigh)
    let host = LiveTextHost(id: id, webview: view, image: image)
    hosts[key] = host; host.layout(NSRect(x: x, y: y, width: width, height: height), visible: true); host.analyze(image)
    return 1
}

@_cdecl("fershot_live_text_layout")
@MainActor public func liveTextLayout(_ pointer: UnsafeMutableRawPointer?, _ request: UnsafePointer<CChar>?, _ x: Double, _ y: Double, _ width: Double, _ height: Double, _ visible: Int32) -> Int32 {
    guard #available(macOS 13.0, *), let pointer, let request else { return -1 }
    let key = ObjectIdentifier(Unmanaged<NSView>.fromOpaque(pointer).takeUnretainedValue())
    guard let host = hosts[key] as? LiveTextHost, host.id == String(cString: request) else { return 0 }
    host.layout(NSRect(x: x, y: y, width: width, height: height), visible: visible != 0)
    return host.status
}

@_cdecl("fershot_live_text_close")
@MainActor public func liveTextClose(_ pointer: UnsafeMutableRawPointer?, _ request: UnsafePointer<CChar>?) {
    guard #available(macOS 13.0, *), let pointer, let request else { return }
    let key = ObjectIdentifier(Unmanaged<NSView>.fromOpaque(pointer).takeUnretainedValue())
    let id = String(cString: request)
    cancelledRequests.close(id)
    guard let host = hosts[key] as? LiveTextHost, host.id == id else { return }
    hosts.removeValue(forKey: key); host.close()
}
