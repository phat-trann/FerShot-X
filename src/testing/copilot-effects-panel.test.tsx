// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EffectsPanel } from "../features/effects-panel/EffectsPanel";

function change(label: string, value: string) { fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } }); }
function apply() { fireEvent.click(screen.getByRole("button", { name: "Apply effect" })); }

describe("pixel effect panel callback boundary", () => {
  it("emits explicit blur and mosaic parameters only after Apply", () => {
    const onApply = vi.fn(); render(<EffectsPanel imageWidth={300} imageHeight={200} busy={false} onApply={onApply} />);
    expect(onApply).not.toHaveBeenCalled();
    change("x", "10"); change("y", "20"); change("width", "40"); change("height", "30"); change("Radius", "64"); apply();
    expect(onApply).toHaveBeenLastCalledWith({ kind: "blur", rect: { x: 10, y: 20, width: 40, height: 30 }, radius: 64 });
    change("Effect", "mosaic"); change("Block size", "128"); apply();
    expect(onApply).toHaveBeenLastCalledWith({ kind: "mosaic", rect: { x: 10, y: 20, width: 40, height: 30 }, blockSize: 128 });
  });

  it("preserves RGBA cover parameters and emits parameter-free transparent erase", () => {
    const onApply = vi.fn(); render(<EffectsPanel imageWidth={200} imageHeight={200} busy={false} onApply={onApply} />);
    change("Effect", "solidCover"); change("Color", "#1234ab"); change("Alpha", "123"); apply();
    expect(onApply).toHaveBeenLastCalledWith({ kind: "solidCover", rect: { x: 0, y: 0, width: 100, height: 100 }, color: { r: 18, g: 52, b: 171, a: 123 } });
    change("Effect", "transparentErase"); apply();
    expect(onApply).toHaveBeenLastCalledWith({ kind: "transparentErase", rect: { x: 0, y: 0, width: 100, height: 100 } });
  });

  it("rejects outside regions and work-budget excess without a callback", () => {
    const onApply = vi.fn(); render(<EffectsPanel imageWidth={4096} imageHeight={4096} busy={false} onApply={onApply} />);
    change("x", "4090"); apply(); expect(screen.getByRole("alert")).toHaveTextContent("outside");
    change("x", "0"); change("width", "2049"); change("height", "2049"); apply();
    expect(screen.getByRole("alert")).toHaveTextContent("too large"); expect(onApply).not.toHaveBeenCalled();
  });

  it("rejects invalid radius and alpha while leaving valid state recoverable", () => {
    const onApply = vi.fn(); render(<EffectsPanel imageWidth={200} imageHeight={200} busy={false} onApply={onApply} />);
    change("Radius", "1.5"); apply(); expect(onApply).not.toHaveBeenCalled();
    change("Effect", "solidCover"); change("Alpha", "256"); apply(); expect(onApply).not.toHaveBeenCalled();
    change("Alpha", "255"); apply(); expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("busy state prevents Apply from emitting", () => {
    const onApply = vi.fn(); render(<EffectsPanel imageWidth={200} imageHeight={200} busy={true} onApply={onApply} />);
    expect(screen.getByRole("button", { name: "Apply effect" })).toBeDisabled(); apply(); expect(onApply).not.toHaveBeenCalled();
  });
});
