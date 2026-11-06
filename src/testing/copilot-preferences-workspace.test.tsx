// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_APP_PREFERENCES,
  type FerbyPreferenceCapabilities,
} from "../features/app-preferences";
import {
  DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT,
  PreferencesWorkspace,
  applyGuardedPreferencePatch,
  fromRawPreferenceRecord,
  type PreferencesWorkspaceProps,
} from "../features/preferences-workspace/PreferencesWorkspace";

const limitedCapabilities: FerbyPreferenceCapabilities = Object.freeze({
  alwaysOnTopSupported: false,
  notificationsSupported: false,
  launchAtLoginSupported: false,
  menuBarSupported: false,
});

describe("PreferencesWorkspace independent regressions", () => {
  it("preserves capability-disabled values while applying supported changes", () => {
    const snapshot = fromRawPreferenceRecord({
      ...DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT,
      appPreferences: {
        ...DEFAULT_APP_PREFERENCES,
        launchAtLogin: true,
        defaultZoomPercent: 100,
      },
    });

    const next = applyGuardedPreferencePatch(
      snapshot,
      { ...snapshot.appPreferences, launchAtLogin: false, defaultZoomPercent: 175 },
      limitedCapabilities,
    );

    expect(next.appPreferences.launchAtLogin).toBe(true);
    expect(next.appPreferences.defaultZoomPercent).toBe(175);
  });

  it("emits the edited snapshot through the controlled save callback", async () => {
    const onSave = vi.fn<NonNullable<PreferencesWorkspaceProps["onSave"]>>();
    render(
      <PreferencesWorkspace
        initialSnapshot={DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT}
        capabilities={limitedCapabilities}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Default zoom (%)"), {
      target: { value: "180" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Preferences" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].appPreferences.defaultZoomPercent).toBe(180);
  });

  it("adopts a controlled external snapshot while the workspace is clean", () => {
    const external = fromRawPreferenceRecord({
      ...DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT,
      appPreferences: {
        ...DEFAULT_APP_PREFERENCES,
        defaultZoomPercent: 140,
      },
    });
    const { rerender } = render(
      <PreferencesWorkspace
        initialSnapshot={DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT}
        capabilities={limitedCapabilities}
      />,
    );

    rerender(
      <PreferencesWorkspace
        initialSnapshot={DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT}
        externalSnapshot={external}
        capabilities={limitedCapabilities}
      />,
    );
    expect(screen.getByLabelText("Default zoom (%)")).toHaveValue(140);
  });
});
