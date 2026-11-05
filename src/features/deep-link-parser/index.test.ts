import { describe, expect, it } from "vitest";
import { parseFerbyIntent } from "./index";

describe("parseFerbyIntent", () => {
  it("returns inert confirmed-required capture/editor intents", () => {
    expect(parseFerbyIntent("ferby://capture?mode=area")).toEqual({ kind: "capture", mode: "area", requiresConfirmation: true });
    expect(parseFerbyIntent("ferby://editor?imageId=local-1")).toEqual({ kind: "editor", imageId: "local-1", requiresConfirmation: true });
  });

  it("rejects unknown commands, modes, parameters, duplicates and unsafe paths", () => {
    for (const value of [
      "shottr://capture?mode=area", "https://capture?mode=area", "ferby://capture?mode=area&mode=window",
      "ferby://capture?mode=javascript", "ferby://capture?x=1", "ferby://editor?imageId=../secret",
      "ferby://capture@evil.test?mode=area", "ferby://unknown?mode=area",
    ]) expect(() => parseFerbyIntent(value)).toThrow();
  });

  it("rejects malformed, oversized and control-character input", () => {
    expect(() => parseFerbyIntent("not a URL")).toThrow();
    expect(() => parseFerbyIntent(`ferby://capture?mode=area${"x".repeat(2048)}`)).toThrow(RangeError);
    expect(() => parseFerbyIntent("ferby://editor?imageId=bad%00id")).toThrow(TypeError);
  });
});
