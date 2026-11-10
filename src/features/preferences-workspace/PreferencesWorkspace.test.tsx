// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_APP_PREFERENCES,
  type FerShotPreferenceCapabilities,
} from "../app-preferences";
import {
  DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT,
  PreferencesWorkspace,
  applyGuardedPreferencePatch,
  fromRawPreferenceRecord,
  toRawPreferenceRecord,
  type PreferencesWorkspaceSnapshot,
} from "./PreferencesWorkspace";

describe("PreferencesWorkspace (A37)", () => {
  it("preserves unknown fields and capability-disabled values, suppresses duplicate saves, retains edits on failed save with retry, and resolves external reload conflicts", async () => {
    const rawLoaded = {
      ...DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT,
      appPreferences: {
        ...DEFAULT_APP_PREFERENCES,
        launchAtLogin: true, // Already true on disk even though capability is disabled
        showInMenuBar: true,
      },
      customExperimentalFlag: "preserve-me-123",
      nestedUnknownObject: Object.freeze({ version: 2 }),
    };

    const initialSnapshot = fromRawPreferenceRecord(rawLoaded);
    expect(initialSnapshot.unknownFields.customExperimentalFlag).toBe(
      "preserve-me-123",
    );

    const capabilities: FerShotPreferenceCapabilities = Object.freeze({
      alwaysOnTopSupported: true,
      notificationsSupported: true,
      launchAtLoginSupported: false,
      menuBarSupported: false,
    });

    // Direct adapter check: capability-disabled fields cannot be overwritten
    const guarded = applyGuardedPreferencePatch(
      initialSnapshot,
      {
        ...initialSnapshot.appPreferences,
        defaultZoomPercent: 150,
        launchAtLogin: false, // attempted mutation while unsupported
        showInMenuBar: false, // attempted mutation while unsupported
      },
      capabilities,
    );
    expect(guarded.appPreferences.defaultZoomPercent).toBe(150);
    expect(guarded.appPreferences.launchAtLogin).toBe(true);
    expect(guarded.appPreferences.showInMenuBar).toBe(true);
    expect(guarded.unknownFields.customExperimentalFlag).toBe(
      "preserve-me-123",
    );

    let resolveSave!: () => void;
    let rejectSave!: (err: Error) => void;
    let callCount = 0;

    const onSave = vi.fn(
      (_snapshot: Readonly<PreferencesWorkspaceSnapshot>) =>
        new Promise<void>((resolve, reject) => {
          callCount += 1;
          resolveSave = resolve;
          rejectSave = reject;
        }),
    );

    const { rerender } = render(
      <PreferencesWorkspace
        initialSnapshot={initialSnapshot}
        capabilities={capabilities}
        hotkeyPermissionState="missing"
        onSave={onSave}
      />,
    );

    // Explanations for unsupported capabilities and missing shortcut permission are shown
    expect(
      screen.getByLabelText("Capability explanations"),
    ).toHaveTextContent(/Launch at login is unsupported/);
    expect(
      screen.getByLabelText("Capability explanations"),
    ).toHaveTextContent(/Global shortcut OS permission is missing/);

    // Edit zoom to make workspace dirty
    const zoomInput = screen.getByLabelText("Default zoom (%)");
    fireEvent.change(zoomInput, { target: { value: "200" } });
    expect(screen.getByLabelText("Workspace dirty state")).toHaveTextContent(
      "Unsaved changes",
    );

    // Click Save twice rapidly -> duplicate submit suppressed
    const saveButton = screen.getByRole("button", {
      name: "Save Preferences",
    });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);
    expect(callCount).toBe(1);

    // Fail the first save -> edits retained, retry button offered
    rejectSave(new Error("Disk write locked"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Save failed: Disk write locked",
      );
    });
    expect(screen.getByLabelText("Default zoom (%)")).toHaveValue(200);
    expect(screen.getByLabelText("Workspace dirty state")).toHaveTextContent(
      "Unsaved changes",
    );

    // External reload arrives while local edits are dirty -> conflict banner shown
    const externalSnapshot = fromRawPreferenceRecord({
      ...rawLoaded,
      appPreferences: {
        ...rawLoaded.appPreferences,
        defaultZoomPercent: 125,
      },
    });
    rerender(
      <PreferencesWorkspace
        initialSnapshot={initialSnapshot}
        externalSnapshot={externalSnapshot}
        capabilities={capabilities}
        hotkeyPermissionState="missing"
        onSave={onSave}
      />,
    );

    expect(
      screen.getByText(
        /External preferences changed on disk while you have unsaved edits/,
      ),
    ).toBeInTheDocument();

    // Choose "Keep Local Edits" -> local zoom 200 stays, conflict clears
    fireEvent.click(screen.getByRole("button", { name: "Keep Local Edits" }));
    expect(screen.getByLabelText("Default zoom (%)")).toHaveValue(200);

    // Retry save and succeed -> unknown fields and disabled settings preserved in saved snapshot
    fireEvent.click(screen.getByRole("button", { name: "Retry Save" }));
    expect(callCount).toBe(2);
    resolveSave();

    await waitFor(() => {
      expect(screen.getByLabelText("Workspace dirty state")).toHaveTextContent(
        "Saved",
      );
    });

    const savedSnapshot = onSave.mock.calls[1][0];
    expect(savedSnapshot.appPreferences.defaultZoomPercent).toBe(200);
    expect(savedSnapshot.appPreferences.launchAtLogin).toBe(true);
    expect(savedSnapshot.unknownFields.customExperimentalFlag).toBe(
      "preserve-me-123",
    );
    const rawSaved = toRawPreferenceRecord(savedSnapshot);
    expect(rawSaved.customExperimentalFlag).toBe("preserve-me-123");
  });
});

