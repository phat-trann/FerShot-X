// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArchivePanel } from "../features/archive-panel/ArchivePanel";

describe("ArchivePanel action invariants (A40)", () => {
  it("disables export when library is empty, and fires callbacks only upon explicit click without render side effects", () => {
    const onImport = vi.fn();
    const onExport = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <ArchivePanel
        imageCount={0}
        busy={false}
        status={null}
        error={null}
        onImport={onImport}
        onExport={onExport}
        onCancel={onCancel}
      />,
    );

    // No callbacks fired simply by rendering
    expect(onImport).not.toHaveBeenCalled();
    expect(onExport).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    const importButton = screen.getByRole("button", { name: "Import archive" });
    const exportButton = screen.getByRole("button", { name: "Export archive" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    // Empty library disables export, cancel is disabled when not busy
    expect(exportButton).toBeDisabled();
    expect(importButton).toBeEnabled();
    expect(cancelButton).toBeDisabled();

    // Explicit click on import fires callback
    fireEvent.click(importButton);
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onExport).not.toHaveBeenCalled();

    // Rerender with non-empty library enables export
    rerender(
      <ArchivePanel
        imageCount={3}
        busy={false}
        status={null}
        error={null}
        onImport={onImport}
        onExport={onExport}
        onCancel={onCancel}
      />,
    );

    expect(exportButton).toBeEnabled();
    fireEvent.click(exportButton);
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("disables import and export while busy, but enables and fires cancel on explicit click", () => {
    const onImport = vi.fn();
    const onExport = vi.fn();
    const onCancel = vi.fn();

    render(
      <ArchivePanel
        imageCount={4}
        busy={true}
        status="Archiving in progress..."
        error={null}
        onImport={onImport}
        onExport={onExport}
        onCancel={onCancel}
      />,
    );

    // No callbacks fired on mount
    expect(onImport).not.toHaveBeenCalled();
    expect(onExport).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    const importButton = screen.getByRole("button", { name: "Import archive" });
    const exportButton = screen.getByRole("button", { name: "Export archive" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    // Busy state locks import and export, but permits cancellation
    expect(importButton).toBeDisabled();
    expect(exportButton).toBeDisabled();
    expect(cancelButton).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Archiving in progress...",
    );

    // Explicit click triggers cancel
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onImport).not.toHaveBeenCalled();
    expect(onExport).not.toHaveBeenCalled();
  });
});

