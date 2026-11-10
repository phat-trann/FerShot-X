// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LibraryPanel } from "../features/library";
import type { ImageDocument } from "../contracts/media";
import type { FtpQueueItem } from "../contracts/phase2";

const image: ImageDocument = {
  id: "local-1",
  name: "capture.png",
  src: "blob:capture",
  width: 10,
  height: 10,
  mimeType: "image/png",
  byteSize: 100,
};

const ftp = (status: FtpQueueItem["status"]): FtpQueueItem => ({
  id: `upload-${status}`,
  sourceId: image.id,
  name: image.name,
  remotePath: "/captures/capture.png",
  url: "https://example.test/captures/capture.png",
  status,
  createdAt: 1,
  updatedAt: 1,
  error: status === "failed" ? "connection refused" : null,
});

const baseProps = {
  images: [image],
  selectedId: null,
  onSelect: vi.fn(),
  onRemove: vi.fn(),
};

describe("Phase 2 library regressions", () => {
  it("hides uploaded local sources and reports a truthful empty state", () => {
    render(<LibraryPanel {...baseProps} uploadedSourceIds={[image.id]} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No local images; all session sources have been uploaded.",
    );
    expect(screen.queryByRole("button", { name: /Select capture/ })).toBeNull();
  });

  it("keeps pending and failed uploads recoverable through Retry", () => {
    const onRetryUpload = vi.fn();
    render(
      <LibraryPanel
        {...baseProps}
        ftpItems={[ftp("pending"), ftp("failed")]}
        onRetryUpload={onRetryUpload}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "FTP" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[1]);
    expect(onRetryUpload).toHaveBeenNthCalledWith(1, "upload-pending");
    expect(onRetryUpload).toHaveBeenNthCalledWith(2, "upload-failed");
  });

  it("does not allow removing an upload while it is uploading", () => {
    const onRemoveUpload = vi.fn();
    render(
      <LibraryPanel
        {...baseProps}
        ftpItems={[ftp("uploading")]}
        onRemoveUpload={onRemoveUpload}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "FTP" }));
    const remove = screen.getByRole("button", { name: "Remove history" });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(onRemoveUpload).not.toHaveBeenCalled();
  });
});
