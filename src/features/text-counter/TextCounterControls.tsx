import { Type, ListOrdered, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import React, { useId } from "react";
import type {
  Annotation,
  AnnotationStyle,
  Point,
} from "../../contracts/editor";
import "./TextCounterControls.css";
import { Input } from "../../components/ui/input";

export const MAX_ANNOTATION_TEXT_LENGTH = 500;
export const MIN_ANNOTATION_STROKE_WIDTH = 1;
export const MAX_ANNOTATION_STROKE_WIDTH = 32;
export const MAX_COUNTER_ANNOTATION_VALUE = 9999;

export function clampAnchorPoint(
  point: Point,
  imageWidth: number,
  imageHeight: number,
): Point {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    throw new Error("Image dimensions must be finite positive numbers.");
  }
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("Anchor point coordinates must be finite numbers.");
  }
  return Object.freeze({
    x: Math.min(imageWidth, Math.max(0, point.x)),
    y: Math.min(imageHeight, Math.max(0, point.y)),
  });
}

export function validateCounterNumber(counter: number): number {
  if (
    !Number.isSafeInteger(counter) ||
    counter < 1 ||
    counter > MAX_COUNTER_ANNOTATION_VALUE
  ) {
    throw new Error(
      `Counter value must be an integer between 1 and ${MAX_COUNTER_ANNOTATION_VALUE}.`,
    );
  }
  return counter;
}

export function validateAnnotationText(text: string): string {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Annotation text must not be empty.");
  }
  if (text.length > MAX_ANNOTATION_TEXT_LENGTH) {
    throw new Error(
      `Annotation text exceeds maximum length of ${MAX_ANNOTATION_TEXT_LENGTH} characters.`,
    );
  }
  return text;
}

export function cloneFrozenStyle(style: AnnotationStyle): AnnotationStyle {
  const strokeWidth = Number.isFinite(style.strokeWidth)
    ? Math.min(
        MAX_ANNOTATION_STROKE_WIDTH,
        Math.max(MIN_ANNOTATION_STROKE_WIDTH, Math.round(style.strokeWidth)),
      )
    : 3;
  const opacity = Number.isFinite(style.opacity)
    ? Math.min(1, Math.max(0.1, style.opacity))
    : 1;
  return Object.freeze({
    color: style.color || "#ef4444",
    strokeWidth,
    opacity,
  });
}

export interface TextCounterControlsProps {
  readonly mode: "text" | "counter";
  readonly draftText: string;
  readonly nextCounterPreview: number;
  readonly anchorPoint: Point;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly style: AnnotationStyle;
  readonly annotations?: readonly Annotation[];
  readonly onModeChange: (mode: "text" | "counter") => void;
  readonly onDraftTextChange: (text: string) => void;
  readonly onStyleChange: (style: AnnotationStyle) => void;
  readonly onCommitAnnotation: (annotation: Annotation) => void;
  readonly onCancel: () => void;
}

export function TextCounterControls({
  mode,
  draftText,
  nextCounterPreview,
  anchorPoint,
  imageWidth,
  imageHeight,
  style,
  annotations = [],
  onModeChange,
  onDraftTextChange,
  onStyleChange,
  onCommitAnnotation,
  onCancel,
}: TextCounterControlsProps): React.JSX.Element {
  const textInputId = useId();
  const sizeInputId = useId();

  const isTextValid =
    draftText.trim().length > 0 &&
    draftText.length <= MAX_ANNOTATION_TEXT_LENGTH;
  const isCounterValid =
    Number.isSafeInteger(nextCounterPreview) &&
    nextCounterPreview >= 1 &&
    nextCounterPreview <= MAX_COUNTER_ANNOTATION_VALUE;

  const canCommit = mode === "text" ? isTextValid : isCounterValid;

  const handleCommit = () => {
    if (!canCommit) {
      return;
    }
    const clampedPt = clampAnchorPoint(anchorPoint, imageWidth, imageHeight);
    const frozenStyle = cloneFrozenStyle(style);

    if (mode === "text") {
      const validText = validateAnnotationText(draftText);
      onCommitAnnotation(
        Object.freeze({
          id: `text-${Date.now()}`,
          tool: "text",
          points: Object.freeze([clampedPt]),
          style: frozenStyle,
          text: validText,
        }),
      );
      return;
    }

    const validCounter = validateCounterNumber(nextCounterPreview);
    onCommitAnnotation(
      Object.freeze({
        id: `counter-${validCounter}`,
        tool: "counter",
        points: Object.freeze([clampedPt]),
        style: frozenStyle,
        counter: validCounter,
      }),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleCommit();
    }
  };

  const visibleItems = annotations.filter(
    (ann) => ann.tool === "text" || ann.tool === "counter",
  );

  return (
    <section
      className="fershot-text-counter"
      aria-label="Text and counter annotation controls"
      onKeyDown={handleKeyDown}
    >
      <div className="fershot-text-counter__toolbar">
        <div role="group" aria-label="Annotation mode">
          <Button icon={Type} variant="secondary"
            type="button"
            className="fershot-text-counter__btn"
            aria-pressed={mode === "text"}
            onClick={() => onModeChange("text")}
          >
            Text Tool
          </Button>
          <Button icon={ListOrdered} variant="secondary"
            type="button"
            className="fershot-text-counter__btn"
            aria-pressed={mode === "counter"}
            onClick={() => onModeChange("counter")}
          >
            Counter Tool
          </Button>
        </div>

        <div className="fershot-text-counter__field">
          <label htmlFor={sizeInputId}>Stroke/Size</label>
          <Input
            id={sizeInputId}
            type="number"
            aria-label="Stroke and font size scale"
            min={MIN_ANNOTATION_STROKE_WIDTH}
            max={MAX_ANNOTATION_STROKE_WIDTH}
            value={style.strokeWidth}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (!Number.isFinite(parsed)) {
                return;
              }
              onStyleChange(
                cloneFrozenStyle({
                  ...style,
                  strokeWidth: parsed,
                }),
              );
            }}
          />
        </div>
      </div>

      {mode === "text" ? (
        <div className="fershot-text-counter__editor">
          <label htmlFor={textInputId}>Annotation text</label>
          <Input
            id={textInputId}
            type="text"
            value={draftText}
            maxLength={MAX_ANNOTATION_TEXT_LENGTH}
            onChange={(event) =>
              onDraftTextChange(
                event.target.value.slice(0, MAX_ANNOTATION_TEXT_LENGTH),
              )
            }
          />
        </div>
      ) : (
        <div className="fershot-text-counter__counter-preview">
          <span>
            Next counter badge:{" "}
            <strong data-testid="counter-preview-badge">
              {isCounterValid ? `#${nextCounterPreview}` : "Invalid"}
            </strong>
          </span>
        </div>
      )}

      <div className="fershot-text-counter__actions">
        <Button icon={Type} variant="default"
          type="button"
          className="fershot-text-counter__btn fershot-text-counter__btn--primary"
          disabled={!canCommit}
          onClick={handleCommit}
        >
          {mode === "text" ? "Place Text" : "Place Counter"}
        </Button>
        <Button icon={X} variant="secondary"
          type="button"
          className="fershot-text-counter__btn"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>

      <ul
        className="fershot-text-counter__list"
        aria-label="Placed text and counter annotations"
      >
        {visibleItems.map((item) => (
          <li
            key={item.id}
            className="fershot-text-counter__item"
            data-testid={`placed-item-${item.id}`}
          >
            {item.tool === "counter"
              ? `#${item.counter ?? 1}`
              : (item.text ?? "")}
          </li>
        ))}
      </ul>
    </section>
  );
}

