// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  PinPreviewCard,
  clampPinOpacity,
  clampPinScale,
} from "./PinPreviewCard";
import type { ImageDocument } from "../../contracts/media";

const SYNTHETIC_DOC: ImageDocument = {
  id: "pin-doc-1",
  name: "pinned-snippet.png",
  src: "blob:synthetic-pin-1",
  width: 400,
  height: 300,
  mimeType: "image/png",
  byteSize: 40960,
};

afterEach(() => {
  cleanup();
});

describe("PinPreviewCard", () => {
  it("clamps scale to [0.25, 2.0] and opacity to [0.2, 1.0]", () => {
    expect(clampPinScale(0.05)).toBe(0.25);
    expect(clampPinScale(5.0)).toBe(2.0);
    expect(clampPinScale(Number.NaN)).toBe(1.0);

    expect(clampPinOpacity(0.01)).toBe(0.2);
    expect(clampPinOpacity(3.5)).toBe(1.0);
    expect(clampPinOpacity(Number.NaN)).toBe(1.0);
  });

  it("renders scaled dimensions, opacity style, and triggers scale/opacity callbacks within bounds", () => {
    const onScaleChange = vi.fn<(nextScale: number) => void>();
    const onOpacityChange = vi.fn<(nextOpacity: number) => void>();

    render(
      <PinPreviewCard
        document={SYNTHETIC_DOC}
        scale={1.0}
        opacity={1.0}
        onScaleChange={onScaleChange}
        onOpacityChange={onOpacityChange}
        onEdit={vi.fn()}
        onCopy={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const img = screen.getByRole("img", { name: "pinned-snippet.png" });
    expect(img).toHaveAttribute("width", "400");
    expect(img).toHaveAttribute("height", "300");

    fireEvent.click(screen.getByRole("button", { name: "200%" }));
    expect(onScaleChange).toHaveBeenCalledExactlyOnceWith(2.0);

    const scaleInput = screen.getByLabelText(/pin scale percentage/i);
    fireEvent.change(scaleInput, { target: { value: "500" } });
    expect(onScaleChange).toHaveBeenLastCalledWith(2.0);

    fireEvent.change(scaleInput, { target: { value: "10" } });
    expect(onScaleChange).toHaveBeenLastCalledWith(0.25);

    const opacityInput = screen.getByLabelText(/pin opacity percentage/i);
    fireEvent.change(opacityInput, { target: { value: "5" } });
    expect(onOpacityChange).toHaveBeenLastCalledWith(0.2);

    fireEvent.click(screen.getByRole("button", { name: /semi-transparent/i }));
    expect(onOpacityChange).toHaveBeenLastCalledWith(0.5);
  });

  it("invokes onEdit, onCopy, and onClose callbacks with the document ID", () => {
    const onEdit = vi.fn<(id: string) => void>();
    const onCopy = vi.fn<(id: string) => void>();
    const onClose = vi.fn<(id: string) => void>();

    render(
      <PinPreviewCard
        document={SYNTHETIC_DOC}
        scale={0.5}
        opacity={0.5}
        onScaleChange={vi.fn()}
        onOpacityChange={vi.fn()}
        onEdit={onEdit}
        onCopy={onCopy}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByRole("region", { name: /pinned preview: pinned-snippet\.png/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit image/i }));
    fireEvent.click(screen.getByRole("button", { name: /copy image/i }));
    fireEvent.click(screen.getByRole("button", { name: /close pin/i }));

    expect(onEdit).toHaveBeenCalledExactlyOnceWith("pin-doc-1");
    expect(onCopy).toHaveBeenCalledExactlyOnceWith("pin-doc-1");
    expect(onClose).toHaveBeenCalledExactlyOnceWith("pin-doc-1");
  });
});

