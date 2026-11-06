import { expect, it } from "vitest";
import { decodeLocalArchive, encodeLocalArchive } from "./archive";

const archive = () => ({ selectedId: "one", entries: [{ id: "one", name: "Original.png", width: 2, height: 2,
  mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]), annotations: { version: 1, basic: [], advanced: [] } }] });

it("portable container preserves exact source bytes with owned output and no locator data", () => {
  const source = archive(); const encoded = encodeLocalArchive(source); const decoded = decodeLocalArchive(encoded);
  expect(decoded.entries[0].bytes).toEqual(source.entries[0].bytes);
  expect(decoded.entries[0].bytes).not.toBe(source.entries[0].bytes);
  expect(decoded.entries[0].annotations).toEqual(source.entries[0].annotations);
  expect(decoded.selectedId).toBe("one");
});

it("unknown schema/fields and duplicate identities fail before resource acquisition", () => {
  const raw = JSON.parse(new TextDecoder().decode(encodeLocalArchive(archive())));
  for (const bad of [{ ...raw, version: 2 }, { ...raw, src: "file:///private" }, { ...raw, entries: [...raw.entries, ...raw.entries] }]) {
    expect(() => decodeLocalArchive(new TextEncoder().encode(JSON.stringify(bad)))).toThrow();
  }
});

it("invalid editable annotation data is rejected before creating a library candidate", () => {
  const raw = JSON.parse(new TextDecoder().decode(encodeLocalArchive(archive())));
  raw.entries[0].annotations.version = 2;
  expect(() => decodeLocalArchive(new TextEncoder().encode(JSON.stringify(raw)))).toThrow(/version/);
});

it.each(["zero-width", "blank-color", "invalid-counter", "blank-id"])("rejects %s data that would make the editor fail after import", kind => {
  const raw = JSON.parse(new TextDecoder().decode(encodeLocalArchive(archive())));
  const annotation = { id: "valid", tool: "counter", points: [{ x: 1, y: 1 }], counter: 1,
    style: { color: "#123456", strokeWidth: 2, opacity: 1 } };
  if (kind === "zero-width") annotation.style.strokeWidth = 0;
  if (kind === "blank-color") annotation.style.color = " ";
  if (kind === "invalid-counter") annotation.counter = 0;
  if (kind === "blank-id") annotation.id = " ";
  raw.entries[0].annotations.basic.push(annotation);
  expect(() => decodeLocalArchive(new TextEncoder().encode(JSON.stringify(raw)))).toThrow();
});
