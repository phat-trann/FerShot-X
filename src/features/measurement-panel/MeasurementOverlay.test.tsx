// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MeasurementOverlay,
  computeMeasurementReadout,
} from "./MeasurementOverlay";

describe("MeasurementOverlay (A27)", () => {
  it("computes PX and PT readouts for 1x, 2x, and fractional display scales with reverse selection and source-pixel clamping", () => {
    const start = Object.freeze({ x: 350, y: 260 });
    const end = Object.freeze({ x: -20, y: 20 });

    // Clamped to 300x200 image -> start=(300,200), end=(0,20) => rect=(0,20,300,180)
    const readout1x = computeMeasurementReadout(start, end, 300, 200, 1);
    expect(readout1x.rectPx).toEqual({ x: 0, y: 20, width: 300, height: 180 });
    expect(readout1x.formattedPx).toBe("300 × 180 px");
    expect(readout1x.formattedPt).toBe("300 × 180 pt");

    const readout2x = computeMeasurementReadout(start, end, 300, 200, 2);
    expect(readout2x.widthPt).toBe(150);
    expect(readout2x.heightPt).toBe(90);
    expect(readout2x.formattedPt).toBe("150 × 90 pt");

    const readoutFractional = computeMeasurementReadout(
      { x: 0, y: 0 },
      { x: 150, y: 75 },
      300,
      200,
      1.5,
    );
    expect(readoutFractional.formattedPx).toBe("150 × 75 px");
    expect(readoutFractional.formattedPt).toBe("100 × 50 pt");
  });

  it("renders accessible PX/PT readouts, switches unit modes, invokes onImprint with a frozen copy, and guards invalid scale/bounds", () => {
    const onImprint = vi.fn();
    const onUnitModeChange = vi.fn();
    const onClear = vi.fn();

    const { rerender } = render(
      <MeasurementOverlay
        startPoint={{ x: 200, y: 120 }}
        endPoint={{ x: 40, y: 20 }}
        imageWidth={400}
        imageHeight={300}
        displayScale={2}
        unitMode="both"
        onUnitModeChange={onUnitModeChange}
        onImprint={onImprint}
        onClear={onClear}
      />,
    );

    expect(screen.getByLabelText("Pixel dimensions")).toHaveTextContent(
      "160 × 100 px",
    );
    expect(screen.getByLabelText("Point dimensions")).toHaveTextContent(
      "80 × 50 pt",
    );
    expect(screen.getByLabelText("Display scale")).toHaveTextContent("2x");

    fireEvent.click(screen.getByRole("button", { name: "PT" }));
    expect(onUnitModeChange).toHaveBeenCalledWith("pt");

    fireEvent.click(screen.getByRole("button", { name: "Imprint Dimensions" }));
    expect(onImprint).toHaveBeenCalledTimes(1);
    const imprinted = onImprint.mock.calls[0][0];
    expect(Object.isFrozen(imprinted)).toBe(true);
    expect(Object.isFrozen(imprinted.rectPx)).toBe(true);
    expect(imprinted.widthPx).toBe(160);
    expect(imprinted.widthPt).toBe(80);

    fireEvent.click(screen.getByRole("button", { name: "Clear Measurement" }));
    expect(onClear).toHaveBeenCalledTimes(1);

    // Invalid displayScale shows alert and disables Imprint
    rerender(
      <MeasurementOverlay
        startPoint={{ x: 200, y: 120 }}
        endPoint={{ x: 40, y: 20 }}
        imageWidth={400}
        imageHeight={300}
        displayScale={0}
        onImprint={onImprint}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/displayScale must be/);
    expect(
      screen.getByRole("button", { name: "Imprint Dimensions" }),
    ).toBeDisabled();
  });
});
