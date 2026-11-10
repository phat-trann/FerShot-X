import React from "react";
import "./SourceRestoreControls.css";

export interface SourceRestoreControlsProps {
  currentName: string;
  sourceName: string | null;
  busy: boolean;
  canRestore: boolean;
  onRestore: () => void;
  className?: string;
}

export function SourceRestoreControls({
  currentName,
  sourceName,
  busy,
  canRestore,
  onRestore,
  className,
}: SourceRestoreControlsProps): React.JSX.Element {
  const isAvailable = Boolean(canRestore && sourceName && sourceName.trim().length > 0);
  const isButtonDisabled = busy || !isAvailable;

  const handleRestore = () => {
    if (isButtonDisabled) return;
    onRestore();
  };

  const containerClasses = [
    "fershot-source-restore-controls",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={containerClasses}
      aria-label="Source Image Restoration"
      aria-busy={busy}
    >
      <div className="fershot-source-restore-controls__header">
        <h3 className="fershot-source-restore-controls__title">
          Original Source Capture
        </h3>
        <span
          className={`fershot-source-restore-controls__badge ${
            isAvailable
              ? "fershot-source-restore-controls__badge--available"
              : "fershot-source-restore-controls__badge--unavailable"
          }`}
        >
          {isAvailable ? "Retained" : "Unavailable"}
        </span>
      </div>

      <div className="fershot-source-restore-controls__content">
        <div className="fershot-source-restore-controls__row">
          <span className="fershot-source-restore-controls__label">
            Current Document:
          </span>
          <span className="fershot-source-restore-controls__value" title={currentName}>
            {currentName || "Untitled Capture"}
          </span>
        </div>

        <div className="fershot-source-restore-controls__row">
          <span className="fershot-source-restore-controls__label">
            Source Origin:
          </span>
          <span
            className={`fershot-source-restore-controls__value ${
              !sourceName ? "fershot-source-restore-controls__value--muted" : ""
            }`}
            title={sourceName ?? "No source document retained"}
          >
            {sourceName ?? "Closed / Detached"}
          </span>
        </div>

        <p className="fershot-source-restore-controls__explanation">
          {isAvailable
            ? `Restoring switches back to the original unmodified capture (${sourceName}). Your derived annotations and edits on the current image remain preserved in the session.`
            : "The original source capture is closed, detached, or already at origin. No ancestral source is available to restore."}
        </p>
      </div>

      <div className="fershot-source-restore-controls__actions">
        <button
          type="button"
          className="fershot-source-restore-controls__button"
          disabled={isButtonDisabled}
          aria-disabled={isButtonDisabled}
          onClick={handleRestore}
        >
          Restore Original Source
        </button>
      </div>
    </section>
  );
}

