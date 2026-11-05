// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  ScrollCapturePanel,
  type ScrollCaptureConfig,
} from "./ScrollCapturePanel";

afterEach(() => {
  cleanup();
});

const DEFAULT_CFG: ScrollCaptureConfig = Object.freeze({
  maxHeight: 8192,
  speed: "normal",
  reverseDirection: false,
});

describe("ScrollCapturePanel (A23)", () => {
  it("clamps max-height bounds, updates speed/reverse options, and starts capture when idle", () => {
    const onConfigChange = vi.fn<(next: ScrollCaptureConfig) => void>();
    const onStart = vi.fn<(cfg: ScrollCaptureConfig) => void>();

    render(
      <ScrollCapturePanel
        state="idle"
        config={DEFAULT_CFG}
        onConfigChange={onConfigChange}
        onStart={onStart}
        onStop={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Max output height (px)"), {
      target: { value: "99999" },
    });
    expect(onConfigChange).toHaveBeenLastCalledWith({
      maxHeight: 32768,
      speed: "normal",
      reverseDirection: false,
    });

    fireEvent.change(screen.getByLabelText("Scroll speed"), {
      target: { value: "fast" },
    });
    expect(onConfigChange).toHaveBeenLastCalledWith({
      maxHeight: 8192,
      speed: "fast",
      reverseDirection: false,
    });

    fireEvent.click(
      screen.getByLabelText("Reverse scroll (bottom-to-top)"),
    );
    expect(onConfigChange).toHaveBeenLastCalledWith({
      maxHeight: 8192,
      speed: "normal",
      reverseDirection: true,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Start Scrolling Capture" }),
    );
    expect(onStart).toHaveBeenCalledExactlyOnceWith(DEFAULT_CFG);
  });

  it("guards against duplicate start while capturing/stitching and handles Stop, Cancel, Escape, and error alerts", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <ScrollCapturePanel
        state="capturing"
        config={DEFAULT_CFG}
        progress={{ frameCount: 4, stitchedHeight: 1600 }}
        onConfigChange={vi.fn()}
        onStart={onStart}
        onStop={onStop}
        onCancel={onCancel}
      />,
    );

    const startBtn = screen.getByRole("button", {
      name: "Start Scrolling Capture",
    });
    const stopBtn = screen.getByRole("button", { name: "Stop & Stitch" });
    const cancelBtn = screen.getByRole("button", { name: "Cancel Capture" });

    expect(startBtn).toBeDisabled();
    expect(stopBtn).not.toBeDisabled();
    expect(cancelBtn).not.toBeDisabled();

    fireEvent.click(startBtn);
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);

    // Escape cancels active capture
    fireEvent.keyDown(
      screen.getByRole("region", { name: "Scrolling capture controls" }),
      { key: "Escape" },
    );
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <ScrollCapturePanel
        state="error"
        config={DEFAULT_CFG}
        error="No overlap matched at frame 3"
        onConfigChange={vi.fn()}
        onStart={onStart}
        onStop={onStop}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No overlap matched at frame 3",
    );
    expect(
      screen.getByRole("button", { name: "Start Scrolling Capture" }),
    ).not.toBeDisabled();
  });
});

