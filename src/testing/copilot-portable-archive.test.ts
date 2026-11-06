import { describe, expect, it } from "vitest";
import { decodeLocalArchive, encodeLocalArchive } from "../platform/archive";

const utf8 = new TextEncoder();
const fixture = () => ({ selectedId: "photo-1", entries: [{ id: "photo-1", name: "Ảnh.png", width: 8, height: 6,
  mimeType: "image/png", bytes: new Uint8Array([0, 255, 17, 128]),
  annotations: { version: 1, basic: [{ id: "box", tool: "rectangle", points: [{ x: 1, y: 1 }, { x: 5, y: 4 }], style: { color: "#ffffff", strokeWidth: 2, opacity: 0.5 } }], advanced: [] } }] });
const wire = () => JSON.parse(new TextDecoder().decode(encodeLocalArchive(fixture())));
const decode = (value: unknown) => decodeLocalArchive(utf8.encode(JSON.stringify(value)));

describe("portable archive public boundary", () => {
  it("preserves source bytes, Unicode names, selection and editable data as owned values", () => {
    const input = fixture(); const output = decodeLocalArchive(encodeLocalArchive(input));
    expect(output).toEqual(input);
    output.entries[0].bytes[0] = 99;
    expect(input.entries[0].bytes[0]).toBe(0);
    expect(output.entries[0].annotations).not.toBe(input.entries[0].annotations);
  });

  it("rejects unsupported version and unrecognized data fields", () => {
    expect(() => decode({ ...wire(), version: 2 })).toThrow();
    expect(() => decode({ ...wire(), filePath: "/private/image.png" })).toThrow();
    const value = wire(); value.entries[0].src = "blob:unowned";
    expect(() => decode(value)).toThrow();
  });

  it("rejects dimension and pixel budgets before browser raster acquisition", () => {
    for (const [width, height] of [[0, 6], [16_385, 1], [4097, 4097]]) {
      const value = wire(); Object.assign(value.entries[0], { width, height });
      expect(() => decode(value)).toThrow();
    }
  });

  it("rejects duplicate identities and selection outside the decoded entries", () => {
    const duplicate = wire(); duplicate.entries.push(duplicate.entries[0]);
    expect(() => decode(duplicate)).toThrow(/Duplicate/);
    expect(() => decode({ ...wire(), selectedId: "absent" })).toThrow(/selection/);
  });

  it("rejects malformed base64 and unsupported annotation schema", () => {
    const invalid = wire(); invalid.entries[0].bytesBase64 = "%%%";
    expect(() => decode(invalid)).toThrow();
    const unsupported = wire(); unsupported.entries[0].annotations.version = 20;
    expect(() => decode(unsupported)).toThrow(/version/);
  });

  it("does not misrepresent container acceptance as image decoder acceptance", () => {
    // Non-image bytes survive the pure container; createImage later performs actual browser decoding.
    expect(decodeLocalArchive(encodeLocalArchive(fixture())).entries[0].bytes).toEqual(new Uint8Array([0, 255, 17, 128]));
  });
});
