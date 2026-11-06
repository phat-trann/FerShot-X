import React, { useState } from "react";
import type { ImageDocument } from "../../contracts/media";
import "./LocalOutputWorkspace.css";
import {
  LocalOutputPanel,
  type LocalDragImagePayload,
  type PrintOrientation,
  type PrintPaperPreset,
  type PrintScaleMode,
  type PrintSheetOptions,
} from "../local-output";

export interface LocalOutputWorkspaceProps {
  readonly image: ImageDocument;
  readonly busy: boolean;
  readonly canPrint: boolean;
  readonly canDrag: boolean;
  readonly onCopy: () => void;
  readonly onSave: () => void;
  readonly onPrint: (options: PrintSheetOptions) => void;
  readonly onDrag: (payload: LocalDragImagePayload) => void;
  readonly nativeDragControls?: React.ReactNode;
}

export function LocalOutputWorkspace({
  image,
  busy,
  canPrint,
  canDrag,
  onCopy,
  onSave,
  onPrint,
  onDrag,
  nativeDragControls,
}: LocalOutputWorkspaceProps): React.JSX.Element {
  const [paper, setPaper] = useState<PrintPaperPreset>("a4");
  const [orientation, setOrientation] =
    useState<PrintOrientation>("portrait");
  const [marginPt, setMarginPt] = useState(36);
  const [scaleMode, setScaleMode] = useState<PrintScaleMode>("fit");

  const printOptions: PrintSheetOptions = {
    imageWidth: image.width,
    imageHeight: image.height,
    paper,
    orientation,
    marginPt,
    scaleMode,
  };

  return (
    <section
      className="ferby-local-output-workspace"
      aria-label="Local output workspace"
    >
      <div className="ferby-local-output-workspace__actions">
        <button type="button" disabled={busy} onClick={onCopy}>
          Copy Image
        </button>
        <button type="button" disabled={busy} onClick={onSave}>
          Save Image
        </button>
      </div>
      <label>
        Print scale
        <select
          aria-label="Print scale"
          value={scaleMode}
          disabled={busy || !canPrint}
          onChange={(event) => {
            if (busy || !canPrint) return;
            const next = event.target.value;
            if (next === "fit" || next === "actual") setScaleMode(next);
          }}
        >
          <option value="fit">Fit to sheet</option>
          <option value="actual">Actual size (fit oversized image)</option>
        </select>
      </label>
      <LocalOutputPanel
        document={image}
        paper={paper}
        orientation={orientation}
        marginPt={marginPt}
        scaleMode={scaleMode}
        busy={busy || (!canPrint && !canDrag)}
        onOptionsChange={(next) => {
          setPaper(next.paper);
          setOrientation(next.orientation);
          setMarginPt(next.marginPt);
          setScaleMode(next.scaleMode);
        }}
        onRequestNativePrint={
          canPrint ? () => onPrint(printOptions) : undefined
        }
        onInitiateImageDrag={canDrag ? onDrag : undefined}
        nativeDragControls={nativeDragControls}
      />
      {!canPrint && (
        <p role="status">
          Native printing is unavailable in the current runtime.
        </p>
      )}
      {!canDrag && !nativeDragControls && (
        <p role="status">
          Drag-out is unavailable in the current runtime.
        </p>
      )}
    </section>
  );
}
