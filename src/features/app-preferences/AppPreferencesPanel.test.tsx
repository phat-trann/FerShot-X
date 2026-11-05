// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AppPreferencesPanel,
  DEFAULT_APP_PREFERENCES,
  type FerbyPreferenceCapabilities,
} from "./AppPreferencesPanel";

describe("AppPreferencesPanel (A28)", () => {
  it("gates unsupported backend options via capability props and emits immutable clamped updates without mutating inputs", () => {
    const onChange = vi.fn();
    const initial = Object.freeze({ ...DEFAULT_APP_PREFERENCES });
    const capabilities: FerbyPreferenceCapabilities = Object.freeze({
      alwaysOnTopSupported: true,
      notificationsSupported: false,
      launchAtLoginSupported: false,
      menuBarSupported: true,
    });

    render(
      <AppPreferencesPanel
        value={initial}
        capabilities={capabilities}
        onChange={onChange}
      />,
    );

    const alwaysOnTopCheckbox = screen.getByLabelText(
      /Keep editor window on top/i,
    );
    const notificationsCheckbox = screen.getByLabelText(
      /Show capture notifications/i,
    );
    const launchAtLoginCheckbox = screen.getByLabelText(
      /Launch Ferby at login/i,
    );
    const menuBarCheckbox = screen.getByLabelText(
      /Show Ferby icon in menu bar/i,
    );

    expect(alwaysOnTopCheckbox).not.toBeDisabled();
    expect(notificationsCheckbox).toBeDisabled();
    expect(launchAtLoginCheckbox).toBeDisabled();
    expect(menuBarCheckbox).not.toBeDisabled();

    // Toggling enabled option emits frozen copy
    fireEvent.click(alwaysOnTopCheckbox);
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0];
    expect(updated.keepEditorAlwaysOnTop).toBe(true);
    expect(Object.isFrozen(updated)).toBe(true);
    expect(Object.isFrozen(updated.baseSettings)).toBe(true);
    expect(initial.keepEditorAlwaysOnTop).toBe(false);

    // Default zoom clamps to [25, 400]
    const zoomInput = screen.getByLabelText("Default zoom (%)");
    fireEvent.change(zoomInput, { target: { value: "999" } });
    expect(onChange.mock.calls[1][0].defaultZoomPercent).toBe(400);

    fireEvent.change(zoomInput, { target: { value: "5" } });
    expect(onChange.mock.calls[2][0].defaultZoomPercent).toBe(25);

    // Changing post-capture behavior
    fireEvent.change(screen.getByLabelText("After capture"), {
      target: { value: "copy-only" },
    });
    expect(onChange.mock.calls[3][0].postCaptureBehavior).toBe("copy-only");
  });
});

