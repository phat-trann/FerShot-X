import { describe, expect, it } from "vitest";
import { imprintMeasurement } from "./measurement";

const source = { id: "probe", name: "probe.png", src: "blob:probe", width: 100, height: 100, mimeType: "image/png", byteSize: 100 };
describe("measurement imprint boundary", () => {
  it("rejects invalid regions and scale before invoking a browser decoder", async () => {
    await expect(imprintMeasurement(source, { x: 0, y: 0, width: 0, height: 1 }, 1, "px")).rejects.toThrow(/nonempty/);
    await expect(imprintMeasurement(source, { x: 0, y: 0, width: 1, height: 1 }, 0, "px")).rejects.toThrow(/displayScale/);
    await expect(imprintMeasurement(source, { x: 200, y: 200, width: 1, height: 1 }, 1, "px")).rejects.toThrow(/inside/);
    await expect(imprintMeasurement({ ...source, width: 0 }, { x: 0, y: 0, width: 1, height: 1 }, 1, "px")).rejects.toThrow();
  });
});
