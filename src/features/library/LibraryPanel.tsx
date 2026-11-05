import React, { useMemo, useRef, useState } from "react";
import type { ImageDocument, LibraryPanelProps } from "../../contracts/media";
import "./LibraryPanel.css";

export type LibraryLayoutMode = "list" | "grid";

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

export function LibraryPanel({
  images,
  selectedId,
  onSelect,
  onRemove,
}: LibraryPanelProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<LibraryLayoutMode>("list");
  const selectButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredImages = useMemo<readonly ImageDocument[]>(() => {
    if (!normalizedQuery) {
      return images;
    }
    return images.filter(
      (img) =>
        img.name.toLowerCase().includes(normalizedQuery) ||
        img.mimeType.toLowerCase().includes(normalizedQuery),
    );
  }, [images, normalizedQuery]);

  const handleSelectKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft"
    ) {
      return;
    }
    if (filteredImages.length === 0) {
      return;
    }
    event.preventDefault();
    const delta =
      event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (index + delta + filteredImages.length) % filteredImages.length;
    selectButtonRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      className="ferby-library-panel"
      aria-label="Session Library"
      data-layout={layout}
    >
      <div className="ferby-library-panel__header">
        <h2 className="ferby-library-panel__title">
          Session Library ({images.length})
        </h2>
        <div
          className="ferby-library-panel__layout-group"
          role="group"
          aria-label="Library view mode"
        >
          <button
            type="button"
            className="ferby-library-panel__layout-btn"
            aria-pressed={layout === "list"}
            onClick={() => setLayout("list")}
          >
            List View
          </button>
          <button
            type="button"
            className="ferby-library-panel__layout-btn"
            aria-pressed={layout === "grid"}
            onClick={() => setLayout("grid")}
          >
            Grid View
          </button>
        </div>
      </div>

      <div className="ferby-library-panel__search">
        <input
          type="search"
          className="ferby-library-panel__search-input"
          aria-label="Filter library images"
          placeholder="Filter by filename or MIME type…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query.length > 0 && (
          <button
            type="button"
            className="ferby-library-panel__clear-btn"
            onClick={() => setQuery("")}
          >
            Clear filter
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <p className="ferby-library-panel__empty" role="status">
          No images in session library.
        </p>
      ) : filteredImages.length === 0 ? (
        <p className="ferby-library-panel__empty" role="status">
          No images match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <ul
          className={`ferby-library-panel__items ferby-library-panel__items--${layout}`}
          aria-label="Library items"
        >
          {filteredImages.map((image, index) => {
            const isSelected = image.id === selectedId;
            return (
              <li
                key={image.id}
                className={`ferby-library-panel__item ${
                  isSelected ? "ferby-library-panel__item--selected" : ""
                }`}
              >
                <button
                  ref={(el) => {
                    selectButtonRefs.current[index] = el;
                  }}
                  type="button"
                  className="ferby-library-panel__select-btn"
                  aria-pressed={isSelected}
                  aria-label={`Select ${image.name}`}
                  onClick={() => onSelect(image.id)}
                  onKeyDown={(event) => handleSelectKeyDown(event, index)}
                >
                  <img
                    className="ferby-library-panel__thumb"
                    src={image.src}
                    alt={image.name}
                  />
                  <span className="ferby-library-panel__meta">
                    <span className="ferby-library-panel__name">{image.name}</span>
                    <span className="ferby-library-panel__details">
                      {image.width}×{image.height} · {formatBytes(image.byteSize)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="ferby-library-panel__remove-btn"
                  aria-label={`Remove ${image.name}`}
                  onClick={() => onRemove(image.id)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

