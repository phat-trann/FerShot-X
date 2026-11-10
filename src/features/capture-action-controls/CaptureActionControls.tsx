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
  repeatRegionSupported?: boolean;
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
    label: "Capture Fullscreen",
    description: "Capture entire primary display",
    isSupported: () => true,
  },
  {
    id: "area",
    label: "Capture Area",
    description: "Select a custom rectangular region",
    isSupported: () => true,
  },
  {
    id: "window",
    label: "Capture Window",
    description: "Select an open application window",
    isSupported: () => true,
  },
  {
    id: "active-window",
    label: "Capture Active Window",
    description: "Capture the currently focused window",
    isSupported: (props) => props.activeWindowSupported,
  },
  {
    id: "repeat-region",
    label: "Repeat Region",
    description: "Re-capture the last selected region",
    isSupported: (props) => props.repeatRegionSupported ?? false,
  },
  {
    id: "scrolling",
    label: "Capture Scrolling Area",
    description: "Capture long scrollable content",
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
    "fershot-capture-action-controls",
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
        className="fershot-capture-action-controls__grid"
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
              className="fershot-capture-action-controls__button"
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
              <span className="fershot-capture-action-controls__label">
                {action.label}
              </span>
              <span className="fershot-capture-action-controls__desc">
                {action.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

