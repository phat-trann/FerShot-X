import React, { useMemo, useRef } from "react";
import "./QrPanel.css";

export interface QrCodeItem {
  readonly id: string;
  readonly payload: string;
  readonly symbology?: string;
}

export interface QrPanelProps {
  readonly items: readonly QrCodeItem[];
  readonly selectedId: string | null;
  readonly busy: boolean;
  readonly error?: string | null;
  readonly onScan?: () => void;
  readonly onSelect: (id: string) => void;
  readonly onCopy: (payload: string, id: string) => void;
}

export function QrPanel({
  items,
  selectedId,
  busy,
  error,
  onScan,
  onSelect,
  onCopy,
}: QrPanelProps): React.JSX.Element {
  const itemButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedItem = useMemo<QrCodeItem | null>(() => {
    if (selectedId === null) {
      return null;
    }
    return items.find((entry) => entry.id === selectedId) ?? null;
  }, [items, selectedId]);

  const handleItemKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (busy || items.length === 0) {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (index + 1) % items.length;
      const nextItem = items[nextIndex];
      if (nextItem) {
        itemButtonRefs.current[nextIndex]?.focus();
        onSelect(nextItem.id);
      }
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = (index - 1 + items.length) % items.length;
      const prevItem = items[prevIndex];
      if (prevItem) {
        itemButtonRefs.current[prevIndex]?.focus();
        onSelect(prevItem.id);
      }
    }
  };

  return (
    <section
      className="ferby-qr-panel"
      aria-label="QR code recognition"
      aria-busy={busy}
    >
      <div className="ferby-qr-panel__header">
        <span className="ferby-qr-panel__count">
          {items.length} {items.length === 1 ? "QR code" : "QR codes"}
        </span>
        <div className="ferby-qr-panel__actions">
          {onScan && (
            <button
              type="button"
              className="ferby-qr-panel__btn"
              disabled={busy}
              onClick={() => {
                if (!busy) {
                  onScan();
                }
              }}
            >
              {busy ? "Scanning..." : "Scan QR Codes"}
            </button>
          )}
          <button
            type="button"
            className="ferby-qr-panel__btn ferby-qr-panel__btn--primary"
            disabled={busy || selectedItem === null}
            onClick={() => {
              if (!busy && selectedItem !== null) {
                onCopy(selectedItem.payload, selectedItem.id);
              }
            }}
          >
            Copy Selected Payload
          </button>
        </div>
      </div>

      {busy && (
        <p className="ferby-qr-panel__status" role="status" aria-live="polite">
          Scanning image for QR codes...
        </p>
      )}

      {error && error.trim().length > 0 && (
        <p className="ferby-qr-panel__error" role="alert">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="ferby-qr-panel__empty">
          No QR codes detected in this image.
        </p>
      ) : (
        <ul className="ferby-qr-panel__list" aria-label="Detected QR payloads">
          {items.map((item, index) => {
            const isSelected = item.id === selectedId;
            return (
              <li key={item.id} className="ferby-qr-panel__item">
                <button
                  ref={(el) => {
                    itemButtonRefs.current[index] = el;
                  }}
                  type="button"
                  className={`ferby-qr-panel__select-btn${
                    isSelected ? " ferby-qr-panel__select-btn--selected" : ""
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Select QR code ${index + 1}`}
                  disabled={busy}
                  onClick={() => {
                    if (!busy) {
                      onSelect(item.id);
                    }
                  }}
                  onKeyDown={(event) => handleItemKeyDown(event, index)}
                >
                  <span className="ferby-qr-panel__badge">
                    {item.symbology ?? "QR"}
                  </span>
                  <code
                    className="ferby-qr-panel__payload"
                    data-testid={`qr-payload-${item.id}`}
                  >
                    {item.payload}
                  </code>
                </button>
                <button
                  type="button"
                  className="ferby-qr-panel__btn ferby-qr-panel__btn--small"
                  aria-label={`Copy QR code ${index + 1}`}
                  disabled={busy}
                  onClick={() => {
                    if (!busy) {
                      onCopy(item.payload, item.id);
                    }
                  }}
                >
                  Copy
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

