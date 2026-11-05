import React, { useRef } from "react";
import type { CaptureMode, CapturePanelProps } from "../../contracts/media";
import "./CapturePanel.css";

interface CaptureOption {
  readonly mode: CaptureMode;
  readonly label: string;
  readonly description: string;
}

const CAPTURE_OPTIONS: readonly CaptureOption[] = [
  {
    mode: "fullscreen",
    label: "Capture Fullscreen",
    description: "Entire active display",
  },
  {
    mode: "area",
    label: "Capture Area",
    description: "Select a rectangular region",
  },
  {
    mode: "window",
    label: "Capture Window",
    description: "Single application window",
  },
];

export function CapturePanel({ onCapture, busy, error }: CapturePanelProps): React.JSX.Element {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const trimmedError = error?.trim();

  const handleTrigger = (mode: CaptureMode) => {
    if (busy) {
      return;
    }
    onCapture(mode);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + delta + CAPTURE_OPTIONS.length) % CAPTURE_OPTIONS.length;
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      className="ferby-capture-panel"
      aria-label="Screen Capture"
      aria-busy={busy}
    >
      <div className="ferby-capture-panel__header">
        <h2 className="ferby-capture-panel__title">Capture</h2>
        {busy && (
          <span className="ferby-capture-panel__status" role="status" aria-live="polite">
            Capturing in progress…
          </span>
        )}
      </div>

      <div className="ferby-capture-panel__actions" role="group" aria-label="Capture Modes">
        {CAPTURE_OPTIONS.map((option, index) => (
          <button
            key={option.mode}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            className="ferby-capture-panel__button"
            disabled={busy}
            onClick={() => handleTrigger(option.mode)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span>{option.label}</span>
            <span className="ferby-capture-panel__button-desc">{option.description}</span>
          </button>
        ))}
      </div>

      {trimmedError ? (
        <p className="ferby-capture-panel__error" role="alert">
          {trimmedError}
        </p>
      ) : null}
    </section>
  );
}

