// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AutoAdjustPanel } from "../features/auto-adjust-panel/AutoAdjustPanel";
import { DEFAULT_AUTO_ADJUST_OPTIONS } from "../features/auto-adjust/auto-adjust";

describe("AutoAdjustPanel independent regressions", () => {
  it("does not apply during render and emits the exact valid options", () => {
    const onApply = vi.fn();
    render(
      <AutoAdjustPanel imageWidth={640} imageHeight={480} busy={false} onApply={onApply} />,
    );
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply adjustment" }));
    expect(onApply).toHaveBeenCalledWith({
      enabled: true,
      strength: DEFAULT_AUTO_ADJUST_OPTIONS.strength,
      lowPercentile: DEFAULT_AUTO_ADJUST_OPTIONS.lowPercentile,
      highPercentile: DEFAULT_AUTO_ADJUST_OPTIONS.highPercentile,
    });
  });

  it("rejects reversed percentile ranges without invoking the callback", () => {
    const onApply = vi.fn();
    render(
      <AutoAdjustPanel imageWidth={640} imageHeight={480} busy={false} onApply={onApply} />,
    );
    fireEvent.change(screen.getByLabelText("Low percentile"), {
      target: { value: "0.9" },
    });
    fireEvent.change(screen.getByLabelText("High percentile"), {
      target: { value: "0.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply adjustment" }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("percentiles are invalid");
  });

  it("rejects invalid strength values and dimensions", () => {
    const onApply = vi.fn();
    const { rerender } = render(
      <AutoAdjustPanel imageWidth={640} imageHeight={480} busy={false} onApply={onApply} />,
    );
    fireEvent.change(screen.getByLabelText("Strength"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply adjustment" }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("invalid");
    rerender(
      <AutoAdjustPanel imageWidth={0} imageHeight={480} busy={false} onApply={onApply} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply adjustment" }));
    expect(screen.getByRole("alert")).toHaveTextContent("dimensions exceed");
  });

  it("suppresses Apply while busy", () => {
    const onApply = vi.fn();
    render(
      <AutoAdjustPanel imageWidth={640} imageHeight={480} busy onApply={onApply} />,
    );
    const apply = screen.getByRole("button", { name: "Apply adjustment" });
    expect(apply).toBeDisabled();
    fireEvent.click(apply);
    expect(onApply).not.toHaveBeenCalled();
  });
});
