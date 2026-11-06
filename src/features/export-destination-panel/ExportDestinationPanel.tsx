import React from "react";
import "./ExportDestinationPanel.css";

export interface ExportDestinationPanelProps {
  folderLabel: string | null;
  defaultBasename: string;
  busy: boolean;
  onChooseFolder: () => void;
  onClearFolder: () => void;
  onBasenameChange: (value: string) => void;
  className?: string;
}

export function validateBasename(basename: string): string | null {
  const trimmed = basename.trim();
  if (basename.length === 0 || trimmed.length === 0) {
    return "Basename must contain at least 1 visible character";
  }
  if (basename.length > 80) {
    return "Basename must not exceed 80 characters";
  }
  if (basename.includes("/") || basename.includes("\\")) {
    return "Basename cannot contain slashes ('/' or '\\')";
  }
  if (/[\u0000-\u001f\u007f]/.test(basename)) {
    return "Basename cannot contain control characters";
  }
  if (trimmed === "." || trimmed === "..") {
    return "Basename cannot be '.' or '..'";
  }
  return null;
}

export function ExportDestinationPanel({
  folderLabel,
  defaultBasename,
  busy,
  onChooseFolder,
  onClearFolder,
  onBasenameChange,
  className,
}: ExportDestinationPanelProps): React.JSX.Element {
  const error = validateBasename(defaultBasename);
  const hasCustomFolder = Boolean(folderLabel && folderLabel.trim().length > 0);

  const containerClasses = [
    "ferby-export-destination-panel",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleChoose = () => {
    if (busy) return;
    onChooseFolder();
  };

  const handleClear = () => {
    if (busy || !hasCustomFolder) return;
    onClearFolder();
  };

  return (
    <section
      className={containerClasses}
      aria-label="Export Destination"
      aria-busy={busy}
    >
      <div className="ferby-export-destination-panel__field">
        <label
          htmlFor="ferby-export-destination-basename"
          className="ferby-export-destination-panel__label"
        >
          Default File Name
        </label>
        <input
          id="ferby-export-destination-basename"
          type="text"
          className={`ferby-export-destination-panel__input ${
            error ? "ferby-export-destination-panel__input--invalid" : ""
          }`}
          value={defaultBasename}
          disabled={busy}
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-errormessage={
            error ? "ferby-export-destination-basename-error" : undefined
          }
          onChange={(event) => onBasenameChange(event.target.value)}
        />
        {error ? (
          <span
            id="ferby-export-destination-basename-error"
            className="ferby-export-destination-panel__error"
            role="alert"
          >
            {error}
          </span>
        ) : null}
      </div>

      <div className="ferby-export-destination-panel__field">
        <span className="ferby-export-destination-panel__label">
          Destination Folder
        </span>
        <div className="ferby-export-destination-panel__folder-row">
          <span
            className="ferby-export-destination-panel__folder-display"
            title={folderLabel ?? "Ask for a destination on save"}
          >
            {hasCustomFolder ? folderLabel : "Ask for a destination on save"}
          </span>
          <div className="ferby-export-destination-panel__folder-actions">
            <button
              type="button"
              className="ferby-export-destination-panel__button"
              disabled={busy}
              onClick={handleChoose}
            >
              Choose Folder…
            </button>
            <button
              type="button"
              className="ferby-export-destination-panel__button ferby-export-destination-panel__button--secondary"
              disabled={busy || !hasCustomFolder}
              onClick={handleClear}
            >
              Reset Folder
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

