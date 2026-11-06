import React from "react";
import "./CaptureActionControls.css";

export type CaptureActionId =
  | "fullscreen"
  | "area"
  | "window"
  | "active-window"
  | "fixed-region"
  | "repeat-region"
  | "scrolling"
  | "ocr";

export interface CaptureActionControlsProps {
  disabled: boolean;
  activeWindowSupported: boolean;
  fixedRegionSupported: boolean;
  onAction: (action: CaptureActionId) => void;
  className?: string;
}

interface ActionDescriptor {
  readonly id: CaptureActionId;
  readonly label: string;
  readonly description: string;
  readonly isSupported: (props: CaptureActionControlsProps) => boolean;
}

const ACTIONS: readonly ActionDescriptor[] = [
  {
    id: "fullscreen",
    label: "Fullscreen",
    description: "Capture entire primary display",
    isSupported: () => true,
  },
  {
    id: "area",
    label: "Area",
    description: "Select a custom rectangular region",
    isSupported: () => true,
  },
  {
    id: "window",
    label: "Window",
    description: "Select an open application window",
    isSupported: () => true,
  },
  {
    id: "active-window",
    label: "Active Window",
    description: "Capture the currently focused window",
    isSupported: (props) => props.activeWindowSupported,
  },
  {
    id: "fixed-region",
    label: "Fixed Region",
    description: "Capture with fixed size or aspect ratio",
    isSupported: (props) => props.fixedRegionSupported,
  },
  {
    id: "repeat-region",
    label: "Repeat Region",
    description: "Re-capture the last selected region",
    isSupported: (props) => props.fixedRegionSupported,
  },
  {
    id: "scrolling",
    label: "Scrolling",
    description: "Capture long scrollable content",
    isSupported: () => true,
  },
  {
    id: "ocr",
    label: "OCR / Text",
    description: "Capture screen region for text and QR recognition",
    isSupported: () => true,
  },
];

export function CaptureActionControls(
  props: CaptureActionControlsProps,
): React.JSX.Element {
  const { disabled, onAction, className } = props;

  const handleClick = (action: CaptureActionId, isActionDisabled: boolean) => {
    if (disabled || isActionDisabled) {
      return;
    }
    onAction(action);
  };

  const containerClasses = [
    "ferby-capture-action-controls",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={containerClasses}
      aria-label="Capture Action Controls"
      aria-disabled={disabled}
    >
      <div
        className="ferby-capture-action-controls__grid"
        role="group"
        aria-label="Capture Actions"
      >
        {ACTIONS.map((action) => {
          const supported = action.isSupported(props);
          const isButtonDisabled = disabled || !supported;

          return (
            <button
              key={action.id}
              type="button"
              className="ferby-capture-action-controls__button"
              disabled={isButtonDisabled}
              data-action={action.id}
              data-supported={supported ? "true" : "false"}
              onClick={() => handleClick(action.id, isButtonDisabled)}
              title={
                !supported
                  ? `${action.label} (not supported on this display)`
                  : action.description
              }
            >
              <span className="ferby-capture-action-controls__label">
                {action.label}
              </span>
              <span className="ferby-capture-action-controls__desc">
                {action.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

