import React from "react";
import "./ArchivePanel.css";

export interface ArchivePanelProps {
  readonly imageCount: number;
  readonly busy: boolean;
  readonly status: string | null;
  readonly error: string | null;
  readonly onImport: () => void;
  readonly onExport: () => void;
  readonly onCancel: () => void;
}

export function ArchivePanel({
  imageCount,
  busy,
  status,
  error,
  onImport,
  onExport,
  onCancel,
}: ArchivePanelProps): React.ReactElement {
  return (
    <section
      aria-label="Local archive"
      data-testid="archive-panel"
      className="ferby-archive-panel"
    >
      <h2 className="ferby-archive-panel__header">Local archive</h2>
      <p className="ferby-archive-panel__hint">
        Import adds entries to the current library; it does not replace existing
        images.
      </p>
      <div className="ferby-archive-panel__actions">
        <button
          type="button"
          onClick={onImport}
          disabled={busy}
          className="ferby-archive-panel__btn"
        >
          Import archive
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={busy || imageCount === 0}
          className="ferby-archive-panel__btn"
        >
          Export archive
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={!busy}
          className="ferby-archive-panel__btn"
        >
          Cancel
        </button>
      </div>
      {status ? (
        <p role="status" className="ferby-archive-panel__status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="ferby-archive-panel__error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
