// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  LayoutWorkspace,
  type LayoutWorkspaceLayer,
} from "../features/layout-workspace/LayoutWorkspace";

const source = {} as CanvasImageSource;
const layer: LayoutWorkspaceLayer = {
  id: "layer-1",
  source,
  x: 0,
  y: 0,
  width: 40,
  height: 20,
  zIndex: 1,
};

describe("LayoutWorkspace independent regressions", () => {
  it("reports invalid dimensions and keeps export disabled", () => {
    render(
      <LayoutWorkspace
        canvasWidth={0}
        canvasHeight={100}
        displayScale={1}
        layers={[layer]}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Invalid composition canvas dimensions/,
    );
    expect(screen.getByRole("button", { name: "Export Layout PNG" })).toBeDisabled();
  });

  it("recomputes planned output when the backdrop changes", () => {
    const { rerender } = render(
      <LayoutWorkspace
        canvasWidth={100}
        canvasHeight={60}
        displayScale={1}
        layers={[layer]}
      />,
    );
    expect(screen.getByLabelText("Planned output size")).toHaveTextContent(
      "Output: 100 × 60 px",
    );

    rerender(
      <LayoutWorkspace
        canvasWidth={100}
        canvasHeight={60}
        displayScale={1}
        layers={[layer]}
        backdrop={{
          inset: 10,
          cornerRadius: 4,
          fill: { kind: "solid", color: "#ffffff" },
        }}
      />,
    );
    expect(screen.getByLabelText("Planned output size")).toHaveTextContent(
      "Output: 120 × 80 px",
    );
  });

  it("switches measurement state between pixel and point modes", () => {
    render(
      <LayoutWorkspace
        canvasWidth={100}
        canvasHeight={50}
        displayScale={2}
        layers={[layer]}
      />,
    );

    expect(screen.getByLabelText("Pixel dimensions")).toBeInTheDocument();
    expect(screen.getByLabelText("Point dimensions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "PT" }));
    expect(screen.queryByLabelText("Pixel dimensions")).toBeNull();
    expect(screen.getByLabelText("Point dimensions")).toBeInTheDocument();
  });
});
