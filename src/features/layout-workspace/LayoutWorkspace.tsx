import React, { useState } from "react";
import type { Point } from "../../contracts/editor";
import {
  planBackdropLayout,
  renderBackdropToPngBlob,
  type BackdropFill,
  type BackdropShadowOptions,
} from "../backdrop";
import {
  DEFAULT_SNAP_THRESHOLD_PX,
  FERSHOT_EDGE_SNAPPING_RULE,
  renderCompositionToPngBlob,
  snapPlacementToEdges,
  sortLayersByZOrder,
  validateCompositionOptions,
  type PlacedImageLayer,
  type PlacementBox,
} from "../composition";
import {
  MeasurementOverlay,
  computeMeasurementReadout,
  type MeasurementReadout,
  type MeasurementUnitMode,
} from "../measurement-panel";
import {
  computeWindowAppearanceLayout,
  renderWindowAppearanceToCanvas,
  type ShadowTrimInsets,
  type WindowBackgroundAppearance,
} from "../window-appearance";
import "./LayoutWorkspace.css";

/**
 * Documented FerShot design choices vs. unresolved target reference application semantics (`A36`):
 * - Snapping: Uses `FERSHOT_EDGE_SNAPPING_RULE` (`A21`, nearest geometric edge/center within
 *   `thresholdPx`); reference application's internal similarity/auto-alignment heuristic is `UNKNOWN`.
 * - Window shadow trim: Uses explicit caller-supplied `ShadowTrimInsets` (`A26`); reference application's
 *   automatic shadow alpha threshold is `UNKNOWN`.
 * - Measurement text color / contrast adaptation: reference application's dynamic measurement label contrast
 *   rule is `UNKNOWN`; FerShot uses high-contrast overlay badges and explicit `displayScale`.
 */
export const LAYOUT_WORKSPACE_EVIDENCE_NOTES = Object.freeze({
  snappingRule: FERSHOT_EDGE_SNAPPING_RULE,
  referenceAutoAlignHeuristic: "UNKNOWN" as const,
  referenceAutoShadowTrimHeuristic: "UNKNOWN" as const,
  referenceMeasurementTextColorRule: "UNKNOWN" as const,
  retinaScaleInferenceForbidden: true,
});

export const LAYOUT_WORKSPACE_INTEGRATION_EXAMPLE = `
// Proposed Codex C11/C12 integration:
// <LayoutWorkspace
//   canvasWidth={800}
//   canvasHeight={600}
//   displayScale={explicitWindowScaleFactor}
//   layers={placedLayers}
//   backdrop={backdropConfig}
//   onExportPng={(blob, summary) => handleComposedPng(blob, summary)}
// />
`.trim();

export interface LayoutWorkspaceWindowTrimOption {
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly background: WindowBackgroundAppearance;
  readonly shadowTrim?: ShadowTrimInsets;
}

export interface LayoutWorkspaceLayer extends PlacedImageLayer {
  readonly windowAppearance?: LayoutWorkspaceWindowTrimOption;
}

export interface LayoutWorkspaceBackdropOption {
  readonly inset: number;
  readonly cornerRadius: number;
  readonly aspectRatio?: number | null;
  readonly fill: BackdropFill;
  readonly shadow?: BackdropShadowOptions | null;
}

export interface LayoutWorkspaceConfig {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly displayScale: number;
  readonly backgroundColor?: string | null;
  readonly layers: readonly LayoutWorkspaceLayer[];
  readonly backdrop?: LayoutWorkspaceBackdropOption | null;
}

export interface LayoutWorkspaceSummary {
  readonly composedWidthPx: number;
  readonly composedHeightPx: number;
  readonly outputWidthPx: number;
  readonly outputHeightPx: number;
  readonly outputMeasurement: MeasurementReadout;
  readonly orderedLayerIds: readonly string[];
}

export function planLayoutWorkspaceSummary(
  config: LayoutWorkspaceConfig,
): LayoutWorkspaceSummary {
  const {
    canvasWidth,
    canvasHeight,
    displayScale,
    backgroundColor,
    layers,
    backdrop,
  } = config;

  // Validate each layer's optional window-appearance trim first
  for (const layer of layers) {
    if (layer.windowAppearance) {
      computeWindowAppearanceLayout({
        windowSource: layer.source,
        windowWidth: layer.windowAppearance.sourceWidth,
        windowHeight: layer.windowAppearance.sourceHeight,
        background: layer.windowAppearance.background,
        shadowTrim: layer.windowAppearance.shadowTrim,
      });
    }
  }

  // Validate multi-image composition budget & bounds
  validateCompositionOptions({
    canvasWidth,
    canvasHeight,
    backgroundColor,
    layers,
  });

  let outputWidthPx = canvasWidth;
  let outputHeightPx = canvasHeight;

  if (backdrop) {
    const dummySource = {} as CanvasImageSource;
    const backdropPlan = planBackdropLayout({
      source: dummySource,
      sourceWidth: canvasWidth,
      sourceHeight: canvasHeight,
      inset: backdrop.inset,
      cornerRadius: backdrop.cornerRadius,
      aspectRatio: backdrop.aspectRatio,
      fill: backdrop.fill,
      shadow: backdrop.shadow,
    });
    outputWidthPx = backdropPlan.canvasWidth;
    outputHeightPx = backdropPlan.canvasHeight;
  }

  const outputMeasurement = computeMeasurementReadout(
    { x: 0, y: 0 },
    { x: outputWidthPx, y: outputHeightPx },
    outputWidthPx,
    outputHeightPx,
    displayScale,
  );

  const orderedLayerIds = Object.freeze(
    sortLayersByZOrder(layers).map((l) => l.id),
  );

  return Object.freeze({
    composedWidthPx: canvasWidth,
    composedHeightPx: canvasHeight,
    outputWidthPx,
    outputHeightPx,
    outputMeasurement,
    orderedLayerIds,
  });
}

export async function renderLayoutWorkspaceToPngBlob(
  config: LayoutWorkspaceConfig,
): Promise<{ readonly blob: Blob; readonly summary: LayoutWorkspaceSummary }> {
  const summary = planLayoutWorkspaceSummary(config);

  // 1. Apply optional window appearance / explicit shadow-trim per layer without mutating caller sources
  const preparedLayers: PlacedImageLayer[] = config.layers.map((layer) => {
    if (!layer.windowAppearance) {
      return layer;
    }
    const trimmedCanvas = renderWindowAppearanceToCanvas({
      windowSource: layer.source,
      windowWidth: layer.windowAppearance.sourceWidth,
      windowHeight: layer.windowAppearance.sourceHeight,
      background: layer.windowAppearance.background,
      shadowTrim: layer.windowAppearance.shadowTrim,
    });
    return Object.freeze({
      id: layer.id,
      source: trimmedCanvas,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      zIndex: layer.zIndex,
      opacity: layer.opacity,
    });
  });

  // 2. Render ordered multi-image composition (preserves transparency when backgroundColor is null/undefined)
  const composedBlob = await renderCompositionToPngBlob({
    canvasWidth: config.canvasWidth,
    canvasHeight: config.canvasHeight,
    backgroundColor: config.backgroundColor ?? null,
    layers: preparedLayers,
  });

  if (!config.backdrop) {
    return Object.freeze({
      blob: composedBlob,
      summary,
    });
  }

  // 3. Apply backdrop composition around the composed bitmap
  const composedBitmap = await createImageBitmap(composedBlob);
  const finalBlob = await renderBackdropToPngBlob({
    source: composedBitmap,
    sourceWidth: config.canvasWidth,
    sourceHeight: config.canvasHeight,
    inset: config.backdrop.inset,
    cornerRadius: config.backdrop.cornerRadius,
    aspectRatio: config.backdrop.aspectRatio,
    fill: config.backdrop.fill,
    shadow: config.backdrop.shadow,
  });

  return Object.freeze({
    blob: finalBlob,
    summary,
  });
}

export interface LayoutWorkspaceProps extends LayoutWorkspaceConfig {
  readonly snapThresholdPx?: number;
  readonly measurementStart?: Readonly<Point>;
  readonly measurementEnd?: Readonly<Point>;
  readonly onSnapLayer?: (
    layerId: string,
    snapped: { readonly x: number; readonly y: number },
  ) => void;
  readonly onExportPng?: (blob: Blob, summary: LayoutWorkspaceSummary) => void;
}

export const LayoutWorkspace: React.FC<LayoutWorkspaceProps> = ({
  canvasWidth,
  canvasHeight,
  displayScale,
  backgroundColor = null,
  layers,
  backdrop = null,
  snapThresholdPx = DEFAULT_SNAP_THRESHOLD_PX,
  measurementStart,
  measurementEnd,
  onSnapLayer,
  onExportPng,
}) => {
  const [unitMode, setUnitMode] = useState<MeasurementUnitMode>("both");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  let summary: LayoutWorkspaceSummary | null = null;
  let planError: string | null = null;

  try {
    summary = planLayoutWorkspaceSummary({
      canvasWidth,
      canvasHeight,
      displayScale,
      backgroundColor,
      layers,
      backdrop,
    });
  } catch (err) {
    planError = err instanceof Error ? err.message : "Invalid layout config.";
  }

  const activeError = planError ?? runtimeError;

  const handleSnapFirstLayer = () => {
    if (layers.length === 0 || !onSnapLayer) return;
    const [target, ...peers] = layers;
    const peerBoxes: PlacementBox[] = peers.map((p) => ({
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
    }));
    const snapped = snapPlacementToEdges(
      target,
      peerBoxes,
      canvasWidth,
      canvasHeight,
      snapThresholdPx,
    );
    onSnapLayer(target.id, Object.freeze({ x: snapped.x, y: snapped.y }));
  };

  return (
    <section
      className="fershot-layout-workspace"
      aria-label="Composed image layout workspace"
    >
      <header className="fershot-layout-workspace__header">
        <h3 className="fershot-layout-workspace__title">Layout Workspace</h3>
        {summary && (
          <div
            className="fershot-layout-workspace__dimensions"
            aria-label="Planned output size"
          >
            Output: {summary.outputMeasurement.formattedPx} (
            {summary.outputMeasurement.formattedPt})
          </div>
        )}
      </header>

      {activeError && (
        <div role="alert" className="fershot-layout-workspace__error">
          {activeError}
        </div>
      )}

      {summary && (
        <div
          className="fershot-layout-workspace__layers"
          aria-label="Ordered layers"
        >
          Z-Order: {summary.orderedLayerIds.join(" -> ")}
        </div>
      )}

      <div className="fershot-layout-workspace__actions">
        {onSnapLayer && layers.length > 0 && (
          <button type="button" onClick={handleSnapFirstLayer}>
            Snap Primary Layer to Edges
          </button>
        )}

        <button
          type="button"
          disabled={!summary}
          onClick={async () => {
            if (!summary) return;
            try {
              setRuntimeError(null);
              const res = await renderLayoutWorkspaceToPngBlob({
                canvasWidth,
                canvasHeight,
                displayScale,
                backgroundColor,
                layers,
                backdrop,
              });
              onExportPng?.(res.blob, res.summary);
            } catch (err) {
              setRuntimeError(
                err instanceof Error ? err.message : "Export failed.",
              );
            }
          }}
        >
          Export Layout PNG
        </button>
      </div>

      {summary && (
        <MeasurementOverlay
          startPoint={measurementStart ?? { x: 0, y: 0 }}
          endPoint={
            measurementEnd ?? {
              x: summary.outputWidthPx,
              y: summary.outputHeightPx,
            }
          }
          imageWidth={summary.outputWidthPx}
          imageHeight={summary.outputHeightPx}
          displayScale={displayScale}
          unitMode={unitMode}
          onUnitModeChange={setUnitMode}
        />
      )}
    </section>
  );
};

