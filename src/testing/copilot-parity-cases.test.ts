import { describe, expect, it } from "vitest";
import cases from "./parity-cases.json";

const expectedIds = [
  ...Array.from({ length: 26 }, (_, index) => `F${String(index + 1).padStart(2, "0")}`),
  "F30", "F31", "F32",
];

describe("bounded parity case inventory", () => {
  it("covers the requested feature IDs exactly once", () => {
    const ids = cases.map((item) => item.id);
    expect(ids).toHaveLength(expectedIds.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(expectedIds);
  });

  it("requires synthetic evidence descriptors and explicit unexecuted status", () => {
    for (const item of cases) {
      expect(item.fixture.length).toBeGreaterThan(0);
      expect(item.trigger.length).toBeGreaterThan(0);
      expect(item.expectedEvidence.length).toBeGreaterThan(0);
      expect(item.nativeStatus).toBe("NOT_EXECUTED");
    }
  });
});
