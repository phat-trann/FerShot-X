import { describe, expect, it } from "vitest";
import {
  parsePrintPreferencesJson,
  serializePrintPreferencesJson,
} from "../features/print-preferences-codec";
import type { PrintSheetOptions } from "../features/local-output/local-output";

const fit: PrintSheetOptions = {
  imageWidth: 1200,
  imageHeight: 800,
  paper: "a4",
  orientation: "portrait",
  marginPt: 36,
};
const actual: PrintSheetOptions = {
  imageWidth: 800,
  imageHeight: 1200,
  paper: "letter",
  orientation: "landscape",
  marginPt: 12,
  scaleMode: "actual",
};

describe("print preferences codec independent regressions", () => {
  it("round-trips fit and actual/orientation options while preserving optional scale", () => {
    expect(parsePrintPreferencesJson(serializePrintPreferencesJson(fit))).toEqual(fit);
    expect(parsePrintPreferencesJson(serializePrintPreferencesJson(actual))).toEqual(actual);
    const parsed = parsePrintPreferencesJson(JSON.stringify({ version: 1, print: fit }));
    expect("scaleMode" in parsed).toBe(false);
  });

  it("rejects unknown schema and fields", () => {
    expect(() =>
      parsePrintPreferencesJson(JSON.stringify({ version: 2, print: fit })),
    ).toThrow(/schema version/i);
    expect(() =>
      parsePrintPreferencesJson(
        JSON.stringify({ version: 1, print: { ...fit, extra: true } }),
      ),
    ).toThrow(/unknown field/i);
  });

  it("rejects wrong numeric types, margins and image dimensions", () => {
    expect(() =>
      parsePrintPreferencesJson(
        JSON.stringify({ version: 1, print: { ...fit, marginPt: "36" } }),
      ),
    ).toThrow(/margin/i);
    expect(() =>
      parsePrintPreferencesJson(
        JSON.stringify({ version: 1, print: { ...fit, marginPt: 145 } }),
      ),
    ).toThrow(/margin/i);
    expect(() =>
      parsePrintPreferencesJson(
        JSON.stringify({ version: 1, print: { ...fit, imageWidth: 0 } }),
      ),
    ).toThrow(/imageWidth|dimensions/i);
  });

  it("rejects invalid enum values and contradictory printable dimensions", () => {
    expect(() =>
      parsePrintPreferencesJson(
        JSON.stringify({ version: 1, print: { ...fit, paper: "legal" } }),
      ),
    ).toThrow(/paper/i);
    expect(() =>
      parsePrintPreferencesJson(
        JSON.stringify({
          version: 1,
          print: { ...fit, imageWidth: 16_385, imageHeight: 16_384, marginPt: 144 },
        }),
      ),
    ).toThrow(/printable|margin|dimension|imageWidth/i);
  });
});
