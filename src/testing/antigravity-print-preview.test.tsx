// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PrintWorkspace from "../Workspace.print";
import * as native from "../platform/native";

vi.mock("../platform/native", () => ({
  readPrintPreview: vi.fn(),
  requestPrintDialog: vi.fn(),
  closePrintPreview: vi.fn(),
}));

const mockPreview = {
  image: {
    id: "img-1",
    name: "print-sample.png",
    src: "blob:http://localhost/print-sample",
    width: 400,
    height: 300,
    mimeType: "image/png",
    byteSize: 2048,
  },
  options: {
    imageWidth: 400,
    imageHeight: 300,
    paper: "a4" as const,
    orientation: "portrait" as const,
    marginPt: 36,
    scaleMode: "fit" as const,
  },
};

describe("PrintWorkspace action invariants (A39)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not print on load; print button enables only after image loads and requires explicit click", async () => {
    vi.mocked(native.readPrintPreview).mockResolvedValue(mockPreview);
    vi.mocked(native.requestPrintDialog).mockResolvedValue();

    render(<PrintWorkspace />);

    // Initially or before image load, requestPrintDialog must never be invoked automatically
    expect(native.requestPrintDialog).not.toHaveBeenCalled();

    // The print button should be present but disabled before image finishes decoding/loading
    const printButton = await screen.findByRole("button", {
      name: "Open system print dialog",
    });
    expect(printButton).toBeDisabled();
    expect(native.requestPrintDialog).not.toHaveBeenCalled();

    // Trigger image onLoad to indicate supplied image is ready
    const img = screen.getByAltText("Image to print");
    fireEvent.load(img);

    // Button is now enabled
    expect(printButton).toBeEnabled();
    expect(native.requestPrintDialog).not.toHaveBeenCalled();

    // Explicit click triggers requestPrintDialog
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(native.requestPrintDialog).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText(
        "Print dialog requested. Complete or cancel it in the system dialog.",
      ),
    ).toBeInTheDocument();
  });

  it("leaves retry possible when native print dialog request fails", async () => {
    vi.mocked(native.readPrintPreview).mockResolvedValue(mockPreview);
    vi.mocked(native.requestPrintDialog).mockRejectedValueOnce(
      new Error("Native print server unavailable"),
    );

    render(<PrintWorkspace />);

    const printButton = await screen.findByRole("button", {
      name: "Open system print dialog",
    });
    const img = screen.getByAltText("Image to print");
    fireEvent.load(img);

    expect(printButton).toBeEnabled();

    // First attempt fails
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Native print server unavailable",
      );
    });
    expect(native.requestPrintDialog).toHaveBeenCalledTimes(1);

    // The button must not stay permanently disabled; retry remains possible
    expect(printButton).toBeEnabled();

    // Retry succeeds
    vi.mocked(native.requestPrintDialog).mockResolvedValueOnce();
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(native.requestPrintDialog).toHaveBeenCalledTimes(2);
    });

    expect(
      screen.getByText(
        "Print dialog requested. Complete or cancel it in the system dialog.",
      ),
    ).toBeInTheDocument();
  });
});

