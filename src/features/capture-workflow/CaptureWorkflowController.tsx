import React, { useEffect, useId, useRef, useState } from "react";
import type { CaptureMode, ImageDocument } from "../../contracts/media";
import {
  CapturePreviewController,
  DEFAULT_PREVIEW_AUTO_DISMISS_MS,
  type CapturePreviewCloseReason,
} from "../capture-preview";
import {
  DEFAULT_POST_CAPTURE_PREFERENCES,
  PostCapturePreferencesPanel,
  createPostCaptureToken,
  planPostCaptureSteps,
  runPostCapturePlan,
  type PostCaptureOperationToken,
  type PostCapturePreferences,
  type PostCaptureStep,
} from "../post-capture";
import "./CaptureWorkflowController.css";

/**
 * Evidence note (`A35`):
 * Exact target Shottr post-capture step scheduling/concurrency semantics are `UNKNOWN`.
 * Ferby's deterministic workflow order (`copy -> save -> preview -> edit -> show`) and
 * per-operation token + capture-scoped idempotency ledger are explicit Ferby design choices,
 * not inferred Shottr runtime behavior.
 */
export const CAPTURE_WORKFLOW_SEMANTICS_NOTE = Object.freeze({
  targetSchedulingEvidence: "UNKNOWN" as const,
  ferbyStepOrder: Object.freeze([
    "copy",
    "save",
    "preview",
    "edit",
    "show",
  ] as const),
  isolationRule:
    "Each explicit user capture gets a monotonically increasing operationId and PostCaptureOperationToken; starting a newer capture or unmounting cancels any in-flight token so late promises cannot overwrite state or trigger stale preview actions on a newer document.",
});

export const CAPTURE_WORKFLOW_INTEGRATION_EXAMPLE = `
// Proposed Codex C10/C11 integration:
// <CaptureWorkflowController
//   preferences={postCapturePrefs}
//   onPreferencesChange={setPostCapturePrefs}
//   onCapture={async (mode) => invokeCaptureMode(mode)}
//   onCopy={async (doc) => copyDocumentToClipboard(doc)}
//   onSave={async (doc) => saveDocumentToDisk(doc)}
//   onOpenEditor={async (doc) => openDocumentInEditor(doc)}
//   onRevealWindow={async (doc) => revealMainWindow(doc)}
//   onPin={async (doc) => openPinWindow(doc)}
//   onRecognize={async (doc) => startOcrRecognition(doc)}
// />
`.trim();

export type CaptureWorkflowPhase =
  | "idle"
  | "capturing"
  | "running-post-actions"
  | "preview-open"
  | "completed"
  | "cancelled"
  | "failed";

export interface CaptureWorkflowState {
  readonly phase: CaptureWorkflowPhase;
  readonly operationId: string | null;
  readonly activeDocument: ImageDocument | null;
  readonly completedSteps: readonly PostCaptureStep[];
  readonly failedStep: PostCaptureStep | null;
  readonly errorMessage: string | null;
  readonly closeReason: CapturePreviewCloseReason | null;
}

export interface CaptureWorkflowControllerProps {
  readonly preferences?: Readonly<PostCapturePreferences>;
  readonly autoDismissMs?: number | null;
  readonly onPreferencesChange?: (
    next: Readonly<PostCapturePreferences>,
  ) => void;
  readonly onCapture: (mode: CaptureMode) => Promise<ImageDocument>;
  readonly onCopy?: (doc: ImageDocument) => Promise<void> | void;
  readonly onSave?: (doc: ImageDocument) => Promise<void> | void;
  readonly onOpenEditor?: (doc: ImageDocument) => Promise<void> | void;
  readonly onRevealWindow?: (doc: ImageDocument) => Promise<void> | void;
  readonly onPin?: (doc: ImageDocument) => Promise<void> | void;
  readonly onRecognize?: (doc: ImageDocument) => Promise<void> | void;
  readonly onReleaseSource?: (doc: ImageDocument) => void;
}

export const CaptureWorkflowController: React.FC<
  CaptureWorkflowControllerProps
> = ({
  preferences = DEFAULT_POST_CAPTURE_PREFERENCES,
  autoDismissMs = DEFAULT_PREVIEW_AUTO_DISMISS_MS,
  onPreferencesChange,
  onCapture,
  onCopy,
  onSave,
  onOpenEditor,
  onRevealWindow,
  onPin,
  onRecognize,
  onReleaseSource,
}) => {
  const instanceId = useId();
  const releaseSourceRef = useRef(onReleaseSource);
  const previewActionInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const seqRef = useRef(0);
  const activeOpIdRef = useRef<string | null>(null);
  const activeTokenRef = useRef<PostCaptureOperationToken | null>(null);
  const activeDocRef = useRef<ImageDocument | null>(null);

  // Capture-scoped ledger shared by the plan, preview actions and retries.
  const completedEffectsByDocRef = useRef<Map<string, Set<string>>>(new Map());

  const [state, setState] = useState<CaptureWorkflowState>(() =>
    Object.freeze({
      phase: "idle",
      operationId: null,
      activeDocument: null,
      completedSteps: Object.freeze([]),
      failedStep: null,
      errorMessage: null,
      closeReason: null,
    }),
  );

  useEffect(() => {
    releaseSourceRef.current = onReleaseSource;
  }, [onReleaseSource]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeOpIdRef.current = null;
      activeTokenRef.current?.cancel();
      const doc = activeDocRef.current;
      activeDocRef.current = null;
      completedEffectsByDocRef.current.clear();
      if (doc) releaseSourceRef.current?.(doc);
    };
  }, []);

  const invokeEffect = async (
    name: string,
    handler: ((doc: ImageDocument) => Promise<void> | void) | undefined,
    doc: ImageDocument,
  ) => {
    if (!handler) throw new Error(`${name} is unavailable.`);
    await handler(doc);
  };

  const hasDocCompletedEffect = (docId: string, effectKey: string): boolean => {
    return completedEffectsByDocRef.current.get(docId)?.has(effectKey) ?? false;
  };

  const markDocEffectCompleted = (docId: string, effectKey: string): void => {
    let set = completedEffectsByDocRef.current.get(docId);
    if (!set) {
      set = new Set<string>();
      completedEffectsByDocRef.current.set(docId, set);
    }
    set.add(effectKey);
  };

  const executePlanForDocument = async (
    opId: string,
    doc: ImageDocument,
    stepsToRun: readonly PostCaptureStep[],
    priorCompleted: readonly PostCaptureStep[],
  ) => {
    const token = createPostCaptureToken(`${opId}-run-${ ++seqRef.current }`);
    activeTokenRef.current = token;
    let failedStepRef: PostCaptureStep | null = null;
    let openedPreview = false;

    const result = await runPostCapturePlan({
      token,
      steps: stepsToRun,
      handlers: {
        copy: async () => {
          if (hasDocCompletedEffect(doc.id, "copy")) return;
          try {
            await invokeEffect("Copy", onCopy, doc);
            if (!token.isCancelled() && activeOpIdRef.current === opId) {
              markDocEffectCompleted(doc.id, "copy");
            }
          } catch (err) {
            failedStepRef = "copy";
            throw err;
          }
        },
        save: async () => {
          if (hasDocCompletedEffect(doc.id, "save")) return;
          try {
            await invokeEffect("Save", onSave, doc);
            if (!token.isCancelled() && activeOpIdRef.current === opId) {
              markDocEffectCompleted(doc.id, "save");
            }
          } catch (err) {
            failedStepRef = "save";
            throw err;
          }
        },
        preview: async () => {
          openedPreview = true;
        },
        edit: async () => {
          if (hasDocCompletedEffect(doc.id, "edit")) return;
          try {
            await invokeEffect("Edit", onOpenEditor, doc);
            if (!token.isCancelled() && activeOpIdRef.current === opId) {
              markDocEffectCompleted(doc.id, "edit");
            }
          } catch (err) {
            failedStepRef = "edit";
            throw err;
          }
        },
        show: async () => {
          if (hasDocCompletedEffect(doc.id, "show")) return;
          try {
            await invokeEffect("Show", onRevealWindow, doc);
            if (!token.isCancelled() && activeOpIdRef.current === opId) {
              markDocEffectCompleted(doc.id, "show");
            }
          } catch (err) {
            failedStepRef = "show";
            throw err;
          }
        },
      },
    });

    if (!mountedRef.current || activeOpIdRef.current !== opId) {
      return;
    }

    const mergedSteps = Object.freeze([
      ...priorCompleted,
      ...result.completedSteps.filter((s) => !priorCompleted.includes(s)),
    ]);

    if (result.cancelled) {
      setState(
        Object.freeze({
          phase: "cancelled",
          operationId: opId,
          activeDocument: doc,
          completedSteps: mergedSteps,
          failedStep: null,
          errorMessage: null,
          closeReason: null,
        }),
      );
      return;
    }

    if (result.error !== undefined) {
      setState(
        Object.freeze({
          phase: "failed",
          operationId: opId,
          activeDocument: doc,
          completedSteps: mergedSteps,
          failedStep: failedStepRef,
          errorMessage: result.error || "Post-capture action failed.",
          closeReason: null,
        }),
      );
      return;
    }

    setState(
      Object.freeze({
        phase:
          openedPreview || mergedSteps.includes("preview")
            ? "preview-open"
            : "completed",
        operationId: opId,
        activeDocument: doc,
        completedSteps: mergedSteps,
        failedStep: null,
        errorMessage: null,
        closeReason: null,
      }),
    );
  };

  const handleStartCapture = async (mode: CaptureMode) => {
    // Cancel any previous in-flight operation and release superseded source if needed
    activeTokenRef.current?.cancel();
    activeOpIdRef.current = null;
    previewActionInFlightRef.current = false;
    const previousDoc = activeDocRef.current;
    activeDocRef.current = null;
    completedEffectsByDocRef.current.clear();
    if (previousDoc) releaseSourceRef.current?.(previousDoc);

    const opId = `${instanceId}-capture-op-${++seqRef.current}`;
    activeOpIdRef.current = opId;
    const captureToken = createPostCaptureToken(`${opId}-capture`);
    activeTokenRef.current = captureToken;

    setState(
      Object.freeze({
        phase: "capturing",
        operationId: opId,
        activeDocument: null,
        completedSteps: Object.freeze([]),
        failedStep: null,
        errorMessage: null,
        closeReason: null,
      }),
    );

    let capturedDoc: ImageDocument;
    try {
      capturedDoc = await onCapture(mode);
    } catch (err) {
      if (!mountedRef.current || activeOpIdRef.current !== opId) {
        return;
      }
      setState(
        Object.freeze({
          phase: captureToken.isCancelled() ? "cancelled" : "failed",
          operationId: opId,
          activeDocument: null,
          completedSteps: Object.freeze([]),
          failedStep: null,
          errorMessage:
            err instanceof Error && err.message ? err.message : "Capture failed.",
          closeReason: null,
        }),
      );
      return;
    }

    // Isolate late completion after cancel, unmount, or newer capture
    if (
      !mountedRef.current ||
      activeOpIdRef.current !== opId ||
      captureToken.isCancelled()
    ) {
      releaseSourceRef.current?.(capturedDoc);
      return;
    }

    activeDocRef.current = capturedDoc;
    const plannedSteps = planPostCaptureSteps(preferences);

    setState(
      Object.freeze({
        phase: "running-post-actions",
        operationId: opId,
        activeDocument: capturedDoc,
        completedSteps: Object.freeze([]),
        failedStep: null,
        errorMessage: null,
        closeReason: null,
      }),
    );

    await executePlanForDocument(opId, capturedDoc, plannedSteps, []);
  };

  const handleCancelActive = () => {
    activeTokenRef.current?.cancel();
    activeOpIdRef.current = null;
    previewActionInFlightRef.current = false;
    const doc = activeDocRef.current;
    activeDocRef.current = null;
    completedEffectsByDocRef.current.clear();
    if (doc) releaseSourceRef.current?.(doc);
    setState((prev) =>
      Object.freeze({
        ...prev,
        phase: "cancelled",
        activeDocument: null,
        failedStep: null,
        errorMessage: null,
      }),
    );
  };

  const handleRetryFailed = async () => {
    if (
      state.phase !== "failed" ||
      !state.activeDocument ||
      !state.operationId
    ) {
      return;
    }
    const opId = state.operationId;
    const doc = state.activeDocument;
    const allPlanned = planPostCaptureSteps(preferences);
    const remaining = allPlanned.filter(
      (step) => !state.completedSteps.includes(step),
    );

    setState((prev) =>
      Object.freeze({
        ...prev,
        phase: "running-post-actions",
        failedStep: null,
        errorMessage: null,
      }),
    );

    await executePlanForDocument(opId, doc, remaining, state.completedSteps);
  };

  // Bind preview effects to the capture operation, including their asynchronous result.
  const withCurrentDocGuard = async (
    targetDocId: string,
    effectKey: string,
    fn: ((doc: ImageDocument) => Promise<void> | void) | undefined,
  ) => {
    const currentDoc = activeDocRef.current;
    const opId = state.operationId;
    if (!mountedRef.current || !opId || activeOpIdRef.current !== opId ||
        !currentDoc || currentDoc.id !== targetDocId || previewActionInFlightRef.current) {
      return;
    }
    const token = createPostCaptureToken(`${opId}-preview-${++seqRef.current}`);
    activeTokenRef.current = token;
    previewActionInFlightRef.current = true;
    setState((prev) => Object.freeze({ ...prev, phase: "running-post-actions", errorMessage: null }));
    try {
      if (!hasDocCompletedEffect(currentDoc.id, effectKey)) {
        await invokeEffect(effectKey, fn, currentDoc);
      }
      if (!mountedRef.current || token.isCancelled() || activeOpIdRef.current !== opId) return;
      markDocEffectCompleted(currentDoc.id, effectKey);
      setState((prev) => Object.freeze({ ...prev, phase: "completed", errorMessage: null, closeReason: "manual" }));
    } catch (err) {
      if (!mountedRef.current || token.isCancelled() || activeOpIdRef.current !== opId) return;
      setState((prev) => Object.freeze({
        ...prev,
        phase: "preview-open",
        failedStep: null,
        errorMessage: err instanceof Error && err.message ? err.message : "Preview action failed.",
      }));
    } finally {
      if (activeOpIdRef.current === opId && activeTokenRef.current === token) {
        previewActionInFlightRef.current = false;
      }
    }
  };

  return (
    <section
      className="ferby-capture-workflow"
      aria-label="Composed post-capture workflow"
    >
      <div
        className="ferby-capture-workflow__triggers"
        role="group"
        aria-label="Start capture"
      >
        {(["area", "window", "fullscreen"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => void handleStartCapture(mode)}
          >
            Capture {mode}
          </button>
        ))}
        {(state.phase === "capturing" ||
          state.phase === "running-post-actions") && (
          <button type="button" onClick={handleCancelActive}>
            Cancel Workflow
          </button>
        )}
      </div>

      <div
        className="ferby-capture-workflow__status"
        aria-label="Workflow status"
      >
        Phase: {state.phase}
      </div>

      {state.errorMessage !== null && (
        <div role="alert" className="ferby-capture-workflow__error">
          <span>
            {state.failedStep
              ? `Step "${state.failedStep}" failed: `
              : state.phase === "preview-open" ? "Preview action failed: " : "Capture error: "}
            {state.errorMessage}
          </span>
          {state.phase === "failed" && state.activeDocument && (
            <button type="button" onClick={() => void handleRetryFailed()}>
              Retry Remaining Steps
            </button>
          )}
        </div>
      )}

      {onPreferencesChange && (
        <PostCapturePreferencesPanel
          value={preferences}
          onChange={onPreferencesChange}
        />
      )}

      {state.phase === "preview-open" && state.activeDocument && (
        <CapturePreviewController
          document={state.activeDocument}
          autoDismissMs={autoDismissMs}
          onEdit={(docId) => { void withCurrentDocGuard(docId, "edit", onOpenEditor); }}
          onCopy={(docId) => { void withCurrentDocGuard(docId, "copy", onCopy); }}
          onSave={(docId) => { void withCurrentDocGuard(docId, "save", onSave); }}
          onOcr={(docId) => { void withCurrentDocGuard(docId, "ocr", onRecognize); }}
          onPin={(docId) => { void withCurrentDocGuard(docId, "pin", onPin); }}
          onClose={(docId, reason) => {
            const currentDoc = activeDocRef.current;
            if (!currentDoc || currentDoc.id !== docId || activeOpIdRef.current !== state.operationId) return;
            activeTokenRef.current?.cancel();
            activeOpIdRef.current = null;
            activeDocRef.current = null;
            completedEffectsByDocRef.current.clear();
            releaseSourceRef.current?.(currentDoc);
            setState((prev) =>
              Object.freeze({
                ...prev,
                phase: "completed",
                activeDocument: null,
                closeReason: reason,
              }),
            );
          }}
        />
      )}
    </section>
  );
};

