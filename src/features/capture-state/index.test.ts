import { describe, expect, it } from "vitest";
import { captureReducer, initialCaptureState } from "./index";

describe("captureReducer", () => {
  it("transitions start, selection and success", () => {
    let state = captureReducer(initialCaptureState, { type: "start", token: "a", mode: "area" });
    state = captureReducer(state, { type: "selected", token: "a" });
    state = captureReducer(state, { type: "success", token: "a", result: "image" });
    expect(state).toMatchObject({ status: "ready", jobToken: "a", result: "image" });
  });

  it("ignores stale results and duplicate starts", () => {
    const state = captureReducer(initialCaptureState, { type: "start", token: "a", mode: "window" });
    expect(captureReducer(state, { type: "start", token: "b", mode: "fullscreen" })).toBe(state);
    expect(captureReducer(state, { type: "success", token: "old", result: "bad" })).toBe(state);
  });

  it("supports cancellation, failure and retry from terminal states", () => {
    let state = captureReducer(initialCaptureState, { type: "start", token: "a", mode: "area" });
    state = captureReducer(state, { type: "cancel", token: "a" });
    expect(state.status).toBe("cancelled");
    state = captureReducer(state, { type: "start", token: "b", mode: "area" });
    state = captureReducer(state, { type: "failure", token: "b", error: "denied" });
    expect(state.error).toBe("denied");
    expect(captureReducer(state, { type: "success", token: "a", result: "late" })).toBe(state);
  });
});
