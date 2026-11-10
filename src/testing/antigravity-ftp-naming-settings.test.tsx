// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ipcMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => true),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: ipcMocks.invoke,
  isTauri: ipcMocks.isTauri,
}));

import { WorkspaceFtpSettings } from "../Workspace.ftp";
import type { FtpSettings } from "../contracts/phase2";

describe("WorkspaceFtpSettings namingMode & save regressions (A213)", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver",class { observe(){} unobserve(){} disconnect(){} });
    ipcMocks.invoke.mockReset();
    ipcMocks.isTauri.mockReset();
    ipcMocks.isTauri.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("defaults old profiles without namingMode to random and persists timestamp/random changes with blank password as null", async () => {
    const legacyProfileWithoutNamingMode = {
      host: "ftp.example.invalid",
      port: 21,
      username: "legacy-account",
      remoteDir: "/captures",
          monthlyFolders: false,
      publicBaseUrl: "https://cdn.example.invalid",
      secure: true,
    } as unknown as FtpSettings;

    ipcMocks.invoke.mockImplementation(
      async (command: string, args?: Record<string, unknown>) => {
        if (command === "ftp_read_settings") {
          return legacyProfileWithoutNamingMode;
        }
        if (command === "ftp_save_settings") {
          return (args as { settings: FtpSettings }).settings;
        }
        return null;
      },
    );

    render(<WorkspaceFtpSettings />);

    const select = (await screen.findByLabelText("Upload filename")) as HTMLSelectElement;
    await waitFor(() => {
      expect(select.closest("fieldset")?.disabled).toBe(false);
    });

    // Old profile without namingMode defaults to "random"
    expect(select.value).toBe("random");
    expect(
      screen.getByText(/Allocates a unique screenshot filename, as before\./),
    ).toBeTruthy();

    // Switch to "timestamp" and save with blank password
    fireEvent.change(select, { target: { value: "timestamp" } });
    expect(select.value).toBe("timestamp");
    expect(
      screen.getByText(/Uses local snapshot time: day, hour, minute, second and a sequence digit\./),
    ).toBeTruthy();

    const form = select.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(ipcMocks.invoke).toHaveBeenCalledWith("ftp_save_settings", {
        settings: {
          host: "ftp.example.invalid",
          port: 21,
          username: "legacy-account",
          remoteDir: "/captures",
          monthlyFolders: false,
          publicBaseUrl: "https://cdn.example.invalid",
          secure: true,
          namingMode: "timestamp",
        },
        password: null,
      });
    });

    expect(screen.getByRole("status",{name:"FTP settings status"}).textContent).toContain(
      "FTP settings saved. Existing queued uploads keep their original destination.",
    );

    // Switch back to "random" and save again; blank password still remains null
    fireEvent.change(select, { target: { value: "random" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(ipcMocks.invoke).toHaveBeenLastCalledWith("ftp_save_settings", {
        settings: {
          host: "ftp.example.invalid",
          port: 21,
          username: "legacy-account",
          remoteDir: "/captures",
          monthlyFolders: false,
          publicBaseUrl: "https://cdn.example.invalid",
          secure: true,
          namingMode: "random",
        },
        password: null,
      });
    });
  });

  it("disables fieldset changes while save is pending and prevents duplicate submissions", async () => {
    const initialSettings: FtpSettings = {
      host: "ftp.example.invalid",
      port: 21,
      username: "tester",
      remoteDir: "/shots",
      publicBaseUrl: "https://cdn.example.invalid",
      secure: false,
      namingMode: "random",
    };

    let resolveSave!: (saved: FtpSettings) => void;
    ipcMocks.invoke.mockImplementation(
      (command: string, args?: Record<string, unknown>) => {
        if (command === "ftp_read_settings") {
          return Promise.resolve(initialSettings);
        }
        if (command === "ftp_save_settings") {
          return new Promise<FtpSettings>((resolve) => {
            resolveSave = () => resolve((args as { settings: FtpSettings }).settings);
          });
        }
        return Promise.resolve(null);
      },
    );

    render(<WorkspaceFtpSettings />);

    const select = (await screen.findByLabelText("Upload filename")) as HTMLSelectElement;
    const fieldset = select.closest("fieldset") as HTMLFieldSetElement;
    const form = select.closest("form") as HTMLFormElement;

    await waitFor(() => {
      expect(fieldset.disabled).toBe(false);
    });

    fireEvent.change(select, { target: { value: "timestamp" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fieldset.disabled).toBe(true);
    });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeTruthy();

    // Attempting a second submit while pending must be ignored
    fireEvent.submit(form);
    const saveCallsWhilePending = ipcMocks.invoke.mock.calls.filter(
      ([cmd]) => cmd === "ftp_save_settings",
    );
    expect(saveCallsWhilePending).toHaveLength(1);

    await act(async () => {
      resolveSave({ ...initialSettings, namingMode: "timestamp" });
    });

    await waitFor(() => {
      expect(fieldset.disabled).toBe(false);
    });
    expect(screen.getByRole("button", { name: "Save FTP settings" })).toBeTruthy();
    expect(select.value).toBe("timestamp");
  });

  it("preserves user namingMode selection on failed save and succeeds on subsequent retry", async () => {
    const initialSettings: FtpSettings = {
      host: "ftp.example.invalid",
      port: 21,
      username: "tester",
      remoteDir: "/shots",
      publicBaseUrl: "https://cdn.example.invalid",
      secure: true,
      namingMode: "random",
    };

    let failNextSave = true;
    ipcMocks.invoke.mockImplementation(
      async (command: string, args?: Record<string, unknown>) => {
        if (command === "ftp_read_settings") {
          return initialSettings;
        }
        if (command === "ftp_save_settings") {
          if (failNextSave) {
            failNextSave = false;
            throw { code: "ftp_failed", message: "Disk write temporarily unavailable." };
          }
          return (args as { settings: FtpSettings }).settings;
        }
        return null;
      },
    );

    render(<WorkspaceFtpSettings />);

    const select = (await screen.findByLabelText("Upload filename")) as HTMLSelectElement;
    const fieldset = select.closest("fieldset") as HTMLFieldSetElement;
    const form = select.closest("form") as HTMLFormElement;

    await waitFor(() => {
      expect(fieldset.disabled).toBe(false);
    });

    fireEvent.change(select, { target: { value: "timestamp" } });
    fireEvent.submit(form);

    // Failed save surfaces the error, re-enables the form, and preserves "timestamp" selection
    await waitFor(() => {
      expect(screen.getByRole("status",{name:"FTP settings status"}).textContent).toBe(
        "Disk write temporarily unavailable.",
      );
    });
    expect(fieldset.disabled).toBe(false);
    expect(select.value).toBe("timestamp");

    // Retry succeeds and persists the preserved "timestamp" selection with null password
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("status",{name:"FTP settings status"}).textContent).toContain(
        "FTP settings saved. Existing queued uploads keep their original destination.",
      );
    });
    expect(select.value).toBe("timestamp");

    const saveCalls = ipcMocks.invoke.mock.calls.filter(
      ([cmd]) => cmd === "ftp_save_settings",
    );
    expect(saveCalls).toHaveLength(2);
    expect(saveCalls[1][1]).toEqual({
      settings: {
        ...initialSettings,
        monthlyFolders: false,
        namingMode: "timestamp",
      },
      password: null,
    });
  });
});
