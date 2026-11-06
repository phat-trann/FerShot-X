import { describe, expect, it } from "vitest";
import { decodeEditorSession, encodeEditorSession } from "../features/editor-session-codec/codec";
import type { Annotation } from "../contracts/editor";

function annotation(id = "basic-rect", tool: Annotation["tool"] = "rectangle"): Annotation {
  return { id, tool, points: [{ x: 1, y: 2 }, { x: 8, y: 9 }], style: { color: "#123456", strokeWidth: 2, opacity: 0.7 } };
}
const input = () => ({ basic: [annotation()], advanced: [{ id: "advanced-ellipse", itemKind: "contract" as const, annotation: annotation("advanced-ellipse", "ellipse") }] });

describe("editable session persistence public boundary", () => {
  it("rejects blank ids/colors and non-positive widths before storage or import", () => {
    const mutations: ((item: Annotation) => void)[] = [
      item => { item.id = "   "; }, item => { item.style.color = " \t"; },
      item => { item.style.strokeWidth = 0; }, item => { item.style.strokeWidth = -1; },
    ];
    for (const mutate of mutations) {
      const basic = annotation(); mutate(basic); const data = { basic: [basic], advanced: [] };
      expect(() => encodeEditorSession(data, 20, 20)).toThrow();
      expect(() => decodeEditorSession(JSON.stringify({ version: 1, ...data }), 20, 20)).toThrow();
    }
  });

  it("requires positive safe counters below the model exhaustion boundary", () => {
    for (const counter of [0, -1, 1.5, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
      const data = { basic: [{ ...annotation("counter", "counter"), counter }], advanced: [] };
      expect(() => encodeEditorSession(data, 20, 20)).toThrow();
      expect(() => decodeEditorSession(JSON.stringify({ version: 1, ...data }), 20, 20)).toThrow();
    }
    const data = { basic: [{ ...annotation("counter", "counter"), counter: Number.MAX_SAFE_INTEGER - 1 }], advanced: [] };
    expect(decodeEditorSession(encodeEditorSession(data, 20, 20), 20, 20).basic[0].counter).toBe(Number.MAX_SAFE_INTEGER - 1);
  });

  it("applies model-compatible annotation guards to advanced contract items too", () => {
    const data = input(); data.advanced[0].annotation.style.strokeWidth = 0;
    expect(() => encodeEditorSession(data, 20, 20)).toThrow();
    expect(() => decodeEditorSession(JSON.stringify({ version: 1, ...data }), 20, 20)).toThrow();
  });

  it("preserves basic and advanced ellipse data and returns owned nested values", () => {
    const source = input(); const decoded = decodeEditorSession(encodeEditorSession(source, 20, 20), 20, 20);
    expect(decoded).toEqual({ version: 1, ...source });
    decoded.basic[0].style.color = "#ffffff";
    expect(source.basic[0].style.color).toBe("#123456");
    expect(decoded.advanced[0]).not.toBe(source.advanced[0]);
  });

  it("rejects identity collisions across basic and advanced collections", () => {
    const source = input(); source.advanced[0].id = "basic-rect";
    source.advanced[0].annotation.id = "basic-rect";
    expect(() => encodeEditorSession(source, 20, 20)).toThrow(/duplicate/);
  });

  it("rejects nonfinite/outside geometry and unsupported schema on decode", () => {
    const source = input(); source.basic[0].points[0].x = Number.NaN;
    expect(() => encodeEditorSession(source, 20, 20)).toThrow();
    const outside = input(); outside.basic[0].points[0].x = 21;
    expect(() => encodeEditorSession(outside, 20, 20)).toThrow(/outside/);
    expect(() => decodeEditorSession(JSON.stringify({ version: 2, basic: [], advanced: [] }), 20, 20)).toThrow(/version/);
  });

  it("rejects oversized item/text data and excessive nesting", () => {
    expect(() => encodeEditorSession({ basic: Array.from({ length: 1001 }, (_, index) => annotation(`a-${index}`)), advanced: [] }, 20, 20)).toThrow(/count/);
    const large = input(); large.basic[0].text = "a".repeat(4 * 1024 * 1024 + 1);
    expect(() => encodeEditorSession(large, 20, 20)).toThrow(/UTF-8/);
    let nested: unknown = {};
    for (let level = 0; level < 40; level++) nested = { nested };
    expect(() => encodeEditorSession({ basic: [], advanced: [], nested } as ReturnType<typeof input>, 20, 20)).toThrow(/nesting/);
  });

  it("rejects cycles and explicit undefined rather than silently dropping values", () => {
    const cyclic = { basic: [], advanced: [], cycle: null as unknown }; cyclic.cycle = cyclic;
    expect(() => encodeEditorSession(cyclic, 20, 20)).toThrow(/cyclic/);
    const source = input(); source.basic[0].text = undefined;
    expect(() => encodeEditorSession(source, 20, 20)).toThrow(/undefined/);
  });
});
