import { describe, expect, it } from "vitest";
import { createPreviewTimer, getPreviewTimerStatus, pausePreviewTimer, resumePreviewTimer } from "./index";

describe("preview timer planner", () => {
  it("plans expiry and clamps backward/forward clock jumps", () => {
    const state = createPreviewTimer(100, 50);
    expect(getPreviewTimerStatus(state, 120)).toEqual({ remaining: 30, expired: false, paused: false });
    expect(getPreviewTimerStatus(state, 90)).toEqual({ remaining: 60, expired: false, paused: false });
    expect(getPreviewTimerStatus(state, 200)).toEqual({ remaining: 0, expired: true, paused: false });
  });

  it("pauses and resumes by extending the deadline", () => {
    let state = createPreviewTimer(0, 100);
    state = pausePreviewTimer(state, 40);
    expect(getPreviewTimerStatus(state, 90)).toEqual({ remaining: 60, expired: false, paused: true });
    state = resumePreviewTimer(state, 90);
    expect(getPreviewTimerStatus(state, 120)).toEqual({ remaining: 30, expired: false, paused: false });
  });

  it("rejects nonfinite/zero timeout and overflow", () => {
    expect(() => createPreviewTimer(0, 0)).toThrow(RangeError);
    expect(() => createPreviewTimer(Infinity, 1)).toThrow(TypeError);
    expect(() => createPreviewTimer(Number.MAX_VALUE, Number.MAX_VALUE)).toThrow(RangeError);
  });
});
