import React, { useId } from "react";
import {
  clampScrollMaxHeight,
  DEFAULT_SCROLL_MAX_HEIGHT,
  MAX_SCROLL_MAX_HEIGHT,
  MIN_SCROLL_MAX_HEIGHT,
} from "../scroll-panel/ScrollCapturePanel";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";

export type ScrollWorkspaceState =
  | "idle"
  | "capturing"
  | "stitching"
  | "completed"
  | "cancelled"
  | "error";

export interface ScrollWorkspaceConfig {
  readonly maxHeight: number;
  readonly reverseDirection: boolean;
}

export interface ScrollWorkspaceProps {
  readonly state: ScrollWorkspaceState;
  readonly config: ScrollWorkspaceConfig;
  readonly frameCount: number;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onConfigChange: (config: ScrollWorkspaceConfig) => void;
  readonly onStart: () => void;
  readonly onCaptureFrame: () => void;
  readonly onStop: () => void;
  readonly onCancel: () => void;
}

export function ScrollWorkspace({
  state,
  config,
  frameCount,
  busy,
  error,
  onConfigChange,
  onStart,
  onCaptureFrame,
  onStop,
  onCancel,
}: ScrollWorkspaceProps): React.JSX.Element {
  const maxHeightId = useId();
  const isRunning = busy || state === "capturing" || state === "stitching";
  const canStart = !isRunning;
  const canCapture = state === "capturing" && busy;
  const canStop = canCapture && frameCount > 0;
  const safeMaxHeight = clampScrollMaxHeight(
    Number.isFinite(config.maxHeight)
      ? config.maxHeight
      : DEFAULT_SCROLL_MAX_HEIGHT,
  );

  return (
    <section aria-label="Manual scrolling capture" aria-busy={isRunning}>
      <h2>Manual scrolling capture</h2>
      <p>
        Scroll the source yourself, then capture each frame explicitly before
        stitching.
      </p>
      <label htmlFor={maxHeightId}>Max output height (px)</label>
      <Input
        id={maxHeightId}
        type="number"
        min={MIN_SCROLL_MAX_HEIGHT}
        max={MAX_SCROLL_MAX_HEIGHT}
        step={100}
        value={safeMaxHeight}
        disabled={isRunning}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value)) {
            onConfigChange({
              maxHeight: clampScrollMaxHeight(value),
              reverseDirection: Boolean(config.reverseDirection),
            });
          }
        }}
      />
      <label>
        <Switch
          
          checked={Boolean(config.reverseDirection)}
          disabled={isRunning}
          onCheckedChange={checked => onConfigChange({
              maxHeight: safeMaxHeight,
              reverseDirection: checked,
            })}
        />
        Reverse direction
      </label>
      <div>
        <button type="button" onClick={onStart} disabled={!canStart}>
          Start frame collection
        </button>
        <button type="button" onClick={onCaptureFrame} disabled={!canCapture}>
          Capture next frame
        </button>
        <button type="button" onClick={onStop} disabled={!canStop}>
          Stop and stitch
        </button>
        <button type="button" onClick={onCancel} disabled={!isRunning}>
          Cancel
        </button>
      </div>
      <p>Frames: {frameCount}</p>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
