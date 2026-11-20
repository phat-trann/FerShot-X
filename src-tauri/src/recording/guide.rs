//! One transparent AppKit window per area recording. Only its outer bands are dimmed.
use super::model::CaptureRegion;
use crate::{diagnostics, display_capture::DisplayTarget};
use objc2::{MainThreadMarker, MainThreadOnly, define_class, msg_send, rc::Retained, runtime::Bool};
use objc2_app_kit::{NSBackingStoreType, NSColor, NSScreen, NSView, NSWindow, NSWindowCollectionBehavior, NSWindowStyleMask};
use objc2_foundation::{NSNumber, NSPoint, NSRect, NSSize, NSString};
use objc2_quartz_core::CALayer;
use std::{cell::RefCell, sync::{Arc, atomic::{AtomicBool, Ordering}, mpsc}, time::{Duration, Instant}};

define_class!(
    #[unsafe(super(NSWindow))]
    #[thread_kind = MainThreadOnly]
    struct FerShotRecordingGuideWindow;

    impl FerShotRecordingGuideWindow {
        #[unsafe(method(constrainFrameRect:toScreen:))]
        fn constrain_frame(&self, frame: NSRect, _screen: Option<&NSScreen>) -> NSRect {
            // The display frame includes the menu bar and Dock area.
            frame
        }
    }
);

struct NativeGuide {
    owner: Arc<AtomicBool>,
    window: Retained<FerShotRecordingGuideWindow>,
    layer: Retained<CALayer>,
    frame: NSRect,
}

thread_local! {
    static ACTIVE: RefCell<Option<NativeGuide>> = const { RefCell::new(None) };
}

fn outer_bands(size: NSSize, region: CaptureRegion) -> impl Iterator<Item = NSRect> {
    // Capture uses a top-left origin. A non-flipped content view uses bottom-left.
    let crop_bottom = size.height - (region.y + region.height);
    let crop_top = size.height - region.y;
    let crop_right = region.x + region.width;
    [
        NSRect::new(NSPoint::new(0., crop_top), NSSize::new(size.width, region.y)),
        NSRect::new(NSPoint::new(0., 0.), NSSize::new(size.width, crop_bottom)),
        NSRect::new(NSPoint::new(0., crop_bottom), NSSize::new(region.x, region.height)),
        NSRect::new(NSPoint::new(crop_right, crop_bottom), NSSize::new(size.width - crop_right, region.height)),
    ].into_iter().filter(|band| band.size.width > 0. && band.size.height > 0.)
}

fn aligned_frame(actual: NSRect, expected: NSRect, scale: f64) -> bool {
    let tolerance = 0.5 / scale;
    [
        actual.origin.x - expected.origin.x, actual.origin.y - expected.origin.y,
        actual.size.width - expected.size.width, actual.size.height - expected.size.height,
    ].into_iter().all(|delta| delta.abs() <= tolerance)
}

fn make_window(owner: Arc<AtomicBool>, display: DisplayTarget, region: CaptureRegion) -> Result<NativeGuide, ()> {
    let mtm = MainThreadMarker::new().ok_or(())?;
    let number_key = NSString::from_str("NSScreenNumber");
    let screen = NSScreen::screens(mtm).iter().find(|screen| {
        screen.deviceDescription().objectForKey(&number_key)
            .and_then(|number| number.downcast::<NSNumber>().ok())
            .is_some_and(|number| number.unsignedIntValue() == display.id)
    }).ok_or(())?;
    let frame = screen.frame();
    let size = NSSize::new(f64::from(display.rect.width), f64::from(display.rect.height));
    if (frame.size.width - size.width).abs() > 0.01 || (frame.size.height - size.height).abs() > 0.01 {
        return Err(());
    }
    let bounds = NSRect::new(NSPoint::new(0., 0.), size);
    let window: Option<Retained<FerShotRecordingGuideWindow>> = unsafe {
        msg_send![FerShotRecordingGuideWindow::alloc(mtm),
            initWithContentRect: bounds,
            styleMask: NSWindowStyleMask::Borderless,
            backing: NSBackingStoreType::Buffered,
            defer: Bool::NO,
            screen: &*screen]
    };
    let window = window.ok_or(())?;
    // Rust owns the retained reference. Closing may not release it independently.
    unsafe { window.setReleasedWhenClosed(false); }
    window.setOpaque(false);
    window.setBackgroundColor(Some(&NSColor::clearColor()));
    window.setHasShadow(false);
    window.setIgnoresMouseEvents(true);
    window.setLevel(3);
    window.setCollectionBehavior(NSWindowCollectionBehavior::CanJoinAllSpaces
        | NSWindowCollectionBehavior::IgnoresCycle | NSWindowCollectionBehavior::FullScreenAuxiliary);

    let view = NSView::initWithFrame(NSView::alloc(mtm), bounds);
    view.setWantsLayer(true);
    let root = view.layer().ok_or(())?;
    let layer = CALayer::layer();
    layer.setFrame(bounds);
    layer.setHidden(true);
    let color = NSColor::colorWithWhite_alpha(0., 0.24).CGColor();
    for band in outer_bands(size, region) {
        let stripe = CALayer::layer();
        stripe.setFrame(band);
        stripe.setBackgroundColor(Some(&color));
        layer.addSublayer(&stripe);
    }
    root.addSublayer(&layer);
    window.setContentView(Some(&view));
    window.setFrame_display(frame, false);
    Ok(NativeGuide { owner, window, layer, frame })
}

fn close(owner: &Arc<AtomicBool>) {
    let native = ACTIVE.with(|active| {
        let mut active = active.borrow_mut();
        if active.as_ref().is_some_and(|guide| Arc::ptr_eq(owner, &guide.owner)) { active.take() } else { None }
    });
    if let Some(guide) = native {
        let _ = objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
            guide.window.orderOut(None);
            guide.window.close();
        }));
    }
}

pub(super) struct Guide {
    app: tauri::AppHandle,
    owner: Arc<AtomicBool>,
    pub(super) window_id: u32,
}

impl Guide {
    pub(super) fn prepare(app: &tauri::AppHandle, display: DisplayTarget, region: CaptureRegion) -> Result<Option<Self>, ()> {
        let size = NSSize::new(f64::from(display.rect.width), f64::from(display.rect.height));
        if outer_bands(size, region).next().is_none() { return Ok(None); }
        let mut guide = Self { app: app.clone(), owner: Arc::new(AtomicBool::new(true)), window_id: 0 };
        let owner = guide.owner.clone();
        let (send, receive) = mpsc::channel();
        app.run_on_main_thread(move || {
            let result = objc2::exception::catch(|| {
                if !owner.load(Ordering::Acquire) { return Err(()); }
                let native = make_window(owner.clone(), display, region)?;
                let window = native.window.clone();
                let frame = native.frame;
                if let Some(previous) = ACTIVE.with(|active| active.borrow().as_ref().map(|guide| guide.owner.clone())) {
                    close(&previous);
                }
                ACTIVE.with(|active| active.replace(Some(native)));
                // Start transparent so discovery can resolve the same window later shown.
                window.orderFrontRegardless();
                if !aligned_frame(window.frame(), frame, display.scale) { return Err(()); }
                u32::try_from(window.windowNumber()).ok().filter(|number| *number != 0).ok_or(())
            }).unwrap_or(Err(()));
            let prepared = result.is_ok();
            if send.send(result).is_err() || !prepared { close(&owner); }
        }).map_err(|_| ())?;
        guide.window_id = receive.recv_timeout(Duration::from_millis(750)).map_err(|_| ())??;
        Ok(Some(guide))
    }

    pub(super) fn reveal(&self, display: DisplayTarget) -> Result<(), ()> {
        let owner = self.owner.clone();
        let app = self.app.clone();
        self.app.run_on_main_thread(move || {
            if !owner.load(Ordering::Acquire) { return; }
            let start = Instant::now();
            let result = objc2::exception::catch(|| ACTIVE.with(|active| {
                let active = active.borrow();
                let Some(guide) = active.as_ref().filter(|guide| Arc::ptr_eq(&owner, &guide.owner)) else { return true; };
                if aligned_frame(guide.window.frame(), guide.frame, display.scale) {
                    guide.layer.setHidden(false);
                    true
                } else { false }
            })).unwrap_or(false);
            if !result {
                close(&owner);
                diagnostics::technical(&app, "start_recording", diagnostics::Stage::RecordingGuide, start.elapsed().as_millis() as u64);
            }
        }).map_err(|_| ())
    }
}

impl Drop for Guide {
    fn drop(&mut self) {
        self.owner.store(false, Ordering::Release);
        let owner = self.owner.clone();
        let _ = self.app.run_on_main_thread(move || close(&owner));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dim_bands_leave_the_top_edge_and_retina_pixel_crop_clear() {
        let size = NSSize::new(80., 60.);
        for (region, scale) in [
            (CaptureRegion { x: 10., y: 0., width: 20., height: 30. }, 1.),
            (CaptureRegion { x: 10.5, y: 6.5, width: 39.5, height: 51. }, 2.),
            (CaptureRegion { x: 0., y: 0., width: 80., height: 60. }, 2.),
        ] {
            let bands: Vec<_> = outer_bands(size, region).collect();
            for y in 0..(size.height * scale) as u32 {
                for x in 0..(size.width * scale) as u32 {
                    let x = (f64::from(x) + 0.5) / scale;
                    let top = (f64::from(y) + 0.5) / scale;
                    let bottom = size.height - top;
                    let inside = x >= region.x && x < region.x + region.width
                        && top >= region.y && top < region.y + region.height;
                    let hits = bands.iter().filter(|band| x >= band.origin.x && x < band.origin.x + band.size.width
                        && bottom >= band.origin.y && bottom < band.origin.y + band.size.height).count();
                    assert_eq!(hits, usize::from(!inside));
                }
            }
        }
    }

    #[test]
    fn a_shifted_display_frame_cannot_be_revealed() {
        let expected = NSRect::new(NSPoint::new(-1920., -100.), NSSize::new(1920., 1080.));
        let adjusted = NSRect::new(NSPoint::new(-1920., -76.), expected.size);
        assert!(aligned_frame(expected, expected, 2.));
        assert!(!aligned_frame(adjusted, expected, 2.));
    }
}
