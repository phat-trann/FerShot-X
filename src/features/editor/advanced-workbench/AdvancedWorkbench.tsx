import {drawMagnifier} from "../../emphasis/magnifier";
import { Sparkles, ImageDown } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { validateEmbeddedPng } from "../konva/image-source";
import { traceCounterBadge } from "../konva/counter";
import { itemBounds } from "../konva/model";
import { createBlurPatch } from "../konva/blur";
import { EditorChrome } from "../../../components/EditorChrome";
import { Toggle } from "../../../components/ui/toggle";
import { MousePointer2,RectangleHorizontal,MoveUpRight,Pencil,Minus,Ellipse,Type,ListOrdered,Highlighter,Focus,ZoomIn,Undo2,Redo2,Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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
import { Slider } from "../../../components/ui/slider";
import { NativeSelect } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";

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
  unsupportedContractToolsRejectedExplicitly: Object.freeze([] as const),
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
  | "rectangle" | "arrow" | "pen"
  | "blur"
  | "workbench-base";

export type AdvancedEditorItem = (
  | {readonly id:string;readonly itemKind:"image";readonly src:string;readonly rect:Rect}
  | { readonly id: string; readonly itemKind: "contract"; readonly annotation: Annotation }
  | { readonly id: string; readonly itemKind: "shape"; readonly shape: ShapePrimitiveAnnotation }
  | { readonly id: string; readonly itemKind: "emphasis"; readonly effect: EmphasisEffect }) & {readonly rotation?:number;readonly geometryScale?:{readonly x:number;readonly y:number}};

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
  readonly disabled?: boolean;
  readonly busy?: boolean;
  readonly initialItems?: readonly AdvancedEditorItem[];
  readonly defaultTool?: AdvancedToolMode;
  readonly compact?: boolean;
  readonly onToolChange?: () => void;
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
  "blur",
]);

export function validateAdvancedItem(
  item: AdvancedEditorItem,
  imageWidth: number,
  imageHeight: number,
): void {
  if (!item || typeof item !== "object") {
    throw new UnsupportedAnnotationKindError("unknown");
  }

  if(item.geometryScale&&(![item.geometryScale.x,item.geometryScale.y].every(n=>Number.isFinite(n)&&n>=.01&&n<=100)))throw new Error("Invalid element scale.");
  if(item.rotation!==undefined&&(!Number.isFinite(item.rotation)||Math.abs(item.rotation)>36000))throw new Error("Invalid element rotation.");
  if(item.itemKind==="image"){
    validateEmbeddedPng(item.src);if(![item.rect?.x,item.rect?.y,item.rect?.width,item.rect?.height].every(Number.isFinite)||item.rect.width<1||item.rect.height<1)throw new Error("Invalid inserted image.");return;
  }
  if (item.itemKind === "contract") {
    const tool = item.annotation?.tool as string;
    if (!SUPPORTED_CONTRACT_TOOLS.has(tool)) {
      throw new UnsupportedAnnotationKindError(String(tool));
    }
    if(tool==="blur"&&(!Number.isFinite(item.annotation.blurRadius??8)||(item.annotation.blurRadius??8)<1||(item.annotation.blurRadius??8)>64))throw new Error("Invalid blur radius.");
    if(tool==="blur"){const pts=item.annotation.points;if(!pts||pts.length!==2||!pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))throw new Error("Blur needs two finite corners.");const w=Math.abs(pts[1].x-pts[0].x),h=Math.abs(pts[1].y-pts[0].y);if(w<1||h<1||Math.round(w)*Math.round(h)>4194304)throw new Error("Blur region exceeds its bounds.");}
    if (tool === "text") {
      validateAnnotationText(item.annotation.text ?? "");
    } else if (tool === "counter") {
      validateCounterNumber(item.annotation.counter ?? 0);
      const angle=item.annotation.counterAngle;if(angle!==undefined&&(!Number.isFinite(angle)||angle<0||angle>=360))throw new Error("Invalid counter corner angle.");
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
  if(item.itemKind==="image")throw new UnsupportedAnnotationKindError("image");
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
  if (item.itemKind === "emphasis") {
    if (item.effect.kind === "highlight") {
      const r = item.effect.rect;
      return Object.freeze({
        id: item.id,
        tool: "rectangle",
        points: Object.freeze([
          Object.freeze({ x: r.x, y: r.y }),
          Object.freeze({ x: r.x + r.width, y: r.y + r.height }),
        ]),
        style: DEFAULT_SHAPE_STYLE,
      });
    }
    if (item.effect.kind === "spotlight") {
      const r = item.effect.cutoutRect;
      return Object.freeze({
        id: item.id,
        tool: "rectangle",
        points: Object.freeze([
          Object.freeze({ x: r.x, y: r.y }),
          Object.freeze({ x: r.x + r.width, y: r.y + r.height }),
        ]),
        style: DEFAULT_SHAPE_STYLE,
      });
    }
    if (item.effect.kind === "magnifier") {
      const { radius, radiusY=radius } = item.effect;
      const center=item.effect.sourceCenter??item.effect.center;
      return Object.freeze({
        id: item.id,
        tool: "rectangle",
        points: Object.freeze([
          Object.freeze({
            x: Math.max(0, center.x - radius),
            y: Math.max(0, center.y - radiusY),
          }),
          Object.freeze({ x: center.x + radius, y: center.y + radiusY }),
        ]),
        style: DEFAULT_SHAPE_STYLE,
      });
    }
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
  if (item.itemKind === "emphasis") {
    const bounds = computeAnnotationBounds(movedProxy);
    const safeRect: Rect = Object.freeze({
      x: Math.max(0, Math.round(bounds.x * 100) / 100),
      y: Math.max(0, Math.round(bounds.y * 100) / 100),
      width: Math.max(2, Math.round(bounds.width * 100) / 100),
      height: Math.max(2, Math.round(bounds.height * 100) / 100),
    });
    if (item.effect.kind === "highlight") {
      return Object.freeze({
        ...item,
        effect: Object.freeze({
          ...item.effect,
          rect: safeRect,
        }),
      });
    }
    if (item.effect.kind === "spotlight") {
      return Object.freeze({
        ...item,
        effect: Object.freeze({
          ...item.effect,
          cutoutRect: safeRect,
        }),
      });
    }
    if (item.effect.kind === "magnifier") {
      const radius = Math.min(
        512,
        Math.max(4, Math.round((item.effect.radiusY!==undefined?safeRect.width:Math.max(safeRect.width, safeRect.height)) / 2)),
      );
      return Object.freeze({
        ...item,
        effect: Object.freeze({
          ...item.effect,
          ...(item.effect.sourceCenter?{sourceCenter:Object.freeze({x:safeRect.x+safeRect.width/2,y:safeRect.y+safeRect.height/2})}:{center:Object.freeze({x:safeRect.x+safeRect.width/2,y:safeRect.y+safeRect.height/2})}),
          radius,
          ...(item.effect.radiusY!==undefined?{radiusY:Math.max(4,Math.min(512,safeRect.height/2))}:{}),
        }),
      });
    }
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
        i.itemKind === "emphasis" && !i.rotation,
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
    if(item.itemKind==="image"){const image=new Image();image.src=item.src;await image.decode();ctx.drawImage(image,item.rect.x,item.rect.y,item.rect.width,item.rect.height);continue;}
    if (item.itemKind === "emphasis") {
      if(item.rotation){const effect=item.effect,b=itemBounds(item),cx=b.x+b.width/2,cy=b.y+b.height/2;ctx.save();
        if(effect.kind==="spotlight"){const hole=new Path2D();hole.rect(b.x,b.y,b.width,b.height);const mask=new Path2D();mask.rect(0,0,width,height);mask.addPath(hole,new DOMMatrix().translate(cx,cy).rotate(item.rotation).translate(-cx,-cy));ctx.fillStyle=`rgba(0,0,0,${effect.dimOpacity})`;ctx.fill(mask,"evenodd");}
        else {ctx.translate(cx,cy);ctx.rotate(item.rotation*Math.PI/180);ctx.translate(-cx,-cy);if(effect.kind==="highlight"){ctx.globalAlpha=effect.opacity;ctx.fillStyle=effect.color;ctx.fillRect(b.x,b.y,b.width,b.height);}else{drawMagnifier(ctx,source,effect);}}
        ctx.restore();}
      continue;
    }

    if (item.itemKind === "shape") {
      const { shape } = item;
      ctx.save();
      if(item.rotation){const b=itemBounds(item);ctx.translate(b.x+b.width/2,b.y+b.height/2);ctx.rotate(item.rotation*Math.PI/180);ctx.translate(-b.x-b.width/2,-b.y-b.height/2);}
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
    if(item.rotation){const b=itemBounds(item);ctx.translate(b.x+b.width/2,b.y+b.height/2);ctx.rotate(item.rotation*Math.PI/180);ctx.translate(-b.x-b.width/2,-b.y-b.height/2);}
    if(item.geometryScale&&["text","counter"].includes(ann.tool)){const p=ann.points[0];ctx.translate(p.x,p.y);ctx.scale(item.geometryScale.x,item.geometryScale.y);ctx.translate(-p.x,-p.y);}
    ctx.strokeStyle = ann.style.color;
    ctx.fillStyle = ann.style.color;
    ctx.lineWidth = ann.style.strokeWidth;
    ctx.globalAlpha = ann.style.opacity;

    if(ann.tool==="blur"&&ann.points.length>=2){const b=itemBounds(item);const patch=createBlurPatch(source,b,ann.blurRadius??8);ctx.drawImage(patch,b.x,b.y,b.width,b.height);}
    else if (ann.tool === "rectangle" && ann.points.length >= 2) {
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
      const start=ann.points[0],end=ann.points[ann.points.length-1];
      const [tip,leftWing,rightWing]=computeArrowHeadVertices(start,end,ann.style.strokeWidth);
      ctx.lineCap="butt";ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo((leftWing.x+rightWing.x)/2,(leftWing.y+rightWing.y)/2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(leftWing.x,leftWing.y);ctx.lineTo(rightWing.x,rightWing.y);ctx.closePath();ctx.fill();
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
      (ann.text ?? "").split("\n").forEach((line,index)=>ctx.fillText(line,pt.x,pt.y+index*Math.max(14,ann.style.strokeWidth*6)));
    } else if (ann.tool === "counter" && ann.points.length >= 1) {
      const pt = ann.points[0];
      const radius = Math.max(12, ann.style.strokeWidth * 4);
      traceCounterBadge(ctx,pt,radius,ann.counterAngle);
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

interface StageDraftGesture {
  readonly pointerId: number;
  readonly tool: AdvancedToolMode;
  readonly start: Point;
  readonly current: Point;
  readonly points?: readonly Point[];
}

export const AdvancedWorkbench: React.FC<AdvancedWorkbenchProps> = ({
  imageId,
  imageSrc,
  imageSourceElement,
  imageWidth,
  imageHeight,
  zoom = 1,
  disabled = false,
  busy = false,
  initialItems = EMPTY_ADVANCED_ITEMS,
  defaultTool = "select",
  compact = false,
  onToolChange,
  onSnapshotChange,
  onExportRaster,
}) => {
  const isBlocked = Boolean(disabled || busy);
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<AdvancedToolMode>(defaultTool);
  const [draftText, setDraftText] = useState("FERSHOT NOTE");
  const [style, setStyle] = useState<AnnotationStyle>(() =>
    cloneFrozenStyle(DEFAULT_SHAPE_STYLE),
  );
  const [anchorPoint, setAnchorPoint] = useState<Point>(() =>
    clampAnchorPoint({ x: 24, y: 24 }, imageWidth, imageHeight),
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [stageDraft, setStageDraft] = useState<StageDraftGesture | null>(null);
  const [inlineTextOverlay, setInlineTextOverlay] = useState<{
    readonly point: Point;
    readonly text: string;
  } | null>(null);

  const releaseStageCapture = (pointerId: number) => {
    const el = stageRef.current;
    if (!el || typeof el.releasePointerCapture !== "function") return;
    try {
      if (typeof el.hasPointerCapture !== "function" || el.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore if pointer capture is already released
    }
  };

  useEffect(() => {
    if (!isBlocked) return;
    if (stageDraft) {
      releaseStageCapture(stageDraft.pointerId);
      setStageDraft(null);
    }
    if (inlineTextOverlay) {
      setInlineTextOverlay(null);
    }
  }, [isBlocked, stageDraft, inlineTextOverlay]);

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
    if (isBlocked) return;
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
    if (isBlocked || !history.past.length) return;
    const previous = history.past[history.past.length - 1];
    setHistory(() => ({ past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future].slice(0, 100) }));
    onSnapshotChange?.(previous);
  };

  const handleRedo = () => {
    if (isBlocked || !history.future.length) return;
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
    !isBlocked && (tool === "line" || tool === "ellipse") ? tool : null;

  const resolveStagePoint = (
    clientX: number,
    clientY: number,
    currentTarget: HTMLElement,
  ): Point => {
    const rect =
      stageRef.current?.getBoundingClientRect() ??
      currentTarget.getBoundingClientRect();
    let rawX: number;
    let rawY: number;
    if (rect.width > 0 && rect.height > 0) {
      rawX = ((clientX - rect.left) / rect.width) * imageWidth;
      rawY = ((clientY - rect.top) / rect.height) * imageHeight;
    } else {
      rawX = (clientX - rect.left) / safeZoom;
      rawY = (clientY - rect.top) / safeZoom;
    }
    return clampAnchorPoint(
      {
        x: Math.round(rawX * 100) / 100,
        y: Math.round(rawY * 100) / 100,
      },
      imageWidth,
      imageHeight,
    );
  };

  const commitInlineTextAt = (point: Point, textValue: string) => {
    setInlineTextOverlay(null);
    if (isBlocked) return;
    const trimmed = textValue.trim();
    if (!trimmed) return;
    const validText = validateAnnotationText(trimmed);
    const clampedPt = clampAnchorPoint(point, imageWidth, imageHeight);
    const id = `text-${history.present.items.length + 1}-${Date.now()}`;
    appendItem(
      Object.freeze({
        id,
        itemKind: "contract",
        annotation: Object.freeze({
          id,
          tool: "text",
          points: Object.freeze([clampedPt]),
          style: cloneFrozenStyle(style),
          text: validText,
        }),
      }),
    );
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isBlocked || e.button !== 0 || stageDraft !== null) {
      return;
    }
    const targetEl = e.target as HTMLElement | null;
    if (
      targetEl &&
      (targetEl.closest(".fershot-selection-handles") ||
        targetEl.closest(".fershot-advanced-workbench__inline-text"))
    ) {
      return;
    }

    stageRef.current?.focus();
    const pt = resolveStagePoint(e.clientX, e.clientY, e.currentTarget);
    setAnchorPoint(pt);

    if (tool === "select") {
      // Hit-test items from top to bottom
      for (let i = history.present.items.length - 1; i >= 0; i--) {
        const candidate = history.present.items[i];
        const proxy = itemToSelectionProxyAnnotation(candidate);
        if (!proxy) continue;
        const b = computeAnnotationBounds(proxy);
        if (
          pt.x >= b.x - 4 &&
          pt.x <= b.x + Math.max(8, b.width) + 4 &&
          pt.y >= b.y - 4 &&
          pt.y <= b.y + Math.max(8, b.height) + 4
        ) {
          const next = Object.freeze({
            ...history.present,
            selectedId: candidate.id,
          });
          setHistory((prev) => ({ ...prev, present: next }));
          return;
        }
      }
      if (history.present.selectedId !== null) {
        const next = Object.freeze({ ...history.present, selectedId: null });
        setHistory((prev) => ({ ...prev, present: next }));
      }
      return;
    }

    if (tool === "workbench-base") {
      return;
    }

    // If ShapesOverlay has positive layout bounds and handles line/ellipse directly, avoid duplicate draft
    const stageRect = e.currentTarget.getBoundingClientRect();
    if (
      (tool === "line" || tool === "ellipse") &&
      stageRect.width > 0 &&
      stageRect.height > 0 &&
      targetEl?.tagName.toLowerCase() === "svg"
    ) {
      return;
    }

    if (typeof e.currentTarget.setPointerCapture === "function") {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported in test environment
      }
    }

    setStageDraft({
      pointerId: e.pointerId,
      tool,
      start: pt,
      current: pt,
      points: [pt],
    });
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isBlocked) {
      if (stageDraft) {
        releaseStageCapture(stageDraft.pointerId);
        setStageDraft(null);
      }
      return;
    }
    if (!stageDraft || stageDraft.pointerId !== e.pointerId) {
      return;
    }
    const pt = resolveStagePoint(e.clientX, e.clientY, e.currentTarget);
    setStageDraft((prev) =>
      prev && prev.pointerId === e.pointerId ? { ...prev, current: pt, points: [...(prev.points??[prev.start]),pt].slice(-2048) } : prev,
    );
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageDraft || stageDraft.pointerId !== e.pointerId) {
      return;
    }
    const active = stageDraft;
    releaseStageCapture(active.pointerId);
    setStageDraft(null);
    if (isBlocked) {
      return;
    }

    const endPt = resolveStagePoint(e.clientX, e.clientY, e.currentTarget);
    setAnchorPoint(endPt);

    if (["rectangle","arrow","pen"].includes(active.tool)) {
      const id=`draw-${active.tool}-${Date.now()}-${history.present.items.length}`;
      const points=active.tool==="pen"?[...(active.points??[active.start]),endPt]:[active.start,endPt];
      if(Math.hypot(endPt.x-active.start.x,endPt.y-active.start.y)<1&&active.tool!=="pen")return;
      appendItem({id,itemKind:"contract",annotation:{id,tool:active.tool as "rectangle"|"arrow"|"pen",points,style:cloneFrozenStyle(style)}});return;
    }
    if (active.tool === "counter") {
      const validCounter = validateCounterNumber(nextCounterVal);
      const id = `counter-${validCounter}`;
      appendItem(
        Object.freeze({
          id,
          itemKind: "contract",
          annotation: Object.freeze({
            id,
            tool: "counter",
            points: Object.freeze([endPt]),
            style: cloneFrozenStyle(style),
            counter: validCounter,
          }),
        }),
      );
      return;
    }

    if (active.tool === "text") {
      setInlineTextOverlay({
        point: endPt,
        text: draftText,
      });
      return;
    }

    if (active.tool === "line" || active.tool === "ellipse") {
      const isValid =
        active.tool === "ellipse"
          ? computeEllipseGeometry(
              active.start,
              endPt,
              imageWidth,
              imageHeight,
            ) !== null
          : computeLineGeometry(
              active.start,
              endPt,
              imageWidth,
              imageHeight,
            ) !== null;
      if (!isValid) return;
      const id = `shape-${active.tool}-${history.present.items.length + 1}`;
      appendItem(
        Object.freeze({
          id,
          itemKind: "shape",
          shape: Object.freeze({
            id,
            kind: active.tool,
            points: Object.freeze([
              Object.freeze({ x: active.start.x, y: active.start.y }),
              Object.freeze({ x: endPt.x, y: endPt.y }),
            ] as const),
            style: cloneFrozenStyle(style),
          }),
        }),
      );
      return;
    }

    if (
      active.tool === "highlight" ||
      active.tool === "spotlight" ||
      active.tool === "magnifier"
    ) {
      const minX = Math.min(active.start.x, endPt.x);
      const minY = Math.min(active.start.y, endPt.y);
      const width = Math.abs(endPt.x - active.start.x);
      const height = Math.abs(endPt.y - active.start.y);
      const id = `emphasis-${active.tool}-${history.present.items.length + 1}`;

      if (active.tool === "magnifier") {
        const dist = Math.hypot(
          endPt.x - active.start.x,
          endPt.y - active.start.y,
        );
        const radius = Math.min(
          512,
          Math.max(4, Math.round(dist >= 4 ? dist : 24)),
        );
        appendItem(
          Object.freeze({
            id,
            itemKind: "emphasis",
            effect: Object.freeze({
              id,
              kind: "magnifier",
              center: Object.freeze({
                x: active.start.x,
                y: active.start.y,
              }),
              radius,
              zoom: 2,
              borderColor: "#38bdf8",
              borderWidth: 2,
            }),
          }),
        );
        return;
      }

      if (width < 2 || height < 2) {
        return;
      }
      const rect: Rect = Object.freeze({
        x: minX,
        y: minY,
        width: Math.min(width, imageWidth - minX),
        height: Math.min(height, imageHeight - minY),
      });
      const effect: EmphasisEffect =
        active.tool === "highlight"
          ? Object.freeze({
              id,
              kind: "highlight",
              rect,
              color: "#ffff00",
              opacity: 0.5,
            })
          : Object.freeze({
              id,
              kind: "spotlight",
              cutoutRect: rect,
              dimOpacity: 0.6,
            });
      appendItem(
        Object.freeze({
          id,
          itemKind: "emphasis",
          effect,
        }),
      );
    }
  };

  return (
    <section
      className="fershot-advanced-workbench"
      aria-label={`Advanced editor workbench for ${imageId}`}
      aria-busy={busy || undefined}
      aria-disabled={isBlocked || undefined}
      onKeyDown={(e) => {
        if(e.defaultPrevented||isBlocked)return;const target=e.target as HTMLElement;
        if(target.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(target.tagName))return;
        if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="z"){e.preventDefault();if(e.shiftKey)handleRedo();else handleUndo();return;}
        if(!e.metaKey&&!e.ctrlKey&&!e.altKey){const keys:Record<string,AdvancedToolMode>={v:"select",r:"rectangle",a:"arrow",p:"pen",l:"line",o:"ellipse",t:"text",c:"counter",h:"highlight",s:"spotlight",m:"magnifier"};const next=keys[e.key.toLowerCase()];if(next){e.preventDefault();setTool(next);onToolChange?.();return;}if((e.key==="Delete"||e.key==="Backspace")&&history.present.selectedId){e.preventDefault();commitPresent({items:history.present.items.filter(item=>item.id!==history.present.selectedId),selectedId:null});return;}}

        if (e.key === "Escape") {
          if (stageDraft) {
            e.preventDefault();
            releaseStageCapture(stageDraft.pointerId);
            setStageDraft(null);
          } else if (inlineTextOverlay) {
            e.preventDefault();
            setInlineTextOverlay(null);
          }
        }
      }}
    >
      <EditorChrome target="editor-annotation-tools"><header className="fershot-advanced-workbench__toolbar">
        <div role="group" aria-label="Advanced tools">
          {(
            [
              "select",
              "rectangle", "arrow", "pen",
              "line",
              "ellipse",
              "text",
              "counter",
              "highlight",
              "spotlight",
              "magnifier",
            ] as const
          ).map((mode) => (
            <Toggle size="sm"
              key={mode}
              type="button"
              disabled={isBlocked}
              aria-label={`${mode} tool`} title={mode}
              pressed={tool === mode}
              onPressedChange={pressed => {
                if (pressed && !isBlocked) {setTool(mode);onToolChange?.();}
              }}
            >
              {React.createElement({select:MousePointer2,rectangle:RectangleHorizontal,arrow:MoveUpRight,pen:Pencil,line:Minus,ellipse:Ellipse,text:Type,counter:ListOrdered,highlight:Highlighter,spotlight:Focus,magnifier:ZoomIn}[mode],{size:16,strokeWidth:1.75,"aria-hidden":true})}
            </Toggle>
          ))}
        </div>

        {compact&&<label className="annotation-style"><Input type="color" aria-label="Annotation color" value={style.color} disabled={isBlocked} onChange={e=>setStyle({...style,color:e.target.value})}/><Slider  aria-label="Stroke width" min={1} max={12} value={style.strokeWidth} disabled={isBlocked} onValueChange={sliderValue => setStyle({...style,strokeWidth:Number(sliderValue)})}/></label>}
        <div className="fershot-advanced-workbench__history">
          <Button variant="secondary"
            type="button"
            disabled={isBlocked || history.past.length === 0}
            onClick={handleUndo}
          >
            <Undo2 size={16}/><span className="sr-only">Undo</span>
          </Button>
          <Button variant="secondary"
            type="button"
            disabled={isBlocked || history.future.length === 0}
            onClick={handleRedo}
          >
            <Redo2 size={16}/><span className="sr-only">Redo</span>
          </Button>
          {!compact && <label>Selected item<NativeSelect aria-label="Advanced selection" disabled={isBlocked} value={history.present.selectedId ?? ""}
            onChange={event => { if (isBlocked) return; const next = Object.freeze({ ...history.present, selectedId: event.target.value || null }); setHistory(previous => ({ ...previous, present: next })); }}>
            <option value="">None</option>{history.present.items.map(item => <option key={item.id} value={item.id}>{item.itemKind}: {item.id}</option>)}
          </NativeSelect></label>}
          <Button variant="secondary" type="button" disabled={isBlocked || !history.present.selectedId} onClick={() => commitPresent({ items: history.present.items.filter(item => item.id !== history.present.selectedId), selectedId: null })} aria-label="Delete selected annotation" title="Delete selected annotation"><Trash2 size={16}/></Button>
          <span aria-label="Advanced item count">
            {history.present.items.length} items
          </span>
        </div>
      </header></EditorChrome>

      {errorBanner && (
        <div role="alert" className="fershot-advanced-workbench__error">
          {errorBanner}
        </div>
      )}

      {!compact && (tool === "highlight" ||
        tool === "spotlight" ||
        tool === "magnifier") && (
        <div
          className="fershot-advanced-workbench__emphasis-bar"
          aria-label="Emphasis effect controls"
        >
          <Button icon={Sparkles} variant="secondary"
            type="button"
            disabled={isBlocked}
            onClick={() => {
              if (isBlocked) return;
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
          </Button>
        </div>
      )}

      {!compact && (tool === "text" || tool === "counter") && (
        <TextCounterControls
          mode={tool}
          draftText={draftText}
          nextCounterPreview={nextCounterVal}
          anchorPoint={anchorPoint}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          style={style}
          annotations={textCounterAnnotations}
          onModeChange={(m) => {
            if (!isBlocked) setTool(m);
          }}
          onDraftTextChange={(t) => {
            if (!isBlocked) {
              setDraftText(t);
              setInlineTextOverlay((prev) =>
                prev ? { ...prev, text: t } : null,
              );
            }
          }}
          onStyleChange={(s) => {
            if (!isBlocked) setStyle(s);
          }}
          onCommitAnnotation={(ann) => {
            if (!isBlocked) {
              appendItem(
                Object.freeze({
                  id: ann.id,
                  itemKind: "contract",
                  annotation: ann,
                }),
              );
            }
          }}
          onCancel={() => {
            setInlineTextOverlay(null);
            setTool("select");
          }}
        />
      )}

      <div
        ref={stageRef}
        tabIndex={0}
        className="fershot-advanced-workbench__stage"
        data-testid="advanced-workbench-stage"
        style={{
          width: `${imageWidth * safeZoom}px`,
          height: `${imageHeight * safeZoom}px`,
        }}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={(e) => {
          if (stageDraft && stageDraft.pointerId === e.pointerId) {
            releaseStageCapture(stageDraft.pointerId);
            setStageDraft(null);
          }
        }}
        onLostPointerCapture={(e) => {
          if (stageDraft && stageDraft.pointerId === e.pointerId) {
            setStageDraft(null);
          }
        }}
        onClick={(e) => {
          if (isBlocked) return;
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setAnchorPoint(
              clampAnchorPoint(
                {
                  x: ((e.clientX - rect.left) / rect.width) * imageWidth,
                  y: ((e.clientY - rect.top) / rect.height) * imageHeight,
                },
                imageWidth,
                imageHeight,
              ),
            );
          }
        }}
      >
        <img src={previewSrc ?? imageSrc} alt="Advanced image preview" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: activeShapeKind ? "auto" : "none",
          }}
        >
          <ShapesOverlay
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            shapes={[]}
            activeKind={activeShapeKind}
            style={style}
            onShapeCreate={(shape) => {
              if (!isBlocked) {
                appendItem(
                  Object.freeze({
                    id: shape.id,
                    itemKind: "shape",
                    shape,
                  }),
                );
              }
            }}
          />
        </div>

        {inlineTextOverlay && (
          <div
            className="fershot-advanced-workbench__inline-text"
            style={{
              left: `${inlineTextOverlay.point.x * safeZoom}px`,
              top: `${inlineTextOverlay.point.y * safeZoom}px`,
            }}
          >
            <Input
              type="text"
              aria-label="Inline canvas text input"
              disabled={isBlocked}
              value={inlineTextOverlay.text}
              onChange={(e) => {
                const nextVal = e.target.value;
                setDraftText(nextVal);
                setInlineTextOverlay((prev) =>
                  prev ? { ...prev, text: nextVal } : null,
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setInlineTextOverlay(null);
                } else if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  commitInlineTextAt(
                    inlineTextOverlay.point,
                    inlineTextOverlay.text,
                  );
                }
              }}
            />
            <Button icon={Type} variant="secondary"
              type="button"
              disabled={isBlocked || !inlineTextOverlay.text.trim()}
              onClick={() =>
                commitInlineTextAt(
                  inlineTextOverlay.point,
                  inlineTextOverlay.text,
                )
              }
            >
              Apply inline text
            </Button>
          </div>
        )}

        {selectedItem && selectedProxy && (
          <SelectionHandlesOverlay
            annotation={selectedProxy}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            zoom={safeZoom}
            disabled={disabled}
            busy={busy}
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
          disabled={disabled}
          busy={busy}
          initialAnnotations={textCounterAnnotations}
        />
      )}

      {onExportRaster && imageSourceElement && (
        <Button icon={ImageDown} variant="secondary"
          type="button"
          disabled={isBlocked}
          onClick={async () => {
            if (isBlocked) return;
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
        </Button>
      )}
    </section>
  );
};
export { computeAnnotationBounds };

