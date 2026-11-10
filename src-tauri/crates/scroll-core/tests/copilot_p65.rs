use fershot_scroll_core::{
    stitch_frames, ScrollDirection, ScrollFrame, StitchError, StitchOptions,
};

fn frame(rows: &[[u8; 4]]) -> ScrollFrame {
    ScrollFrame {
        width: 1,
        height: rows.len() as u32,
        rgba: rows.iter().flat_map(|row| row.iter().copied()).collect(),
    }
}

fn options(max_channel_diff: u8) -> StitchOptions {
    StitchOptions {
        direction: ScrollDirection::Down,
        max_channel_diff,
        ..StitchOptions::default()
    }
}

#[test]
fn malformed_rgba_buffers_are_rejected_without_mutating_sources() {
    let malformed = ScrollFrame {
        width: 1,
        height: 2,
        rgba: vec![1, 2, 3, 4, 5],
    };
    let before = malformed.clone();

    assert_eq!(
        stitch_frames(&[malformed.clone()], StitchOptions::default()),
        Err(StitchError::MalformedRgbaBuffer {
            expected: 8,
            actual: 5,
        })
    );
    assert_eq!(malformed, before);
}

#[test]
fn mismatched_widths_are_rejected() {
    let first = frame(&[[1, 1, 1, 255], [2, 2, 2, 255]]);
    let second = ScrollFrame {
        width: 2,
        height: 2,
        rgba: vec![2, 2, 2, 255, 3, 3, 3, 255, 4, 4, 4, 255, 5, 5, 5, 255],
    };

    assert_eq!(
        stitch_frames(&[first, second], StitchOptions::default()),
        Err(StitchError::MismatchedFrameWidth {
            expected: 1,
            actual: 2,
        })
    );
}

#[test]
fn invalid_overlap_options_are_rejected() {
    let input = frame(&[[1, 1, 1, 255], [2, 2, 2, 255]]);
    let mut invalid = StitchOptions::default();
    invalid.min_overlap_rows = 1;
    assert_eq!(
        stitch_frames(&[input.clone()], invalid),
        Err(StitchError::InvalidOverlapConfig)
    );

    invalid = StitchOptions::default();
    invalid.max_output_height = 0;
    assert_eq!(
        stitch_frames(&[input], invalid),
        Err(StitchError::InvalidOverlapConfig)
    );
}

#[test]
fn channel_tolerance_accepts_boundary_and_rejects_above_boundary() {
    let first = frame(&[
        [10, 10, 10, 255],
        [20, 20, 20, 255],
        [30, 30, 30, 255],
    ]);
    let within = frame(&[
        [21, 21, 21, 255],
        [31, 31, 31, 255],
        [40, 40, 40, 255],
    ]);
    let above = frame(&[
        [22, 22, 22, 255],
        [32, 32, 32, 255],
        [40, 40, 40, 255],
    ]);

    let stitched = stitch_frames(&[first.clone(), within], options(1)).unwrap();
    assert_eq!(stitched.matched_overlaps, vec![2]);
    assert_eq!(stitched.height, 4);
    assert_eq!(
        stitch_frames(&[first.clone(), above], options(1)),
        Err(StitchError::NoOverlapMatch { frame_index: 1 })
    );
    assert_eq!(first, frame(&[
        [10, 10, 10, 255],
        [20, 20, 20, 255],
        [30, 30, 30, 255],
    ]));
}
