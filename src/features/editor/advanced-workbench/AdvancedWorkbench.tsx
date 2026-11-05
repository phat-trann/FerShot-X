import React, { useEffect, useState } from "react";
import type {
  Annotation,
  AnnotationStyle,
  Point,
  Rect,
} from "../../../contracts/editor";
import {
  renderEmphasisToPngBlob,
  validateEmphasisOptions,
  type EmphasisEffect,
} from "../../emphasis";
import {
  SelectionHandlesOverlay,
  computeAnnotationBounds,
  moveAnnotationPoints,
  resizeAnnotationPoints,
  type ResizeHandleId,
} from "../../selection-handles";
import {
  DEFAULT_SHAPE_STYLE,
  ShapesOverlay,
  computeEllipseGeometry,
  computeLineGeometry,
  toContractEllipseAnnotation,
  type ShapePrimitiveAnnotation,
  type ShapePrimitiveKind,
} from "../../shapes";
import {
  TextCounterControls,
  clampAnchorPoint,
  cloneFrozenStyle,
  validateAnnotationText,
  validateCounterNumber,
} from "../../text-counter";
import { computeArrowHeadVertices } from "../render";
import { EditorWorkbench } from "../workbench";
import "./AdvancedWorkbench.css";

/**
 * Documented adapter conversion rules (`A34`):
 * - `shape` with `kind: "ellipse"` converts losslessly to frozen `Annotation` (`tool: "ellipse"`)
 *   via `toContractEllipseAnnotation`.
 * - `contract` with `tool: "rectangle" | "arrow" | "pen" | "ellipse" | "text" | "counter"` is
 *   preserved losslessly.
 * - `shape` with `kind: "line"` and `emphasis` (`"highlight" | "spotlight" | "magnifier"`) are
 *   preserved losslessly in `AdvancedEditorItem` history and rendered in `renderAdvancedWorkbenchToPngBlob`,
 *   but cannot be projected into the frozen `Annotation` union without C12 contract extension;
 *   `projectItemToFrozenContractAnnotation` throws an explicit `UnsupportedAnnotationKindError`
 *   rather than silently dropping or coercing `"line"` into `"arrow"`.
 */
export const ADVANCED_WORKBENCH_ADAPTER_NOTES = Object.freeze({
  losslessToFrozenContract: Object.freeze([
    "rectangle",
    "arrow",
    "pen",
    "ellipse",
    "text",
    "counter",
  ] as const),
  requiresExtendedContractInC12: Object.freeze([
    "line",
    "highlight",
    "spotlight",
    "magnifier",
  ] as const),
  unsupportedContractToolsRejectedExplicitly: Object.freeze(["blur"] as const),
});

export const ADVANCED_WORKBENCH_INTEGRATION_EXAMPLE = `
// Proposed Codex C07/C12 integration in Workspace.editor.tsx:
// <AdvancedWorkbench
//   imageId={activeDoc.id}
//   imageSrc={activeDoc.src}
//   imageWidth={activeDoc.width}
//   imageHeight={activeDoc.height}
//   zoom={editorZoom}
//   onExportBlob={(blob, snapshot) => saveOrCopyRenderedBlob(blob, snapshot)}
// />
`.trim();

export class UnsupportedAnnotationKindError extends Error {
  public readonly kindName: string;
  constructor(kindName: string, message?: string) {
    super(
      message ??
        `Unsupported annotation/effect kind "${kindName}": refusing to silently drop item.`,
    );
    this.name = "UnsupportedAnnotationKindError";
    this.kindName = kindName;
  }
}

export type AdvancedToolMode =
  | "select"
  | "line"
  | "ellipse"
  | "text"
  | "counter"
  | "highlight"
  | "spotlight"
  | "magnifier"
  | "workbench-base";

export type AdvancedEditorItem =
  | { readonly id: string; readonly itemKind: "contract"; readonly annotation: Annotation }
  | { readonly id: string; readonly itemKind: "shape"; readonly shape: ShapePrimitiveAnnotation }
  | { readonly id: string; readonly itemKind: "emphasis"; readonly effect: EmphasisEffect };

export interface AdvancedEditorSnapshot {
  readonly items: readonly AdvancedEditorItem[];
  readonly selectedId: string | null;
}
const EMPTY_ADVANCED_ITEMS: readonly AdvancedEditorItem[] = Object.freeze([]);

export interface AdvancedWorkbenchProps {
  readonly imageId: string;
  readonly imageSrc: string;
  readonly imageSourceElement?: CanvasImageSource;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly zoom?: number;
  readonly initialItems?: readonly AdvancedEditorItem[];
  readonly defaultTool?: AdvancedToolMode;
  readonly onSnapshotChange?: (snapshot: AdvancedEditorSnapshot) => void;
  readonly onExportRaster?: (
    blob: Blob,
    snapshot: AdvancedEditorSnapshot,
  ) => void;
}

const SUPPORTED_CONTRACT_TOOLS = new Set<string>([
  "rectangle",
  "arrow",
  "pen",
  "ellipse",
  "text",
  "counter",
]);

export function validateAdvancedItem(
  item: AdvancedEditorItem,
  imageWidth: number,
  imageHeight: number,
): void {
  if (!item || typeof item !== "object") {
    throw new UnsupportedAnnotationKindError("unknown");
  }

  if (item.itemKind === "contract") {
    const tool = item.annotation?.tool as string;
    if (!SUPPORTED_CONTRACT_TOOLS.has(tool)) {
      throw new UnsupportedAnnotationKindError(String(tool));
    }
    if (tool === "text") {
      validateAnnotationText(item.annotation.text ?? "");
    } else if (tool === "counter") {
      validateCounterNumber(item.annotation.counter ?? 0);
    }
    if (!item.annotation.points || item.annotation.points.length === 0) {
      throw new Error(`Contract annotation "${item.id}" has no points.`);
    }
    return;
  }

  if (item.itemKind === "shape") {
    const kind = item.shape?.kind as string;
    if (kind !== "ellipse" && kind !== "line") {
      throw new UnsupportedAnnotationKindError(String(kind));
    }
    const [p0, p1] = item.shape.points;
    const valid =
      kind === "ellipse"
        ? computeEllipseGeometry(p0, p1, imageWidth, imageHeight) !== null
        : computeLineGeometry(p0, p1, imageWidth, imageHeight) !== null;
    if (!valid) {
      throw new Error(`Shape "${item.id}" has degenerate geometry.`);
    }
    return;
  }

  if (item.itemKind === "emphasis") {
    const dummySource = {} as CanvasImageSource;
    try {
      validateEmphasisOptions({
        source: dummySource,
        width: imageWidth,
        height: imageHeight,
        effects: [item.effect],
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith("Unsupported emphasis effect kind:")
      ) {
        throw new UnsupportedAnnotationKindError(
          String((item.effect as { kind?: unknown })?.kind),
          err.message,
        );
      }
      throw err;
    }
    return;
  }

  throw new UnsupportedAnnotationKindError(
    String((item as { itemKind?: unknown }).itemKind),
  );
}

/**
 * Lossless/explicit adapter from `AdvancedEditorItem` to frozen `Annotation`.
 * Never silently drops unsupported kinds (`"line"`, `"emphasis"`, `"blur"`).
 */
export function projectItemToFrozenContractAnnotation(
  item: AdvancedEditorItem,
): Annotation {
  if (item.itemKind === "contract") {
    if (!SUPPORTED_CONTRACT_TOOLS.has(item.annotation.tool)) {
      throw new UnsupportedAnnotationKindError(item.annotation.tool);
    }
    return item.annotation;
  }
  if (item.itemKind === "shape") {
    if (item.shape.kind === "ellipse") {
      return toContractEllipseAnnotation(item.shape);
    }
    throw new UnsupportedAnnotationKindError(
      item.shape.kind,
      `Shape kind "${item.shape.kind}" requires C12 contract extension and cannot be coerced to arrow.`,
    );
  }
  throw new UnsupportedAnnotationKindError(
    item.effect.kind,
    `Emphasis effect "${item.effect.kind}" cannot be projected to frozen Annotation without C12 extension.`,
  );
}

function itemToSelectionProxyAnnotation(
  item: AdvancedEditorItem,
): Annotation | null {
  if (item.itemKind === "contract") {
    if (item.annotation.points.length === 1) {
      const pt = item.annotation.points[0];
      return Object.freeze({
        ...item.annotation,
        points: Object.freeze([
          Object.freeze({ x: pt.x, y: pt.y }),
          Object.freeze({ x: pt.x + 24, y: pt.y + 24 }),
        ]),
      });
    }
    return item.annotation;
  }
  if (item.itemKind === "shape") {
    return Object.freeze({
      id: item.shape.id,
      tool: "rectangle",
      points: Object.freeze([
        Object.freeze({ ...item.shape.points[0] }),
        Object.freeze({ ...item.shape.points[1] }),
      ]),
      style: Object.freeze({ ...item.shape.style }),
    });
  }
  return null;
}

function applyMovedPointsToItem(
  item: AdvancedEditorItem,
  movedProxy: Annotation,
): AdvancedEditorItem {
  if (item.itemKind === "contract") {
    const nextPoints =
      item.annotation.points.length === 1
        ? Object.freeze([Object.freeze({ ...movedProxy.points[0] })])
        : movedProxy.points;
    return Object.freeze({
      ...item,
      annotation: Object.freeze({
        ...item.annotation,
        points: nextPoints,
      }),
    });
  }
  if (item.itemKind === "shape") {
    const tuplePoints: readonly [Point, Point] = Object.freeze([
      Object.freeze({ ...movedProxy.points[0] }),
      Object.freeze({ ...movedProxy.points[1] }),
    ] as const);
    return Object.freeze({
      ...item,
      shape: Object.freeze({
        ...item.shape,
        points: tuplePoints,
      }),
    });
  }
  return item;
}

export function moveAdvancedItem(
  item: AdvancedEditorItem,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): AdvancedEditorItem {
  const proxy = itemToSelectionProxyAnnotation(item);
  if (!proxy) {
    throw new UnsupportedAnnotationKindError(
      item.itemKind === "emphasis" ? item.effect.kind : "unknown",
      "Only point-backed shape and contract annotations support handle move.",
    );
  }
  const moved = moveAnnotationPoints(
    proxy,
    deltaX,
    deltaY,
    imageWidth,
    imageHeight,
  );
  return applyMovedPointsToItem(item, moved);
}

export function resizeAdvancedItem(
  item: AdvancedEditorItem,
  handle: ResizeHandleId,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): AdvancedEditorItem {
  const proxy = itemToSelectionProxyAnnotation(item);
  if (!proxy) {
    throw new UnsupportedAnnotationKindError(
      item.itemKind === "emphasis" ? item.effect.kind : "unknown",
      "Only point-backed shape and contract annotations support handle resize.",
    );
  }
  const resized = resizeAnnotationPoints(
    proxy,
    handle,
    deltaX,
    deltaY,
    imageWidth,
    imageHeight,
  );
  return applyMovedPointsToItem(item, resized);
}

export async function renderAdvancedWorkbenchToPngBlob(options: {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  readonly items: readonly AdvancedEditorItem[];
}): Promise<Blob> {
  const { source, width, height, items } = options;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > 16384 || height > 16384 || width * height > 16777216) throw new RangeError("Advanced raster exceeds image limits.");
  for (const item of items) {
    validateAdvancedItem(item, width, height);
  }

  const emphasisEffects: EmphasisEffect[] = items
    .filter(
      (i): i is Extract<AdvancedEditorItem, { itemKind: "emphasis" }> =>
        i.itemKind === "emphasis",
    )
    .map((i) => i.effect);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable.");
  }

  try {
  if (emphasisEffects.length > 0) {
    const emphasisBlob = await renderEmphasisToPngBlob({
      source,
      width,
      height,
      effects: emphasisEffects,
    });
    const bmp = await createImageBitmap(emphasisBlob);
    try { ctx.drawImage(bmp, 0, 0, width, height); } finally { bmp.close(); }
  } else {
    ctx.drawImage(source, 0, 0, width, height);
  }

  for (const item of items) {
    if (item.itemKind === "emphasis") {
      continue;
    }

    if (item.itemKind === "shape") {
      const { shape } = item;
      ctx.save();
      ctx.strokeStyle = shape.style.color;
      ctx.lineWidth = shape.style.strokeWidth;
      ctx.globalAlpha = shape.style.opacity;
      if (shape.kind === "line") {
        const geom = computeLineGeometry(
          shape.points[0],
          shape.points[1],
          width,
          height,
        );
        if (geom) {
          ctx.beginPath();
          ctx.moveTo(geom.x1, geom.y1);
          ctx.lineTo(geom.x2, geom.y2);
          ctx.stroke();
        }
      } else {
        const geom = computeEllipseGeometry(
          shape.points[0],
          shape.points[1],
          width,
          height,
        );
        if (geom) {
          ctx.beginPath();
          ctx.ellipse(geom.cx, geom.cy, geom.rx, geom.ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
      continue;
    }

    const ann = item.annotation;
    ctx.save();
    ctx.strokeStyle = ann.style.color;
    ctx.fillStyle = ann.style.color;
    ctx.lineWidth = ann.style.strokeWidth;
    ctx.globalAlpha = ann.style.opacity;

    if (ann.tool === "rectangle" && ann.points.length >= 2) {
      const [p0, p1] = ann.points;
      const x = Math.min(p0.x, p1.x);
      const y = Math.min(p0.y, p1.y);
      ctx.strokeRect(x, y, Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y));
    } else if (ann.tool === "ellipse" && ann.points.length >= 2) {
      const geom = computeEllipseGeometry(
        ann.points[0],
        ann.points[1],
        width,
        height,
      );
      if (geom) {
        ctx.beginPath();
        ctx.ellipse(geom.cx, geom.cy, geom.rx, geom.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (ann.tool === "arrow" && ann.points.length >= 2) {
      const start = ann.points[0];
      const end = ann.points[ann.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      const [tip, leftWing, rightWing] = computeArrowHeadVertices(
        start,
        end,
        ann.style.strokeWidth,
      );
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(leftWing.x, leftWing.y);
      ctx.lineTo(rightWing.x, rightWing.y);
      ctx.closePath();
      ctx.fill();
    } else if (ann.tool === "pen" && ann.points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo(ann.points[i].x, ann.points[i].y);
      }
      ctx.stroke();
    } else if (ann.tool === "text" && ann.points.length >= 1) {
      const pt = ann.points[0];
      const fontPx = Math.max(14, ann.style.strokeWidth * 6);
      ctx.font = `bold ${fontPx}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(ann.text ?? "", pt.x, pt.y);
    } else if (ann.tool === "counter" && ann.points.length >= 1) {
      const pt = ann.points[0];
      const radius = Math.max(12, ann.style.strokeWidth * 4);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(radius)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(ann.counter ?? 1), pt.x, pt.y);
    }
    ctx.restore();
  }

  return await new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode AdvancedWorkbench canvas to PNG."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
  } finally { outCanvas.width = 0; outCanvas.height = 0; }
}

interface HistoryStack {
  readonly past: readonly AdvancedEditorSnapshot[];
  readonly present: AdvancedEditorSnapshot;
  readonly future: readonly AdvancedEditorSnapshot[];
}

export const AdvancedWorkbench: React.FC<AdvancedWorkbenchProps> = ({
  imageId,
  imageSrc,
  imageSourceElement,
  imageWidth,
  imageHeight,
  zoom = 1,
  initialItems = EMPTY_ADVANCED_ITEMS,
  defaultTool = "select",
  onSnapshotChange,
  onExportRaster,
}) => {
  const [tool, setTool] = useState<AdvancedToolMode>(defaultTool);
  const [draftText, setDraftText] = useState("FERBY NOTE");
  const [style, setStyle] = useState<AnnotationStyle>(() =>
    cloneFrozenStyle(DEFAULT_SHAPE_STYLE),
  );
  const [anchorPoint, setAnchorPoint] = useState<Point>(() =>
    clampAnchorPoint({ x: 24, y: 24 }, imageWidth, imageHeight),
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [histories, setHistories] = useState<ReadonlyMap<string, HistoryStack>>(() => new Map());
  const history = histories.get(imageId) ?? { past: [], present: Object.freeze({ items: initialItems, selectedId: initialItems[0]?.id ?? null }), future: [] };
  const setHistory = (update: (previous: HistoryStack) => HistoryStack) => {
    setHistories(previous => new Map(previous).set(imageId, update(previous.get(imageId) ?? history)));
  };
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let ownedUrl: string | undefined;
    setPreviewSrc(null);
    void (async () => {
      let source = imageSourceElement;
      if (!source) {
        const decoded = new Image(); decoded.src = imageSrc; await decoded.decode();
        if (decoded.naturalWidth !== imageWidth || decoded.naturalHeight !== imageHeight) throw new Error("Editor image dimensions changed.");
        source = decoded;
      }
      const blob = await renderAdvancedWorkbenchToPngBlob({ source, width: imageWidth, height: imageHeight, items: history.present.items });
      if (!active) return;
      ownedUrl = URL.createObjectURL(blob);
      setPreviewSrc(ownedUrl);
    })().catch(error => { if (active) setErrorBanner(error instanceof Error ? error.message : "Preview unavailable."); });
    return () => { active = false; if (ownedUrl) URL.revokeObjectURL(ownedUrl); };
  }, [imageId, imageSrc, imageSourceElement, imageWidth, imageHeight, history.present.items]);

  const commitPresent = (nextPresent: AdvancedEditorSnapshot) => {
    try {
      if (nextPresent.items.length > 1000) throw new RangeError("Advanced annotation limit reached.");
      for (const item of nextPresent.items) {
        validateAdvancedItem(item, imageWidth, imageHeight);
      }
      setErrorBanner(null);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Invalid annotation item.",
      );
      return;
    }

    const frozen = Object.freeze({
      items: Object.freeze([...nextPresent.items]),
      selectedId: nextPresent.selectedId,
    });
    setHistory((prev) => ({
      past: Object.freeze([...prev.past, prev.present].slice(-100)),
      present: frozen,
      future: [],
    }));
    onSnapshotChange?.(frozen);
  };

  const handleUndo = () => {
    if (!history.past.length) return;
    const previous = history.past[history.past.length - 1];
    setHistory(() => ({ past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future].slice(0, 100) }));
    onSnapshotChange?.(previous);
  };

  const handleRedo = () => {
    if (!history.future.length) return;
    const [next, ...rest] = history.future;
    setHistory(() => ({ past: [...history.past, history.present].slice(-100), present: next, future: rest }));
    onSnapshotChange?.(next);
  };

  const appendItem = (item: AdvancedEditorItem) => {
    commitPresent({
      items: [...history.present.items, item],
      selectedId: item.id,
    });
  };

  const updateSelectedItem = (updated: AdvancedEditorItem) => {
    commitPresent({
      items: history.present.items.map((existing) =>
        existing.id === updated.id ? updated : existing,
      ),
      selectedId: updated.id,
    });
  };

  const selectedItem =
    history.present.items.find((i) => i.id === history.present.selectedId) ??
    null;
  const selectedProxy = selectedItem
    ? itemToSelectionProxyAnnotation(selectedItem)
    : null;

  const textCounterAnnotations: Annotation[] = history.present.items
    .filter(
      (i): i is Extract<AdvancedEditorItem, { itemKind: "contract" }> =>
        i.itemKind === "contract",
    )
    .map((i) => i.annotation);

  const nextCounterVal =
    Math.max(0, ...textCounterAnnotations.filter(a => a.tool === "counter").map(a => a.counter ?? 0)) + 1;

  const activeShapeKind: ShapePrimitiveKind | null =
    tool === "line" || tool === "ellipse" ? tool : null;

  return (
    <section
      className="ferby-advanced-workbench"
      aria-label={`Advanced editor workbench for ${imageId}`}
    >
      <header className="ferby-advanced-workbench__toolbar">
        <div role="group" aria-label="Advanced tools">
          {(
            [
              "select",
              "line",
              "ellipse",
              "text",
              "counter",
              "highlight",
              "spotlight",
              "magnifier",
            ] as const
          ).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={tool === mode}
              onClick={() => setTool(mode)}
            >
              Tool: {mode}
            </button>
          ))}
        </div>

        <div className="ferby-advanced-workbench__history">
          <button
            type="button"
            disabled={history.past.length === 0}
            onClick={handleUndo}
          >
            Undo Advanced
          </button>
          <button
            type="button"
            disabled={history.future.length === 0}
            onClick={handleRedo}
          >
            Redo Advanced
          </button>
          <label>Selected item<select aria-label="Advanced selection" value={history.present.selectedId ?? ""}
            onChange={event => { const next = Object.freeze({ ...history.present, selectedId: event.target.value || null }); setHistory(previous => ({ ...previous, present: next })); }}>
            <option value="">None</option>{history.present.items.map(item => <option key={item.id} value={item.id}>{item.itemKind}: {item.id}</option>)}
          </select></label>
          <button type="button" disabled={!history.present.selectedId} onClick={() => commitPresent({ items: history.present.items.filter(item => item.id !== history.present.selectedId), selectedId: null })}>Delete advanced item</button>
          <span aria-label="Advanced item count">
            {history.present.items.length} items
          </span>
        </div>
      </header>

      {errorBanner && (
        <div role="alert" className="ferby-advanced-workbench__error">
          {errorBanner}
        </div>
      )}

      {(tool === "highlight" ||
        tool === "spotlight" ||
        tool === "magnifier") && (
        <div
          className="ferby-advanced-workbench__emphasis-bar"
          aria-label="Emphasis effect controls"
        >
          <button
            type="button"
            onClick={() => {
              const id = `emphasis-${tool}-${history.present.items.length + 1}`;
              const rect: Rect = Object.freeze({
                x: Math.min(20, Math.max(0, imageWidth - 40)),
                y: Math.min(20, Math.max(0, imageHeight - 30)),
                width: Math.min(60, imageWidth),
                height: Math.min(40, imageHeight),
              });
              const effect: EmphasisEffect =
                tool === "highlight"
                  ? Object.freeze({
                      id,
                      kind: "highlight",
                      rect,
                      color: "#ffff00",
                      opacity: 0.5,
                    })
                  : tool === "spotlight"
                    ? Object.freeze({
                        id,
                        kind: "spotlight",
                        cutoutRect: rect,
                        dimOpacity: 0.6,
                      })
                    : Object.freeze({
                        id,
                        kind: "magnifier",
                        center: Object.freeze({
                          x: Math.floor(imageWidth / 2),
                          y: Math.floor(imageHeight / 2),
                        }),
                        radius: 24,
                        zoom: 2,
                        borderColor: "#38bdf8",
                        borderWidth: 2,
                      });
              appendItem(
                Object.freeze({
                  id,
                  itemKind: "emphasis",
                  effect,
                }),
              );
            }}
          >
            Add {tool} effect
          </button>
        </div>
      )}

      {(tool === "text" || tool === "counter") && (
        <TextCounterControls
          mode={tool}
          draftText={draftText}
          nextCounterPreview={nextCounterVal}
          anchorPoint={anchorPoint}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          style={style}
          annotations={textCounterAnnotations}
          onModeChange={(m) => setTool(m)}
          onDraftTextChange={setDraftText}
          onStyleChange={setStyle}
          onCommitAnnotation={(ann) =>
            appendItem(
              Object.freeze({
                id: ann.id,
                itemKind: "contract",
                annotation: ann,
              }),
            )
          }
          onCancel={() => setTool("select")}
        />
      )}

      <div
        className="ferby-advanced-workbench__stage"
        style={{
          width: `${imageWidth * zoom}px`,
          height: `${imageHeight * zoom}px`,
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setAnchorPoint(
              clampAnchorPoint(
                {
                  x: (e.clientX - rect.left) / zoom,
                  y: (e.clientY - rect.top) / zoom,
                },
                imageWidth,
                imageHeight,
              ),
            );
          }
        }}
      >
        <img src={previewSrc ?? imageSrc} alt="Advanced image preview" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        <ShapesOverlay
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          shapes={[]}
          activeKind={activeShapeKind}
          style={style}
          onShapeCreate={(shape) =>
            appendItem(
              Object.freeze({
                id: shape.id,
                itemKind: "shape",
                shape,
              }),
            )
          }
        />

        {selectedItem && selectedProxy && (
          <SelectionHandlesOverlay
            annotation={selectedProxy}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            zoom={zoom}
            onMove={(movedProxy) => {
              updateSelectedItem(
                applyMovedPointsToItem(selectedItem, movedProxy),
              );
            }}
            onResize={(resizedProxy) => {
              updateSelectedItem(
                applyMovedPointsToItem(selectedItem, resizedProxy),
              );
            }}
          />
        )}
      </div>

      {tool === "workbench-base" && (
        <EditorWorkbench
          imageId={imageId}
          imageSrc={imageSrc}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          initialAnnotations={textCounterAnnotations}
        />
      )}

      {onExportRaster && imageSourceElement && (
        <button
          type="button"
          onClick={async () => {
            try {
              const blob = await renderAdvancedWorkbenchToPngBlob({
                source: imageSourceElement,
                width: imageWidth,
                height: imageHeight,
                items: history.present.items,
              });
              onExportRaster(blob, history.present);
            } catch (err) {
              setErrorBanner(
                err instanceof Error ? err.message : "Export failed.",
              );
            }
          }}
        >
          Export Advanced Raster
        </button>
      )}
    </section>
  );
};
export { computeAnnotationBounds };

