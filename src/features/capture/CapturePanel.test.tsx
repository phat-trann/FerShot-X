// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CapturePanel } from "./CapturePanel";
import type { CaptureMode } from "../../contracts/media";

afterEach(() => {
  cleanup();
});

describe("CapturePanel", () => {
  it("invokes onCapture with fullscreen, area, and window modes", () => {
    const onCapture = vi.fn<(mode: CaptureMode) => void>();
    render(<CapturePanel onCapture={onCapture} busy={false} />);

    fireEvent.click(screen.getByRole("button", { name: /capture fullscreen/i }));
    fireEvent.click(screen.getByRole("button", { name: /capture area/i }));
    fireEvent.click(screen.getByRole("button", { name: /capture window/i }));

    expect(onCapture).toHaveBeenCalledTimes(3);
    expect(onCapture.mock.calls.map((call) => call[0])).toEqual([
      "fullscreen",
      "area",
      "window",
    ]);
  });

  it("disables capture buttons and exposes busy status when busy is true", () => {
    const onCapture = vi.fn<(mode: CaptureMode) => void>();
    render(<CapturePanel onCapture={onCapture} busy={true} />);

    const region = screen.getByRole("region", { name: /screen capture/i });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(/capturing in progress/i);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }

    expect(onCapture).not.toHaveBeenCalled();
  });

  it("announces non-empty error messages via an alert role and omits empty errors", () => {
    const onCapture = vi.fn<(mode: CaptureMode) => void>();
    const { rerender } = render(
      <CapturePanel
        onCapture={onCapture}
        busy={false}
        error="Screen Recording permission denied by host"
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Screen Recording permission denied by host");

    rerender(<CapturePanel onCapture={onCapture} busy={false} error="   " />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("supports keyboard focus and arrow-key navigation across capture actions", () => {
    const onCapture = vi.fn<(mode: CaptureMode) => void>();
    render(<CapturePanel onCapture={onCapture} busy={false} />);

    const fullscreenBtn = screen.getByRole("button", { name: /capture fullscreen/i });
    const areaBtn = screen.getByRole("button", { name: /capture area/i });
    const windowBtn = screen.getByRole("button", { name: /capture window/i });

    fullscreenBtn.focus();
    expect(fullscreenBtn).toHaveFocus();

    fireEvent.keyDown(fullscreenBtn, { key: "ArrowRight" });
    expect(areaBtn).toHaveFocus();

    fireEvent.keyDown(areaBtn, { key: "ArrowRight" });
    expect(windowBtn).toHaveFocus();

    fireEvent.keyDown(windowBtn, { key: "ArrowRight" });
    expect(fullscreenBtn).toHaveFocus();

    fireEvent.keyDown(fullscreenBtn, { key: "ArrowLeft" });
    expect(windowBtn).toHaveFocus();
  });
});

