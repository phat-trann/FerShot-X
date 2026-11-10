import React, { useEffect, useRef, useState } from "react";
import type { ImageDocument } from "../../contracts/media";
import { clampPinScale } from "../pin/PinPreviewCard";
import "./CapturePreviewController.css";

export const DEFAULT_PREVIEW_AUTO_DISMISS_MS = 5000;

export type CapturePreviewCloseReason = "manual" | "timeout" | "escape";

export interface CapturePreviewControllerProps {
  readonly document: ImageDocument;
  readonly autoDismissMs?: number | null;
  readonly paused?: boolean;
  readonly scale?: number;
  readonly onEdit: (id: string) => void;
  readonly onCopy: (id: string) => void;
  readonly onSave: (id: string) => void;
  readonly onOcr?: (id: string) => void;
  readonly onPin: (id: string) => void;
  readonly onClose: (id: string, reason: CapturePreviewCloseReason) => void;
  readonly onCancelAutoDismiss?: (id: string) => void;
}

export function CapturePreviewController({
  document,
  autoDismissMs = DEFAULT_PREVIEW_AUTO_DISMISS_MS,
  paused = false,
  scale = 0.5,
  onEdit,
  onCopy,
  onSave,
  onOcr,
  onPin,
  onClose,
  onCancelAutoDismiss,
}: CapturePreviewControllerProps): React.JSX.Element {
  const [timerCancelled, setTimerCancelled] = useState(false);
  const completedForIdRef = useRef<string | null>(null);
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimer = () => {
    if (timerIdRef.current !== null) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  };

  useEffect(() => {
    setTimerCancelled(false);
    completedForIdRef.current = null;
  }, [document.id]);

  useEffect(() => {
    clearPendingTimer();
    if (
      timerCancelled ||
      paused ||
      autoDismissMs === null ||
      autoDismissMs === undefined ||
      !Number.isFinite(autoDismissMs) ||
      autoDismissMs <= 0
    ) {
      return undefined;
    }

    timerIdRef.current = setTimeout(() => {
      timerIdRef.current = null;
      if (completedForIdRef.current === document.id) {
        return;
      }
      completedForIdRef.current = document.id;
      onClose(document.id, "timeout");
    }, autoDismissMs);

    return () => {
      clearPendingTimer();
    };
  }, [autoDismissMs, document.id, onClose, paused, timerCancelled]);

  const runOnce = (action: () => void) => {
    if (completedForIdRef.current === document.id) {
      return;
    }
    completedForIdRef.current = document.id;
    clearPendingTimer();
    action();
  };

  const handleCancelTimer = () => {
    if (timerCancelled || completedForIdRef.current === document.id) {
      return;
    }
    clearPendingTimer();
    setTimerCancelled(true);
    onCancelAutoDismiss?.(document.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      runOnce(() => onClose(document.id, "escape"));
    }
  };

  const safeScale = clampPinScale(scale);
  const previewWidth = Math.max(1, Math.round(document.width * safeScale));
  const previewHeight = Math.max(1, Math.round(document.height * safeScale));

  return (
    <section
      className="fershot-capture-preview"
      role="dialog"
      aria-label={`Post-capture preview: ${document.name}`}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <header className="fershot-capture-preview__header">
        <span className="fershot-capture-preview__title">{document.name}</span>
        <span className="fershot-capture-preview__meta">
          {document.width}×{document.height} px
        </span>
      </header>

      <div className="fershot-capture-preview__body">
        <img
          className="fershot-capture-preview__img"
          src={document.src}
          alt={document.name}
          width={previewWidth}
          height={previewHeight}
        />
      </div>

      <footer
        className="fershot-capture-preview__actions"
        role="group"
        aria-label="Post-capture actions"
      >
        <button
          type="button"
          className="fershot-capture-preview__btn fershot-capture-preview__btn--primary"
          onClick={() => runOnce(() => onEdit(document.id))}
        >
          Edit
        </button>
        <button
          type="button"
          className="fershot-capture-preview__btn"
          onClick={() => runOnce(() => onCopy(document.id))}
        >
          Copy
        </button>
        <button
          type="button"
          className="fershot-capture-preview__btn"
          onClick={() => runOnce(() => onSave(document.id))}
        >
          Save
        </button>
        {onOcr && <button type="button" className="fershot-capture-preview__btn" onClick={() => runOnce(() => onOcr(document.id))}>OCR</button>}
        <button
          type="button"
          className="fershot-capture-preview__btn"
          onClick={() => runOnce(() => onPin(document.id))}
        >
          Pin
        </button>
        {!timerCancelled &&
          autoDismissMs !== null &&
          autoDismissMs > 0 &&
          !paused && (
            <button
              type="button"
              className="fershot-capture-preview__btn"
              onClick={handleCancelTimer}
            >
              Keep Open
            </button>
          )}
        <button
          type="button"
          className="fershot-capture-preview__btn"
          onClick={() => runOnce(() => onClose(document.id, "manual"))}
        >
          Close Preview
        </button>
      </footer>
    </section>
  );
}

