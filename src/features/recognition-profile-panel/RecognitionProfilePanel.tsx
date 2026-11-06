import React, { useState } from "react";
import {
  parseRecognitionPreferences,
  type RecognitionMode,
  type RecognitionPreferences,
  RECOGNITION_PREFERENCES_CODEC_LIMITS,
} from "../recognition-preferences-codec";
import "./RecognitionProfilePanel.css";

export interface RecognitionProfilePanelProps {
  value: RecognitionPreferences;
  supportedLanguages: readonly string[];
  busy: boolean;
  onChange: (value: RecognitionPreferences) => void;
  onSave: () => void;
  onReset: () => void;
  className?: string;
}

const MODES: readonly { id: RecognitionMode; label: string; description: string }[] = [
  { id: "both", label: "Both (Text & QR)", description: "Simultaneously scan for text and QR codes" },
  { id: "ocr", label: "OCR Only", description: "Extract text characters only" },
  { id: "qr", label: "QR Only", description: "Detect and decode barcodes & QR codes" },
];

export function RecognitionProfilePanel({
  value,
  supportedLanguages,
  busy,
  onChange,
  onSave,
  onReset,
  className,
}: RecognitionProfilePanelProps): React.JSX.Element {
  const [customTagInput, setCustomTagInput] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);

  // Validate value using existing codec
  let shapeError: string | null = null;
  try {
    parseRecognitionPreferences(value, supportedLanguages.length > 0 ? supportedLanguages : undefined);
  } catch (err) {
    shapeError = err instanceof Error ? err.message : "Invalid recognition preferences";
  }

  const handleModeChange = (nextMode: RecognitionMode) => {
    if (busy) return;
    onChange({
      ...value,
      mode: nextMode,
    });
  };

  const handleToggleLanguage = (tag: string) => {
    if (busy) return;
    const normalized = tag.trim().toLowerCase();
    const current = value.languages.map((l) => l.toLowerCase());
    let next: string[];

    if (current.includes(normalized)) {
      next = current.filter((l) => l !== normalized);
    } else {
      if (current.length >= RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguages) {
        setTagError(`Maximum of ${RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguages} languages allowed.`);
        return;
      }
      next = [...current, normalized];
    }
    setTagError(null);
    onChange({
      ...value,
      languages: next,
    });
  };

  const handleAddCustomTag = () => {
    if (busy) return;
    const trimmed = customTagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (trimmed.length > RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguageTagLength) {
      setTagError(`Language tag must be at most ${RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguageTagLength} characters.`);
      return;
    }
    const current = value.languages.map((l) => l.toLowerCase());
    if (current.includes(trimmed)) {
      setTagError(`Language tag "${trimmed}" is already selected.`);
      return;
    }
    if (current.length >= RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguages) {
      setTagError(`Maximum of ${RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguages} languages allowed.`);
      return;
    }
    setTagError(null);
    setCustomTagInput("");
    onChange({
      ...value,
      languages: [...current, trimmed],
    });
  };

  const handlePreserveLineBreaksChange = (checked: boolean) => {
    if (busy) return;
    onChange({
      ...value,
      preserveLineBreaks: checked,
    });
  };

  const availableLanguages = Array.from(
    new Set([
      ...supportedLanguages.map((l) => l.toLowerCase()),
      ...value.languages.map((l) => l.toLowerCase()),
    ]),
  );

  const containerClasses = [
    "ferby-recognition-profile-panel",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={containerClasses}
      aria-label="Recognition Preferences Profile"
      aria-busy={busy}
    >
      <div className="ferby-recognition-profile-panel__field">
        <label className="ferby-recognition-profile-panel__label">
          Recognition Mode
        </label>
        <div
          className="ferby-recognition-profile-panel__mode-options"
          role="radiogroup"
          aria-label="Recognition Mode Selection"
        >
          {MODES.map((mode) => (
            <label
              key={mode.id}
              className={`ferby-recognition-profile-panel__mode-option ${
                value.mode === mode.id ? "ferby-recognition-profile-panel__mode-option--selected" : ""
              }`}
            >
              <input
                type="radio"
                name="recognition-mode"
                value={mode.id}
                checked={value.mode === mode.id}
                disabled={busy}
                onChange={() => handleModeChange(mode.id)}
              />
              <div className="ferby-recognition-profile-panel__mode-info">
                <span className="ferby-recognition-profile-panel__mode-label">
                  {mode.label}
                </span>
                <span className="ferby-recognition-profile-panel__mode-desc">
                  {mode.description}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="ferby-recognition-profile-panel__field">
        <div className="ferby-recognition-profile-panel__header-row">
          <label className="ferby-recognition-profile-panel__label">
            OCR Languages ({value.languages.length}/{RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguages})
          </label>
        </div>

        <div className="ferby-recognition-profile-panel__languages-list">
          {availableLanguages.map((tag) => {
            const isChecked = value.languages.map((l) => l.toLowerCase()).includes(tag);
            return (
              <label
                key={tag}
                className={`ferby-recognition-profile-panel__tag-checkbox ${
                  isChecked ? "ferby-recognition-profile-panel__tag-checkbox--checked" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={busy}
                  onChange={() => handleToggleLanguage(tag)}
                />
                <span>{tag}</span>
              </label>
            );
          })}
        </div>

        <div className="ferby-recognition-profile-panel__add-tag-row">
          <input
            type="text"
            className="ferby-recognition-profile-panel__input"
            placeholder="Add language tag (e.g. ja-JP)"
            value={customTagInput}
            disabled={busy || value.languages.length >= RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguages}
            maxLength={RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguageTagLength}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomTag();
              }
            }}
          />
          <button
            type="button"
            className="ferby-recognition-profile-panel__button ferby-recognition-profile-panel__button--small"
            disabled={
              busy ||
              !customTagInput.trim() ||
              value.languages.length >= RECOGNITION_PREFERENCES_CODEC_LIMITS.maxLanguages
            }
            onClick={handleAddCustomTag}
          >
            Add
          </button>
        </div>

        {tagError && (
          <p className="ferby-recognition-profile-panel__error" role="alert">
            {tagError}
          </p>
        )}
      </div>

      <div className="ferby-recognition-profile-panel__field">
        <label className="ferby-recognition-profile-panel__checkbox-label">
          <input
            type="checkbox"
            checked={value.preserveLineBreaks}
            disabled={busy}
            onChange={(e) => handlePreserveLineBreaksChange(e.target.checked)}
          />
          <span>Preserve original line breaks in recognized OCR output</span>
        </label>
      </div>

      {shapeError && (
        <p className="ferby-recognition-profile-panel__error" role="alert">
          {shapeError}
        </p>
      )}

      <div className="ferby-recognition-profile-panel__actions">
        <button
          type="button"
          className="ferby-recognition-profile-panel__button ferby-recognition-profile-panel__button--secondary"
          disabled={busy}
          onClick={onReset}
        >
          Reset
        </button>
        <button
          type="button"
          className="ferby-recognition-profile-panel__button ferby-recognition-profile-panel__button--primary"
          disabled={busy || Boolean(shapeError)}
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </section>
  );
}

