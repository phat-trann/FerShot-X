import { PanelsTopLeft, ImageDown, X, Blend } from "lucide-react";
import { Button } from "../../components/ui/button";
import { KonvaComposition } from "../editor/konva/KonvaComposition";
import { EditorChrome } from "../../components/EditorChrome";
import React, { useEffect, useRef, useState } from "react";
import { DirectLayoutRasterPreview, type PrepareLayoutSource } from "./DirectLayoutRasterPreview";
import type { ImageDocument } from "../../contracts/media";
import {
  MAX_BACKDROP_CORNER_RADIUS,
  MAX_BACKDROP_INSET,
  planBackdropLayout,
  type BackdropLayout,
  type BackdropShadowOptions,
} from "../backdrop/backdrop-renderer";
import { snapPlacementToEdges } from "../composition";
import type { LayoutLayerPlan, WorkspaceLayoutPlan } from "../../platform/layout";
import {
  ALL_RESIZE_CORNER_HANDLES,
  MAX_TRANSFORM_DIMENSION,
  type CornerResizeHandleId,
} from "./index";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { NativeSelect } from "../../components/ui/select";

const DEFAULT_BACKDROP_SHADOW: BackdropShadowOptions = Object.freeze({
  blur: 16,
  offsetX: 0,
  offsetY: 8,
  color: "#000000",
});

export function computeDirectBackdropPreviewLayout(
  sourceWidth: number,
  sourceHeight: number,
  inset: number,
  cornerRadius: number,
  shadowEnabled: boolean,
): BackdropLayout {
  const safeW = Math.max(1, Math.round(sourceWidth));
  const safeH = Math.max(1, Math.round(sourceHeight));
  const safeInset = Math.min(
    MAX_BACKDROP_INSET,
    Math.max(0, Math.round(inset)),
  );
  const safeRadius = Math.min(
    MAX_BACKDROP_CORNER_RADIUS,
    Math.max(0, Math.round(cornerRadius)),
  );
  try {
    return planBackdropLayout({
      source: {} as CanvasImageSource,
      sourceWidth: safeW,
      sourceHeight: safeH,
      inset: safeInset,
      cornerRadius: safeRadius,
      fill: { kind: "solid", color: "#000000" },
      shadow: shadowEnabled ? DEFAULT_BACKDROP_SHADOW : null,
    });
  } catch {
    return Object.freeze({
      canvasWidth: safeW + safeInset * 2,
      canvasHeight: safeH + safeInset * 2,
      drawX: safeInset,
      drawY: safeInset,
    });
  }
}

export interface DirectLayoutSurfaceProps {
  readonly images: readonly ImageDocument[];
  readonly selected: ImageDocument;
  readonly busy: boolean;
  readonly zoom?: number;
  readonly onCompose: (plan: WorkspaceLayoutPlan) => void;
  readonly onCancel?: () => void;
  readonly prepareSource?: PrepareLayoutSource;
  readonly konva?: boolean;
}

interface ActiveLayoutGesture {
  readonly pointerId: number;
  readonly kind:
    | { readonly type: "layer-move"; readonly layerId: string }
    | {
        readonly type: "layer-resize";
        readonly layerId: string;
        readonly handle: CornerResizeHandleId;
      }
    | { readonly type: "canvas-resize" }
    | { readonly type: "backdrop-inset" };
  readonly startClientX: number;
  readonly startClientY: number;
  readonly currentClientX: number;
  readonly currentClientY: number;
  readonly startScaleX: number;
  readonly startScaleY: number;
  readonly baseLayer?: LayoutLayerPlan;
  readonly baseCanvasWidth: number;
  readonly baseCanvasHeight: number;
  readonly baseInset: number;
}

export function clampLayerToCanvas(
  layer: LayoutLayerPlan,
  canvasWidth: number,
  canvasHeight: number,
): LayoutLayerPlan {
  const safeW = Math.max(1, Math.round(canvasWidth));
  const safeH = Math.max(1, Math.round(canvasHeight));
  const width = Math.min(safeW, Math.max(1, Math.round(layer.width)));
  const height = Math.min(safeH, Math.max(1, Math.round(layer.height)));
  const x = Math.min(safeW - width, Math.max(0, Math.round(layer.x)));
  const y = Math.min(safeH - height, Math.max(0, Math.round(layer.y)));
  return Object.freeze({
    ...layer,
    x,
    y,
    width,
    height,
  });
}

export function DirectLayoutSurface({
  images,
  selected,
  busy,
  zoom,
  onCompose,
  onCancel,
  prepareSource,
  konva=false,
}: DirectLayoutSurfaceProps): React.JSX.Element {
  const safeZoom =
    zoom !== undefined && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const surfaceRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [layers, setLayers] = useState<readonly LayoutLayerPlan[]>([
    {
      id: selected.id,
      x: 0,
      y: 0,
      width: selected.width,
      height: selected.height,
      zIndex: 0,
      opacity: 1,
    },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>(selected.id);
  const [canvasWidth, setCanvasWidth] = useState(selected.width);
  const [canvasHeight, setCanvasHeight] = useState(selected.height);
  const [scale, setScale] = useState(1);
  const [backdrop, setBackdrop] = useState(false);
  const [inset, setInset] = useState(64);
  const [cornerRadius, setCornerRadius] = useState(12);
  const [color, setColor] = useState("#e8edf5");
  const [fillKind, setFillKind] = useState("solid");
  const [endColor, setEndColor] = useState("#6c5ce7");
  const [angle, setAngle] = useState(135);
  const [backgroundId, setBackgroundId] = useState(selected.id);
  const [shadow, setShadow] = useState(false);
  const [error, setError] = useState("");
  const [gesture, setGesture] = useState<ActiveLayoutGesture | null>(null);

  const captureGesturePointer = (
    pointerId: number,
    fallbackTarget?: HTMLElement,
  ) => {
    const target = stageRef.current ?? surfaceRef.current ?? fallbackTarget ?? null;
    if (!target || typeof target.setPointerCapture !== "function") return;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Ignore synthetic jsdom environments
    }
  };

  const releaseGesturePointer = (pointerId: number) => {
    for (const candidate of [stageRef.current, surfaceRef.current]) {
      if (!candidate || typeof candidate.releasePointerCapture !== "function") {
        continue;
      }
      try {
        if (
          typeof candidate.hasPointerCapture !== "function" ||
          candidate.hasPointerCapture(pointerId)
        ) {
          candidate.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore if pointer capture is already released
      }
    }
  };

  useEffect(() => {
    setLayers([
      {
        id: selected.id,
        x: 0,
        y: 0,
        width: selected.width,
        height: selected.height,
        zIndex: 0,
        opacity: 1,
      },
    ]);
    setActiveLayerId(selected.id);
    setCanvasWidth(selected.width);
    setCanvasHeight(selected.height);
    setBackgroundId(selected.id);
    setGesture(null);
    setError("");
  }, [selected.id, selected.width, selected.height]);

  useEffect(() => {
    if (busy && gesture) {
      releaseGesturePointer(gesture.pointerId);
      setGesture(null);
    }
  }, [busy, gesture]);

  useEffect(() => {
    const available = new Set(images.map(image => image.id));
    setLayers(previous => previous.some(layer => !available.has(layer.id)) ? previous.filter(layer => available.has(layer.id)) : previous);
    if (gesture && (gesture.kind.type === "layer-move" || gesture.kind.type === "layer-resize") && !available.has(gesture.kind.layerId)) {
      releaseGesturePointer(gesture.pointerId); setGesture(null);
    }
  }, [images]);

  const resolveInitialScales = (
    baseW: number,
    baseH: number,
    baseInset: number,
    hasBackdrop: boolean,
  ) => {
    const planned = hasBackdrop
      ? computeDirectBackdropPreviewLayout(
          baseW,
          baseH,
          baseInset,
          cornerRadius,
          shadow,
        )
      : { canvasWidth: baseW, canvasHeight: baseH, drawX: 0, drawY: 0 };
    const outW = planned.canvasWidth;
    const outH = planned.canvasHeight;
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0 && outW > 0 && outH > 0) {
      return {
        scaleX: rect.width / outW,
        scaleY: rect.height / outH,
      };
    }
    return { scaleX: safeZoom, scaleY: safeZoom };
  };

  const computeTransformedLayer = (
    active: ActiveLayoutGesture,
  ): LayoutLayerPlan | null => {
    const base = active.baseLayer;
    if (!base) return null;
    const dx =
      (active.currentClientX - active.startClientX) / active.startScaleX;
    const dy =
      (active.currentClientY - active.startClientY) / active.startScaleY;

    if (active.kind.type === "layer-move") {
      const moved = clampLayerToCanvas(
        {
          ...base,
          x: Math.round(base.x + dx),
          y: Math.round(base.y + dy),
        },
        canvasWidth,
        canvasHeight,
      );
      try {
        const siblings = layers.filter((item) => item.id !== base.id);
        const snapped = snapPlacementToEdges(
          moved,
          siblings,
          canvasWidth,
          canvasHeight,
        );
        return clampLayerToCanvas(
          { ...moved, x: snapped.x, y: snapped.y },
          canvasWidth,
          canvasHeight,
        );
      } catch {
        return moved;
      }
    }

    if (active.kind.type === "layer-resize") {
      const handle = active.kind.handle;
      let left = base.x;
      let top = base.y;
      let right = base.x + base.width;
      let bottom = base.y + base.height;

      if (handle.includes("w")) {
        left = Math.max(0, Math.min(right - 1, Math.round(left + dx)));
      }
      if (handle.includes("e")) {
        right = Math.min(
          canvasWidth,
          Math.max(left + 1, Math.round(right + dx)),
        );
      }
      if (handle.includes("n")) {
        top = Math.max(0, Math.min(bottom - 1, Math.round(top + dy)));
      }
      if (handle.includes("s")) {
        bottom = Math.min(
          canvasHeight,
          Math.max(top + 1, Math.round(bottom + dy)),
        );
      }
      return clampLayerToCanvas(
        {
          ...base,
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
        },
        canvasWidth,
        canvasHeight,
      );
    }

    return base;
  };

  const computeLiveCanvasDims = (active: ActiveLayoutGesture) => {
    if (active.kind.type !== "canvas-resize") {
      return { width: canvasWidth, height: canvasHeight };
    }
    const dx =
      (active.currentClientX - active.startClientX) / active.startScaleX;
    const dy =
      (active.currentClientY - active.startClientY) / active.startScaleY;
    return {
      width: Math.min(
        MAX_TRANSFORM_DIMENSION,
        Math.max(1, Math.round(active.baseCanvasWidth + dx)),
      ),
      height: Math.min(
        MAX_TRANSFORM_DIMENSION,
        Math.max(1, Math.round(active.baseCanvasHeight + dy)),
      ),
    };
  };

  const computeLiveInset = (active: ActiveLayoutGesture) => {
    if (active.kind.type !== "backdrop-inset") {
      return inset;
    }
    const dx =
      (active.currentClientX - active.startClientX) / active.startScaleX;
    return Math.min(512, Math.max(0, Math.round(active.baseInset + dx)));
  };

  const displayCanvas = gesture
    ? computeLiveCanvasDims(gesture)
    : { width: canvasWidth, height: canvasHeight };
  const displayInset = gesture ? computeLiveInset(gesture) : inset;
  const backdropLayout = backdrop
    ? computeDirectBackdropPreviewLayout(
        displayCanvas.width,
        displayCanvas.height,
        displayInset,
        cornerRadius,
        shadow,
      )
    : {
        canvasWidth: displayCanvas.width,
        canvasHeight: displayCanvas.height,
        drawX: 0,
        drawY: 0,
      };
  const outputWidth = backdropLayout.canvasWidth;
  const outputHeight = backdropLayout.canvasHeight;
  const contentDrawX = backdropLayout.drawX;
  const contentDrawY = backdropLayout.drawY;
  const previewShadowCss =
    backdrop && shadow
      ? `${DEFAULT_BACKDROP_SHADOW.offsetX * safeZoom}px ${DEFAULT_BACKDROP_SHADOW.offsetY * safeZoom}px ${DEFAULT_BACKDROP_SHADOW.blur * safeZoom}px ${DEFAULT_BACKDROP_SHADOW.color}`
      : "none";

  const startGesture = (
    kind: ActiveLayoutGesture["kind"],
    e: React.PointerEvent<HTMLElement>,
    baseLayer?: LayoutLayerPlan,
  ) => {
    if (busy || e.button !== 0 || gesture !== null) {
      return;
    }
    e.stopPropagation();
    captureGesturePointer(e.pointerId, e.currentTarget);
    if (baseLayer) {
      setActiveLayerId(baseLayer.id);
    }
    const { scaleX, scaleY } = resolveInitialScales(
      canvasWidth,
      canvasHeight,
      inset,
      backdrop,
    );
    setGesture({
      pointerId: e.pointerId,
      kind,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentClientX: e.clientX,
      currentClientY: e.clientY,
      startScaleX: scaleX,
      startScaleY: scaleY,
      baseLayer,
      baseCanvasWidth: canvasWidth,
      baseCanvasHeight: canvasHeight,
      baseInset: inset,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (busy) {
      if (gesture) {
        releaseGesturePointer(gesture.pointerId);
        setGesture(null);
      }
      return;
    }
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    setGesture((prev) =>
      prev && prev.pointerId === e.pointerId
        ? {
            ...prev,
            currentClientX: e.clientX,
            currentClientY: e.clientY,
          }
        : prev,
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    releaseGesturePointer(gesture.pointerId);
    if (busy) {
      setGesture(null);
      return;
    }
    const finalized: ActiveLayoutGesture = {
      ...gesture,
      currentClientX: e.clientX,
      currentClientY: e.clientY,
    };
    setGesture(null);

    if (
      finalized.kind.type === "layer-move" ||
      finalized.kind.type === "layer-resize"
    ) {
      const updatedLayer = computeTransformedLayer(finalized);
      if (updatedLayer) {
        setLayers((prev) =>
          prev.map((item) =>
            item.id === updatedLayer.id ? updatedLayer : item,
          ),
        );
      }
      return;
    }

    if (finalized.kind.type === "canvas-resize") {
      const nextDims = computeLiveCanvasDims(finalized);
      setCanvasWidth(nextDims.width);
      setCanvasHeight(nextDims.height);
      setLayers((prev) =>
        prev.map((layer) =>
          clampLayerToCanvas(layer, nextDims.width, nextDims.height),
        ),
      );
      return;
    }

    if (finalized.kind.type === "backdrop-inset") {
      setInset(computeLiveInset(finalized));
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    if (gesture && gesture.pointerId === e.pointerId) {
      releaseGesturePointer(gesture.pointerId);
      setGesture(null);
    }
  };

  const handleLostPointerCapture = (e: React.PointerEvent<HTMLElement>) => {
    if (gesture && gesture.pointerId === e.pointerId) {
      setGesture(null);
    }
  };

  const stackVertically = () => {
    if (busy) return;
    let y = 0;
    const ordered = layers.map((layer, index) => {
      const next = { ...layer, x: 0, y, zIndex: index };
      y += layer.height;
      return next;
    });
    setCanvasWidth(Math.max(1, ...ordered.map((layer) => layer.width)));
    setCanvasHeight(Math.max(1, y));
    setLayers(ordered);
  };

  const previewPlan: WorkspaceLayoutPlan = {
      canvasWidth: displayCanvas.width,
      canvasHeight: displayCanvas.height,
      displayScale: scale,
      layers: layers.map(layer => gesture && (gesture.kind.type === "layer-move" || gesture.kind.type === "layer-resize") && gesture.kind.layerId === layer.id ? computeTransformedLayer(gesture) ?? layer : layer),
      backdropImageId:
        backdrop && fillKind === "image" ? backgroundId : undefined,
      backdrop: backdrop
        ? {
            inset: displayInset,
            cornerRadius,
            fill:
              fillKind === "linear-gradient"
                ? {
                    kind: "linear-gradient",
                    startColor: color,
                    endColor,
                    angleDeg: angle,
                  }
                : fillKind === "radial-gradient"
                  ? {
                      kind: "radial-gradient",
                      innerColor: color,
                      outerColor: endColor,
                    }
                  : { kind: "solid", color },
            shadow: shadow
              ? { blur: 16, offsetX: 0, offsetY: 8, color: "#000000" }
              : null,
          }
        : null,
    };

  const handleCompose = () => {
    if (busy) return;
    setError("");
    if (!Number.isFinite(scale) || scale <= 0 || scale > 8) {
      setError("Pixels per point must be greater than 0 and at most 8.");
      return;
    }
    if (
      backdrop &&
      fillKind === "image" &&
      !images.some((image) => image.id === backgroundId)
    ) {
      setError("Choose an available background image.");
      return;
    }
    onCompose(previewPlan);
  };

  const backdropImageDoc =
    backdrop && fillKind === "image"
      ? images.find((img) => img.id === backgroundId) ?? null
      : null;

  const computeBackdropPreviewBackground = (): string => {
    if (fillKind === "linear-gradient") {
      return `linear-gradient(${angle}deg, ${color}, ${endColor})`;
    }
    if (fillKind === "radial-gradient") {
      return `radial-gradient(circle, ${color}, ${endColor})`;
    }
    return color;
  };

  return (
    <section
      ref={surfaceRef}
      className="fershot-direct-transform"
      aria-label="Direct composition layout surface"
      aria-busy={busy}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          if (gesture) {
            releaseGesturePointer(gesture.pointerId);
            setGesture(null);
          } else {
            onCancel?.();
          }
        }
      }}
    >
      <EditorChrome><header className="fershot-direct-transform__header">
        <strong>Direct Composition &amp; Backdrop</strong>
        <span
          className="fershot-direct-transform__readout"
          data-testid="direct-layout-readout"
        >
          Canvas: {displayCanvas.width} × {displayCanvas.height} px
          {backdrop
            ? ` · Output: ${outputWidth} × ${outputHeight} px`
            : ""}{" "}
          ({layers.length} {layers.length === 1 ? "layer" : "layers"})
        </span>
        <Button icon={PanelsTopLeft} variant="secondary"
          type="button"
          disabled={busy || layers.length === 0 || gesture !== null}
          onClick={stackVertically}
        >
          Stack selected images vertically
        </Button>
        <Button icon={ImageDown} variant="secondary"
          type="button"
          disabled={busy || layers.length === 0 || gesture !== null}
          onClick={handleCompose}
        >
          Create composed image
        </Button>
        {onCancel && <Button icon={X} variant="secondary" type="button" disabled={busy} onClick={onCancel}>Cancel</Button>}
      </header></EditorChrome>

      <EditorChrome><fieldset aria-label="Source images (up to 32)" disabled={busy}>

        {images.map((image) => (
          <label key={image.id}>
            <Checkbox

              checked={layers.some((layer) => layer.id === image.id)}
              onChange={(event) => {
                if (!event.target.checked) {
                  setLayers((prev) =>
                    prev.filter((layer) => layer.id !== image.id),
                  );
                } else if (layers.length < 32) {
                  const newLayer: LayoutLayerPlan = {
                    id: image.id,
                    x: 0,
                    y: 0,
                    width: Math.min(image.width, canvasWidth),
                    height: Math.min(image.height, canvasHeight),
                    zIndex: layers.length,
                    opacity: 1,
                  };
                  setLayers((prev) => [...prev, newLayer]);
                  setActiveLayerId(image.id);
                }
              }}
            />
            {image.name}
          </label>
        ))}

        <label>
          Explicit pixels per point
          <Input
            type="number"
            aria-label="Explicit pixels per point"
            min={0.1}
            max={8}
            step={0.1}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
        </label>

        <label>
          <Switch

            checked={backdrop}
            onCheckedChange={checked => setBackdrop(checked)}
          />
          Add backdrop
        </label>

        {backdrop && (
          <div>
            <span data-testid="direct-layout-inset-readout">
              Backdrop inset: {displayInset} px
            </span>
            <Button icon={Blend} variant="secondary"
              type="button"
              aria-label="Drag backdrop inset handle"
              onPointerDown={(e) =>
                startGesture({ type: "backdrop-inset" }, e)
              }
            >
              Adjust backdrop inset
            </Button>
            <label>
              Corner radius
              <Input
                type="number"
                aria-label="Corner radius"
                min={0}
                max={256}
                value={cornerRadius}
                onChange={(e) =>
                  setCornerRadius(
                    Math.min(256, Math.max(0, Math.round(Number(e.target.value) || 0))),
                  )
                }
              />
            </label>
            <label>
              Backdrop fill
              <NativeSelect
                aria-label="Backdrop fill"
                value={fillKind}
                onChange={(e) => setFillKind(e.target.value)}
              >
                <option value="solid">Solid color</option>
                <option value="linear-gradient">Linear gradient</option>
                <option value="radial-gradient">Radial gradient</option>
                <option value="image">Session image</option>
              </NativeSelect>
            </label>
            <label>
              Backdrop color
              <Input
                type="text"
                aria-label="Backdrop color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            {(fillKind === "linear-gradient" ||
              fillKind === "radial-gradient") && (
              <label>
                Second backdrop color
                <Input
                  type="text"
                  aria-label="Second backdrop color"
                  value={endColor}
                  onChange={(e) => setEndColor(e.target.value)}
                />
              </label>
            )}
            {fillKind === "linear-gradient" && (
              <label>
                Gradient angle
                <Input
                  type="number"
                  aria-label="Gradient angle"
                  min={-360}
                  max={360}
                  value={angle}
                  onChange={(e) =>
                    setAngle(
                      Math.min(
                        360,
                        Math.max(-360, Math.round(Number(e.target.value) || 0)),
                      ),
                    )
                  }
                />
              </label>
            )}
            {fillKind === "image" && (
              <label>
                Backdrop image
                <NativeSelect
                  aria-label="Backdrop image"
                  value={backgroundId}
                  onChange={(e) => setBackgroundId(e.target.value)}
                >
                  {images.map((image) => (
                    <option key={image.id} value={image.id}>
                      {image.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            )}
            <label>
              <Switch

                checked={shadow}
                onCheckedChange={checked => setShadow(checked)}
              />
              Add shadow
            </label>
          </div>
        )}
      </fieldset></EditorChrome>


      {error && <p role="alert">{error}</p>}

      <div
        ref={stageRef}
        role="application"
        aria-label="Direct composition canvas"
        data-testid="direct-layout-stage"
        data-output-width={outputWidth}
        data-output-height={outputHeight}
        tabIndex={0}
        className="fershot-direct-transform__stage"
        style={{
          width: `${outputWidth * safeZoom}px`,
          height: `${outputHeight * safeZoom}px`,
        }}
        onLostPointerCapture={handleLostPointerCapture}
      >
        {konva?<KonvaComposition images={images} plan={previewPlan} zoom={safeZoom} busy={busy} prepareSource={prepareSource} onLayerChange={next=>{setActiveLayerId(next.id);setLayers(previous=>previous.map(layer=>layer.id===next.id?next:layer));}}/>:<>
        <DirectLayoutRasterPreview images={images} plan={previewPlan} prepareSource={prepareSource}/>
        {backdrop && (
          <div
            hidden
            data-testid="direct-layout-backdrop-preview"
            aria-label="Backdrop preview"
            data-fill-kind={fillKind}
            data-preview-fill={computeBackdropPreviewBackground()}
            data-backdrop-image-id={backdropImageDoc?.id ?? ""}
            data-output-width={outputWidth}
            data-output-height={outputHeight}
            data-draw-x={contentDrawX}
            data-draw-y={contentDrawY}
            style={{
              position: "absolute",
              left: "0px",
              top: "0px",
              width: `${outputWidth * safeZoom}px`,
              height: `${outputHeight * safeZoom}px`,
              backgroundColor:
                fillKind === "solid" || fillKind === "image" ? color : undefined,
              backgroundImage:
                fillKind === "linear-gradient" || fillKind === "radial-gradient"
                  ? computeBackdropPreviewBackground()
                  : undefined,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >

          </div>
        )}

        <div
          hidden
          data-testid="direct-layout-content-card"
          data-draw-x={contentDrawX}
          data-draw-y={contentDrawY}
          data-shadow={previewShadowCss}
          style={{
            position: "absolute",
            left: `${contentDrawX * safeZoom}px`,
            top: `${contentDrawY * safeZoom}px`,
            width: `${displayCanvas.width * safeZoom}px`,
            height: `${displayCanvas.height * safeZoom}px`,
            borderRadius: backdrop ? `${cornerRadius}px` : "0px",
            boxShadow: previewShadowCss,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {layers.map((layer) => {
          const isBeingDragged =
            gesture &&
            (gesture.kind.type === "layer-move" ||
              gesture.kind.type === "layer-resize") &&
            gesture.kind.layerId === layer.id;
          const displayLayer = isBeingDragged
            ? computeTransformedLayer(gesture) ?? layer
            : layer;
          const isSelectedLayer = activeLayerId === layer.id;
          const layerOutX = contentDrawX + displayLayer.x;
          const layerOutY = contentDrawY + displayLayer.y;

          return (
            <div
              key={layer.id}
              role="group"
              aria-label={`Composition layer ${layer.id}`}
              data-testid={`layout-layer-${layer.id}`}
              data-output-x={layerOutX}
              data-output-y={layerOutY}
              className="fershot-direct-transform__box"
              style={{
                left: `${layerOutX * safeZoom}px`,
                top: `${layerOutY * safeZoom}px`,
                width: `${displayLayer.width * safeZoom}px`,
                height: `${displayLayer.height * safeZoom}px`,
                zIndex: displayLayer.zIndex + 2,
                opacity: displayLayer.opacity,
                borderRadius: 0,
                background: "transparent",
                boxShadow: "none",
              }}
            >

              <div
                role="button"
                aria-label={`Move layer ${layer.id}`}
                className="fershot-direct-transform__body"
                onPointerDown={(e) =>
                  startGesture(
                    { type: "layer-move", layerId: layer.id },
                    e,
                    layer,
                  )
                }
              />
              {isSelectedLayer &&
                ALL_RESIZE_CORNER_HANDLES.map((handle) => (
                  <Button variant="plain"
                    key={handle}
                    type="button"
                    disabled={busy}
                    aria-label={`Resize layer ${layer.id} ${handle.toUpperCase()}`}
                    data-handle={handle}
                    className={`fershot-direct-transform__handle fershot-direct-transform__handle--${handle}`}
                    onPointerDown={(e) =>
                      startGesture(
                        {
                          type: "layer-resize",
                          layerId: layer.id,
                          handle,
                        },
                        e,
                        layer,
                      )
                    }
                  />
                ))}
            </div>
          );
        })}

        </>}
        <Button variant="plain"
          type="button"
          disabled={busy}
          aria-label="Resize composition canvas"
          className="fershot-direct-transform__handle fershot-direct-transform__handle--se"
          style={{ zIndex: 40 }}
          onPointerDown={(e) => startGesture({ type: "canvas-resize" }, e)}
        />
      </div>
    </section>
  );
}
