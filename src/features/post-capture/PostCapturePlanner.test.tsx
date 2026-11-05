// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  DEFAULT_POST_CAPTURE_PREFERENCES,
  PostCapturePreferencesPanel,
  createPostCaptureToken,
  planPostCaptureSteps,
  runPostCapturePlan,
  type PostCapturePreferences,
  type PostCaptureStep,
} from "./PostCapturePlanner";

afterEach(() => {
  cleanup();
});

describe("PostCapturePlanner (A24)", () => {
  it("plans deterministic ordered steps and runs async callbacks in order with stop-on-error, cancellation, and duplicate-token protection", async () => {
    const prefs: PostCapturePreferences = Object.freeze({
      copyToClipboard: true,
      autoSave: true,
      showPreview: true,
      openInEditor: true,
      revealWindow: true,
    });

    const steps = planPostCaptureSteps(prefs);
    expect(steps).toEqual(["copy", "save", "preview", "edit", "show"]);

    const callOrder: string[] = [];
    const token1 = createPostCaptureToken("op-1");

    const res1 = await runPostCapturePlan({
      token: token1,
      steps,
      handlers: {
        copy: async () => {
          callOrder.push("copy");
        },
        save: async () => {
          callOrder.push("save");
        },
        preview: async (tok) => {
          callOrder.push("preview");
          tok.cancel(); // cancel during preview step
        },
        edit: async () => {
          callOrder.push("edit");
        },
      },
    });

    expect(callOrder).toEqual(["copy", "save", "preview"]);
    expect(res1.completedSteps).toEqual(["copy", "save"]);
    expect(res1.cancelled).toBe(true);

    // Re-running with the same token1 id does not execute duplicate work
    const dupRes = await runPostCapturePlan({
      token: token1,
      steps,
      handlers: {
        copy: () => {
          callOrder.push("duplicate-copy");
        },
      },
    });
    expect(dupRes.duplicateIgnored).toBe(true);
    expect(callOrder).toEqual(["copy", "save", "preview"]);

    // Independent token2 stops immediately on error
    const token2 = createPostCaptureToken("op-2");
    const errOrder: PostCaptureStep[] = [];
    const res2 = await runPostCapturePlan({
      token: token2,
      steps: ["copy", "save", "edit"],
      handlers: {
        copy: () => {
          errOrder.push("copy");
        },
        save: () => {
          errOrder.push("save");
          throw new Error("Disk full");
        },
        edit: () => {
          errOrder.push("edit");
        },
      },
    });

    expect(errOrder).toEqual(["copy", "save"]);
    expect(res2.completedSteps).toEqual(["copy"]);
    expect(res2.error).toBe("Disk full");
  });

  it("renders controlled preferences without invoking actions and emits immutable option copies on toggle", () => {
    const onChange = vi.fn<(next: Readonly<PostCapturePreferences>) => void>();

    render(
      <PostCapturePreferencesPanel
        value={DEFAULT_POST_CAPTURE_PREFERENCES}
        onChange={onChange}
      />,
    );

    expect(screen.getByTestId("planned-post-capture-steps")).toHaveTextContent(
      "Planned order: copy -> preview",
    );
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Open in editor"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0]?.[0];
    expect(updated).toEqual({
      ...DEFAULT_POST_CAPTURE_PREFERENCES,
      openInEditor: true,
    });
    expect(Object.isFrozen(updated)).toBe(true);
  });
});

