import type { Annotation, AnnotationStyle, Point } from "../../contracts/editor";
import {
  validateAdvancedItem,
  type AdvancedEditorItem,
} from "../editor/advanced-workbench/AdvancedWorkbench";

export interface EditorSessionData {
  readonly version: 1;
  readonly basic: readonly Annotation[];
  readonly advanced: readonly AdvancedEditorItem[];
}

const MAX_UTF8_BYTES = 4 * 1024 * 1024;
const MAX_ITEMS = 1000;
const MAX_DEPTH = 32;
const MAX_NODES = 20_000;
const encoder = new TextEncoder();

function fail(message: string): never {
  throw new TypeError(message);
}

function finite(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${name} must be finite`);
  }
  return value;
}

function ownRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string): string {
  if (typeof value !== "string") {
    fail(`${name} must be a string`);
  }
  return value;
}

function point(value: unknown, name: string, width: number, height: number): Point {
  const record = ownRecord(value, name);
  const x = finite(record.x, `${name}.x`);
  const y = finite(record.y, `${name}.y`);
  if (x < 0 || x > width || y < 0 || y > height) {
    fail(`${name} is outside the image bounds`);
  }
  return { x, y };
}

function style(value: unknown, name: string): AnnotationStyle {
  const record = ownRecord(value, name);
  const color = text(record.color, `${name}.color`);
  const strokeWidth = finite(record.strokeWidth, `${name}.strokeWidth`);
  const opacity = finite(record.opacity, `${name}.opacity`);
  if (!color.trim() || strokeWidth <= 0 || opacity < 0 || opacity > 1) {
    fail(`${name} has invalid bounds`);
  }
  return { color, strokeWidth, opacity };
}

function validateBasic(
  value: unknown,
  width: number,
  height: number,
): Annotation {
  const record = ownRecord(value, "basic annotation");
  const id = text(record.id, "annotation.id");
  const tool = text(record.tool, "annotation.tool");
  if (!id.trim() || !["arrow", "rectangle", "ellipse", "pen", "text", "counter", "blur"].includes(tool)) {
    fail("annotation has an unsupported tool or empty id");
  }
  if (!Array.isArray(record.points) || record.points.length === 0) {
    fail("annotation.points must be non-empty");
  }
  const points = record.points.map((entry, index) =>
    point(entry, `annotation.points[${index}]`, width, height),
  );
  const annotation = {
    id,
    tool: tool as Annotation["tool"],
    points,
    style: style(record.style, "annotation.style"),
    ...("text" in record
      ? { text: text(record.text, "annotation.text") }
      : {}),
    ...("counter" in record
      ? (() => {
          const counter = finite(record.counter, "annotation.counter");
          if (!Number.isSafeInteger(counter) || counter < 1 || counter >= Number.MAX_SAFE_INTEGER) {
            fail("annotation.counter must be a positive safe integer below Number.MAX_SAFE_INTEGER");
          }
          return { counter };
        })()
      : {}),
  } satisfies Annotation;
  return annotation;
}

function inspectJsonGraph(value: unknown): void {
  const active = new Set<object>();
  const seen = new Set<object>();
  let nodes = 0;
  const visit = (current: unknown, depth: number): void => {
    if (current === null || typeof current === "string" || typeof current === "boolean") {
      return;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) fail("non-finite values are not serializable");
      return;
    }
    if (typeof current !== "object") fail("non-JSON values are not serializable");
    const object = current as object;
    if (active.has(object)) fail("cyclic values are not serializable");
    if (depth > MAX_DEPTH) fail("editor session nesting exceeds the limit");
    if (seen.has(object)) return;
    seen.add(object);
    nodes += 1;
    if (nodes > MAX_NODES) fail("editor session node count exceeds the limit");
    if (Array.isArray(current)) {
      active.add(object);
      current.forEach((entry) => visit(entry, depth + 1));
      active.delete(object);
      return;
    }
    if (Object.getPrototypeOf(current) !== Object.prototype) {
      fail("only plain JSON objects are serializable");
    }
    active.add(object);
    for (const [key, entry] of Object.entries(current)) {
      if (entry === undefined) fail(`undefined value at ${key} is not serializable`);
      visit(entry, depth + 1);
    }
    active.delete(object);
  };
  visit(value, 0);
}

function cloneOwned<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function validateDimensions(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError("Image dimensions must be finite and positive");
  }
}

export function encodeEditorSession(
  data: Omit<EditorSessionData, "version">,
  imageWidth: number,
  imageHeight: number,
): string {
  validateDimensions(imageWidth, imageHeight);
  inspectJsonGraph(data);
  if (!Array.isArray(data.basic) || !Array.isArray(data.advanced)) {
    fail("Editor session collections must be arrays");
  }
  if (data.basic.length + data.advanced.length > MAX_ITEMS) {
    throw new RangeError(`Editor session item count exceeds ${MAX_ITEMS}`);
  }
  const ids = new Set<string>();
  const basic = data.basic.map((item) => validateBasic(item, imageWidth, imageHeight));
  const advanced = data.advanced.map((item) => {
    const record = ownRecord(item, "advanced item");
    const id = text(record.id, "advanced.id");
    if (!id.trim() || ids.has(id)) fail(`duplicate or blank editor item id: ${id}`);
    if (record.itemKind === "contract") validateBasic(record.annotation, imageWidth, imageHeight);
    validateAdvancedItem(item, imageWidth, imageHeight);
    ids.add(id);
    return cloneOwned(item);
  });
  for (const item of basic) {
    if (ids.has(item.id)) fail(`duplicate editor item id: ${item.id}`);
    ids.add(item.id);
  }
  const envelope: EditorSessionData = { version: 1, basic, advanced };
  const encoded = JSON.stringify(envelope);
  if (encoder.encode(encoded).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`Encoded editor session exceeds ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  return encoded;
}

export function decodeEditorSession(
  raw: string,
  imageWidth: number,
  imageHeight: number,
): EditorSessionData {
  validateDimensions(imageWidth, imageHeight);
  if (typeof raw !== "string" || encoder.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`Encoded editor session exceeds ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new TypeError(
      `Invalid editor session JSON: ${error instanceof Error ? error.message : "parse failure"}`,
    );
  }
  inspectJsonGraph(parsed);
  const envelope = ownRecord(parsed, "editor session");
  if (envelope.version !== 1) {
    throw new RangeError("Unsupported editor session schema version");
  }
  if (!Array.isArray(envelope.basic) || !Array.isArray(envelope.advanced)) {
    fail("Editor session collections must be arrays");
  }
  if (envelope.basic.length + envelope.advanced.length > MAX_ITEMS) {
    throw new RangeError(`Editor session item count exceeds ${MAX_ITEMS}`);
  }
  const ids = new Set<string>();
  const basic = envelope.basic.map((item) => {
    const annotation = validateBasic(item, imageWidth, imageHeight);
    if (ids.has(annotation.id)) fail(`duplicate editor item id: ${annotation.id}`);
    ids.add(annotation.id);
    return annotation;
  });
  const advanced = envelope.advanced.map((item) => {
    const record = ownRecord(item, "advanced item");
    const id = text(record.id, "advanced.id");
    if (!id.trim() || ids.has(id)) fail(`duplicate or blank editor item id: ${id}`);
    if (record.itemKind === "contract") validateBasic(record.annotation, imageWidth, imageHeight);
    validateAdvancedItem(item as AdvancedEditorItem, imageWidth, imageHeight);
    ids.add(id);
    return cloneOwned(item as AdvancedEditorItem);
  });
  return Object.freeze({
    version: 1,
    basic: Object.freeze(cloneOwned(basic)),
    advanced: Object.freeze(cloneOwned(advanced)),
  });
}

export const EDITOR_SESSION_CODEC_LIMITS = Object.freeze({
  maxUtf8Bytes: MAX_UTF8_BYTES,
  maxItems: MAX_ITEMS,
  maxDepth: MAX_DEPTH,
  maxNodes: MAX_NODES,
});
