# Review precision update

A204: initial Crop body is full-image and blocks the expected first draw. Effects starts at an inset rectangle up to 120x80, so the prior description calling it full-image was inaccurate. Do not change effects based on that assumption. Its real pointer issue is no setPointerCapture in startGesture and move/up handled only in stage; verify release outside and reselection. All confirmed A205 layout/build/backdrop findings remain. Queue text was corrected.
