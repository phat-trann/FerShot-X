import { FolderOpen, RotateCcw } from "lucide-react";
import { ToolHint } from "../../components/ui/tool-hint";
import { Button } from "../../components/ui/button";
import React from "react";
import "./ExportDestinationPanel.css";
import { Input } from "../../components/ui/input";

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
    "fershot-export-destination-panel",
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
      <div className="fershot-export-destination-panel__field">
        <label
          htmlFor="fershot-export-destination-basename"
          className="fershot-export-destination-panel__label"
        >
          Default File Name
        </label>
        <Input
          id="fershot-export-destination-basename"
          type="text"
          className={`fershot-export-destination-panel__input ${
            error ? "fershot-export-destination-panel__input--invalid" : ""
          }`}
          value={defaultBasename}
          disabled={busy}
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-errormessage={
            error ? "fershot-export-destination-basename-error" : undefined
          }
          onChange={(event) => onBasenameChange(event.target.value)}
        />
        {error ? (
          <span
            id="fershot-export-destination-basename-error"
            className="fershot-export-destination-panel__error"
            role="alert"
          >
            {error}
          </span>
        ) : null}
      </div>

      <div className="fershot-export-destination-panel__field">
        <span className="fershot-export-destination-panel__label">
          Destination Folder
        </span>
        <div className="fershot-export-destination-panel__folder-row">
          <Input className="fershot-export-destination-panel__folder-display" aria-label="Screenshots folder" readOnly title={folderLabel??"Ask for a destination on save"} value={hasCustomFolder?folderLabel!:"Ask each time"}/>
          <div className="fershot-export-destination-panel__folder-actions">
            <ToolHint label="Choose Folder"><Button icon={FolderOpen} variant="secondary" size="icon"
              type="button"
              disabled={busy}
              onClick={handleChoose}
              aria-label="Choose Folder…"
            /></ToolHint>
            <ToolHint label="Reset Folder"><Button icon={RotateCcw} variant="secondary" size="icon"
              type="button"
              disabled={busy || !hasCustomFolder}
              onClick={handleClear}
              aria-label="Reset Folder"
            /></ToolHint>
          </div>
        </div>
      </div>
    </section>
  );
}

