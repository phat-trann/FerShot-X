// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { OcrPanel, type OcrRecognizeOptions } from "./OcrPanel";

afterEach(() => {
  cleanup();
});

describe("OcrPanel", () => {
  it("renders empty and error states accessibly and triggers language, line-break, recognize, and copy callbacks", () => {
    const onLanguageChange = vi.fn<(lang: string) => void>();
    const onPreserveLineBreaksChange = vi.fn<(preserve: boolean) => void>();
    const onRecognize = vi.fn<(options: OcrRecognizeOptions) => void>();
    const onCopy = vi.fn<(text: string) => void>();

    const { rerender } = render(
      <OcrPanel
        recognizedText=""
        language="en-US"
        preserveLineBreaks={true}
        busy={false}
        error={null}
        onLanguageChange={onLanguageChange}
        onPreserveLineBreaksChange={onPreserveLineBreaksChange}
        onRecognize={onRecognize}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByText("No recognized text yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Text" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Recognition language"), {
      target: { value: "vi-VN" },
    });
    expect(onLanguageChange).toHaveBeenCalledExactlyOnceWith("vi-VN");

    fireEvent.click(screen.getByLabelText("Preserve line breaks"));
    expect(onPreserveLineBreaksChange).toHaveBeenCalledExactlyOnceWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Recognize Text" }));
    expect(onRecognize).toHaveBeenCalledExactlyOnceWith({
      language: "en-US",
      preserveLineBreaks: true,
    });

    rerender(
      <OcrPanel
        recognizedText={"First line\nSecond line"}
        language="vi-VN"
        preserveLineBreaks={false}
        busy={false}
        error="Low contrast warning"
        onLanguageChange={onLanguageChange}
        onPreserveLineBreaksChange={onPreserveLineBreaksChange}
        onRecognize={onRecognize}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Low contrast warning");
    expect(screen.getByTestId("ocr-recognized-text")).toHaveTextContent(
      "First line Second line",
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy Text" }));
    expect(onCopy).toHaveBeenCalledExactlyOnceWith("First line Second line");
  });

  it("renders XSS/HTML payloads as inert literal text without creating DOM elements", () => {
    const malicious =
      '<img src="x" onerror="window.__xss=true"><script>alert("xss")</script>';

    const { container } = render(
      <OcrPanel
        recognizedText={malicious}
        language="en-US"
        preserveLineBreaks={true}
        busy={false}
        onLanguageChange={vi.fn()}
        onPreserveLineBreaksChange={vi.fn()}
        onRecognize={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    const output = screen.getByTestId("ocr-recognized-text");
    expect(output.textContent).toBe(malicious);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("guards all controls and callbacks while busy", () => {
    const onLanguageChange = vi.fn();
    const onPreserveLineBreaksChange = vi.fn();
    const onRecognize = vi.fn();
    const onCopy = vi.fn();

    render(
      <OcrPanel
        recognizedText="Sample recognized text"
        language="en-US"
        preserveLineBreaks={true}
        busy={true}
        onLanguageChange={onLanguageChange}
        onPreserveLineBreaksChange={onPreserveLineBreaksChange}
        onRecognize={onRecognize}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Recognizing text from image...",
    );
    const select = screen.getByLabelText("Recognition language");
    const checkbox = screen.getByLabelText("Preserve line breaks");
    const recognizeBtn = screen.getByRole("button", { name: "Recognizing..." });
    const copyBtn = screen.getByRole("button", { name: "Copy Text" });

    expect(select).toBeDisabled();
    expect(checkbox).toBeDisabled();
    expect(recognizeBtn).toBeDisabled();
    expect(copyBtn).toBeDisabled();

    fireEvent.change(select, { target: { value: "ja-JP" } });
    fireEvent.click(checkbox);
    fireEvent.click(recognizeBtn);
    fireEvent.click(copyBtn);

    expect(onLanguageChange).not.toHaveBeenCalled();
    expect(onPreserveLineBreaksChange).not.toHaveBeenCalled();
    expect(onRecognize).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
  });
});

