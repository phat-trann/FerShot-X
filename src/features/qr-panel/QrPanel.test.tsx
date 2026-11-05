// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QrPanel, type QrCodeItem } from "./QrPanel";

afterEach(() => {
  cleanup();
});

const SAMPLE_ITEMS: readonly QrCodeItem[] = Object.freeze([
  Object.freeze({
    id: "qr-1",
    payload: "https://example.com/welcome",
    symbology: "QR",
  }),
  Object.freeze({
    id: "qr-2",
    payload: 'javascript:alert("pwned")',
    symbology: "QR",
  }),
  Object.freeze({
    id: "qr-3",
    payload: "<script>window.__qr_xss = true;</script>",
  }),
]);

describe("QrPanel", () => {
  it("renders multiple payloads as inert text without links or script execution and handles selection/copy callbacks", () => {
    const onSelect = vi.fn<(id: string) => void>();
    const onCopy = vi.fn<(payload: string, id: string) => void>();

    const { container } = render(
      <QrPanel
        items={SAMPLE_ITEMS}
        selectedId="qr-1"
        busy={false}
        onSelect={onSelect}
        onCopy={onCopy}
      />,
    );

    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByTestId("qr-payload-qr-2").textContent).toBe(
      'javascript:alert("pwned")',
    );
    expect(screen.getByTestId("qr-payload-qr-3").textContent).toBe(
      "<script>window.__qr_xss = true;</script>",
    );

    const firstSelect = screen.getByRole("button", {
      name: "Select QR code 1",
    });
    const secondSelect = screen.getByRole("button", {
      name: "Select QR code 2",
    });
    expect(firstSelect).toHaveAttribute("aria-pressed", "true");
    expect(secondSelect).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(secondSelect);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("qr-2");

    fireEvent.click(
      screen.getByRole("button", { name: "Copy Selected Payload" }),
    );
    expect(onCopy).toHaveBeenCalledWith("https://example.com/welcome", "qr-1");

    fireEvent.click(screen.getByRole("button", { name: "Copy QR code 2" }));
    expect(onCopy).toHaveBeenCalledWith('javascript:alert("pwned")', "qr-2");
  });

  it("supports keyboard arrow selection across QR items", () => {
    const onSelect = vi.fn<(id: string) => void>();

    render(
      <QrPanel
        items={SAMPLE_ITEMS}
        selectedId="qr-1"
        busy={false}
        onSelect={onSelect}
        onCopy={vi.fn()}
      />,
    );

    const firstBtn = screen.getByRole("button", { name: "Select QR code 1" });
    const secondBtn = screen.getByRole("button", { name: "Select QR code 2" });
    const thirdBtn = screen.getByRole("button", { name: "Select QR code 3" });

    firstBtn.focus();
    fireEvent.keyDown(firstBtn, { key: "ArrowDown" });
    expect(secondBtn).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith("qr-2");

    fireEvent.keyDown(secondBtn, { key: "ArrowUp" });
    expect(firstBtn).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith("qr-1");

    fireEvent.keyDown(firstBtn, { key: "ArrowUp" });
    expect(thirdBtn).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith("qr-3");
  });

  it("renders empty, busy, and error states and disables controls when busy or unselected", () => {
    const onSelect = vi.fn();
    const onCopy = vi.fn();
    const onScan = vi.fn();

    const { rerender } = render(
      <QrPanel
        items={[]}
        selectedId={null}
        busy={false}
        error="QR detector failed"
        onScan={onScan}
        onSelect={onSelect}
        onCopy={onCopy}
      />,
    );

    expect(
      screen.getByText("No QR codes detected in this image."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("QR detector failed");
    expect(
      screen.getByRole("button", { name: "Copy Selected Payload" }),
    ).toBeDisabled();

    rerender(
      <QrPanel
        items={SAMPLE_ITEMS}
        selectedId="qr-1"
        busy={true}
        onScan={onScan}
        onSelect={onSelect}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Scanning image for QR codes...",
    );
    const selectBtn = screen.getByRole("button", { name: "Select QR code 1" });
    const copySelectedBtn = screen.getByRole("button", {
      name: "Copy Selected Payload",
    });
    const scanBtn = screen.getByRole("button", { name: "Scanning..." });

    expect(selectBtn).toBeDisabled();
    expect(copySelectedBtn).toBeDisabled();
    expect(scanBtn).toBeDisabled();

    fireEvent.click(selectBtn);
    fireEvent.click(copySelectedBtn);
    fireEvent.click(scanBtn);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
    expect(onScan).not.toHaveBeenCalled();
  });
});

