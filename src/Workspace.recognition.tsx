import { useEffect, useRef, useState } from "react";
import type { ImageDocument } from "./contracts/media";
import type { RecognitionController, RecognitionKind } from "./features/recognition-workflow";
import { RecognitionWorkspace } from "./features/recognition-workspace";
import { RecognitionProfilePanel } from "./features/recognition-profile-panel";
import type { QrCodeItem } from "./features/qr-panel";
import { createRecognitionSession, discoverRecognitionLanguages } from "./platform/recognition";
import { copyRecognizedText, readRecognitionPreferences, saveRecognitionPreferences, supportsNativeOutput } from "./platform/native";
import { DEFAULT_RECOGNITION_PREFERENCES, type RecognitionPreferences } from "./features/recognition-preferences-codec";

export function WorkspaceRecognition({ image, revision, prepare }: {
  image: ImageDocument; revision: number;
  prepare: (signal: AbortSignal, languages: readonly string[]) => Promise<RecognitionController>;
}) {
  const sourceKey = `${image.id}:${revision}`;
  const [languages, setLanguages] = useState<readonly string[]>([]);
  const [language, setLanguage] = useState("");
  const [preserve, setPreserve] = useState(true);
  const [profile, setProfile] = useState<Readonly<RecognitionPreferences>>(DEFAULT_RECOGNITION_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState("");
  const preferenceLock = useRef(false);
  const [result, setResult] = useState<{ key: string; text: string; codes: readonly QrCodeItem[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const running = useRef(false);
  const copying = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const controller = useRef<RecognitionController | null>(null);

  useEffect(() => {
    const query = new AbortController();
    void Promise.all([discoverRecognitionLanguages(query.signal), readRecognitionPreferences().catch(() => {
      if (!query.signal.aborted) setPreferenceNotice("Saved OCR preferences could not be loaded; defaults are active.");
      return DEFAULT_RECOGNITION_PREFERENCES;
    })]).then(([values, saved]) => {
      if (!query.signal.aborted) {
        setLanguages(values); setProfile(saved); setPreserve(saved.preserveLineBreaks);
        const preferred = saved.languages.map(tag => values.find(value => value.toLowerCase() === tag.toLowerCase())).find(Boolean);
        setLanguage(preferred ?? values[0] ?? "");
      }
    }).catch(reason => { if (!query.signal.aborted) setError(reason instanceof Error ? reason.message : "Recognition is unavailable."); })
      .finally(() => { if (!query.signal.aborted) setPreferencesReady(true); });
    return () => query.abort();
  }, []);

  useEffect(() => {
    sequence.current++;
    abort.current?.abort(); controller.current?.dispose(); controller.current = null;
    running.current = false;
    setBusy(false); setResult(null); setError(null);
    return () => { sequence.current++; abort.current?.abort(); controller.current?.dispose(); controller.current = null; running.current = false; };
  }, [sourceKey]);

  async function recognize(kind: RecognitionKind | "both", selectedLanguage?: string) {
    if (running.current || copying.current || preferenceLock.current || !preferencesReady) return;
    const token = ++sequence.current;
    const operation = new AbortController(); abort.current = operation;
    running.current = true; setBusy(true); setError(null); setResult(null);
    let current: RecognitionController | undefined;
    try {
      current = await prepare(operation.signal, languages);
      if (operation.signal.aborted || token !== sequence.current) return;
      controller.current = current;
      let text = ""; let codes: readonly QrCodeItem[] = [];
      const kinds: readonly RecognitionKind[] = kind === "both" ? ["text", "qr"] : [kind];
      for (const requested of kinds) {
        if (operation.signal.aborted || token !== sequence.current) return;
        const value = await current.recognize(requested, { language: selectedLanguage, preserveLineBreaks: preserve });
        if (!value || operation.signal.aborted || token !== sequence.current) return;
        if (requested === "text") text = value.rawText; else codes = value.codes;
        setResult({ key: sourceKey, text, codes });
      }
    } catch (reason) {
      if (token === sequence.current && !operation.signal.aborted) setError(reason instanceof Error ? reason.message : "Recognition failed.");
    } finally {
      current?.dispose();
      if (token === sequence.current) { controller.current = null; running.current = false; setBusy(false); }
    }
  }

  function cancel() {
    sequence.current++; abort.current?.abort(); controller.current?.dispose(); controller.current = null;
    running.current = false; setBusy(false); setError(null);
  }

  function copy(text: string) {
    if (copying.current || running.current) return;
    copying.current = true;
    const token = sequence.current;
    void copyRecognizedText(text).catch(reason => {
      if (token === sequence.current) setError(reason instanceof Error ? reason.message : "Text copy failed.");
    }).finally(() => { copying.current = false; });
  }

  async function saveProfile(reset = false) {
    if (running.current || copying.current || preferenceLock.current || !preferencesReady) return;
    preferenceLock.current = true; setSavingPreferences(true); setPreferenceNotice("");
    try {
      const draft = reset ? DEFAULT_RECOGNITION_PREFERENCES : { ...profile, preserveLineBreaks: preserve,
        languages: language ? [language.toLowerCase(), ...profile.languages.filter(tag => tag.toLowerCase() !== language.toLowerCase())].slice(0, 16) : [] };
      const saved = await saveRecognitionPreferences(draft);
      setProfile(saved); setPreserve(saved.preserveLineBreaks);
      if (reset) setLanguage(saved.languages.map(tag => languages.find(value => value.toLowerCase() === tag.toLowerCase())).find(Boolean) ?? languages[0] ?? "");
      setPreferenceNotice(reset ? "Recognition preferences reset and saved." : "Recognition preferences saved.");
    } catch (reason) { setPreferenceNotice(reason instanceof Error ? reason.message : "Unable to save recognition preferences."); }
    finally { preferenceLock.current = false; setSavingPreferences(false); }
  }

  const visible = result?.key === sourceKey ? result : null;
  return (
    <>
      <RecognitionProfilePanel
        value={profile}
        supportedLanguages={languages}
        busy={busy || savingPreferences || !preferencesReady}
        onChange={setProfile}
        onSave={() => {
          void saveProfile();
        }}
        onReset={() => {
          void saveProfile(true);
        }}
      />
      <fieldset disabled={busy || savingPreferences || !preferencesReady}>
        <legend>Recognition Actions</legend>
        <button
          disabled={profile.mode !== "qr" && !language}
          onClick={() => {
            void recognize(
              profile.mode === "ocr" ? "text" : profile.mode,
              language,
            );
          }}
        >
          Recognize using profile
        </button>
      </fieldset>
      {preferenceNotice && <p role="status">{preferenceNotice}</p>}
      <RecognitionWorkspace
        languages={languages}
        language={language}
        preserveLineBreaks={preserve}
        text={visible?.text ?? ""}
        codes={visible?.codes ?? []}
        busy={busy || savingPreferences || !preferencesReady}
        error={error}
        onLanguageChange={setLanguage}
        onPreserveLineBreaksChange={setPreserve}
        onRecognize={(kind, selected) => {
          void recognize(kind, selected);
        }}
        onCopy={copy}
        onCancel={cancel}
      />
    </>
  );
}

export { createRecognitionSession };
