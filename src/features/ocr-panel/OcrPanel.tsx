import React, { useId, useMemo } from "react";
import "./OcrPanel.css";

export interface OcrLanguageOption {
  readonly code: string;
  readonly label: string;
}

export const DEFAULT_OCR_LANGUAGES: readonly OcrLanguageOption[] =
  Object.freeze([
    Object.freeze({ code: "en-US", label: "English (US)" }),
    Object.freeze({ code: "vi-VN", label: "Vietnamese" }),
    Object.freeze({ code: "ja-JP", label: "Japanese" }),
    Object.freeze({ code: "zh-Hans", label: "Chinese (Simplified)" }),
    Object.freeze({ code: "fr-FR", label: "French" }),
    Object.freeze({ code: "de-DE", label: "German" }),
  ]);

export interface OcrRecognizeOptions {
  readonly language: string;
  readonly preserveLineBreaks: boolean;
}

export interface OcrPanelProps {
  readonly recognizedText: string;
  readonly language: string;
  readonly languages?: readonly OcrLanguageOption[];
  readonly preserveLineBreaks: boolean;
  readonly busy: boolean;
  readonly error?: string | null;
  readonly onLanguageChange: (language: string) => void;
  readonly onPreserveLineBreaksChange: (preserveLineBreaks: boolean) => void;
  readonly onRecognize: (options: OcrRecognizeOptions) => void;
  readonly onCopy: (text: string) => void;
}

export function formatRecognizedOcrText(
  rawText: string,
  preserveLineBreaks: boolean,
): string {
  const normalized = rawText.replace(/\r\n?/g, "\n");
  if (preserveLineBreaks) {
    return normalized;
  }
  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");
}

export function OcrPanel({
  recognizedText,
  language,
  languages = DEFAULT_OCR_LANGUAGES,
  preserveLineBreaks,
  busy,
  error,
  onLanguageChange,
  onPreserveLineBreaksChange,
  onRecognize,
  onCopy,
}: OcrPanelProps): React.JSX.Element {
  const languageSelectId = useId();
  const lineBreaksCheckboxId = useId();

  const availableLanguages = useMemo<readonly OcrLanguageOption[]>(() => {
    return languages.length > 0 ? languages : DEFAULT_OCR_LANGUAGES;
  }, [languages]);

  const effectiveLanguage = useMemo<string>(() => {
    const found = availableLanguages.some((item) => item.code === language);
    if (found) {
      return language;
    }
    return availableLanguages[0]?.code ?? "en-US";
  }, [availableLanguages, language]);

  const displayedText = useMemo<string>(
    () => formatRecognizedOcrText(recognizedText, preserveLineBreaks),
    [recognizedText, preserveLineBreaks],
  );

  const hasText = displayedText.trim().length > 0;
  const canCopy = !busy && hasText;

  const handleRecognizeClick = () => {
    if (busy) {
      return;
    }
    onRecognize(
      Object.freeze({
        language: effectiveLanguage,
        preserveLineBreaks: Boolean(preserveLineBreaks),
      }),
    );
  };

  const handleCopyClick = () => {
    if (!canCopy) {
      return;
    }
    onCopy(displayedText);
  };

  return (
    <section
      className="ferby-ocr-panel"
      aria-label="OCR text recognition"
      aria-busy={busy}
    >
      <div className="ferby-ocr-panel__controls">
        <div className="ferby-ocr-panel__field">
          <label
            htmlFor={languageSelectId}
            className="ferby-ocr-panel__label"
          >
            Recognition language
          </label>
          <select
            id={languageSelectId}
            className="ferby-ocr-panel__select"
            value={effectiveLanguage}
            disabled={busy}
            onChange={(event) => {
              if (!busy) {
                onLanguageChange(event.target.value);
              }
            }}
          >
            {availableLanguages.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ferby-ocr-panel__checkbox-row">
          <input
            id={lineBreaksCheckboxId}
            type="checkbox"
            checked={preserveLineBreaks}
            disabled={busy}
            onChange={(event) => {
              if (!busy) {
                onPreserveLineBreaksChange(event.target.checked);
              }
            }}
          />
          <label
            htmlFor={lineBreaksCheckboxId}
            className="ferby-ocr-panel__checkbox-label"
          >
            Preserve line breaks
          </label>
        </div>

        <div className="ferby-ocr-panel__actions">
          <button
            type="button"
            className="ferby-ocr-panel__btn ferby-ocr-panel__btn--primary"
            disabled={busy}
            onClick={handleRecognizeClick}
          >
            {busy ? "Recognizing..." : "Recognize Text"}
          </button>
          <button
            type="button"
            className="ferby-ocr-panel__btn"
            disabled={!canCopy}
            onClick={handleCopyClick}
          >
            Copy Text
          </button>
        </div>
      </div>

      {busy && (
        <p className="ferby-ocr-panel__status" role="status" aria-live="polite">
          Recognizing text from image...
        </p>
      )}

      {error && error.trim().length > 0 && (
        <p className="ferby-ocr-panel__error" role="alert">
          {error}
        </p>
      )}

      <div
        className="ferby-ocr-panel__result"
        role="region"
        aria-label="Recognized text output"
      >
        {hasText ? (
          <pre
            className="ferby-ocr-panel__text"
            data-testid="ocr-recognized-text"
          >
            {displayedText}
          </pre>
        ) : (
          <p className="ferby-ocr-panel__empty">No recognized text yet.</p>
        )}
      </div>
    </section>
  );
}

