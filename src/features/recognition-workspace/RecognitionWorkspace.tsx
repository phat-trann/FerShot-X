import React, { useEffect, useMemo, useState } from "react";
import { OcrPanel, type OcrLanguageOption } from "../ocr-panel/OcrPanel";
import { QrPanel, type QrCodeItem } from "../qr-panel/QrPanel";

export interface RecognitionWorkspaceProps {
  readonly languages: readonly string[];
  readonly language: string;
  readonly preserveLineBreaks: boolean;
  readonly text: string;
  readonly codes: readonly QrCodeItem[];
  readonly busy: boolean;
  readonly error: string | null;
  readonly onLanguageChange: (language: string) => void;
  readonly onPreserveLineBreaksChange: (value: boolean) => void;
  readonly onRecognize: (kind: "text" | "qr", language?: string) => void;
  readonly onCopy: (text: string) => void;
  readonly onCancel: () => void;
}

export function RecognitionWorkspace({
  languages,
  language,
  preserveLineBreaks,
  text,
  codes,
  busy,
  error,
  onLanguageChange,
  onPreserveLineBreaksChange,
  onRecognize,
  onCopy,
  onCancel,
}: RecognitionWorkspaceProps): React.JSX.Element {
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null);
  const runtimeLanguages = useMemo<readonly OcrLanguageOption[]>(
    () => languages.map((code) => Object.freeze({ code, label: code })),
    [languages],
  );
  const ocrUnavailable = runtimeLanguages.length === 0;

  useEffect(() => {
    if (
      selectedQrId !== null &&
      !codes.some((code) => code.id === selectedQrId)
    ) {
      setSelectedQrId(null);
    }
  }, [codes, selectedQrId]);

  return (
    <section
      className="ferby-recognition-workspace"
      aria-label="Recognition workspace"
    >
      <div className="ferby-recognition-workspace__toolbar">
        {busy && (
          <button type="button" onClick={onCancel}>
            Cancel Recognition
          </button>
        )}
        {ocrUnavailable && (
          <p role="status">
            OCR is unavailable because no runtime recognition languages were
            discovered.
          </p>
        )}
      </div>
      <div className="ferby-recognition-workspace__panels">
        <OcrPanel
          recognizedText={text}
          language={language}
          languages={runtimeLanguages}
          preserveLineBreaks={preserveLineBreaks}
          busy={busy || ocrUnavailable}
          error={error}
          onLanguageChange={onLanguageChange}
          onPreserveLineBreaksChange={onPreserveLineBreaksChange}
          onRecognize={({ language: selectedLanguage }) => {
            if (!ocrUnavailable) {
              onRecognize("text", selectedLanguage);
            }
          }}
          onCopy={onCopy}
        />
        <QrPanel
          items={codes}
          selectedId={selectedQrId}
          busy={busy}
          error={error}
          onScan={() => onRecognize("qr")}
          onSelect={setSelectedQrId}
          onCopy={(payload) => onCopy(payload)}
        />
      </div>
    </section>
  );
}
