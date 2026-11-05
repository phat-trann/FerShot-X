// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SettingsPanel, clampJpegQuality } from "./SettingsPanel";
import { DEFAULT_SETTINGS, type AppSettings } from "../../contracts/settings";

afterEach(() => {
  cleanup();
});

describe("SettingsPanel", () => {
  it("hides JPEG quality when saveFormat is png and reveals it when saveFormat is jpeg", () => {
    const onChange = vi.fn<(next: AppSettings) => void>();
    const { rerender } = render(
      <SettingsPanel value={DEFAULT_SETTINGS} onChange={onChange} />,
    );

    expect(screen.queryByLabelText(/jpeg quality/i)).toBeNull();

    fireEvent.change(screen.getByLabelText(/save format/i), {
      target: { value: "jpeg" },
    });
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      ...DEFAULT_SETTINGS,
      saveFormat: "jpeg",
    });

    rerender(
      <SettingsPanel
        value={{ ...DEFAULT_SETTINGS, saveFormat: "jpeg" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText(/jpeg quality/i)).toHaveValue(90);
  });

  it("clamps JPEG quality to [1, 100] and emits immutable AppSettings objects", () => {
    const initial: Readonly<AppSettings> = Object.freeze({
      saveFormat: "jpeg",
      jpegQuality: 85,
      downscaleRetina: false,
      showPreview: true,
    });
    const onChange = vi.fn<(next: AppSettings) => void>();

    render(<SettingsPanel value={initial} onChange={onChange} />);

    const qualityInput = screen.getByLabelText(/jpeg quality/i);

    fireEvent.change(qualityInput, { target: { value: "150" } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...initial,
      jpegQuality: 100,
    });

    fireEvent.change(qualityInput, { target: { value: "-10" } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...initial,
      jpegQuality: 1,
    });

    expect(initial.jpegQuality).toBe(85);
    expect(clampJpegQuality(Number.NaN)).toBe(DEFAULT_SETTINGS.jpegQuality);
  });

  it("updates downscaleRetina, showPreview, and resets to DEFAULT_SETTINGS", () => {
    const current: Readonly<AppSettings> = {
      saveFormat: "jpeg",
      jpegQuality: 72,
      downscaleRetina: true,
      showPreview: false,
    };
    const onChange = vi.fn<(next: AppSettings) => void>();

    render(<SettingsPanel value={current} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText(/downscale retina captures to 1x/i));
    expect(onChange).toHaveBeenLastCalledWith({
      ...current,
      downscaleRetina: false,
    });

    fireEvent.click(
      screen.getByLabelText(/show floating preview after capture/i),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      ...current,
      showPreview: true,
    });

    fireEvent.click(screen.getByRole("button", { name: /reset to defaults/i }));
    const resetArg = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(resetArg).toEqual(DEFAULT_SETTINGS);
    expect(resetArg).not.toBe(DEFAULT_SETTINGS);
  });
});
