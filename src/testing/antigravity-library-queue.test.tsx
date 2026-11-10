// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LibraryPanel } from "../features/library/LibraryPanel";
import type { ImageDocument } from "../contracts/media";
import type { FtpQueueItem } from "../contracts/phase2";

const SYNTHETIC_IMAGES: readonly ImageDocument[] = [
  {
    id: "img-1",
    name: "alpha-shot.png",
    src: "blob:synthetic-alpha",
    width: 1280,
    height: 720,
    mimeType: "image/png",
    byteSize: 102400,
  },
  {
    id: "img-2",
    name: "beta-window.jpeg",
    src: "blob:synthetic-beta",
    width: 800,
    height: 600,
    mimeType: "image/jpeg",
    byteSize: 40960,
  },
  {
    id: "img-3",
    name: "gamma-region.png",
    src: "blob:synthetic-gamma",
    width: 640,
    height: 360,
    mimeType: "image/png",
    byteSize: 20480,
  },
];

const SYNTHETIC_FTP_ITEMS: readonly FtpQueueItem[] = [
  {
    id: "ftp-1",
    sourceId: "img-1",
    name: "alpha-shot.png",
    remotePath: "/shots/alpha-shot.png",
    url: "https://cdn.example.test/shots/alpha-shot.png",
    status: "pending",
    createdAt: 100,
    updatedAt: 100,
    error: null,
  },
  {
    id: "ftp-2",
    sourceId: "img-2",
    name: "beta-window.jpeg",
    remotePath: "/shots/beta-window.jpeg",
    url: "https://cdn.example.test/shots/beta-window.jpeg",
    status: "failed",
    createdAt: 200,
    updatedAt: 210,
    error: "Connection reset by peer",
  },
  {
    id: "ftp-3",
    sourceId: "img-3",
    name: "gamma-region.png",
    remotePath: "/shots/gamma-region.png",
    url: "https://cdn.example.test/shots/gamma-region.png",
    status: "success",
    createdAt: 300,
    updatedAt: 320,
    error: null,
  },
];

afterEach(() => {
  cleanup();
});

describe("A206 Local/FTP library keyboard and queue usability regressions", () => {
  it("supports keyboard navigation and actions across tabs, local items, and search filter", () => {
    const onSelect = vi.fn<(id: string) => void>();
    const onRemove = vi.fn<(id: string) => void>();

    render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={onSelect}
        onRemove={onRemove}
        ftpItems={SYNTHETIC_FTP_ITEMS}
      />,
    );

    const firstLocalBtn = screen.getByRole("button", {
      name: "Select alpha-shot.png",
    });
    const secondLocalBtn = screen.getByRole("button", {
      name: "Select beta-window.jpeg",
    });
    const thirdLocalBtn = screen.getByRole("button", {
      name: "Select gamma-region.png",
    });

    firstLocalBtn.focus();
    fireEvent.keyDown(firstLocalBtn, { key: "ArrowDown" });
    expect(secondLocalBtn).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith("img-2");

    fireEvent.keyDown(secondLocalBtn, { key: "End" });
    expect(thirdLocalBtn).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith("img-3");

    fireEvent.keyDown(thirdLocalBtn, { key: "Home" });
    expect(firstLocalBtn).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith("img-1");

    fireEvent.keyDown(firstLocalBtn, { key: "Delete" });
    expect(onRemove).toHaveBeenCalledExactlyOnceWith("img-1");

    const searchInput = screen.getByRole("searchbox", {
      name: /filter library images/i,
    });
    fireEvent.change(searchInput, { target: { value: "gamma" } });
    expect(searchInput).toHaveValue("gamma");
    fireEvent.keyDown(searchInput, { key: "Escape" });
    expect(searchInput).toHaveValue("");

    const localTab = screen.getByRole("tab", { name: "Local" });
    const ftpTab = screen.getByRole("tab", { name: "FTP" });
    localTab.focus();
    fireEvent.keyDown(localTab, { key: "ArrowRight" });
    expect(ftpTab).toHaveFocus();
    expect(ftpTab).toHaveAttribute("aria-selected", "true");
  });

  it("supports keyboard selection and shortcuts (R retry, C copy, Delete remove) in FTP queue", () => {
    const onRetryUpload = vi.fn<(id: string) => void>();
    const onRemoveUpload = vi.fn<(id: string) => void>();
    const onCopyUploadUrl = vi.fn<(url: string) => void>();

    render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
        ftpItems={SYNTHETIC_FTP_ITEMS}
        onRetryUpload={onRetryUpload}
        onRemoveUpload={onRemoveUpload}
        onCopyUploadUrl={onCopyUploadUrl}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "FTP" }));

    const firstUploadBtn = screen.getByRole("button", {
      name: "Select upload alpha-shot.png",
    });
    const secondUploadBtn = screen.getByRole("button", {
      name: "Select upload beta-window.jpeg",
    });

    fireEvent.click(firstUploadBtn);
    firstUploadBtn.focus();

    fireEvent.keyDown(firstUploadBtn, { key: "ArrowDown" });
    expect(secondUploadBtn).toHaveFocus();
    expect(screen.getByLabelText("Selected upload details")).toHaveTextContent(
      "beta-window.jpeg",
    );

    fireEvent.keyDown(secondUploadBtn, { key: "r" });
    expect(onRetryUpload).toHaveBeenCalledExactlyOnceWith("ftp-2");

    fireEvent.keyDown(secondUploadBtn, { key: "c" });
    expect(onCopyUploadUrl).toHaveBeenCalledExactlyOnceWith(
      "https://cdn.example.test/shots/beta-window.jpeg",
    );

    // Modified shortcuts (Cmd/Ctrl/Alt) must NOT trigger retry, copy, or delete
    fireEvent.keyDown(secondUploadBtn, { key: "r", metaKey: true });
    fireEvent.keyDown(secondUploadBtn, { key: "r", ctrlKey: true });
    fireEvent.keyDown(secondUploadBtn, { key: "r", altKey: true });
    expect(onRetryUpload).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(secondUploadBtn, { key: "c", metaKey: true });
    fireEvent.keyDown(secondUploadBtn, { key: "c", ctrlKey: true });
    fireEvent.keyDown(secondUploadBtn, { key: "c", altKey: true });
    expect(onCopyUploadUrl).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(secondUploadBtn, { key: "Backspace", metaKey: true });
    fireEvent.keyDown(secondUploadBtn, { key: "Delete", ctrlKey: true });
    fireEvent.keyDown(secondUploadBtn, { key: "Delete", altKey: true });
    expect(onRemoveUpload).not.toHaveBeenCalled();

    // Pressing R on a completed ("success") item must NOT trigger retry
    const thirdUploadBtn = screen.getByRole("button", {
      name: "Select upload gamma-region.png",
    });
    fireEvent.keyDown(thirdUploadBtn, { key: "r" });
    expect(onRetryUpload).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(secondUploadBtn, { key: "Backspace" });
    expect(onRemoveUpload).toHaveBeenCalledExactlyOnceWith("ftp-2");
  });

  it("uses accurate FTP transport status wording and preserves selected details on asynchronous removal failure before advancing on actual removal", () => {
    function StatefulHarness(): React.JSX.Element {
      const [items, setItems] = useState<readonly FtpQueueItem[]>(SYNTHETIC_FTP_ITEMS);
      const [failNextRemoval, setFailNextRemoval] = useState(true);
      return (
        <LibraryPanel
          images={SYNTHETIC_IMAGES}
          selectedId="img-1"
          onSelect={vi.fn()}
          onRemove={vi.fn()}
          ftpItems={items}
          onRetryUpload={(id) => {
            setItems((prev) =>
              prev.map((item) =>
                item.id === id
                  ? { ...item, status: "success", error: null, updatedAt: 400 }
                  : item,
              ),
            );
          }}
          onRemoveUpload={(id) => {
            if (failNextRemoval) {
              setFailNextRemoval(false);
              setItems((prev) =>
                prev.map((item) =>
                  item.id === id
                    ? {
                        ...item,
                        error: "History store locked; could not remove item",
                      }
                    : item,
                ),
              );
              return;
            }
            setItems((prev) => prev.filter((item) => item.id !== id));
          }}
        />
      );
    }

    render(<StatefulHarness />);
    fireEvent.click(screen.getByRole("tab", { name: "FTP" }));

    // Check list item URL status labels (explicit predicted/target URL wording without unverified HTTP liveness claims)
    expect(
      screen.getByText(
        "Pending URL: https://cdn.example.test/shots/alpha-shot.png",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Target URL (FTP transfer failed): https://cdn.example.test/shots/beta-window.jpeg",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Target URL (FTP transfer complete): https://cdn.example.test/shots/gamma-region.png",
      ),
    ).toBeInTheDocument();

    // Select failed upload and verify details panel
    fireEvent.click(
      screen.getByRole("button", { name: "Select upload beta-window.jpeg" }),
    );
    const details = screen.getByLabelText("Selected upload details");
    expect(details).toHaveTextContent("beta-window.jpeg");
    expect(details).toHaveTextContent("Status: failed");
    expect(details).toHaveTextContent(
      "Transport status: FTP transfer failed (target URL unconfirmed)",
    );
    expect(within(details).getByRole("alert")).toHaveTextContent(
      "Error: Connection reset by peer",
    );

    // Retry upload -> details should update in place to success and clear error alert
    const retryButtons = screen.getAllByRole("button", { name: "Retry" });
    fireEvent.click(retryButtons[1]!);
    expect(details).toHaveTextContent("Status: success");
    expect(details).toHaveTextContent(
      "Transport status: FTP transfer completed (public URL not probed)",
    );
    expect(
      within(details).getByText(
        "Target URL (FTP transfer complete): https://cdn.example.test/shots/beta-window.jpeg",
      ),
    ).toBeInTheDocument();
    expect(within(details).queryByRole("alert")).toBeNull();

    // First removal attempt fails asynchronously -> item remains in ftpItems, so Selected upload details MUST stay on beta-window.jpeg and surface the error
    const removeButtons = screen.getAllByRole("button", {
      name: "Remove history",
    });
    fireEvent.click(removeButtons[1]!);
    expect(screen.getByLabelText("Selected upload details")).toHaveTextContent(
      "beta-window.jpeg",
    );
    expect(within(details).getByRole("alert")).toHaveTextContent(
      "Error: History store locked; could not remove item",
    );

    // Second removal attempt succeeds -> item leaves ftpItems and Selected upload details advances to gamma-region.png
    fireEvent.click(removeButtons[1]!);
    expect(screen.getByLabelText("Selected upload details")).toHaveTextContent(
      "gamma-region.png",
    );
  });

  it("distinguishes empty vs filtered states in both Local (with uploadedSourceIds) and FTP views", () => {
    const { rerender } = render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-2"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
        uploadedSourceIds={["img-1"]}
        ftpItems={[]}
      />,
    );

    // Local has un-uploaded images (img-2, img-3) and uploadedSourceIds is non-empty.
    // A search filter with no matches must show the search miss message, NOT "all session sources have been uploaded".
    const searchInput = screen.getByRole("searchbox", {
      name: /filter library images/i,
    });
    fireEvent.change(searchInput, { target: { value: "no-such-file" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      /no images match “no-such-file”/i,
    );

    // Clear filter and switch to empty FTP queue
    fireEvent.keyDown(searchInput, { key: "Escape" });
    fireEvent.click(screen.getByRole("tab", { name: "FTP" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      /no ftp uploads in queue/i,
    );

    // Rerender with FTP items and filter to no match
    rerender(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-2"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
        uploadedSourceIds={["img-1", "img-2", "img-3"]}
        ftpItems={SYNTHETIC_FTP_ITEMS}
      />,
    );
    fireEvent.change(searchInput, { target: { value: "missing-upload" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      /no ftp uploads match “missing-upload”/i,
    );

    // Switch back to Local when all sources are uploaded
    fireEvent.keyDown(searchInput, { key: "Escape" });
    fireEvent.click(screen.getByRole("tab", { name: "Local" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      /no local images; all session sources have been uploaded/i,
    );
  });

  it("disables destructive and retry actions when busy or when an FTP item is currently uploading", () => {
    const onRemove = vi.fn();
    const onRetryUpload = vi.fn();
    const onRemoveUpload = vi.fn();
    const onCopyUploadUrl = vi.fn();

    const uploadingItems: readonly FtpQueueItem[] = [
      {
        id: "ftp-uploading",
        sourceId: "img-1",
        name: "alpha-shot.png",
        remotePath: "/shots/alpha-shot.png",
        url: "https://cdn.example.test/shots/alpha-shot.png",
        status: "uploading",
        createdAt: 100,
        updatedAt: 110,
        error: null,
      },
      {
        id: "ftp-failed",
        sourceId: "img-2",
        name: "beta-window.jpeg",
        remotePath: "/shots/beta-window.jpeg",
        url: "https://cdn.example.test/shots/beta-window.jpeg",
        status: "failed",
        createdAt: 200,
        updatedAt: 210,
        error: "Timeout",
      },
    ];

    const { rerender } = render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={vi.fn()}
        onRemove={onRemove}
        ftpItems={uploadingItems}
        onRetryUpload={onRetryUpload}
        onRemoveUpload={onRemoveUpload}
        onCopyUploadUrl={onCopyUploadUrl}
        busy={true}
      />,
    );

    const localRemoveBtn = screen.getByRole("button", {
      name: "Remove alpha-shot.png",
    });
    expect(localRemoveBtn).toBeDisabled();
    fireEvent.click(localRemoveBtn);
    const localSelectBtn = screen.getByRole("button", {
      name: "Select alpha-shot.png",
    });
    fireEvent.keyDown(localSelectBtn, { key: "Delete" });
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: "FTP" }));
    const failedSelectBtn = screen.getByRole("button", {
      name: "Select upload beta-window.jpeg",
    });
    fireEvent.keyDown(failedSelectBtn, { key: "r" });
    fireEvent.keyDown(failedSelectBtn, { key: "c" });
    fireEvent.keyDown(failedSelectBtn, { key: "Delete" });
    expect(onRetryUpload).not.toHaveBeenCalled();
    expect(onCopyUploadUrl).not.toHaveBeenCalled();
    expect(onRemoveUpload).not.toHaveBeenCalled();

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    expect(retryBtn).toBeDisabled();
    fireEvent.click(retryBtn);
    expect(onRetryUpload).not.toHaveBeenCalled();

    const removeHistoryBtns = screen.getAllByRole("button", {
      name: "Remove history",
    });
    for (const btn of removeHistoryBtns) {
      expect(btn).toBeDisabled();
    }

    // Even when panel busy=false, an item with status="uploading" keeps Remove history disabled and blocks Delete key
    rerender(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={vi.fn()}
        onRemove={onRemove}
        ftpItems={uploadingItems}
        onRetryUpload={onRetryUpload}
        onRemoveUpload={onRemoveUpload}
        onCopyUploadUrl={onCopyUploadUrl}
        busy={false}
      />,
    );
    const uploadingSelectBtn = screen.getByRole("button", {
      name: "Select upload alpha-shot.png",
    });
    fireEvent.keyDown(uploadingSelectBtn, { key: "Delete" });
    expect(onRemoveUpload).not.toHaveBeenCalled();
  });
});
