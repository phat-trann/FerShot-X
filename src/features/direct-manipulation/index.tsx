import { X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { EditorChrome } from "../../components/EditorChrome";
import React, { useEffect, useRef, useState } from "react";
import type { ImageDocument } from "../../contracts/media";
import "./DirectTransformSurface.css";

export type TransformHandleId =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export type CornerResizeHandleId = "nw" | "ne" | "se" | "sw";

export const ALL_CROP_HANDLES: readonly TransformHandleId[] = Object.freeze([
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
] as const);

export const ALL_RESIZE_CORNER_HANDLES: readonly CornerResizeHandleId[] =
  Object.freeze(["nw", "ne", "se", "sw"] as const);

export const MAX_TRANSFORM_DIMENSION = 16_384;
export const MAX_TRANSFORM_PIXELS = 16_777_216;

export interface DirectCropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface DirectResizeDimensions {
  readonly width: number;
  readonly height: number;
}

export interface DirectTransformOptions {
  readonly crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  readonly resize?: {
    width: number;
    height: number;
  };
}

export interface DirectTransformSurfaceProps {
  readonly image: ImageDocument;
  readonly busy: boolean;
  readonly mode: "crop" | "resize";
  readonly zoom?: number;
  readonly onTransform: (options: {
    crop?: { x: number; y: number; width: number; height: number };
    resize?: { width: number; height: number };
  }) => void;
  readonly onCancel: () => void;
}

export function clampCropRect(
  rect: DirectCropRect,
  imageWidth: number,
  imageHeight: number,
): DirectCropRect {
  const safeW = Math.max(1, Math.round(imageWidth));
  const safeH = Math.max(1, Math.round(imageHeight));
  const x = Math.min(safeW - 1, Math.max(0, Math.round(rect.x)));
  const y = Math.min(safeH - 1, Math.max(0, Math.round(rect.y)));
  const width = Math.min(safeW - x, Math.max(1, Math.round(rect.width)));
  const height = Math.min(safeH - y, Math.max(1, Math.round(rect.height)));
  return Object.freeze({ x, y, width, height });
}

export function applyCropHandleDelta(
  base: DirectCropRect,
  handle: "move" | TransformHandleId,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): DirectCropRect {
  const safeW = Math.max(1, Math.round(imageWidth));
  const safeH = Math.max(1, Math.round(imageHeight));

  if (handle === "move") {
    const nextX = Math.min(
      safeW - base.width,
      Math.max(0, Math.round(base.x + deltaX)),
    );
    const nextY = Math.min(
      safeH - base.height,
      Math.max(0, Math.round(base.y + deltaY)),
    );
    return clampCropRect(
      { x: nextX, y: nextY, width: base.width, height: base.height },
      safeW,
      safeH,
    );
  }

  let left = base.x;
  let top = base.y;
  let right = base.x + base.width;
  let bottom = base.y + base.height;

  if (handle.includes("w")) {
    left = Math.max(0, Math.min(right - 1, Math.round(left + deltaX)));
  }
  if (handle.includes("e")) {
    right = Math.min(safeW, Math.max(left + 1, Math.round(right + deltaX)));
  }
  if (handle.includes("n")) {
    top = Math.max(0, Math.min(bottom - 1, Math.round(top + deltaY)));
  }
  if (handle.includes("s")) {
    bottom = Math.min(safeH, Math.max(top + 1, Math.round(bottom + deltaY)));
  }

  return clampCropRect(
    {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    },
    safeW,
    safeH,
  );
}

/**
 * Matches `fershot_image_core::Raster::resize(max_width, max_height)`:
 * fits within the dragged corner box while preserving source aspect ratio and pixel limits.
 */
export function fitAspectPreservingResize(
  maxWidth: number,
  maxHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): DirectResizeDimensions {
  const srcW = Math.max(1, Math.round(sourceWidth));
  const srcH = Math.max(1, Math.round(sourceHeight));
  const clampedMaxW = Math.min(
    MAX_TRANSFORM_DIMENSION,
    Math.max(1, Math.round(maxWidth)),
  );
  const clampedMaxH = Math.min(
    MAX_TRANSFORM_DIMENSION,
    Math.max(1, Math.round(maxHeight)),
  );

  let width: number;
  let height: number;
  if (clampedMaxW * srcH <= clampedMaxH * srcW) {
    width = clampedMaxW;
    height = Math.max(1, Math.floor((srcH * clampedMaxW) / srcW));
  } else {
    width = Math.max(1, Math.floor((srcW * clampedMaxH) / srcH));
    height = clampedMaxH;
  }

  if (width * height > MAX_TRANSFORM_PIXELS) {
    const scale = Math.sqrt(MAX_TRANSFORM_PIXELS / (width * height));
    width = Math.max(1, Math.floor(width * scale));
    height = Math.max(1, Math.floor((srcH * width) / srcW));
    while (width * height > MAX_TRANSFORM_PIXELS && width > 1) {
      width -= 1;
      height = Math.max(1, Math.floor((srcH * width) / srcW));
    }
  }

  return Object.freeze({ width, height });
}

export function applyResizeHandleDelta(
  base: DirectResizeDimensions,
  handle: CornerResizeHandleId,
  deltaX: number,
  deltaY: number,
  sourceWidth: number = base.width,
  sourceHeight: number = base.height,
): DirectResizeDimensions {
  const signX = handle.includes("e") ? 1 : -1;
  const signY = handle.includes("s") ? 1 : -1;
  const candidateWidth = Math.min(
    MAX_TRANSFORM_DIMENSION,
    Math.max(1, Math.round(base.width + signX * deltaX)),
  );
  const candidateHeight = Math.min(
    MAX_TRANSFORM_DIMENSION,
    Math.max(1, Math.round(base.height + signY * deltaY)),
  );
  return fitAspectPreservingResize(
    candidateWidth,
    candidateHeight,
    sourceWidth,
    sourceHeight,
  );
}

interface ActiveTransformGesture {
  readonly pointerId: number;
  readonly kind:
    | "crop-drag"
    | "crop-move"
    | `crop-${TransformHandleId}`
    | `resize-${CornerResizeHandleId}`;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly currentClientX: number;
  readonly currentClientY: number;
  readonly startImagePoint: { readonly x: number; readonly y: number };
  readonly currentImagePoint: { readonly x: number; readonly y: number };
  readonly baseCrop: DirectCropRect;
  readonly baseResize: DirectResizeDimensions;
}

export function DirectTransformSurface({
  image,
  busy,
  mode,
  zoom,
  onTransform,
  onCancel,
}: DirectTransformSurfaceProps): React.JSX.Element {
  const safeZoom =
    zoom !== undefined && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [cropRect, setCropRect] = useState<DirectCropRect>(() =>
    clampCropRect(
      { x: 0, y: 0, width: image.width, height: image.height },
      image.width,
      image.height,
    ),
  );
  const [resizeDims, setResizeDims] = useState<DirectResizeDimensions>(() =>
    Object.freeze({
      width: Math.max(1, Math.round(image.width)),
      height: Math.max(1, Math.round(image.height)),
    }),
  );
  const [hasDraft,setHasDraft]=useState(false);
  const [gesture, setGesture] = useState<ActiveTransformGesture | null>(null);

  const captureStagePointer = (pointerId: number, fallbackTarget?: HTMLElement) => {
    const el = stageRef.current ?? fallbackTarget ?? null;
    if (!el || typeof el.setPointerCapture !== "function") return;
    try {
      el.setPointerCapture(pointerId);
    } catch {
      // Ignore synthetic jsdom environments
    }
  };

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
    setCropRect(
      clampCropRect(
        { x: 0, y: 0, width: image.width, height: image.height },
        image.width,
        image.height,
      ),
    );
    setResizeDims(
      Object.freeze({
        width: Math.max(1, Math.round(image.width)),
        height: Math.max(1, Math.round(image.height)),
      }),
    );
    setGesture(null);
    setHasDraft(false);
  }, [image.id, image.width, image.height]);

  useEffect(() => {
    if (busy && gesture) {
      releaseStageCapture(gesture.pointerId);
      setGesture(null);
    }
  }, [busy, gesture]);

  const resolveScales = (): { scaleX: number; scaleY: number; left: number; top: number } => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (
      rect &&
      rect.width > 0 &&
      rect.height > 0 &&
      image.width > 0 &&
      image.height > 0
    ) {
      return {
        scaleX: rect.width / image.width,
        scaleY: rect.height / image.height,
        left: rect.left,
        top: rect.top,
      };
    }
    return {
      scaleX: safeZoom,
      scaleY: safeZoom,
      left: rect?.left ?? 0,
      top: rect?.top ?? 0,
    };
  };

  const clientToClampedImagePoint = (clientX: number, clientY: number) => {
    const { scaleX, scaleY, left, top } = resolveScales();
    const rawX = (clientX - left) / scaleX;
    const rawY = (clientY - top) / scaleY;
    return {
      x: Math.min(image.width, Math.max(0, Math.round(rawX))),
      y: Math.min(image.height, Math.max(0, Math.round(rawY))),
    };
  };

  const computeLiveCrop = (active: ActiveTransformGesture): DirectCropRect => {
    if (active.kind === "crop-drag") {
      const p0 = active.startImagePoint;
      const p1 = active.currentImagePoint;
      const minX = Math.min(p0.x, p1.x);
      const minY = Math.min(p0.y, p1.y);
      const w = Math.max(1, Math.abs(p1.x - p0.x));
      const h = Math.max(1, Math.abs(p1.y - p0.y));
      return clampCropRect(
        { x: minX, y: minY, width: w, height: h },
        image.width,
        image.height,
      );
    }
    const { scaleX, scaleY } = resolveScales();
    const dx = (active.currentClientX - active.startClientX) / scaleX;
    const dy = (active.currentClientY - active.startClientY) / scaleY;
    if (active.kind === "crop-move") {
      return applyCropHandleDelta(
        active.baseCrop,
        "move",
        dx,
        dy,
        image.width,
        image.height,
      );
    }
    if (active.kind.startsWith("crop-")) {
      const handle = active.kind.slice(5) as TransformHandleId;
      return applyCropHandleDelta(
        active.baseCrop,
        handle,
        dx,
        dy,
        image.width,
        image.height,
      );
    }
    return active.baseCrop;
  };

  const computeLiveResize = (
    active: ActiveTransformGesture,
  ): DirectResizeDimensions => {
    if (active.kind.startsWith("resize-")) {
      const handle = active.kind.slice(7) as CornerResizeHandleId;
      const { scaleX, scaleY } = resolveScales();
      const dx = (active.currentClientX - active.startClientX) / scaleX;
      const dy = (active.currentClientY - active.startClientY) / scaleY;
      return applyResizeHandleDelta(
        active.baseResize,
        handle,
        dx,
        dy,
        image.width,
        image.height,
      );
    }
    return active.baseResize;
  };

  const displayCrop =
    gesture && mode === "crop" ? computeLiveCrop(gesture) : cropRect;
  const displayResize =
    gesture && mode === "resize" ? computeLiveResize(gesture) : resizeDims;
  const isFullImageCrop =
    displayCrop.x === 0 &&
    displayCrop.y === 0 &&
    displayCrop.width >= image.width &&
    displayCrop.height >= image.height;

  const beginGesture = (
    kind: ActiveTransformGesture["kind"],
    e: React.PointerEvent<HTMLElement>,
  ) => {
    if (busy || e.button !== 0 || gesture !== null) {
      return;
    }
    e.stopPropagation();
    stageRef.current?.focus();
    captureStagePointer(e.pointerId, e.currentTarget);
    const pt = clientToClampedImagePoint(e.clientX, e.clientY);
    setGesture({
      pointerId: e.pointerId,
      kind,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentClientX: e.clientX,
      currentClientY: e.clientY,
      startImagePoint: pt,
      currentImagePoint: pt,
      baseCrop: cropRect,
      baseResize: resizeDims,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (busy) {
      if (gesture) {
        releaseStageCapture(gesture.pointerId);
        setGesture(null);
      }
      return;
    }
    if (!gesture || gesture.pointerId !== e.pointerId) {
      return;
    }
    const pt = clientToClampedImagePoint(e.clientX, e.clientY);
    setGesture((prev) =>
      prev && prev.pointerId === e.pointerId
        ? {
            ...prev,
            currentClientX: e.clientX,
            currentClientY: e.clientY,
            currentImagePoint: pt,
          }
        : prev,
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!gesture || gesture.pointerId !== e.pointerId) {
      return;
    }
    releaseStageCapture(gesture.pointerId);
    if (busy) {
      setGesture(null);
      return;
    }
    const pt = clientToClampedImagePoint(e.clientX, e.clientY);
    const finalized: ActiveTransformGesture = {
      ...gesture,
      currentClientX: e.clientX,
      currentClientY: e.clientY,
      currentImagePoint: pt,
    };
    setGesture(null);

    if (mode === "crop") {
      if (finalized.kind === "crop-drag") {
        const dragW = Math.abs(
          finalized.currentImagePoint.x - finalized.startImagePoint.x,
        );
        const dragH = Math.abs(
          finalized.currentImagePoint.y - finalized.startImagePoint.y,
        );
        if (dragW < 1 || dragH < 1) {
          return;
        }
      }
      const nextCrop = computeLiveCrop(finalized);
      setHasDraft(true);
      setCropRect(nextCrop);
      stageRef.current?.focus();
      return;
    }

    if (mode === "resize" && finalized.kind.startsWith("resize-")) {
      const nextResize = computeLiveResize(finalized);
      setHasDraft(true);
      setResizeDims(nextResize);
      stageRef.current?.focus();

    }
  };

  const cancelActiveOrSurface = () => {
    if (gesture) {
      releaseStageCapture(gesture.pointerId);
      setGesture(null);
      return;
    }
    onCancel();
  };

  return (
    <section
      className="fershot-direct-transform"
      aria-label={`Direct ${mode} surface for ${image.name}`}
      aria-busy={busy}
      onKeyDown={(e) => {
        if(e.key==="Enter"&&hasDraft&&!busy&&!gesture&&!e.repeat){e.preventDefault();e.stopPropagation();if(mode==="crop")onTransform({crop:cropRect});else onTransform({resize:resizeDims});return;}

        if (e.key === "Escape") {
          e.preventDefault();
          cancelActiveOrSurface();
        }
      }}
    >
      <EditorChrome><header className="fershot-direct-transform__header">
        <strong>{mode === "crop" ? "Direct Crop" : "Direct Resize"}</strong>
        <span
          className="fershot-direct-transform__readout"
          data-testid="direct-transform-readout"
        >
          {mode === "crop"
            ? `${displayCrop.x}, ${displayCrop.y} — ${displayCrop.width} × ${displayCrop.height} px`
            : `${displayResize.width} × ${displayResize.height} px`}
        </span>
        <Button icon={X} variant="secondary"
          type="button"
          onClick={() => {
            if (gesture) {
              releaseStageCapture(gesture.pointerId);
              setGesture(null);
            }
            onCancel();
          }}
        >
          Cancel
        </Button>
      </header></EditorChrome>

      <div
        ref={stageRef}
        role="application"
        aria-label="Direct crop and resize surface"
        data-testid="direct-transform-stage"
        tabIndex={0}
        className={`fershot-direct-transform__stage${mode === "resize" ? " fershot-direct-transform__stage--resize" : ""}`}
        style={{
          width: `${image.width * safeZoom}px`,
          height: `${image.height * safeZoom}px`,
        }}
        onPointerDown={(e) => {
          if (mode === "crop") {
            beginGesture("crop-drag", e);
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(e) => {
          if (gesture && gesture.pointerId === e.pointerId) {
            releaseStageCapture(gesture.pointerId);
            setGesture(null);
          }
        }}
        onLostPointerCapture={(e) => {
          if (gesture && gesture.pointerId === e.pointerId) {
            setGesture(null);
          }
        }}
      >
        <img
          className="fershot-direct-transform__image"
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.name}
          draggable={false}
        />

        {mode === "crop" ? (
          <div
            className="fershot-direct-transform__box"
            role="group"
            aria-label="Crop selection box"
            style={{
              left: `${(displayCrop.x / Math.max(1, image.width)) * 100}%`,
              top: `${(displayCrop.y / Math.max(1, image.height)) * 100}%`,
              width: `${(displayCrop.width / Math.max(1, image.width)) * 100}%`,
              height: `${(displayCrop.height / Math.max(1, image.height)) * 100}%`,
            }}
          >
            <div
              role="button"
              aria-label="Move crop region"
              data-hit-mode={isFullImageCrop ? "crop-drag" : "crop-move"}
              className={`fershot-direct-transform__body${isFullImageCrop ? " fershot-direct-transform__body--passthrough" : ""}`}
              style={{ pointerEvents: isFullImageCrop ? "none" : "auto" }}
              onPointerDown={(e) =>
                beginGesture(isFullImageCrop ? "crop-drag" : "crop-move", e)
              }
            />
            {ALL_CROP_HANDLES.map((handle) => (
              <Button variant="plain"
                key={handle}
                type="button"
                disabled={busy}
                aria-label={`Crop handle ${handle.toUpperCase()}`}
                data-handle={handle}
                className={`fershot-direct-transform__handle fershot-direct-transform__handle--${handle}`}
                onPointerDown={(e) => beginGesture(`crop-${handle}`, e)}
              />
            ))}
          </div>
        ) : (
          <div
            className="fershot-direct-transform__box"
            role="group"
            aria-label="Resize frame box"
            style={{
              left: "0%",
              top: "0%",
              width: `${(displayResize.width / Math.max(1, image.width)) * 100}%`,
              height: `${(displayResize.height / Math.max(1, image.height)) * 100}%`,
            }}
          >
            {ALL_RESIZE_CORNER_HANDLES.map((handle) => (
              <Button variant="plain"
                key={handle}
                type="button"
                disabled={busy}
                aria-label={`Resize handle ${handle.toUpperCase()}`}
                data-handle={handle}
                className={`fershot-direct-transform__handle fershot-direct-transform__handle--${handle}`}
                onPointerDown={(e) => beginGesture(`resize-${handle}`, e)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export {
  DirectEffectsSurface,
  MAX_DIRECT_EFFECT_PIXELS,
  buildPixelEffectRequest,
  parseEffectHexColor,
  type DirectEffectsSurfaceProps,
} from "./DirectEffectsSurface";
export {
  DirectLayoutSurface,
  clampLayerToCanvas,
  type DirectLayoutSurfaceProps,
} from "./DirectLayoutSurface";

