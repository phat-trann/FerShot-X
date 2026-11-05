import React, { useId } from "react";
import "./ScrollCapturePanel.css";

export const MIN_SCROLL_MAX_HEIGHT = 400;
export const MAX_SCROLL_MAX_HEIGHT = 32_768;
export const DEFAULT_SCROLL_MAX_HEIGHT = 8_192;

export type ScrollSpeedPreset = "slow" | "normal" | "fast";

export type ScrollCaptureState =
  | "idle"
  | "capturing"
  | "stitching"
  | "completed"
  | "cancelled"
  | "error";

export interface ScrollCaptureConfig {
  readonly maxHeight: number;
  readonly speed: ScrollSpeedPreset;
  readonly reverseDirection: boolean;
}

export interface ScrollCaptureProgress {
  readonly frameCount: number;
  readonly stitchedHeight: number;
}

export const SCROLL_CAPTURE_CONTRACT_PROPOSAL = Object.freeze({
  proposedCommands: Object.freeze([
    "start_scrolling_capture",
    "stop_scrolling_capture",
    "cancel_scrolling_capture",
  ] as const),
  rationale:
    "Codex C11 can bridge ScrollCapturePanel to ferby-scroll-core over main-window-only Tauri commands.",
});

export function clampScrollMaxHeight(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SCROLL_MAX_HEIGHT;
  }
  return Math.min(
    MAX_SCROLL_MAX_HEIGHT,
    Math.max(MIN_SCROLL_MAX_HEIGHT, Math.round(value)),
  );
}

export interface ScrollCapturePanelProps {
  readonly state: ScrollCaptureState;
  readonly config: ScrollCaptureConfig;
  readonly progress?: ScrollCaptureProgress;
  readonly error?: string | null;
  readonly onConfigChange: (next: ScrollCaptureConfig) => void;
  readonly onStart: (config: ScrollCaptureConfig) => void;
  readonly onStop: () => void;
  readonly onCancel: () => void;
}

export function ScrollCapturePanel({
  state,
  config,
  progress = { frameCount: 0, stitchedHeight: 0 },
  error,
  onConfigChange,
  onStart,
  onStop,
  onCancel,
}: ScrollCapturePanelProps): React.JSX.Element {
  const maxHeightId = useId();
  const speedId = useId();
  const reverseId = useId();

  const isBusy = state === "capturing" || state === "stitching";
  const canStart = !isBusy;
  const canStop = state === "capturing";
  const canCancel = isBusy;
  const safeMaxHeight = clampScrollMaxHeight(config.maxHeight);

  const emitConfig = (patch: Partial<ScrollCaptureConfig>) => {
    if (isBusy) {
      return;
    }
    onConfigChange(
      Object.freeze({
        maxHeight: clampScrollMaxHeight(patch.maxHeight ?? config.maxHeight),
        speed: patch.speed ?? config.speed,
        reverseDirection:
          patch.reverseDirection !== undefined
            ? Boolean(patch.reverseDirection)
            : Boolean(config.reverseDirection),
      }),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && canCancel) {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <section
      className="ferby-scroll-panel"
      aria-label="Scrolling capture controls"
      aria-busy={isBusy}
      onKeyDown={handleKeyDown}
    >
      <div className="ferby-scroll-panel__controls">
        <div className="ferby-scroll-panel__field">
          <label htmlFor={maxHeightId}>Max output height (px)</label>
          <input
            id={maxHeightId}
            type="number"
            min={MIN_SCROLL_MAX_HEIGHT}
            max={MAX_SCROLL_MAX_HEIGHT}
            step={100}
            value={safeMaxHeight}
            disabled={isBusy}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (!Number.isFinite(parsed)) {
                return;
              }
              emitConfig({ maxHeight: parsed });
            }}
          />
        </div>

        <div className="ferby-scroll-panel__field">
          <label htmlFor={speedId}>Scroll speed</label>
          <select
            id={speedId}
            value={config.speed}
            disabled={isBusy}
            onChange={(event) =>
              emitConfig({ speed: event.target.value as ScrollSpeedPreset })
            }
          >
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </div>

        <div className="ferby-scroll-panel__checkbox">
          <input
            id={reverseId}
            type="checkbox"
            checked={config.reverseDirection}
            disabled={isBusy}
            onChange={(event) =>
              emitConfig({ reverseDirection: event.target.checked })
            }
          />
          <label htmlFor={reverseId}>Reverse scroll (bottom-to-top)</label>
        </div>
      </div>

      <div className="ferby-scroll-panel__actions">
        <button
          type="button"
          className="ferby-scroll-panel__btn ferby-scroll-panel__btn--primary"
          disabled={!canStart}
          onClick={() => {
            if (!canStart) {
              return;
            }
            onStart(
              Object.freeze({
                maxHeight: safeMaxHeight,
                speed: config.speed,
                reverseDirection: Boolean(config.reverseDirection),
              }),
            );
          }}
        >
          Start Scrolling Capture
        </button>
        <button
          type="button"
          className="ferby-scroll-panel__btn"
          disabled={!canStop}
          onClick={() => {
            if (canStop) {
              onStop();
            }
          }}
        >
          Stop &amp; Stitch
        </button>
        <button
          type="button"
          className="ferby-scroll-panel__btn"
          disabled={!canCancel}
          onClick={() => {
            if (canCancel) {
              onCancel();
            }
          }}
        >
          Cancel Capture
        </button>
      </div>

      <p className="ferby-scroll-panel__status" role="status" aria-live="polite">
        State: <strong>{state}</strong> — {progress.frameCount} frames (
        {progress.stitchedHeight} / {safeMaxHeight} px)
      </p>

      {error && error.trim().length > 0 && (
        <p className="ferby-scroll-panel__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

