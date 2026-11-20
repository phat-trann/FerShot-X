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

private final class LiveTextClip: NSClipView {
    override func constrainBoundsRect(_ proposedBounds: NSRect) -> NSRect {
        guard let image = documentView?.frame, !image.isEmpty, !proposedBounds.isEmpty,
              frame.width > 0, frame.height > 0 else { return super.constrainBoundsRect(proposedBounds) }
        // Leave part of the image reachable when panning. Centering the image on
        // every bounds change would override pointer anchoring below Fit.
        var rect = proposedBounds
        let visibleX = min(image.width, rect.width, 32 * rect.width / frame.width)
        let visibleY = min(image.height, rect.height, 32 * rect.height / frame.height)
        rect.origin.x = max(image.minX + visibleX - rect.width, min(image.maxX - visibleX, rect.minX))
        rect.origin.y = max(image.minY + visibleY - rect.height, min(image.maxY - visibleY, rect.minY))
        return rect
    }
}

@available(macOS 13.0, *)
@MainActor final class LiveTextScroll: NSScrollView {
    private var lastPan = -Double.infinity
    override init(frame: NSRect) {
        super.init(frame: frame)
        contentView = LiveTextClip()
        drawsBackground = false
        hasVerticalScroller = true
        hasHorizontalScroller = true
        scrollerStyle = .overlay
        allowsMagnification = true
        minMagnification = 0.01
        maxMagnification = 8
    }

    required init?(coder: NSCoder) { nil }

    func fitImage() {
        guard let image = documentView?.frame else { return }
        let fitScale = liveTextFitScale(image: image.size, viewport: contentView.frame.size)
        minMagnification = min(0.05, fitScale)
        let center = NSPoint(x: image.midX, y: image.midY)
        setMagnification(fitScale, centeredAt: center)
        let bounds = contentView.bounds
        contentView.scroll(to: NSPoint(x: center.x - bounds.width / 2, y: center.y - bounds.height / 2))
        reflectScrolledClipView(contentView)
    }

    func zoom(to scale: Double, atWindowPoint location: NSPoint) {
        guard scale.isFinite, scale > 0 else { return }
        let next = max(minMagnification, min(maxMagnification, scale))
        guard next != magnification else { return }
        let point = contentView.convert(location, from: nil)
        setMagnification(next, centeredAt: point)
    }

    override func keyDown(with event: NSEvent) {
        guard event.modifierFlags.intersection([.command, .control, .option]).isEmpty, let key = event.charactersIgnoringModifiers, ["+", "=", "-", "0"].contains(key) else { super.keyDown(with: event); return }
        if key == "0" { fitImage(); return }
        let center = NSPoint(x: contentView.bounds.midX, y: contentView.bounds.midY)
        zoom(to: magnification * (key == "-" ? 1 / 1.2 : 1.2), atWindowPoint: contentView.convert(center, to: nil))
    }

    override func scrollWheel(with event: NSEvent) {
        let modified = !event.modifierFlags.intersection([.command, .control]).isEmpty
        if event.hasPreciseScrollingDeltas && !modified { lastPan = event.timestamp; super.scrollWheel(with: event); return }
        if !modified && event.timestamp - lastPan < 0.3 { super.scrollWheel(with: event); return }
        let delta = event.scrollingDeltaY * (event.hasPreciseScrollingDeltas ? 1 : 16)
        zoom(to: liveTextWheelScale(magnification, delta: delta, minimum: minMagnification, maximum: maxMagnification), atWindowPoint: event.locationInWindow)
    }

    override func magnify(with event: NSEvent) {
        zoom(to: magnification * (1 + event.magnification), atWindowPoint: event.locationInWindow)
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
    init(id: String, webview: NSView, image: NSImage) {
        self.id = id; self.webview = webview
        super.init()
        imageView.frame = NSRect(origin: .zero, size: image.size)
        imageView.image = image; imageView.imageScaling = .scaleNone
        imageView.setAccessibilityLabel("Live Text image"); scroll.setAccessibilityLabel("Live Text preview")
        scroll.documentView = imageView
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
        if scroll.frame != frame { scroll.frame = frame }
        if changed || !fitted {
            scroll.fitImage()
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
