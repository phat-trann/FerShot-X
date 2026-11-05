// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  MAX_ANNOTATION_TEXT_LENGTH,
  TextCounterControls,
  validateAnnotationText,
  validateCounterNumber,
} from "./TextCounterControls";
import type { Annotation, AnnotationStyle } from "../../contracts/editor";

afterEach(() => {
  cleanup();
});

const BASE_STYLE: AnnotationStyle = Object.freeze({
  color: "#ef4444",
  strokeWidth: 4,
  opacity: 1,
});

describe("TextCounterControls (A17)", () => {
  it("renders literal text and counter annotations without HTML execution and emits frozen callback copies", () => {
    const onCommitAnnotation = vi.fn<(annotation: Annotation) => void>();
    const onStyleChange = vi.fn<(style: AnnotationStyle) => void>();

    const maliciousText = '<img src=x onerror="window.__tc_xss=1"><script>1</script>';
    const existing: readonly Annotation[] = Object.freeze([
      Object.freeze({
        id: "t-1",
        tool: "text",
        points: Object.freeze([Object.freeze({ x: 20, y: 30 })]),
        style: BASE_STYLE,
        text: maliciousText,
      }),
      Object.freeze({
        id: "c-1",
        tool: "counter",
        points: Object.freeze([Object.freeze({ x: 50, y: 60 })]),
        style: BASE_STYLE,
        counter: 3,
      }),
    ]);

    const { container } = render(
      <TextCounterControls
        mode="text"
        draftText="Release note v0.1"
        nextCounterPreview={4}
        anchorPoint={{ x: 500, y: -15 }}
        imageWidth={400}
        imageHeight={300}
        style={BASE_STYLE}
        annotations={existing}
        onModeChange={vi.fn()}
        onDraftTextChange={vi.fn()}
        onStyleChange={onStyleChange}
        onCommitAnnotation={onCommitAnnotation}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByTestId("placed-item-t-1").textContent).toBe(
      maliciousText,
    );
    expect(screen.getByTestId("placed-item-c-1").textContent).toBe("#3");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();

    // Clamp stroke width update
    fireEvent.change(screen.getByLabelText("Stroke and font size scale"), {
      target: { value: "99" },
    });
    expect(onStyleChange).toHaveBeenCalledWith({
      color: "#ef4444",
      strokeWidth: 32,
      opacity: 1,
    });

    // Place Text clamps anchorPoint to image bounds and freezes output
    fireEvent.click(screen.getByRole("button", { name: "Place Text" }));
    expect(onCommitAnnotation).toHaveBeenCalledTimes(1);
    const committed = onCommitAnnotation.mock.calls[0]?.[0];
    expect(committed?.tool).toBe("text");
    expect(committed?.text).toBe("Release note v0.1");
    expect(committed?.points).toEqual([{ x: 400, y: 0 }]);
    expect(Object.isFrozen(committed)).toBe(true);
  });

  it("validates counter bounds, text length limits, and keyboard Enter/Escape shortcuts", () => {
    const onCommitAnnotation = vi.fn<(annotation: Annotation) => void>();
    const onCancel = vi.fn();

    const { rerender } = render(
      <TextCounterControls
        mode="counter"
        draftText=""
        nextCounterPreview={7}
        anchorPoint={{ x: 100, y: 120 }}
        imageWidth={400}
        imageHeight={300}
        style={BASE_STYLE}
        onModeChange={vi.fn()}
        onDraftTextChange={vi.fn()}
        onStyleChange={vi.fn()}
        onCommitAnnotation={onCommitAnnotation}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByTestId("counter-preview-badge")).toHaveTextContent("#7");
    fireEvent.keyDown(
      screen.getByRole("region", {
        name: "Text and counter annotation controls",
      }),
      { key: "Enter" },
    );
    expect(onCommitAnnotation).toHaveBeenCalledTimes(1);
    expect(onCommitAnnotation.mock.calls[0]?.[0]?.counter).toBe(7);

    fireEvent.keyDown(
      screen.getByRole("region", {
        name: "Text and counter annotation controls",
      }),
      { key: "Escape" },
    );
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Invalid counter disables Place Counter
    rerender(
      <TextCounterControls
        mode="counter"
        draftText=""
        nextCounterPreview={0}
        anchorPoint={{ x: 100, y: 120 }}
        imageWidth={400}
        imageHeight={300}
        style={BASE_STYLE}
        onModeChange={vi.fn()}
        onDraftTextChange={vi.fn()}
        onStyleChange={vi.fn()}
        onCommitAnnotation={onCommitAnnotation}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Place Counter" }),
    ).toBeDisabled();

    expect(() => validateCounterNumber(0)).toThrow(/counter/i);
    expect(() => validateCounterNumber(10000)).toThrow(/counter/i);
    expect(() =>
      validateAnnotationText("x".repeat(MAX_ANNOTATION_TEXT_LENGTH + 1)),
    ).toThrow(/exceeds/i);
  });
});

