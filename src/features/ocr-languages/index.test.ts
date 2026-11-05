import { describe, expect, it } from "vitest";
import { validateOcrLanguages } from "./index";

describe("validateOcrLanguages", () => {
  it("normalizes case and removes duplicates against caller-supported languages", () => {
    expect(validateOcrLanguages(["EN-US", "vi", "en-us"], ["en-us", "VI"])).toEqual(["en-us", "vi"]);
  });

  it("rejects unsupported, empty and malformed values", () => {
    expect(() => validateOcrLanguages(["en", "ja"], ["en"])).toThrow(/unsupported/);
    expect(() => validateOcrLanguages([""], ["en"])).toThrow(TypeError);
    expect(() => validateOcrLanguages([null as unknown as string], ["en"])).toThrow(TypeError);
    expect(() => validateOcrLanguages("en" as unknown as string[], ["en"])).toThrow(TypeError);
  });

  it("rejects oversized lists and identifiers", () => {
    expect(() => validateOcrLanguages(Array.from({ length: 65 }, () => "en"), ["en"])).toThrow(RangeError);
    expect(() => validateOcrLanguages(["e".repeat(33)], ["e".repeat(33)])).toThrow(TypeError);
  });
});
