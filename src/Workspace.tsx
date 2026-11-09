import { useCallback, useEffect, useRef, useState, type MouseEvent, type FormEvent } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "./contracts/settings";
import { PreferenceControls } from "./Workspace.preferences";
import { ApplicationPreferenceControls } from "./Workspace.application-preferences";
import { WorkspaceDestination } from "./Workspace.destination";
import { DEFAULT_APP_PREFERENCES, type FerbyAppPreferences } from "./features/app-preferences";
import { readApplicationPreferences, saveApplicationPreferences, setWorkspaceOnTop, setMenuBarIcon } from "./platform/native";
import { readLoginState, setLaunchAtLogin, notifyCaptureCompleted } from "./platform/native";
import type { Annotation } from "./contracts/editor";
import { withWorkspaceAnnotations, renderWorkspaceDocument } from "./platform/annotations";
import type { AdvancedEditorItem } from "./features/editor/advanced-workbench";
import { WorkspaceEditor } from "./Workspace.editor";
import type { CaptureMode, ImageDocument } from "./contracts/media";
import type { DisplayGeometry } from "./features/capture-session";
import { mapClientPoint } from "./features/point-map";
import { inspectImagePixel, type InspectedPixel } from "./platform/pixel-inspection";
import { AverageColorControls } from "./Workspace.average-color";
import { copyColor, type ColorCopyFormat } from "./platform/color-copy";
import { importImage } from "./platform/import-image";
import { captureImageWithScale, copyImage, importClipboardImage, NativeOperationError, pinImage, documentFromPin, readAppInfo, saveImage, savePreferences, transformImage, readCaptureDisplay, type ProcessOptions } from "./platform/native";
import { CaptureRegionSelector, type CaptureSelectedArea } from "./features/capture-region-selector";
import { LibraryPanel } from "./features/library/LibraryPanel";
import { CaptureActionControls, type CaptureActionId } from "./features/capture-action-controls";
import { CapturePreviewController } from "./features/capture-preview";
import { TransformTools } from "./Workspace.tools";
import { MeasurementTools } from "./Workspace.measurement";
import { WorkspaceRecognition, createRecognitionSession } from "./Workspace.recognition";
import { imprintMeasurement } from "./platform/measurement";
import { withOutputPreferences } from "./platform/output-preferences";
import { WorkspaceScroll } from "./Workspace.scroll";
import { RepeatRegionControls, type RepeatRegionHandle } from "./Workspace.repeat-region";
import { captureActiveWindow } from "./platform/native";
import { WorkspaceLifecycle } from "./Workspace.lifecycle";
import { WorkspaceDeepLinks } from "./Workspace.deep-links";
import { WorkspaceDocumentOpen } from "./Workspace.document-open";
import { openRequestedDocument } from "./platform/native";
import { WorkspaceDrag } from "./Workspace.drag";
import { prepareImageDrag } from "./platform/native";
import { WorkspaceLayout } from "./Workspace.layout";
import { WorkspaceSettingsDialog } from "./Workspace.settings-dialog";
import { WorkspaceWindowAppearance } from "./Workspace.window-appearance";
import { applyWindowAppearance, type WindowAppearanceOptions } from "./platform/window-appearance";
import { composeWorkspaceLayout, type WorkspaceLayoutPlan } from "./platform/layout";
import { AutoAdjustPanel } from "./features/auto-adjust-panel";
import type { AutoAdjustOptions } from "./features/auto-adjust";
import { autoAdjustDocument } from "./platform/auto-adjust";
import { WorkspaceArchive } from "./Workspace.archive";
import { encodeEditorSession, decodeEditorSession } from "./features/editor-session-codec";
import type { ArchiveJson, ArchiveLibrary } from "./features/archive-workflow";
import { LocalOutputWorkspace } from "./features/local-output-workspace";
import type { PrintSheetOptions } from "./features/local-output";
import { openPrintPreview, supportsNativeOutput } from "./platform/native";
import { listenGlobalActions, listenWorkspaceMenu } from "./platform/native";
import { WorkspaceShortcuts } from "./Workspace.shortcuts";
import { EffectsPanel, type PixelEffectRequest } from "./features/effects-panel";
import { applyImageEffect } from "./platform/native";
import type { MeasurementReadout, MeasurementUnitMode } from "./features/measurement-panel";
import {
  IconFolderOpen,
  IconClipboard,
  IconWindow,
  IconScroll,
  IconArchive,
  IconKeyboard,
  IconPencil,
  IconColorPicker,
  IconRuler,
  IconScanText,
  IconSparkles,
  IconMagicWand,
  IconLayers,
  IconPrinter,
  IconPin,
  IconSave,
  IconMerge,
  IconClose,
  IconRestore,
} from "./components/icons";
import "./Workspace.css";

const EMPTY_ADVANCED_ITEMS: readonly AdvancedEditorItem[] = Object.freeze([]);

export default function Workspace() {
  const [images, setImages] = useState<ImageDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [runtimeLabel, setRuntimeLabel] = useState("Local workspace");
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...DEFAULT_SETTINGS }));
  const [applicationPreferences, setApplicationPreferences] = useState<Readonly<FerbyAppPreferences>>(DEFAULT_APP_PREFERENCES);
  const [loginSupported, setLoginSupported] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState("");
  const [notice, setNotice] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [scrollActive, setScrollActive] = useState(false);
  const sessionRevision = useRef(0);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [autoAdjustOpen, setAutoAdjustOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const globalAction = useRef<(action: unknown, fromMenu?: boolean) => void>(() => {});
  const [capturePreviewId, setCapturePreviewId] = useState<string | null>(null);
  const [selectingRegion, setSelectingRegion] = useState<{
    image: ImageDocument;
    displayScale: number | null;
    recognizeAfter: boolean;
    display: DisplayGeometry | null;
  } | null>(null);
  // A selection screenshot is a private temporary resource until the crop is committed.
  useEffect(() => {
    if (!selectingRegion) return;
    return () => URL.revokeObjectURL(selectingRegion.image.src);
  }, [selectingRegion]);
  const dismissCapturePreview = useCallback((id: string) => setCapturePreviewId(current => current === id ? null : current), []);
  const sourceRevisions = useRef(new Map<string, number>());
  const captureScales = useRef(new Map<string, number>());
  const originalById = useRef(new Map<string, string>());
  const [annotationsById, setAnnotationsById] = useState<ReadonlyMap<string, readonly Annotation[]>>(() => new Map());
  const [advancedById, setAdvancedById] = useState<ReadonlyMap<string, readonly AdvancedEditorItem[]>>(() => new Map());
  const [pixel, setPixel] = useState<{ imageId: string; value: InspectedPixel } | null>(null);
  const [pixelCopyFormat, setPixelCopyFormat] = useState<ColorCopyFormat>("hex");
  const picker = useRef<HTMLInputElement>(null);
  const repeatRegion = useRef<RepeatRegionHandle>(null);
  const liveImages = useRef<ImageDocument[]>([]);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const image = images.find((item) => item.id === selectedId);
  const capturePreview = images.find(item => item.id === capturePreviewId);
  const annotations = image ? annotationsById.get(image.id) ?? [] : [];
  const advancedItems = image ? advancedById.get(image.id) ?? EMPTY_ADVANCED_ITEMS : EMPTY_ADVANCED_ITEMS;
  const imageRevision = image ? sourceRevisions.current.get(image.id) ?? 0 : 0;
  const originalId = image ? originalById.current.get(image.id) : undefined;
  const originalImage = originalId ? images.find(item => item.id === originalId) : undefined;
  const withEdits = <T,>(source: ImageDocument, basic: readonly Annotation[], use: (document: ImageDocument) => Promise<T>) => withWorkspaceAnnotations(source, basic, advancedById.get(source.id) ?? EMPTY_ADVANCED_ITEMS, use);

  function addDocument(next: ImageDocument, select = true) {
    if (!mounted.current) { captureScales.current.delete(next.id); URL.revokeObjectURL(next.src); return; }
    if (liveImages.current.length >= 512) { captureScales.current.delete(next.id); URL.revokeObjectURL(next.src); throw new RangeError("Session library is limited to 512 images."); }
    sessionRevision.current++;
    liveImages.current = [...liveImages.current, next];
    setImages([...liveImages.current]);
    if (select) { setSelectedId(next.id); setZoom(applicationPreferences.defaultZoomPercent / 100); }
  }

  function addDerivedDocument(next: ImageDocument, parentId: string, preserveScale = true) {
    const originalId = originalById.current.get(parentId) ?? parentId;
    const scale = captureScales.current.get(parentId);
    if (preserveScale && scale !== undefined) captureScales.current.set(next.id, scale);
    addDocument(next);
    if (liveImages.current.some(document => document.id === next.id)) originalById.current.set(next.id, originalId);
  }

  function restoreOriginal() {
    if (busyRef.current || scrollActive || !image) return;
    const id = originalById.current.get(image.id);
    if (!id || !liveImages.current.some(document => document.id === id)) {
      setNotice("The source image is no longer retained in this session."); return;
    }
    setSelectedId(id); setZoom(applicationPreferences.defaultZoomPercent / 100);
    setNotice("Returned to the retained source; the derived image and all edit histories remain in the library.");
  }

  function archiveSnapshot(): ArchiveLibrary {
    const data: Record<string, ArchiveJson> = Object.create(null);
    const portable = ({ text, counter, ...required }: Annotation): Annotation => ({ ...required,
      ...(text === undefined ? {} : { text }), ...(counter === undefined ? {} : { counter }) });
    for (const source of liveImages.current) data[source.id] = JSON.parse(encodeEditorSession({
      basic: (annotationsById.get(source.id) ?? []).map(portable),
      advanced: (advancedById.get(source.id) ?? EMPTY_ADVANCED_ITEMS).map(item => item.itemKind === "contract" ? { ...item, annotation: portable(item.annotation) } : item),
    }, source.width, source.height)) as ArchiveJson;
    return { revision: sessionRevision.current, images: liveImages.current,
      selectedId: liveImages.current.some(source => source.id === selectedId) ? selectedId : null, annotations: data };
  }

  function commitArchive(candidate: ArchiveLibrary, expectedRevision: number): boolean {
    if (!mounted.current || sessionRevision.current !== expectedRevision) return false;
    const existing = new Map(liveImages.current.map(source => [source.id, source]));
    const basic = new Map(annotationsById), advanced = new Map(advancedById);
    for (const source of candidate.images) {
      if (existing.has(source.id)) continue;
      const session = decodeEditorSession(JSON.stringify(candidate.annotations[source.id]), source.width, source.height);
      basic.set(source.id, session.basic); advanced.set(source.id, session.advanced);
    }
    // All decoding precedes the synchronous, non-throwing commit boundary.
    liveImages.current = candidate.images.map(source => existing.get(source.id) ?? { ...source });
    sessionRevision.current = candidate.revision;
    setAnnotationsById(basic); setAdvancedById(advanced); setImages([...liveImages.current]);
    setSelectedId(candidate.selectedId); setZoom(null);
    return true;
  }

  async function operate(operation: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(""); setNotice("");
    try { await operation(); }
    catch (reason) {
      if (reason instanceof NativeOperationError && reason.code === "cancelled") setNotice("Capture cancelled.");
      else setError(reason instanceof Error ? reason.message : "The image operation failed.");
    } finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }

  function openClipboard() {
    void operate(async () => { addDocument(await importClipboardImage()); setNotice("Clipboard image opened."); });
  }

  async function finishCapture(capture: { image: ImageDocument; displayScale: number | null }, recognizeAfter = false) {
    const captured = capture.image;
    if (capture.displayScale !== null) captureScales.current.set(captured.id, capture.displayScale);
    const behavior = recognizeAfter ? "open-editor" : applicationPreferences.postCaptureBehavior;
    addDocument(captured, behavior === "open-editor" || behavior === "show-preview");
    if (!mounted.current) return;
    setCapturePreviewId(null);
    if (behavior === "copy-only" || behavior === "save-only") {
      try {
        const completed = await withOutputPreferences(captured, settings, capture.displayScale, async output => {
          if (behavior === "copy-only") { await copyImage(output); return true; }
          return saveImage(output, settings.saveFormat, settings.jpegQuality);
        });
        if (mounted.current) setNotice(completed ? (behavior === "copy-only" ? "Capture copied; recovery image retained in library." : "Capture saved; recovery image retained in library.") : "Save cancelled; capture retained in library.");
        if (completed) await notifyCapture(behavior === "copy-only" ? "copied" : "saved");
      } catch (reason) {
        if (mounted.current) { setSelectedId(captured.id); setZoom(applicationPreferences.defaultZoomPercent / 100); }
        throw reason;
      }
      return;
    }
    if (mounted.current) {
      setCapturePreviewId(settings.showPreview && behavior === "show-preview" && !recognizeAfter ? captured.id : null); setNotice("Capture opened.");
      setEditing(behavior === "open-editor" && !recognizeAfter); setInspecting(false); setMeasuring(false);
      if (recognizeAfter) { setRecognizing(true); setEditing(false); setInspecting(false); setMeasuring(false); }
    }
    await notifyCapture("opened");
  }

  async function notifyCapture(action: "opened" | "copied" | "saved") {
    if (!mounted.current || !applicationPreferences.showSystemNotifications || !supportsNativeOutput()) return;
    try { await notifyCaptureCompleted(action); }
    catch { if (mounted.current) setPreferenceNotice("Capture completed; its notification could not be submitted."); }
  }

  function capture(mode: CaptureMode, recognizeAfter = false) {
    void operate(async () => {
      setCapturing(true);
      try {
        if (mode === "area") {
          const display = await readCaptureDisplay().catch(() => null);
          const frame = await captureImageWithScale("fullscreen");
          if (!mounted.current) { URL.revokeObjectURL(frame.image.src); return; }
          setSelectingRegion({
            image: frame.image,
            displayScale: frame.displayScale,
            recognizeAfter,
            display,
          });
          return;
        }
        await finishCapture(await captureImageWithScale(mode), recognizeAfter);
      } finally {
        if (mounted.current) setCapturing(false);
      }
    });
  }

  globalAction.current = (action, fromMenu = false) => {
    const focused = document.activeElement;
    if (busyRef.current || selectingRegion || document.querySelector('[aria-modal="true"]') || scrollActive || shortcutsOpen || (!fromMenu && document.hasFocus() && focused instanceof HTMLElement && (focused.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(focused.tagName)))) return;
    if (action === "capture-fullscreen") capture("fullscreen");
    else if (action === "capture-area") capture("area");
    else if (action === "capture-window") capture("window");
    else if (action === "capture-active-window") captureActive();
    else if (action === "capture-repeat-region") repeatRegion.current?.repeat();
    else if (action === "capture-scrolling") setScrolling(true);
    else if (action === "ocr-capture") capture("area", true);
    else if (action === "show-workspace") { window.focus(); setNotice("Workspace focused."); }
    else if (fromMenu && action === "open-clipboard") openClipboard();
    else if (fromMenu && action === "image-copy") copy();
    else if (fromMenu && action === "image-save") save();
    else if (fromMenu && action === "image-pin") pin();
    else if (fromMenu && action === "image-print" && image) setOutputOpen(true);
  };

  function captureActive() {
    void operate(async () => {
      setCapturing(true);
      try { await finishCapture(await captureActiveWindow()); }
      finally { if (mounted.current) setCapturing(false); }
    });
  }

  function requestCaptureAction(action: CaptureActionId) {
    if (busyRef.current || selectingRegion || scrollActive) return;
    if (action === "fullscreen" || action === "area" || action === "window") capture(action);
    else if (action === "active-window") captureActive();
    else if (action === "fixed-region") repeatRegion.current?.open();
    else if (action === "repeat-region") repeatRegion.current?.repeat();
    else if (action === "scrolling") setScrolling(true);
    else if (action === "ocr") capture("area", true);
  }

  useEffect(() => {
    let active = true; let unlisten: (() => void) | undefined;
    void listenGlobalActions(action => { if (active) globalAction.current(action); }).then(dispose => {
      if (active) unlisten = dispose; else dispose();
    }).catch(() => { if (active) setNotice("Global shortcut events are unavailable in this window."); });
    return () => { active = false; unlisten?.(); };
  }, []);

  useEffect(() => {
    let active = true; let unlisten: (() => void) | undefined;
    void listenWorkspaceMenu(action => { if (active) globalAction.current(action, true); }).then(dispose => {
      if (active) unlisten = dispose; else dispose();
    }).catch(() => { if (active) setNotice("Native menu events are unavailable in this window."); });
    return () => { active = false; unlisten?.(); };
  }, []);

  useEffect(() => { if (!settings.showPreview) setCapturePreviewId(null); }, [settings.showPreview]);

  function previewOperation(id: string, use: (document: ImageDocument) => Promise<unknown>, output = false) {
    const target = liveImages.current.find(document => document.id === id);
    if (!target || busyRef.current) return;
    dismissCapturePreview(id);
    void operate(async () => { await withEdits(target, annotationsById.get(id) ?? [], rendered => output ? withOutputPreferences(rendered, settings, captureScales.current.get(id), use) : use(rendered)); });
  }

  function previewEdit(id: string, recognize = false) {
    if (!liveImages.current.some(document => document.id === id) || busyRef.current) return;
    dismissCapturePreview(id); setSelectedId(id); setZoom(null);
    setEditing(!recognize); setRecognizing(recognize); setInspecting(false); setMeasuring(false);
  }

  function transform(options: ProcessOptions) {
    if (!image) return;
    void operate(async () => { addDerivedDocument(await withEdits(image, annotations, (rendered) => transformImage(rendered, options)), image.id, !!options.crop); setNotice("New image created; original preserved."); });
  }

  function changeWindowAppearance(options: WindowAppearanceOptions) {
    if (!image) return;
    void operate(async () => {
      addDerivedDocument(await withEdits(image, annotations, source => applyWindowAppearance(source, options)), image.id);
      setNotice("Window appearance applied to a new image; source preserved.");
    });
  }

  function samplePixel(point: { x: number; y: number }) {
    if (!image || !inspecting || busyRef.current) return;
    void operate(async () => {
      const value = await inspectImagePixel(image, point);
      if (mounted.current) { setPixel({ imageId: image.id, value }); setNotice("Pixel color sampled."); }
    });
  }

  function inspect(event: MouseEvent<HTMLImageElement>) {
    if (!image || !inspecting || busyRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const mapped = mapClientPoint({ x: event.clientX, y: event.clientY },
      { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height }, image);
    samplePixel({ x: Math.min(image.width - 1, Math.floor(mapped.x)), y: Math.min(image.height - 1, Math.floor(mapped.y)) });
  }

  function inspectCoordinates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    samplePixel({ x: Number(values.get("x")), y: Number(values.get("y")) });
  }

  function updateAnnotations(id: string, next: readonly Annotation[]) {
    if (!liveImages.current.some((document) => document.id === id)) return;
    sessionRevision.current++;
    sourceRevisions.current.set(id, (sourceRevisions.current.get(id) ?? 0) + 1);
    setAnnotationsById((previous) => new Map(previous).set(id, next));
  }

  function updateAdvanced(id: string, items: readonly AdvancedEditorItem[]) {
    if (!liveImages.current.some(document => document.id === id)) return;
    sessionRevision.current++;
    sourceRevisions.current.set(id, (sourceRevisions.current.get(id) ?? 0) + 1);
    setAdvancedById(previous => new Map(previous).set(id, items));
  }

  function mergeAnnotations() {
    if (!image) return;
    void operate(async () => {
      addDerivedDocument(await renderWorkspaceDocument(image, annotations, advancedItems), image.id);
      setNotice("Merged image created; original and edit history preserved.");
    });
  }

  function applyEffect(effect: PixelEffectRequest) {
    if (!image) return;
    void operate(async () => {
      addDerivedDocument(await withEdits(image, annotations, rendered => applyImageEffect(rendered, effect)), image.id);
      setNotice("Effect image created; original and edit history preserved.");
    });
  }

  function composeLayout(plan: WorkspaceLayoutPlan) {
    void operate(async () => {
      const next = await composeWorkspaceLayout(plan, liveImages.current, source =>
        withEdits(source, annotationsById.get(source.id) ?? [], async rendered => {
          const element = new Image(); element.src = rendered.src; await element.decode();
          return createImageBitmap(element);
        }));
      addDocument(next); setNotice("Composed image created; all sources and edits preserved.");
    });
  }

  function autoAdjust(options: AutoAdjustOptions) {
    if (!image) return;
    void operate(async () => {
      addDerivedDocument(await withEdits(image, annotations, rendered => autoAdjustDocument(rendered, options)), image.id);
      setNotice("Adjusted image created using Ferby's tonal rule; original and edits preserved.");
    });
  }

  function print(options: PrintSheetOptions) {
    if (!image) return;
    void operate(async () => {
      await withEdits(image, annotations, rendered => openPrintPreview(rendered, options));
      setNotice("Print preview opened. Use its explicit print button to open the system dialog.");
    });
  }

  function imprint(readout: MeasurementReadout, unit: MeasurementUnitMode) {
    if (!image) return;
    void operate(async () => {
      addDerivedDocument(await withEdits(image, annotations, rendered => imprintMeasurement(rendered, readout.rectPx, readout.displayScale, unit)), image.id);
      setNotice("Measured image created; original and edit history preserved.");
    });
  }

  function pin() {
    if (!image) return;
    void operate(async () => { await withEdits(image, annotations, pinImage); setNotice("Image pinned."); });
  }

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/core").then(async ({ isTauri }) => {
      if (!isTauri()) return;
      const { listen } = await import("@tauri-apps/api/event");
      const dispose = await listen<import("./platform/native").PinWire>("ferby-pin-edit", ({ payload }) => {
        if (!active) return;
        const existing = liveImages.current.find((item) => item.id === payload.sourceId);
        if (existing) { setSelectedId(existing.id); setZoom(null); }
        else {
          try { addDocument(documentFromPin(payload)); }
          catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to restore pinned image."); return; }
        }
        setEditing(true); setInspecting(false); setMeasuring(false);
      });
      if (!active) dispose(); else unlisten = dispose;
    }).catch(() => { /* Event support may be absent in browser/mock transports. */ });
    return () => { active = false; unlisten?.(); };
  }, []);

  function copy() {
    if (!image) return;
    void operate(async () => { await withEdits(image, annotations, rendered => withOutputPreferences(rendered, settings, captureScales.current.get(image.id), copyImage)); setNotice("Image copied to clipboard."); });
  }

  function save() {
    if (!image) return;
    void operate(async () => { const saved = await withEdits(image, annotations, rendered => withOutputPreferences(rendered, settings, captureScales.current.get(image.id), output => saveImage(output, settings.saveFormat, settings.jpegQuality))); setNotice(saved ? "Image saved." : "Save cancelled."); });
  }

  function persistPreferences() {
    void operate(async () => {
      const saved = await savePreferences(settings);
      setSettings(saved);
      try {
        const full = await saveApplicationPreferences({ ...applicationPreferences, baseSettings: saved });
        setApplicationPreferences(full);
      } catch (reason) {
        setPreferenceNotice("Export preferences saved, but application behavior could not be saved. Retry Save preferences.");
        throw reason;
      }
      setPreferenceNotice("Preferences saved.");
    });
  }

  function changeApplicationPreferences(next: FerbyAppPreferences) {
    if (busyRef.current) return;
    if (next.keepEditorAlwaysOnTop !== applicationPreferences.keepEditorAlwaysOnTop) {
      void operate(async () => { await setWorkspaceOnTop(next.keepEditorAlwaysOnTop); if (mounted.current) setApplicationPreferences(next); });
    } else if (next.showInMenuBar !== applicationPreferences.showInMenuBar) {
      void operate(async () => { await setMenuBarIcon(next.showInMenuBar); if (mounted.current) setApplicationPreferences(next); });
    } else if (next.launchAtLogin !== applicationPreferences.launchAtLogin) {
      void operate(async () => {
        const actual = await setLaunchAtLogin(next.launchAtLogin);
        if (mounted.current) setApplicationPreferences({ ...next, launchAtLogin: actual });
      });
    } else setApplicationPreferences(next);
  }

  useEffect(() => {
    let active = true;
    void readApplicationPreferences().then(async loaded => {
      if (!active) return;
      setApplicationPreferences(loaded); setSettings({ ...loaded.baseSettings });
      if (supportsNativeOutput()) {
        try { await setWorkspaceOnTop(loaded.keepEditorAlwaysOnTop); }
        catch { if (active) setPreferenceNotice("Preferences loaded; window-on-top could not be applied."); }
        if (active) {
          try { await setMenuBarIcon(loaded.showInMenuBar); }
          catch { if (active) setPreferenceNotice("Preferences loaded; menu bar icon could not be applied."); }
        }
        if (active) {
          try {
            const login = await readLoginState();
            if (active) { setLoginSupported(login.supported); setApplicationPreferences(previous => ({ ...previous, launchAtLogin: login.enabled })); }
          } catch { if (active) setPreferenceNotice("Preferences loaded; launch-at-login state is unavailable."); }
        }
      }
    })
      .catch(() => { if (active) setPreferenceNotice("Saved preferences could not be loaded. Defaults are active."); })
      .finally(() => { if (active) setPreferencesReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void readAppInfo().then((info) => {
      if (active && info) setRuntimeLabel(`v${info.version} · ${info.platform}`);
    }).catch(() => { if (active) setRuntimeLabel("Desktop connection unavailable"); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; liveImages.current.forEach((item) => URL.revokeObjectURL(item.src)); };
  }, []);

  async function openFiles(files: File[]) {
    if (!files.length || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(""); setNotice("");
    try {
      for (const file of files) {
        if (!mounted.current) break;
        const next = await importImage(file);
        addDocument(next);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open this image.");
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }

  function removeImage(id: string) {
    if (busyRef.current) return;
    sessionRevision.current++;
    const removed = liveImages.current.find((item) => item.id === id);
    if (removed) URL.revokeObjectURL(removed.src);
    dismissCapturePreview(id);
    sourceRevisions.current.delete(id);
    originalById.current.delete(id);
    captureScales.current.delete(id);
    setAdvancedById(previous => { const next = new Map(previous); next.delete(id); return next; });
    setAnnotationsById((previous) => { const next = new Map(previous); next.delete(id); return next; });
    liveImages.current = liveImages.current.filter((item) => item.id !== id);
    setImages([...liveImages.current]);
    if (selectedId === id) setSelectedId(liveImages.current[liveImages.current.length - 1]?.id ?? null);
  }

  return (
    <div className="workspace">
      <aside className="sidebar" inert={!!selectingRegion}>
        <div className="brand"><span className="brand-mark" aria-hidden="true"><IconWindow size={21} /></span><div>ferby<span>Image workspace</span></div><span className="version-badge">0.1</span></div>
        <button className="open-button" onClick={() => picker.current?.click()} disabled={busy}><IconFolderOpen /><span>＋ Open image</span></button>
        <button className="open-button clipboard-open" disabled={busy} onClick={openClipboard}><IconClipboard /><span>Open clipboard image</span></button>
        <p className="section-label">Capture</p>
        <fieldset className="capture-controls" disabled={busy} aria-label="Capture controls">
          <CaptureActionControls disabled={busy || capturing || scrollActive}
            activeWindowSupported={supportsNativeOutput()} fixedRegionSupported={supportsNativeOutput()} onAction={requestCaptureAction} />
        </fieldset>
        <button className="sidebar-action-btn ferby-toggle" disabled={busy} aria-pressed={scrolling} onClick={() => setScrolling(value => !value)}><IconScroll /><span>Manual scrolling capture</span><span className="toggle-indicator" aria-hidden="true" /></button>
        {supportsNativeOutput() && <RepeatRegionControls controlRef={repeatRegion} busy={busy || scrollActive || !preferencesReady} run={operate}
          onCapture={(captured, scale) => finishCapture({ image: captured, displayScale: scale })} />}
        <button className="sidebar-action-btn ferby-toggle" disabled={busy} aria-pressed={archiveOpen} onClick={() => setArchiveOpen(value => !value)}><IconArchive /><span>Local session archive</span><span className="toggle-indicator" aria-hidden="true" /></button>
        <button className="sidebar-action-btn ferby-toggle" disabled={busy} aria-pressed={shortcutsOpen} onClick={() => setShortcutsOpen(value => !value)}><IconKeyboard /><span>Global shortcuts</span><span className="toggle-indicator" aria-hidden="true" /></button>
        <p className="section-label library-label">Library<span>{images.length}</span></p>
        <fieldset className="library-controls" disabled={busy} aria-label="Session library controls">
          <LibraryPanel images={images} selectedId={selectedId}
            onSelect={(id) => { if (!busyRef.current) { setSelectedId(id); setZoom(applicationPreferences.defaultZoomPercent / 100); } }}
            onRemove={removeImage} />
        </fieldset>
        <WorkspaceLifecycle context={{ documentId: image?.id ?? null, revision: sessionRevision.current,
          imageIds: images.map(item => item.id), dirty: images.length > 0, busy: busy || scrollActive, editable: false }}
          onTop={applicationPreferences.keepEditorAlwaysOnTop} onTopChanged={value => setApplicationPreferences(previous => ({ ...previous, keepEditorAlwaysOnTop: value }))} />
        <div className="sidebar-bottom"><span><span className="status-dot" /> Images stay on this device</span><small>{runtimeLabel}</small></div>
      </aside>
      <main className="main-panel" inert={!!selectingRegion}>
        <WorkspaceDocumentOpen busy={busy || scrollActive || !preferencesReady} run={operate} onOpen={async id => {
          addDocument(await openRequestedDocument(id)); setNotice("Image opened from the desktop.");
        }} />

        <header className="topbar"><div className="document-title">{image?.name ?? "Untitled workspace"}<span>{image ? `${image.width} × ${image.height} px` : "Capture, annotate, make it clear."}</span></div><div className="workspace-settings" role="group" aria-label="Workspace preferences">        <WorkspaceDeepLinks context={{ documentId: image?.id ?? null, revision: sessionRevision.current,
          imageIds: images.map(item => item.id), dirty: images.length > 0, busy: busy || scrollActive || !preferencesReady, editable: false }}
          onCapture={capture} onEditor={id => { if (busyRef.current || !liveImages.current.some(source => source.id === id)) return;
            setSelectedId(id); setZoom(applicationPreferences.defaultZoomPercent / 100); setEditing(true); setInspecting(false); setMeasuring(false); setRecognizing(false); }} /><WorkspaceSettingsDialog><WorkspaceDestination busy={busy || scrollActive} run={operate} /><PreferenceControls settings={settings} ready={preferencesReady} busy={busy} notice={preferenceNotice} onChange={setSettings} onSave={persistPreferences} /><ApplicationPreferenceControls loginSupported={loginSupported} value={{ ...applicationPreferences, baseSettings: settings }} disabled={!preferencesReady || busy} onChange={changeApplicationPreferences} /></WorkspaceSettingsDialog></div></header>
        <div className="toolbar">
          <div className="toolbar-left">
            <span className="mode-badge">{editing ? "Edit" : "Preview"}</span>
            {image && (
              <div className="segmented-tool-group" role="group" aria-label="Editor modes">
                <button className="inspect-toggle ferby-toggle" disabled={busy} aria-label="Annotate image" title="Annotate image" aria-pressed={editing} onClick={() => { setEditing((value) => !value); setInspecting(false); setMeasuring(false); }}><IconPencil /><span>Annotate</span></button>
                <button className="inspect-toggle ferby-toggle" disabled={busy} aria-label="Inspect color" title="Inspect color" aria-pressed={inspecting} onClick={() => { setInspecting((value) => !value); setEditing(false); setMeasuring(false); }}><IconColorPicker /><span>Color</span></button>
                <button className="inspect-toggle ferby-toggle" disabled={busy} aria-label="Measure image" title="Measure image" aria-pressed={measuring} onClick={() => { setMeasuring(value => !value); setEditing(false); setInspecting(false); }}><IconRuler /><span>Measure</span></button>
                <button className="inspect-toggle ferby-toggle" disabled={busy} aria-label="Recognize text / QR" title="Recognize text / QR" aria-pressed={recognizing} onClick={() => setRecognizing(value => !value)}><IconScanText /><span>Text / QR</span></button>
              </div>
            )}
            {image && <TransformTools key={image.id} image={image} busy={busy} onTransform={transform} />}
          </div>
          <div className="zoom-controls">
            <button disabled={!image || busy} aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.1, (value ?? 1) - 0.25))}>−</button>
            <span>{zoom === null ? "Fit" : `${Math.round(zoom * 100)}%`}</span>
            <button disabled={!image || busy} aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(4, (value ?? 1) + 0.25))}>＋</button>
            <button disabled={!image || busy} onClick={() => setZoom(null)}>Fit</button>
            {image && originalId && <button className="tool-btn" disabled={busy || scrollActive || !originalImage} title={originalImage ? `Return to ${originalImage.name}` : "Source image was closed"} onClick={restoreOriginal}><IconRestore /><span>Return to source image</span></button>}
            {image && <button className="tool-btn close-btn" disabled={busy} onClick={() => removeImage(image.id)} aria-label={`Close ${image.name}`}><IconClose /><span>Close</span></button>}
          </div>
        </div>

        {image && (
          <div className="export-toolbar">
            <div className="studio-toggles" role="group" aria-label="Studio features">
              <button className="ferby-toggle" disabled={busy} aria-label="Automatic tonal adjustment" title="Automatic tonal adjustment" aria-pressed={autoAdjustOpen} onClick={() => setAutoAdjustOpen(value => !value)}><IconSparkles /><span>Adjust</span></button>
              <button className="ferby-toggle" disabled={busy} aria-label="Pixel effects" title="Pixel effects" aria-pressed={effectsOpen} onClick={() => setEffectsOpen(value => !value)}><IconMagicWand /><span>Effects</span></button>
              <button className="ferby-toggle" disabled={busy} aria-label="Compose images / backdrop" title="Compose images / backdrop" aria-pressed={layoutOpen} onClick={() => setLayoutOpen(value => !value)}><IconLayers /><span>Compose</span></button>
              <button className="ferby-toggle" disabled={busy} aria-label="Print / local output" title="Print / local output" aria-pressed={outputOpen} onClick={() => setOutputOpen(value => !value)}><IconPrinter /><span>Output</span></button>
            </div>
            <div className="export-actions">
              <label>Export format<select aria-label="Export format" disabled={busy || !preferencesReady} value={settings.saveFormat} onChange={(event) => setSettings((previous) => ({ ...previous, saveFormat: event.target.value as AppSettings["saveFormat"] }))}><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label>
              <button className="action-btn" disabled={busy} onClick={copy}><IconClipboard /><span>Copy image</span></button>
              <button className="action-btn" disabled={busy} onClick={pin}><IconPin /><span>Pin image</span></button>
              <button className="action-btn" disabled={busy || (!annotations.length && !advancedItems.length)} onClick={mergeAnnotations}><IconMerge /><span>Merge annotations</span></button>
              <button className="action-btn action-btn--save" disabled={busy} onClick={save}><IconSave /><span>Save image…</span></button>
              <span className="export-note">Original files are never overwritten.</span>
            </div>
          </div>
        )}

        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
        <div className="workspace-body">
        <section className={`stage ${dragging ? "dragging" : ""} ${image ? "has-image" : ""}`} aria-label="Image workspace" aria-busy={busy}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); void openFiles(Array.from(event.dataTransfer.files)); }}>
          {image ? <div className="image-stage"><img hidden={editing} className={`canvas-image ${zoom === null ? "fit-image" : ""} ${inspecting ? "inspect-image" : ""}`} onClick={inspect} src={image.src} alt={image.name} style={zoom === null ? undefined : { width: image.width * zoom, maxWidth: "none", maxHeight: "none" }} /><WorkspaceEditor image={image} annotations={annotations} advancedItems={advancedItems} active={editing} busy={busy} zoom={zoom} onChange={updateAnnotations} onAdvancedChange={updateAdvanced} /></div> :
            <div className="empty-state"><div className="empty-illustration" aria-hidden="true"><IconWindow size={40} /><span className="empty-illustration__plus">+</span></div><p className="eyebrow">A LITTLE MORE CLARITY</p><h1>Bring the details into focus.</h1><p>A capture, an idea, a detail worth sharing.<br />Drop an image to start making it yours.</p><button className="primary-button" onClick={() => picker.current?.click()} disabled={busy}>{busy ? "Opening…" : "Open an image"}<span aria-hidden="true">↗</span></button><small>PNG, JPEG, WebP or GIF · up to 20 MB</small></div>}
        </section>
          {(shortcutsOpen || archiveOpen || scrolling || (image && (recognizing || outputOpen || autoAdjustOpen || layoutOpen || effectsOpen || measuring || inspecting))) && <aside className="inspector" aria-label="Tool properties">
            <div className="inspector-heading"><span>Properties</span><button disabled={busy || scrollActive} aria-label="Close properties" onClick={() => {
              setShortcutsOpen(false); setArchiveOpen(false); setScrolling(false); setRecognizing(false); setOutputOpen(false);
              setAutoAdjustOpen(false); setLayoutOpen(false); setEffectsOpen(false); setMeasuring(false); setInspecting(false);
            }}><IconClose /></button></div>
        {image && recognizing && (
          <div className="workspace-drawer" >
            <WorkspaceRecognition image={image} revision={imageRevision}
              prepare={(signal, languages) => withEdits(image, annotations, rendered => createRecognitionSession(rendered, imageRevision, signal, languages))} />
          </div>
        )}
        {shortcutsOpen && (
          <div className="workspace-drawer" >
            <WorkspaceShortcuts blocked={busy || scrollActive} />
          </div>
        )}
        {image && outputOpen && (
          <div className="workspace-drawer" >
            <LocalOutputWorkspace key={image.id} image={image} busy={busy}
              canPrint={supportsNativeOutput()} canDrag={false} onCopy={copy} onSave={save} onPrint={print} onDrag={() => {}}
              nativeDragControls={supportsNativeOutput() ? <WorkspaceDrag key={`${image.id}:${imageRevision}:${settings.downscaleRetina}`} busy={busy} run={operate}
                prepare={() => withEdits(image, annotations, rendered => withOutputPreferences(rendered, settings, captureScales.current.get(image.id), prepareImageDrag))} /> : undefined} />
          </div>
        )}
        {archiveOpen && (
          <div className="workspace-drawer" >
            <WorkspaceArchive imageCount={images.length} blocked={busy} snapshot={archiveSnapshot} commit={commitArchive} run={operate} />
          </div>
        )}
        {image && autoAdjustOpen && (
          <div className="workspace-drawer" >
            <AutoAdjustPanel key={image.id} imageWidth={image.width} imageHeight={image.height} busy={busy} onApply={autoAdjust} />
          </div>
        )}
        {image && layoutOpen && (
          <div className="workspace-drawer" >
            <WorkspaceLayout key={image.id} images={images} selected={image} busy={busy} onCompose={composeLayout} />
            <WorkspaceWindowAppearance key={`appearance-${image.id}`} image={image} busy={busy} onApply={changeWindowAppearance} />
          </div>
        )}
        {image && effectsOpen && (
          <div className="workspace-drawer" >
            <EffectsPanel key={image.id} imageWidth={image.width} imageHeight={image.height} busy={busy} onApply={applyEffect} />
          </div>
        )}
        {scrolling && (
          <div className="workspace-drawer" >
            <WorkspaceScroll blocked={busy} onResult={addDocument} onActivityChange={setScrollActive} />
          </div>
        )}
        {image && measuring && <MeasurementTools key={image.id} image={image} busy={busy} onImprint={imprint} />}
        {image && inspecting && (
          <div className="pixel-inspector" >
            <AverageColorControls key={`average-${image.id}`} image={image} busy={busy} run={operate} />
            <form key={`pixel-${image.id}`} onSubmit={inspectCoordinates} aria-label="Inspect pixel coordinates">
              <label>X<input aria-label="Pixel X" type="number" name="x" defaultValue="0" min="0" max={image.width - 1} step="1" required disabled={busy} /></label>
              <label>Y<input aria-label="Pixel Y" type="number" name="y" defaultValue="0" min="0" max={image.height - 1} step="1" required disabled={busy} /></label>
              <button disabled={busy}>Sample color</button>
            </form>
            <output role="status" aria-label="Pixel color">{pixel?.imageId === image.id ? <><span className="pixel-swatch" aria-hidden="true" style={{ backgroundColor: `rgba(${pixel.value.r},${pixel.value.g},${pixel.value.b},${pixel.value.a / 255})` }} />
              <label>Copy format<select aria-label="Pixel copy format" value={pixelCopyFormat} onChange={event => setPixelCopyFormat(event.target.value as ColorCopyFormat)}>
                <option value="hex">HEX</option><option value="rgb">RGB</option><option value="rgba">RGBA</option>
              </select></label>
              <button disabled={busy || !supportsNativeOutput()} onClick={() => { const sampled = pixel.value; void operate(async () => { await copyColor(sampled, pixelCopyFormat); setNotice(`Pixel ${pixelCopyFormat.toUpperCase()} copied.`); }); }}>Copy pixel {pixelCopyFormat.toUpperCase()}</button><span>{pixel.value.hex} · RGBA {pixel.value.r}, {pixel.value.g}, {pixel.value.b}, {pixel.value.a} · Pixel {pixel.value.x}, {pixel.value.y}</span></> : "Click the image or enter coordinates."}</output>
          </div>
        )}
          </aside>}
        </div>
        <footer className="statusbar"><span role="status" aria-live="polite">{busy ? "Working…" : notice || (image ? "Image · session only" : "Ready when you are")}</span><span>{images.length} {images.length === 1 ? "image" : "images"}</span></footer>
      </main>
      {capturePreview && settings.showPreview && <div style={{ position: "fixed", right: 16, bottom: 36, width: "min(360px, 80vw)", maxHeight: "65vh", overflowY: "auto", zIndex: 100 }}>
        <CapturePreviewController key={capturePreview.id} document={capturePreview} paused={busy}
          onClose={dismissCapturePreview} onEdit={id => previewEdit(id)} onOcr={id => previewEdit(id, true)}
          onCopy={id => previewOperation(id, copyImage, true)} onPin={id => previewOperation(id, pinImage)}
          onSave={id => previewOperation(id, document => saveImage(document, settings.saveFormat, settings.jpegQuality), true)} />
      </div>}
      {selectingRegion && (
        <div role="dialog" aria-modal="true" aria-label="Select capture region" onKeyDown={event => {
          if (event.key === "Escape" && !busy) { event.preventDefault(); setSelectingRegion(null); setNotice("Area selection cancelled."); }
        }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", padding: 24, overflow: "auto" }}>
          <CaptureRegionSelector
            image={selectingRegion.image}
            busy={busy}
            onConfirm={(area: CaptureSelectedArea) => {
              const target = selectingRegion;
              void operate(async () => {
                const cropped = await transformImage(target.image, { crop: area });
                // The source URL stays alive until its pixels have been consumed.
                setSelectingRegion(null);
                await finishCapture({ image: cropped, displayScale: target.displayScale }, target.recognizeAfter);
                try {
                  const display = await readCaptureDisplay();
                  const before = target.display;
                  if (!before || display.id !== before.id || display.x !== before.x || display.y !== before.y || display.scale !== before.scale ||
                    display.width !== before.width || display.height !== before.height || target.image.width !== display.width || target.image.height !== display.height) {
                    setNotice("Region captured. Display geometry changed or could not be verified; repeat was not updated.");
                    return;
                  }
                  repeatRegion.current?.rememberRegion(display, area);
                  setNotice("Region captured and remembered for repeat.");
                } catch {
                  setNotice("Region captured. Display geometry was unavailable; repeat was not updated.");
                }
              });
            }}
            onCancel={() => {
              setSelectingRegion(null);
              setNotice("Area selection cancelled.");
            }}
          />
        </div>
      )}
      <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(event) => { void openFiles(Array.from(event.target.files ?? [])); }} />
    </div>
  );
}
