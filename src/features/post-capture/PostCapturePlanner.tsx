import React, { useId } from "react";

export type PostCaptureStep = "copy" | "save" | "preview" | "edit" | "show";

export interface PostCapturePreferences {
  readonly copyToClipboard: boolean;
  readonly autoSave: boolean;
  readonly showPreview: boolean;
  readonly openInEditor: boolean;
  readonly revealWindow: boolean;
}

export const DEFAULT_POST_CAPTURE_PREFERENCES: Readonly<PostCapturePreferences> =
  Object.freeze({
    copyToClipboard: true,
    autoSave: false,
    showPreview: true,
    openInEditor: false,
    revealWindow: false,
  });

export function clonePostCapturePreferences(
  prefs: PostCapturePreferences,
): Readonly<PostCapturePreferences> {
  return Object.freeze({
    copyToClipboard: Boolean(prefs.copyToClipboard),
    autoSave: Boolean(prefs.autoSave),
    showPreview: Boolean(prefs.showPreview),
    openInEditor: Boolean(prefs.openInEditor),
    revealWindow: Boolean(prefs.revealWindow),
  });
}

export function planPostCaptureSteps(
  prefs: PostCapturePreferences,
): readonly PostCaptureStep[] {
  const steps: PostCaptureStep[] = [];
  if (prefs.copyToClipboard) {
    steps.push("copy");
  }
  if (prefs.autoSave) {
    steps.push("save");
  }
  if (prefs.showPreview) {
    steps.push("preview");
  }
  if (prefs.openInEditor) {
    steps.push("edit");
  }
  if (prefs.revealWindow) {
    steps.push("show");
  }
  return Object.freeze(steps);
}

export interface PostCaptureOperationToken {
  readonly id: string;
  cancel: () => void;
  readonly isCancelled: () => boolean;
}

export function createPostCaptureToken(id: string): PostCaptureOperationToken {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Post-capture operation token requires a non-empty id.");
  }
  let cancelled = false;
  return Object.freeze({
    id,
    cancel: () => {
      cancelled = true;
    },
    isCancelled: () => cancelled,
  });
}

export type PostCaptureStepHandler = (
  token: PostCaptureOperationToken,
) => Promise<void> | void;

export interface RunPostCapturePlanOptions {
  readonly token: PostCaptureOperationToken;
  readonly steps: readonly PostCaptureStep[];
  readonly handlers: Readonly<
    Partial<Record<PostCaptureStep, PostCaptureStepHandler>>
  >;
}

export interface PostCaptureRunResult {
  readonly tokenId: string;
  readonly completedSteps: readonly PostCaptureStep[];
  readonly cancelled: boolean;
  readonly duplicateIgnored: boolean;
  readonly error?: string;
}

const claimedTokenIds = new Set<string>();

export async function runPostCapturePlan(
  options: RunPostCapturePlanOptions,
): Promise<PostCaptureRunResult> {
  const { token, steps, handlers } = options;
  if (!token || typeof token.id !== "string" || token.id.trim() === "") {
    throw new Error("Valid operation token is required.");
  }

  if (claimedTokenIds.has(token.id)) {
    return Object.freeze({
      tokenId: token.id,
      completedSteps: Object.freeze([]),
      cancelled: token.isCancelled(),
      duplicateIgnored: true,
    });
  }
  claimedTokenIds.add(token.id);

  const completed: PostCaptureStep[] = [];
  const seenInPlan = new Set<PostCaptureStep>();

  for (const step of steps) {
    if (seenInPlan.has(step)) {
      continue;
    }
    seenInPlan.add(step);

    if (token.isCancelled()) {
      return Object.freeze({
        tokenId: token.id,
        completedSteps: Object.freeze([...completed]),
        cancelled: true,
        duplicateIgnored: false,
      });
    }

    const handler = handlers[step];
    if (!handler) {
      continue;
    }

    try {
      await handler(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Object.freeze({
        tokenId: token.id,
        completedSteps: Object.freeze([...completed]),
        cancelled: token.isCancelled(),
        duplicateIgnored: false,
        error: message,
      });
    }

    if (token.isCancelled()) {
      return Object.freeze({
        tokenId: token.id,
        completedSteps: Object.freeze([...completed]),
        cancelled: true,
        duplicateIgnored: false,
      });
    }

    completed.push(step);
  }

  return Object.freeze({
    tokenId: token.id,
    completedSteps: Object.freeze(completed),
    cancelled: false,
    duplicateIgnored: false,
  });
}

export interface PostCapturePreferencesPanelProps {
  readonly value: Readonly<PostCapturePreferences>;
  readonly onChange: (next: Readonly<PostCapturePreferences>) => void;
}

export function PostCapturePreferencesPanel({
  value,
  onChange,
}: PostCapturePreferencesPanelProps): React.JSX.Element {
  const baseId = useId();
  const planned = planPostCaptureSteps(value);

  const toggle = (key: keyof PostCapturePreferences, checked: boolean) => {
    onChange(
      clonePostCapturePreferences({
        ...value,
        [key]: checked,
      }),
    );
  };

  return (
    <section aria-label="Post-capture actions">
      <div>
        <input
          id={`${baseId}-copy`}
          type="checkbox"
          checked={value.copyToClipboard}
          onChange={(e) => toggle("copyToClipboard", e.target.checked)}
        />
        <label htmlFor={`${baseId}-copy`}>Copy to clipboard</label>
      </div>
      <div>
        <input
          id={`${baseId}-save`}
          type="checkbox"
          checked={value.autoSave}
          onChange={(e) => toggle("autoSave", e.target.checked)}
        />
        <label htmlFor={`${baseId}-save`}>Auto-save image</label>
      </div>
      <div>
        <input
          id={`${baseId}-preview`}
          type="checkbox"
          checked={value.showPreview}
          onChange={(e) => toggle("showPreview", e.target.checked)}
        />
        <label htmlFor={`${baseId}-preview`}>Show floating preview</label>
      </div>
      <div>
        <input
          id={`${baseId}-edit`}
          type="checkbox"
          checked={value.openInEditor}
          onChange={(e) => toggle("openInEditor", e.target.checked)}
        />
        <label htmlFor={`${baseId}-edit`}>Open in editor</label>
      </div>
      <div>
        <input
          id={`${baseId}-show`}
          type="checkbox"
          checked={value.revealWindow}
          onChange={(e) => toggle("revealWindow", e.target.checked)}
        />
        <label htmlFor={`${baseId}-show`}>Show main window</label>
      </div>
      <p data-testid="planned-post-capture-steps">
        Planned order: {planned.length > 0 ? planned.join(" -> ") : "none"}
      </p>
    </section>
  );
}

