// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  ExportPanel,
  type ExportRequestPayload,
} from "./ExportPanel";
import { DEFAULT_SETTINGS, type AppSettings } from "../../contracts/settings";
import type { ImageDocument } from "../../contracts/media";

const SYNTHETIC_DOC: ImageDocument = {
  id: "doc-export-1",
  name: "architecture-overview.png",
  src: "blob:synthetic-export-1",
  width: 1440,
  height: 900,
  mimeType: "image/png",
  byteSize: 120000,
};

afterEach(() => {
  cleanup();
});

describe("ExportPanel", () => {
  it("emits immutable settings updates, shows JPEG quality only for JPEG, and clamps quality bounds", () => {
    const frozenSettings: Readonly<AppSettings> = Object.freeze({
      ...DEFAULT_SETTINGS,
      saveFormat: "png",
      jpegQuality: 85,
    });
    const onSettingsChange = vi.fn<(next: AppSettings) => void>();

    const { rerender } = render(
      <ExportPanel
        document={SYNTHETIC_DOC}
        settings={frozenSettings}
        busy={false}
        onSettingsChange={onSettingsChange}
        onExport={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText(/export jpeg quality/i)).toBeNull();
    expect(screen.queryByText(/upload/i)).toBeNull();
    expect(screen.queryByText(/license/i)).toBeNull();

    fireEvent.change(screen.getByLabelText(/export format/i), {
      target: { value: "jpeg" },
    });
    expect(onSettingsChange).toHaveBeenCalledExactlyOnceWith({
      ...frozenSettings,
      saveFormat: "jpeg",
    });

    const jpegSettings: Readonly<AppSettings> = Object.freeze({
      ...frozenSettings,
      saveFormat: "jpeg",
    });
    rerender(
      <ExportPanel
        document={SYNTHETIC_DOC}
        settings={jpegSettings}
        busy={false}
        onSettingsChange={onSettingsChange}
        onExport={vi.fn()}
      />,
    );

    const qualityInput = screen.getByLabelText(/export jpeg quality/i);
    fireEvent.change(qualityInput, { target: { value: "250" } });
    expect(onSettingsChange).toHaveBeenLastCalledWith({
      ...jpegSettings,
      jpegQuality: 100,
    });

    fireEvent.change(qualityInput, { target: { value: "-5" } });
    expect(onSettingsChange).toHaveBeenLastCalledWith({
      ...jpegSettings,
      jpegQuality: 1,
    });
  });

  it("submits export payload with derived/edited basename and blocks double submission while busy", () => {
    const onExport = vi.fn<(payload: ExportRequestPayload) => void>();

    const { rerender } = render(
      <ExportPanel
        document={SYNTHETIC_DOC}
        settings={{ ...DEFAULT_SETTINGS, saveFormat: "jpeg", jpegQuality: 82 }}
        busy={false}
        onSettingsChange={vi.fn()}
        onExport={onExport}
      />,
    );

    const filenameInput = screen.getByLabelText(/suggested filename/i);
    expect(filenameInput).toHaveValue("architecture-overview");

    fireEvent.change(filenameInput, { target: { value: "release-report" } });
    fireEvent.click(screen.getByRole("button", { name: /export jpeg/i }));

    expect(onExport).toHaveBeenCalledExactlyOnceWith({
      documentId: "doc-export-1",
      suggestedBasename: "release-report",
      format: "jpeg",
      jpegQuality: 82,
      downscaleRetina: false,
    });

    // Re-render in busy state: button is disabled and click does not fire onExport again
    rerender(
      <ExportPanel
        document={SYNTHETIC_DOC}
        settings={{ ...DEFAULT_SETTINGS, saveFormat: "jpeg", jpegQuality: 82 }}
        busy={true}
        onSettingsChange={vi.fn()}
        onExport={onExport}
      />,
    );

    const busyBtn = screen.getByRole("button", { name: /exporting/i });
    expect(busyBtn).toBeDisabled();
    fireEvent.click(busyBtn);
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(/exporting image/i);
  });

  it("announces cancelled, success, and error feedback with accessible status and alert roles", () => {
    const { rerender } = render(
      <ExportPanel
        document={SYNTHETIC_DOC}
        settings={DEFAULT_SETTINGS}
        busy={false}
        status="cancelled"
        statusMessage="User cancelled save dialog."
        onSettingsChange={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "User cancelled save dialog.",
    );

    rerender(
      <ExportPanel
        document={SYNTHETIC_DOC}
        settings={DEFAULT_SETTINGS}
        busy={false}
        status="success"
        statusMessage="Saved to Downloads/architecture-overview.png"
        onSettingsChange={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Saved to Downloads/architecture-overview.png",
    );

    rerender(
      <ExportPanel
        document={SYNTHETIC_DOC}
        settings={DEFAULT_SETTINGS}
        busy={false}
        status="idle"
        error="Refusing to overwrite existing file."
        onSettingsChange={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Refusing to overwrite existing file.",
    );
  });
});

