import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ImageDocument, LibraryPanelProps } from "../../contracts/media";
import type { FtpQueueItem } from "../../contracts/phase2";
import "./LibraryPanel.css";
import { Input } from "../../components/ui/input";

export type LibraryTab = "local" | "ftp";

export interface Phase2LibraryProps {
  readonly ftpItems?: readonly FtpQueueItem[];
  readonly onRetryUpload?: (id: string) => void;
  readonly onRemoveUpload?: (id: string) => void;
  readonly onCopyUploadUrl?: (url: string) => void;
  readonly uploadedSourceIds?: readonly string[];
  readonly busy?: boolean;
  readonly disabled?: boolean;
}

function formatBytes(byteSize: number): string {
  if (!Number.isFinite(byteSize) || byteSize <= 0) {
    return "0 B";
  }
  if (byteSize < 1024) {
    return `${Math.round(byteSize)} B`;
  }
  const kb = byteSize / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatUploadUrlSummary(item: FtpQueueItem): string {
  const urlText = item.url.trim();
  if (item.status === "success") {
    return urlText
      ? `Target URL (FTP transfer complete): ${urlText}`
      : "Target URL unavailable";
  }
  if (item.status === "failed") {
    return urlText
      ? `Target URL (FTP transfer failed): ${urlText}`
      : "Target URL unavailable (FTP transfer failed)";
  }
  return urlText ? `Pending URL: ${urlText}` : "Pending URL unavailable";
}

function formatUploadTransportStatusLabel(
  status: FtpQueueItem["status"],
): string {
  switch (status) {
    case "success":
      return "FTP transfer completed (public URL not probed)";
    case "failed":
      return "FTP transfer failed (target URL unconfirmed)";
    case "uploading":
      return "FTP transfer in progress (pending URL)";
    case "pending":
    default:
      return "Queued for FTP transfer (pending URL)";
  }
}

function hasCommandModifier(
  event: React.KeyboardEvent<HTMLElement>,
): boolean {
  return Boolean(event.metaKey || event.ctrlKey || event.altKey);
}

export function LibraryPanel({
  images,
  selectedId,
  onSelect,
  onRemove,
  ftpItems = [],
  onRetryUpload,
  onRemoveUpload,
  onCopyUploadUrl,
  uploadedSourceIds = [],
  busy = false,
  disabled = false,
}: LibraryPanelProps & Phase2LibraryProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<LibraryTab>("local");
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const pendingRemovalFallbackRef = useRef<{
    readonly removedId: string;
    readonly fallbackId: string | null;
  } | null>(null);
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const uploadButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const isBusy = Boolean(busy || disabled);
  const normalizedQuery = query.trim().toLowerCase();
  const uploadedIds = useMemo(
    () => new Set(uploadedSourceIds),
    [uploadedSourceIds],
  );

  const localImages = useMemo<readonly ImageDocument[]>(
    () => images.filter((image) => !uploadedIds.has(image.id)),
    [images, uploadedIds],
  );

  const filteredImages = useMemo<readonly ImageDocument[]>(() => {
    if (!normalizedQuery) {
      return localImages;
    }
    return localImages.filter(
      (img) =>
        img.name.toLowerCase().includes(normalizedQuery) ||
        img.mimeType.toLowerCase().includes(normalizedQuery),
    );
  }, [localImages, normalizedQuery]);

  const filteredUploads = useMemo(() => {
    if (!normalizedQuery) return ftpItems;
    return ftpItems.filter((item) =>
      [item.name, item.remotePath, item.url, item.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [ftpItems, normalizedQuery]);

  useEffect(() => {
    if (selectedUploadId === null) {
      return;
    }
    const stillVisible = filteredUploads.some(
      (item) => item.id === selectedUploadId,
    );
    if (!stillVisible) {
      const pending = pendingRemovalFallbackRef.current;
      const preferredId =
        pending && pending.removedId === selectedUploadId
          ? pending.fallbackId
          : null;
      pendingRemovalFallbackRef.current = null;
      const nextUpload =
        (preferredId
          ? filteredUploads.find((item) => item.id === preferredId)
          : undefined) ??
        filteredUploads[0] ??
        null;
      setSelectedUploadId(nextUpload?.id ?? null);
    }
  }, [filteredUploads, selectedUploadId]);

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: LibraryTab,
  ) => {
    if (hasCommandModifier(event)) {
      return;
    }
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    event.preventDefault();
    let nextTab: LibraryTab;
    if (event.key === "Home") {
      nextTab = "local";
    } else if (event.key === "End") {
      nextTab = "ftp";
    } else {
      nextTab = currentTab === "local" ? "ftp" : "local";
    }
    setTab(nextTab);
    const nextIndex = nextTab === "local" ? 0 : 1;
    tabButtonRefs.current[nextIndex]?.focus();
  };

  const handleSelectKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (hasCommandModifier(event)) {
      return;
    }
    const currentImage = filteredImages[index];
    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      currentImage
    ) {
      event.preventDefault();
      if (!isBusy) {
        onRemove(currentImage.id);
      }
      return;
    }

    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    if (filteredImages.length === 0) {
      return;
    }
    event.preventDefault();
    let nextIndex: number;
    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = filteredImages.length - 1;
    } else {
      const delta =
        event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
      nextIndex =
        (index + delta + filteredImages.length) % filteredImages.length;
    }
    const nextImage = filteredImages[nextIndex];
    selectButtonRefs.current[nextIndex]?.focus();
    if (nextImage) {
      onSelect(nextImage.id);
    }
  };

  const handleUploadRemove = (id: string, index: number) => {
    const item = filteredUploads[index];
    if (isBusy || !onRemoveUpload || item?.status === "uploading") {
      return;
    }
    const fallback =
      filteredUploads[index + 1]?.id ??
      filteredUploads[index - 1]?.id ??
      null;
    pendingRemovalFallbackRef.current = {
      removedId: id,
      fallbackId: fallback,
    };
    onRemoveUpload(id);
  };

  const handleUploadRetry = (id: string) => {
    const item = ftpItems.find((entry) => entry.id === id);
    if (
      isBusy ||
      !onRetryUpload ||
      !item ||
      (item.status !== "failed" && item.status !== "pending")
    ) {
      return;
    }
    setSelectedUploadId(id);
    onRetryUpload(id);
  };

  const handleUploadKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (hasCommandModifier(event)) {
      return;
    }
    const currentUpload = filteredUploads[index];
    if (!currentUpload) {
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      handleUploadRemove(currentUpload.id, index);
      return;
    }

    if (event.key === "r" || event.key === "R") {
      if (
        !isBusy &&
        (currentUpload.status === "failed" ||
          currentUpload.status === "pending")
      ) {
        event.preventDefault();
        handleUploadRetry(currentUpload.id);
      }
      return;
    }

    if (event.key === "c" || event.key === "C") {
      if (!isBusy && currentUpload.url && onCopyUploadUrl) {
        event.preventDefault();
        onCopyUploadUrl(currentUpload.url);
      }
      return;
    }

    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    if (filteredUploads.length === 0) {
      return;
    }
    event.preventDefault();
    let nextIndex: number;
    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = filteredUploads.length - 1;
    } else {
      const delta =
        event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
      nextIndex =
        (index + delta + filteredUploads.length) % filteredUploads.length;
    }
    const nextUpload = filteredUploads[nextIndex];
    uploadButtonRefs.current[nextIndex]?.focus();
    if (nextUpload) {
      setSelectedUploadId(nextUpload.id);
    }
  };

  const selectedUpload = useMemo(() => {
    if (!selectedUploadId) {
      return null;
    }
    const direct = filteredUploads.find((item) => item.id === selectedUploadId);
    if (direct) {
      return direct;
    }
    const pending = pendingRemovalFallbackRef.current;
    const preferredId =
      pending && pending.removedId === selectedUploadId
        ? pending.fallbackId
        : null;
    return (
      (preferredId
        ? filteredUploads.find((item) => item.id === preferredId)
        : undefined) ??
      filteredUploads[0] ??
      null
    );
  }, [filteredUploads, selectedUploadId]);

  return (
    <section
      className="fershot-library-panel"
      aria-label="Session Library"
      aria-busy={isBusy}
    >
      <div className="fershot-library-panel__header">
        <h2 className="fershot-library-panel__title">
          {tab === "local"
            ? `Local Library (${filteredImages.length})`
            : `FTP Uploads (${filteredUploads.length})`}
        </h2>
      </div>
      <div
        className="fershot-library-panel__tabs"
        role="tablist"
        aria-label="Library source"
      >
        <button
          ref={(el) => {
            tabButtonRefs.current[0] = el;
          }}
          type="button"
          role="tab"
          aria-selected={tab === "local"}
          tabIndex={tab === "local" ? 0 : -1}
          onClick={() => setTab("local")}
          onKeyDown={(event) => handleTabKeyDown(event, "local")}
        >
          Local
        </button>
        <button
          ref={(el) => {
            tabButtonRefs.current[1] = el;
          }}
          type="button"
          role="tab"
          aria-selected={tab === "ftp"}
          tabIndex={tab === "ftp" ? 0 : -1}
          onClick={() => setTab("ftp")}
          onKeyDown={(event) => handleTabKeyDown(event, "ftp")}
        >
          FTP
        </button>
      </div>

      <div className="fershot-library-panel__search">
        <Input
          type="search"
          className="fershot-library-panel__search-input"
          aria-label="Filter library images"
          placeholder={
            tab === "local"
              ? "Filter by filename or MIME type…"
              : "Filter uploads by filename, path, URL, or status…"
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query.length > 0) {
              event.preventDefault();
              setQuery("");
            }
          }}
        />
        {query.length > 0 && (
          <button
            type="button"
            className="fershot-library-panel__clear-btn"
            onClick={() => setQuery("")}
          >
            Clear filter
          </button>
        )}
      </div>

      {tab === "local" && images.length === 0 ? (
        <p className="fershot-library-panel__empty" role="status">
          No images in session library.
        </p>
      ) : tab === "local" && localImages.length === 0 && uploadedIds.size > 0 ? (
        <p className="fershot-library-panel__empty" role="status">
          No local images; all session sources have been uploaded.
        </p>
      ) : tab === "local" && filteredImages.length === 0 ? (
        <p className="fershot-library-panel__empty" role="status">
          No images match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : tab === "local" ? (
        <ul
          className="fershot-library-panel__items"
          aria-label="Library items"
        >
          {filteredImages.map((image, index) => {
            const isSelected = image.id === selectedId;
            return (
              <li
                key={image.id}
                className={`fershot-library-panel__item ${
                  isSelected ? "fershot-library-panel__item--selected" : ""
                }`}
              >
                <button
                  ref={(el) => {
                    selectButtonRefs.current[index] = el;
                  }}
                  type="button"
                  className="fershot-library-panel__select-btn"
                  aria-pressed={isSelected}
                  aria-label={`Select ${image.name}`}
                  onClick={() => onSelect(image.id)}
                  onKeyDown={(event) => handleSelectKeyDown(event, index)}
                >
                  <img
                    className="fershot-library-panel__thumb"
                    src={image.src}
                    alt={image.name}
                  />
                  <span className="fershot-library-panel__meta">
                    <span className="fershot-library-panel__name">
                      {image.name}
                    </span>
                    <span className="fershot-library-panel__details">
                      {image.width}×{image.height} · {formatBytes(image.byteSize)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="fershot-library-panel__remove-btn"
                  aria-label={`Remove ${image.name}`}
                  disabled={isBusy}
                  onClick={() => {
                    if (!isBusy) {
                      onRemove(image.id);
                    }
                  }}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : ftpItems.length === 0 ? (
        <p className="fershot-library-panel__empty" role="status">
          No FTP uploads in queue.
        </p>
      ) : filteredUploads.length === 0 ? (
        <p className="fershot-library-panel__empty" role="status">
          No FTP uploads match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <ul
          className="fershot-library-panel__items fershot-library-panel__items--list"
          aria-label="FTP upload items"
        >
          {filteredUploads.map((item, index) => {
            const isUploadSelected = selectedUpload?.id === item.id;
            const isItemUploading = item.status === "uploading";
            return (
              <li
                key={item.id}
                className={`fershot-library-panel__item ${
                  isUploadSelected ? "fershot-library-panel__item--selected" : ""
                }`}
              >
                <button
                  ref={(el) => {
                    uploadButtonRefs.current[index] = el;
                  }}
                  type="button"
                  className="fershot-library-panel__select-btn"
                  aria-pressed={isUploadSelected}
                  aria-label={`Select upload ${item.name}`}
                  onClick={() => setSelectedUploadId(item.id)}
                  onKeyDown={(event) => handleUploadKeyDown(event, index)}
                >
                  <span className="fershot-library-panel__meta">
                    <span className="fershot-library-panel__name">
                      {item.name}
                    </span>
                    <span className="fershot-library-panel__details">
                      {item.status} · {item.remotePath}
                    </span>
                    <span
                      className={`fershot-library-panel__details fershot-library-panel__url-status fershot-library-panel__url-status--${item.status}`}
                    >
                      {formatUploadUrlSummary(item)}
                    </span>
                  </span>
                </button>
                {(item.status === "failed" || item.status === "pending") &&
                onRetryUpload ? (
                  <button
                    type="button"
                    className="fershot-library-panel__remove-btn"
                    disabled={isBusy || isItemUploading}
                    onClick={() => handleUploadRetry(item.id)}
                  >
                    Retry
                  </button>
                ) : null}
                {item.url && onCopyUploadUrl ? (
                  <button
                    type="button"
                    className="fershot-library-panel__remove-btn"
                    disabled={isBusy}
                    onClick={() => {
                      if (!isBusy) {
                        onCopyUploadUrl(item.url);
                      }
                    }}
                  >
                    Copy URL
                  </button>
                ) : null}
                {onRemoveUpload ? (
                  <button
                    type="button"
                    className="fershot-library-panel__remove-btn"
                    disabled={isBusy || isItemUploading}
                    onClick={() => handleUploadRemove(item.id, index)}
                  >
                    Remove history
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {tab === "ftp" && selectedUpload ? (
        <aside
          className="fershot-library-panel__upload-details"
          aria-label="Selected upload details"
        >
          <strong>{selectedUpload.name}</strong>
          <span>Status: {selectedUpload.status}</span>
          <span>
            Transport status:{" "}
            {formatUploadTransportStatusLabel(selectedUpload.status)}
          </span>
          <span>Remote path: {selectedUpload.remotePath}</span>
          <span>{formatUploadUrlSummary(selectedUpload)}</span>
          {selectedUpload.error ? (
            <span role="alert">Error: {selectedUpload.error}</span>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}
