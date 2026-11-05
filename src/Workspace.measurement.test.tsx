// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MeasurementTools } from "./Workspace.measurement";
import type { MeasurementReadout, MeasurementUnitMode } from "./features/measurement-panel";

const image = { id: "probe", name: "probe.png", src: "blob:probe", width: 400, height: 300, mimeType: "image/png", byteSize: 100 };
describe("C12 workspace measurement integration", () => {
  it("uses explicit scale and forwards a normalized immutable selection for imprint", () => {
    const onImprint = vi.fn<(readout: MeasurementReadout, unit: MeasurementUnitMode) => void>();
    render(<MeasurementTools image={image} busy={false} onImprint={onImprint} />);
    fireEvent.change(screen.getByLabelText("Measurement x1"), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText("Measurement y1"), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText("Measurement x2"), { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("Measurement y2"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Measurement pixels per point"), { target: { value: "2" } });
    expect(screen.getByLabelText("Pixel dimensions")).toHaveTextContent("160 × 100 px");
    expect(screen.getByLabelText("Point dimensions")).toHaveTextContent("80 × 50 pt");
    fireEvent.click(screen.getByRole("button", { name: "PT" }));
    fireEvent.click(screen.getByRole("button", { name: "Imprint Dimensions" }));
    expect(onImprint).toHaveBeenCalledTimes(1);
    const [readout, unit] = onImprint.mock.calls[0];
    expect(readout.rectPx).toEqual({ x: 40, y: 20, width: 160, height: 100 });
    expect(Object.isFrozen(readout.rectPx)).toBe(true);
    expect(unit).toBe("pt");
  });

  it("guards blank/invalid scale and empty selection, and honors busy state", () => {
    const onImprint = vi.fn();
    const view = render(<MeasurementTools image={image} busy={false} onImprint={onImprint} />);
    fireEvent.change(screen.getByLabelText("Measurement pixels per point"), { target: { value: "" } });
    expect(screen.getByRole("alert")).toHaveTextContent("displayScale");
    expect(screen.getByRole("button", { name: "Imprint Dimensions" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Measurement pixels per point"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear Measurement" }));
    expect(screen.getByLabelText("Pixel dimensions")).toHaveTextContent("0 × 0 px");
    expect(screen.getByRole("button", { name: "Imprint Dimensions" })).toBeDisabled();
    view.rerender(<MeasurementTools image={image} busy={true} onImprint={onImprint} />);
    expect(screen.getByLabelText("Measurement pixels per point")).toBeDisabled();
    expect(onImprint).not.toHaveBeenCalled();
  });
});
