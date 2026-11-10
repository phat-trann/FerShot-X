import { Toggle } from "../../components/ui/toggle";
import {Blend,Grid2x2,Square,Eraser} from "lucide-react";
import { EditorChrome } from "../../components/EditorChrome";
import React, { useEffect, useRef, useState } from "react";
import type { ImageDocument } from "../../contracts/media";
import type {
  EffectRect,
  PixelEffectRequest,
  RgbaColor,
} from "../effects-panel";
import {
  ALL_CROP_HANDLES,
  applyCropHandleDelta,
  clampCropRect,
  type TransformHandleId,
} from "./index";
import { Input } from "../../components/ui/input";

export const MAX_DIRECT_EFFECT_PIXELS = 4_194_304;
const HEX_COLOR_RE = /^#([0-9a-f]{6})$/i;

export interface DirectEffectsSurfaceProps {
  readonly image: ImageDocument;
  readonly busy: boolean;
  readonly zoom?: number;
  readonly defaultKind?: PixelEffectRequest["kind"];
  readonly onApply: (effect: PixelEffectRequest) => void;
  readonly onCancel?: () => void;
}

export function parseEffectHexColor(hexValue: string, alpha: number): RgbaColor {
  const match = HEX_COLOR_RE.exec(hexValue.trim());
  const clampedAlpha = Math.min(255, Math.max(0, Math.round(alpha)));
  if (!match) {
    return Object.freeze({ r: 0, g: 0, b: 0, a: clampedAlpha });
  }
  const hex = match[1];
  return Object.freeze({
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: clampedAlpha,
  });
}

export function buildPixelEffectRequest(options: {
  readonly kind: PixelEffectRequest["kind"];
  readonly rect: EffectRect;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly radius: number;
  readonly blockSize: number;
  readonly colorHex: string;
  readonly alpha: number;
}): PixelEffectRequest {
  const clamped = clampCropRect(
    options.rect,
    options.imageWidth,
    options.imageHeight,
  );
  if (clamped.width * clamped.height > MAX_DIRECT_EFFECT_PIXELS) {
    throw new RangeError(
      "Effect region exceeds the 4-megapixel safety budget.",
    );
  }
  const rect: EffectRect = {
    x: clamped.x,
    y: clamped.y,
    width: clamped.width,
    height: clamped.height,
  };
  if (options.kind === "blur") {
    const radius = Math.min(64, Math.max(1, Math.round(options.radius)));
    return { kind: "blur", rect, radius };
  }
  if (options.kind === "mosaic") {
    const blockSize = Math.min(
      128,
      Math.max(2, Math.round(options.blockSize)),
    );
    return { kind: "mosaic", rect, blockSize };
  }
  if (options.kind === "solidCover") {
    return {
      kind: "solidCover",
      rect,
      color: parseEffectHexColor(options.colorHex, options.alpha),
    };
  }
  return { kind: "transparentErase", rect };
}

interface EffectGesture {
  readonly pointerId: number;
  readonly mode: "draw" | "move" | TransformHandleId;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly currentClientX: number;
  readonly currentClientY: number;
  readonly startPt: { readonly x: number; readonly y: number };
  readonly currentPt: { readonly x: number; readonly y: number };
  readonly baseRect: EffectRect;
}

export function DirectEffectsSurface({
  image,
  busy,
  zoom,
  defaultKind = "blur",
  onApply,
  onCancel,
}: DirectEffectsSurfaceProps): React.JSX.Element {
  const safeZoom =
    zoom !== undefined && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [kind, setKind] = useState<PixelEffectRequest["kind"]>(defaultKind);
  const [radius, setRadius] = useState(8);
  const [blockSize, setBlockSize] = useState(8);
  const [colorHex, setColorHex] = useState("#000000");
  const [alpha, setAlpha] = useState(255);
  const [region, setRegion] = useState<EffectRect>(() =>
    clampCropRect(
      {
        x: Math.min(16, Math.max(0, image.width - 1)),
        y: Math.min(16, Math.max(0, image.height - 1)),
        width: Math.min(120, image.width),
        height: Math.min(80, image.height),
      },
      image.width,
      image.height,
    ),
  );
  const [hasCustomRegion, setHasCustomRegion] = useState(false);
  const [gesture, setGesture] = useState<EffectGesture | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setRegion(
      clampCropRect(
        {
          x: Math.min(16, Math.max(0, image.width - 1)),
          y: Math.min(16, Math.max(0, image.height - 1)),
          width: Math.min(120, image.width),
          height: Math.min(80, image.height),
        },
        image.width,
        image.height,
      ),
    );
    setHasCustomRegion(false);
    setGesture(null);
    setError(null);
  }, [image.id, image.width, image.height]);

  useEffect(() => {
    if (busy && gesture) {
      releaseStageCapture(gesture.pointerId);
      setGesture(null);
    }
  }, [busy, gesture]);

  const resolveScales = () => {
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

  const clientToImagePoint = (clientX: number, clientY: number) => {
    const { scaleX, scaleY, left, top } = resolveScales();
    return {
      x: Math.min(
        image.width,
        Math.max(0, Math.round((clientX - left) / scaleX)),
      ),
      y: Math.min(
        image.height,
        Math.max(0, Math.round((clientY - top) / scaleY)),
      ),
    };
  };

  const computeLiveRect = (active: EffectGesture): EffectRect => {
    if (active.mode === "draw") {
      const minX = Math.min(active.startPt.x, active.currentPt.x);
      const minY = Math.min(active.startPt.y, active.currentPt.y);
      const w = Math.max(1, Math.abs(active.currentPt.x - active.startPt.x));
      const h = Math.max(1, Math.abs(active.currentPt.y - active.startPt.y));
      return clampCropRect(
        { x: minX, y: minY, width: w, height: h },
        image.width,
        image.height,
      );
    }
    const { scaleX, scaleY } = resolveScales();
    const dx = (active.currentClientX - active.startClientX) / scaleX;
    const dy = (active.currentClientY - active.startClientY) / scaleY;
    return applyCropHandleDelta(
      active.baseRect,
      active.mode,
      dx,
      dy,
      image.width,
      image.height,
    );
  };

  const displayRect = gesture ? computeLiveRect(gesture) : region;

  const commitEffectForRect = (nextRect: EffectRect) => {
    try {
      const request = buildPixelEffectRequest({
        kind,
        rect: nextRect,
        imageWidth: image.width,
        imageHeight: image.height,
        radius,
        blockSize,
        colorHex,
        alpha,
      });
      setError(null);
      onApply(request);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid effect region.",
      );
    }
  };

  const startGesture = (
    mode: EffectGesture["mode"],
    e: React.PointerEvent<HTMLElement>,
  ) => {
    if (busy || e.button !== 0 || gesture !== null) {
      return;
    }
    e.stopPropagation();
    captureStagePointer(e.pointerId, e.currentTarget);
    const pt = clientToImagePoint(e.clientX, e.clientY);
    setGesture({
      pointerId: e.pointerId,
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentClientX: e.clientX,
      currentClientY: e.clientY,
      startPt: pt,
      currentPt: pt,
      baseRect: region,
    });
  };

  return (
    <section
      className="fershot-direct-transform"
      aria-label="Direct region effects surface"
      aria-busy={busy}
      onKeyDown={(e) => {
        if(e.key==="Enter"&&!busy&&!gesture&&!e.repeat){e.preventDefault();e.stopPropagation();if(hasCustomRegion)commitEffectForRect(region);return;}

        if (e.key === "Escape") {
          e.preventDefault();
          if (gesture) {
            releaseStageCapture(gesture.pointerId);
            setGesture(null);
          } else {
            onCancel?.();
          }
        }
      }}
    >
      <EditorChrome><header className="fershot-direct-transform__header">
        <div role="group" aria-label="Direct effect tools">
          {(
            ["blur", "mosaic", "solidCover", "transparentErase"] as const
          ).map((modeKind) => (
            <Toggle size="sm"
              key={modeKind}
              type="button"
              disabled={busy}
              pressed={kind === modeKind}
              aria-label={`Effect: ${modeKind}`} title={modeKind} onPressedChange={pressed=>{if(pressed)setKind(modeKind);}}
            >
              {React.createElement({blur:Blend,mosaic:Grid2x2,solidCover:Square,transparentErase:Eraser}[modeKind],{size:16,strokeWidth:1.75,"aria-hidden":true})}
            </Toggle>
          ))}
        </div>

        {kind === "blur" && (
          <label>
            Blur radius
            <Input
              type="number"
              aria-label="Blur radius"
              min={1}
              max={64}
              disabled={busy}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value) || 1)}
            />
          </label>
        )}
        {kind === "mosaic" && (
          <label>
            Mosaic block size
            <Input
              type="number"
              aria-label="Mosaic block size"
              min={2}
              max={128}
              disabled={busy}
              value={blockSize}
              onChange={(e) => setBlockSize(Number(e.target.value) || 2)}
            />
          </label>
        )}
        {kind === "solidCover" && (
          <>
            <label>
              Cover color
              <Input
                type="text"
                aria-label="Cover color"
                disabled={busy}
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
              />
            </label>
            <label>
              Cover alpha
              <Input
                type="number"
                aria-label="Cover alpha"
                min={0}
                max={255}
                disabled={busy}
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
              />
            </label>
          </>
        )}

        <span
          className="fershot-direct-transform__readout"
          data-testid="direct-effects-readout"
        >
          {displayRect.x}, {displayRect.y} — {displayRect.width} ×{" "}
          {displayRect.height} px
        </span>
      </header></EditorChrome>

      {error && <p role="alert">{error}</p>}

      <div
        ref={stageRef}
        role="application"
        aria-label="Direct effect region canvas"
        data-testid="direct-effects-stage"
        tabIndex={0}
        className="fershot-direct-transform__stage"
        style={{
          width: `${image.width * safeZoom}px`,
          height: `${image.height * safeZoom}px`,
        }}
        onPointerDown={(e) => startGesture("draw", e)}
        onPointerMove={(e) => {
          if (busy) {
            if (gesture) {
              releaseStageCapture(gesture.pointerId);
              setGesture(null);
            }
            return;
          }
          if (!gesture || gesture.pointerId !== e.pointerId) return;
          const pt = clientToImagePoint(e.clientX, e.clientY);
          setGesture((prev) =>
            prev && prev.pointerId === e.pointerId
              ? {
                  ...prev,
                  currentClientX: e.clientX,
                  currentClientY: e.clientY,
                  currentPt: pt,
                }
              : prev,
          );
        }}
        onPointerUp={(e) => {
          if (!gesture || gesture.pointerId !== e.pointerId) return;
          releaseStageCapture(gesture.pointerId);
          if (busy) {
            setGesture(null);
            return;
          }
          const pt = clientToImagePoint(e.clientX, e.clientY);
          const finalized: EffectGesture = {
            ...gesture,
            currentClientX: e.clientX,
            currentClientY: e.clientY,
            currentPt: pt,
          };
          setGesture(null);
          if (
            finalized.mode === "draw" &&
            (Math.abs(finalized.currentPt.x - finalized.startPt.x) < 1 ||
              Math.abs(finalized.currentPt.y - finalized.startPt.y) < 1)
          ) {
            return;
          }
          const nextRect = computeLiveRect(finalized);
          setRegion(nextRect);
          setHasCustomRegion(true);
          stageRef.current?.focus();
        }}
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

        <div
          className="fershot-direct-transform__box"
          role="group"
          aria-label="Effect region box"
          style={{
            left: `${(displayRect.x / Math.max(1, image.width)) * 100}%`,
            top: `${(displayRect.y / Math.max(1, image.height)) * 100}%`,
            width: `${(displayRect.width / Math.max(1, image.width)) * 100}%`,
            height: `${(displayRect.height / Math.max(1, image.height)) * 100}%`,
          }}
        >
          <div
            role="button"
            aria-label="Move effect region"
            data-hit-mode={hasCustomRegion ? "move" : "draw"}
            className={`fershot-direct-transform__body${!hasCustomRegion ? " fershot-direct-transform__body--passthrough" : ""}`}
            style={{ pointerEvents: hasCustomRegion ? "auto" : "none" }}
            onPointerDown={(e) =>
              startGesture(hasCustomRegion ? "move" : "draw", e)
            }
          />
          {ALL_CROP_HANDLES.map((handle) => (
            <button
              key={handle}
              type="button"
              disabled={busy}
              aria-label={`Effect handle ${handle.toUpperCase()}`}
              data-handle={handle}
              className={`fershot-direct-transform__handle fershot-direct-transform__handle--${handle}`}
              onPointerDown={(e) => startGesture(handle, e)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
