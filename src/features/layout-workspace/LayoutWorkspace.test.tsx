// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  LayoutWorkspace,
  planLayoutWorkspaceSummary,
  type LayoutWorkspaceLayer,
} from "./LayoutWorkspace";

describe("LayoutWorkspace (A36)", () => {
  it("computes planned PX/PT output dimensions with explicit displayScale, orders layers by zIndex, snaps layer edges, and rejects oversize budgets before export", () => {
    const dummyImg = {} as CanvasImageSource;
    const layers: readonly LayoutWorkspaceLayer[] = Object.freeze([
      Object.freeze({
        id: "top-layer",
        source: dummyImg,
        x: 5,
        y: 6,
        width: 80,
        height: 60,
        zIndex: 10,
      }),
      Object.freeze({
        id: "bottom-layer",
        source: dummyImg,
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        zIndex: 1,
      }),
    ]);

    const onSnapLayer = vi.fn();

    const { rerender } = render(
      <LayoutWorkspace
        canvasWidth={200}
        canvasHeight={120}
        displayScale={2}
        layers={layers}
        backdrop={{
          inset: 20,
          cornerRadius: 8,
          fill: { kind: "solid", color: "#1e293b" },
        }}
        onSnapLayer={onSnapLayer}
      />,
    );

    // 200x120 + inset 20*2 => 240x160 px => 120x80 pt at displayScale=2
    expect(screen.getByLabelText("Planned output size")).toHaveTextContent(
      "Output: 240 × 160 px (120 × 80 pt)",
    );
    expect(screen.getByLabelText("Ordered layers")).toHaveTextContent(
      "Z-Order: bottom-layer -> top-layer",
    );

    // Snapping top-layer at (5, 6) with height 60 against peer bottom-layer (height 80 at y=0, centerY=40):
    // x snaps to 0 (distance 5 <= 8), y center (6 + 30 = 36) snaps to peer centerY 40 -> y = 10 (distance 4 <= 8)
    fireEvent.click(
      screen.getByRole("button", { name: "Snap Primary Layer to Edges" }),
    );
    expect(onSnapLayer).toHaveBeenCalledWith("top-layer", { x: 0, y: 10 });

    // Oversize canvas rejected with alert and disabled export button
    rerender(
      <LayoutWorkspace
        canvasWidth={20000}
        canvasHeight={200}
        displayScale={2}
        layers={layers}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Invalid composition canvas dimensions/,
    );
    expect(
      screen.getByRole("button", { name: "Export Layout PNG" }),
    ).toBeDisabled();

    expect(() =>
      planLayoutWorkspaceSummary({
        canvasWidth: 200,
        canvasHeight: 120,
        displayScale: 0,
        layers,
      }),
    ).toThrow(/displayScale must be/);
  });
});
