// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LibraryPanel } from "./LibraryPanel";
import type { ImageDocument } from "../../contracts/media";
import type { FtpQueueItem } from "../../contracts/phase2";

const SYNTHETIC_IMAGES: readonly ImageDocument[] = [
  {
    id: "img-1",
    name: "fullscreen-dashboard.png",
    src: "blob:synthetic-1",
    width: 1920,
    height: 1080,
    mimeType: "image/png",
    byteSize: 204800,
  },
  {
    id: "img-2",
    name: "receipt-crop.jpeg",
    src: "blob:synthetic-2",
    width: 640,
    height: 480,
    mimeType: "image/jpeg",
    byteSize: 51200,
  },
];

afterEach(() => {
  cleanup();
});

describe("LibraryPanel", () => {
  it("renders empty state when no session images are supplied", () => {
    render(
      <LibraryPanel
        images={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /no images in session library/i,
    );
  });

  it("filters items by query, shows no-match message, and clears filter", () => {
    render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const searchInput = screen.getByRole("searchbox", {
      name: /filter library images/i,
    });
    fireEvent.change(searchInput, { target: { value: "receipt" } });

    expect(
      screen.getByRole("button", { name: "Select receipt-crop.jpeg" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select fullscreen-dashboard.png" }),
    ).toBeNull();

    fireEvent.change(searchInput, { target: { value: "nonexistent-item" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      /no images match “nonexistent-item”/i,
    );

    fireEvent.click(screen.getByRole("button", { name: /clear filter/i }));
    expect(
      screen.getByRole("button", { name: "Select fullscreen-dashboard.png" }),
    ).toBeInTheDocument();
  });

  it("reflects selectedId state and triggers onSelect and onRemove without revoking object URLs", () => {
    const onSelect = vi.fn<(id: string) => void>();
    const onRemove = vi.fn<(id: string) => void>();
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={onSelect}
        onRemove={onRemove}
      />,
    );

    const firstSelect = screen.getByRole("button", {
      name: "Select fullscreen-dashboard.png",
    });
    const secondSelect = screen.getByRole("button", {
      name: "Select receipt-crop.jpeg",
    });

    expect(firstSelect).toHaveAttribute("aria-pressed", "true");
    expect(secondSelect).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(secondSelect);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("img-2");

    fireEvent.click(
      screen.getByRole("button", { name: "Remove fullscreen-dashboard.png" }),
    );
    expect(onRemove).toHaveBeenCalledExactlyOnceWith("img-1");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(revokeSpy).not.toHaveBeenCalled();

    revokeSpy.mockRestore();
  });

  it("shows FTP status, selected details, and controlled actions", () => {
    const ftpItem: FtpQueueItem = {
      id: "upload-1",
      sourceId: "img-1",
      name: "fullscreen-dashboard.png",
      remotePath: "/captures/fullscreen-dashboard.png",
      url: "https://example.test/captures/fullscreen-dashboard.png",
      status: "pending",
      createdAt: 1,
      updatedAt: 1,
      error: null,
    };
    const onRetryUpload = vi.fn();
    const onCopyUploadUrl = vi.fn();
    const onRemoveUpload = vi.fn();
    render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
        ftpItems={[ftpItem]}
        onRetryUpload={onRetryUpload}
        onCopyUploadUrl={onCopyUploadUrl}
        onRemoveUpload={onRemoveUpload}
      />,
    );
    expect(screen.queryByRole("button", { name: /grid view/i })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "FTP" }));
    fireEvent.click(screen.getByRole("button", { name: "Select upload fullscreen-dashboard.png" }));
    expect(screen.getByLabelText("Selected upload details")).toHaveTextContent("pending");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove history" }));
    expect(onRetryUpload).toHaveBeenCalledWith("upload-1");
    expect(onCopyUploadUrl).toHaveBeenCalledWith(ftpItem.url);
    expect(onRemoveUpload).toHaveBeenCalledWith("upload-1");
  });
});
