use ferby_scroll_core::{stitch_frames, ScrollFrame, StitchError, StitchOptions, MAX_OUTPUT_PIXELS};

#[test]
fn first_frame_over_pixel_budget_is_rejected_before_reading_rgba() {
    let frame = ScrollFrame { width: 8192, height: 4097, rgba: vec![] };
    assert!(u64::from(frame.width) * u64::from(frame.height) > MAX_OUTPUT_PIXELS);
    assert!(matches!(stitch_frames(&[frame], StitchOptions::default()),
        Err(StitchError::InvalidFrameDimensions { width: 8192, height: 4097 })));
}

#[test]
fn exact_pixel_boundary_still_checks_the_required_rgba_length() {
    let frame = ScrollFrame { width: 4096, height: 8192, rgba: vec![] };
    assert_eq!(u64::from(frame.width) * u64::from(frame.height), MAX_OUTPUT_PIXELS);
    assert!(matches!(stitch_frames(&[frame], StitchOptions::default()),
        Err(StitchError::MalformedRgbaBuffer { actual: 0, .. })));
}
