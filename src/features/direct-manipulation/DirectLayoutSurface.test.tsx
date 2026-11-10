// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ImageDocument } from "../../contracts/media";
import { planBackdropLayout } from "../backdrop/backdrop-renderer";
import {
  DirectLayoutSurface,
  computeDirectBackdropPreviewLayout,
} from "./DirectLayoutSurface";

afterEach(() => {
  cleanup();
});

const firstImage: ImageDocument = {
  id: "img-layout-1",
  name: "capture-1.png",
  src: "blob:synthetic-layout-1",
  width: 400,
  height: 300,
  mimeType: "image/png",
  byteSize: 2048,
};

const secondImage: ImageDocument = {
  id: "img-layout-2",
  name: "capture-2.png",
  src: "blob:synthetic-layout-2",
  width: 200,
  height: 150,
  mimeType: "image/png",
  byteSize: 1024,
};

describe("DirectLayoutSurface (A205)", () => {
  it("drops removed source layers instead of retaining a plan that cannot be exported", () => {
    const onCompose = vi.fn();
    const { rerender } = render(<DirectLayoutSurface images={[firstImage, secondImage]} selected={firstImage} busy={false} onCompose={onCompose} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "capture-2.png" }));
    expect(screen.getByTestId("layout-layer-img-layout-2")).toBeInTheDocument();
    rerender(<DirectLayoutSurface images={[firstImage]} selected={firstImage} busy={false} onCompose={onCompose} />);
    expect(screen.queryByTestId("layout-layer-img-layout-2")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create composed image" }));
    expect(onCompose.mock.lastCall?.[0].layers.map((layer: { id: string }) => layer.id)).toEqual([firstImage.id]);
  });
  it("supports layer move/resize to non-square rectangles, drift-free canvas resize, backdrop inset expansion/offsets, and resets when selected image changes", () => {
    const onCompose = vi.fn();

    const { rerender } = render(
      <DirectLayoutSurface
        images={[firstImage, secondImage]}
        selected={firstImage}
        busy={false}
        onCompose={onCompose}
      />,
    );

    const stage = screen.getByTestId("direct-layout-stage");
    expect(stage).toHaveClass("fershot-direct-transform__stage");
    expect(stage).toHaveStyle({ width: "400px", height: "300px" });

    // Simulate live stage DOM growth during canvas-resize to verify initial scale is locked at pointerDown (no drift)
    let liveRectWidth = 400;
    let liveRectHeight = 300;
    const rectSpy = vi
      .spyOn(stage, "getBoundingClientRect")
      .mockImplementation(() => ({
        left: 0,
        top: 0,
        width: liveRectWidth,
        height: liveRectHeight,
        right: liveRectWidth,
        bottom: liveRectHeight,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));

    const canvasHandle = screen.getByRole("button", {
      name: "Resize composition canvas",
    });
    fireEvent.pointerDown(canvasHandle, {
      button: 0,
      pointerId: 1,
      clientX: 400,
      clientY: 300,
    });
    // Even if DOM stage grows during drag, scale stays locked to initial 1x
    liveRectWidth = 500;
    liveRectHeight = 350;
    fireEvent.pointerMove(canvasHandle, {
      pointerId: 1,
      clientX: 500,
      clientY: 350,
    });
    liveRectWidth = 600;
    liveRectHeight = 400;
    fireEvent.pointerUp(canvasHandle, {
      pointerId: 1,
      clientX: 600,
      clientY: 400,
    });
    rectSpy.mockRestore();
    expect(screen.getByTestId("direct-layout-readout")).toHaveTextContent(
      "Canvas: 600 × 400 px",
    );

    // Include second image, move it to (120, 80), and resize it to a non-square / non-aspect rectangle (310x110)
    fireEvent.click(screen.getByRole("checkbox", { name: "capture-2.png" }));
    const moveLayer2 = screen.getByRole("button", {
      name: "Move layer img-layout-2",
    });
    fireEvent.pointerDown(moveLayer2, {
      button: 0,
      pointerId: 2,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 2,
      clientX: 120,
      clientY: 80,
    });

    const resizeLayer2Se = screen.getByRole("button", {
      name: "Resize layer img-layout-2 SE",
    });
    fireEvent.pointerDown(resizeLayer2Se, {
      button: 0,
      pointerId: 3,
      clientX: 320,
      clientY: 230,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 3,
      clientX: 430,
      clientY: 190,
    });

    const layer2Box = screen.getByTestId("layout-layer-img-layout-2");
    expect(layer2Box).toHaveStyle({
      left: "120px",
      top: "75px",
      width: "310px",
      height: "110px",
    });
    expect(screen.getByTestId("direct-layout-raster")).toBeInTheDocument();


    // Enable backdrop (inset=64): output expands to (600 + 128) x (400 + 128) = 728 x 528, and layers shift by (+64, +64)
    fireEvent.click(screen.getByRole("switch", { name: /add backdrop/i }));
    expect(stage).toHaveStyle({ width: "728px", height: "528px" });
    expect(screen.getByTestId("direct-layout-readout")).toHaveTextContent(
      "Canvas: 600 × 400 px · Output: 728 × 528 px",
    );
    const contentCard = screen.getByTestId("direct-layout-content-card");
    expect(contentCard).toHaveStyle({
      left: "64px",
      top: "64px",
      width: "600px",
      height: "400px",
    });
    const layer1Box = screen.getByTestId("layout-layer-img-layout-1");
    expect(layer1Box).toHaveStyle({
      left: "64px",
      top: "64px",
      width: "400px",
      height: "300px",
    });
    expect(layer2Box).toHaveStyle({
      left: "184px",
      top: "139px",
      width: "310px",
      height: "110px",
    });

    // Drag inset handle (+16 -> 80px): output expands to 760 x 560 and content/layers shift to offset 80px
    const insetHandle = screen.getByRole("button", {
      name: "Drag backdrop inset handle",
    });
    fireEvent.pointerDown(insetHandle, {
      button: 0,
      pointerId: 4,
      clientX: 100,
      clientY: 50,
    });
    fireEvent.pointerMove(insetHandle, {
      pointerId: 4,
      clientX: 116,
      clientY: 50,
    });
    expect(screen.getByTestId("direct-layout-inset-readout")).toHaveTextContent(
      "Backdrop inset: 80 px",
    );
    fireEvent.pointerUp(insetHandle, {
      pointerId: 4,
      clientX: 116,
      clientY: 50,
    });
    expect(stage).toHaveStyle({ width: "760px", height: "560px" });
    expect(contentCard).toHaveStyle({
      left: "80px",
      top: "80px",
      width: "600px",
      height: "400px",
    });
    expect(layer1Box).toHaveStyle({
      left: "80px",
      top: "80px",
      width: "400px",
      height: "300px",
    });

    // Changing selected source resets canvas dimensions and layers to the newly selected image
    rerender(
      <DirectLayoutSurface
        images={[firstImage, secondImage]}
        selected={secondImage}
        busy={false}
        onCompose={onCompose}
      />,
    );
    expect(screen.getByTestId("direct-layout-readout")).toHaveTextContent(
      "Canvas: 200 × 150 px · Output: 360 × 310 px (1 layer)",
    );
  });

  it("exposes controls for scale, corner radius, colors, gradient angle, and backdrop image, previews backdrop fills, and handles Escape/lostpointercapture/busy transitions", () => {
    const onCompose = vi.fn();

    const { rerender } = render(
      <DirectLayoutSurface
        images={[firstImage, secondImage]}
        selected={firstImage}
        busy={false}
        onCompose={onCompose}
      />,
    );

    // Set explicit pixels per point (scale)
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Explicit pixels per point" }),
      { target: { value: "2" } },
    );

    // Enable backdrop and configure linear-gradient with custom radius, colors, angle, and shadow
    fireEvent.click(screen.getByRole("switch", { name: /add backdrop/i }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Corner radius" }),
      { target: { value: "24" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Backdrop fill" }), {
      target: { value: "linear-gradient" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Backdrop color" }), {
      target: { value: "#112233" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Second backdrop color" }),
      { target: { value: "#445566" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Gradient angle" }),
      { target: { value: "45" } },
    );
    fireEvent.click(screen.getByRole("switch", { name: /add shadow/i }));

    const preview = screen.getByTestId("direct-layout-backdrop-preview");
    const contentCard = screen.getByTestId("direct-layout-content-card");
    expect(preview).toHaveAttribute("data-fill-kind", "linear-gradient");
    expect(preview).toHaveAttribute("data-output-width", "528");
    expect(preview).toHaveAttribute("data-output-height", "428");
    expect(preview).toHaveAttribute(
      "data-preview-fill",
      "linear-gradient(45deg, #112233, #445566)",
    );
    expect(preview).toHaveStyle({
      width: "528px",
      height: "428px",
      backgroundImage: "linear-gradient(45deg, #112233, #445566)",
    });
    expect(contentCard).toHaveStyle({
      left: "64px",
      top: "64px",
      width: "400px",
      height: "300px",
      borderRadius: "24px",
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Create composed image" }),
    );
    expect(onCompose).toHaveBeenCalledTimes(1);
    expect(onCompose.mock.lastCall?.[0]).toMatchObject({
      canvasWidth: 400,
      canvasHeight: 300,
      displayScale: 2,
      backdrop: {
        inset: 64,
        cornerRadius: 24,
        fill: {
          kind: "linear-gradient",
          startColor: "#112233",
          endColor: "#445566",
          angleDeg: 45,
        },
        shadow: { blur: 16, offsetX: 0, offsetY: 8, color: "#000000" },
      },
    });

    // Switch backdrop fill to Session image and select capture-2.png
    fireEvent.change(screen.getByRole("combobox", { name: "Backdrop fill" }), {
      target: { value: "image" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Backdrop image" }), {
      target: { value: "img-layout-2" },
    });
    expect(preview).toHaveAttribute("data-backdrop-image-id", "img-layout-2");
    expect(screen.getByTestId("direct-layout-raster")).toHaveAttribute("data-backdrop-image-id", "img-layout-2");

    fireEvent.click(
      screen.getByRole("button", { name: "Create composed image" }),
    );
    expect(onCompose).toHaveBeenCalledTimes(2);
    expect(onCompose.mock.lastCall?.[0]).toMatchObject({
      backdropImageId: "img-layout-2",
    });

    // Verify lostpointercapture and mid-gesture busy rollback on canvas resize
    const stage = screen.getByTestId("direct-layout-stage");
    const canvasHandle = screen.getByRole("button", {
      name: "Resize composition canvas",
    });
    fireEvent.pointerDown(canvasHandle, {
      button: 0,
      pointerId: 10,
      clientX: 400,
      clientY: 300,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 10,
      clientX: 700,
      clientY: 500,
    });
    fireEvent(
      stage,
      new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 10 }),
    );
    expect(screen.getByTestId("direct-layout-readout")).toHaveTextContent(
      "Canvas: 400 × 300 px · Output: 528 × 428 px",
    );

    fireEvent.pointerDown(canvasHandle, {
      button: 0,
      pointerId: 11,
      clientX: 400,
      clientY: 300,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 11,
      clientX: 700,
      clientY: 500,
    });
    rerender(
      <DirectLayoutSurface
        images={[firstImage, secondImage]}
        selected={firstImage}
        busy={true}
        onCompose={onCompose}
      />,
    );
    expect(screen.getByTestId("direct-layout-readout")).toHaveTextContent(
      "Canvas: 400 × 300 px · Output: 528 × 428 px",
    );
  });

  it("matches planBackdropLayout geometry, previews shadow and radial/solid fills, and resets stage/layer offsets when backdrop or shadow is toggled off", () => {
    const referenceLayout = planBackdropLayout({
      source: {} as CanvasImageSource,
      sourceWidth: 400,
      sourceHeight: 300,
      inset: 48,
      cornerRadius: 16,
      fill: { kind: "solid", color: "#000000" },
      shadow: { blur: 16, offsetX: 0, offsetY: 8, color: "#000000" },
    });
    const previewLayout = computeDirectBackdropPreviewLayout(
      400,
      300,
      48,
      16,
      true,
    );
    expect(previewLayout).toEqual(referenceLayout);

    render(
      <DirectLayoutSurface
        images={[firstImage, secondImage]}
        selected={firstImage}
        busy={false}
        onCompose={vi.fn()}
      />,
    );

    const stage = screen.getByTestId("direct-layout-stage");
    const contentCard = screen.getByTestId("direct-layout-content-card");
    const layer1 = screen.getByTestId("layout-layer-img-layout-1");

    // Enable backdrop and shadow
    const backdropCheckbox = screen.getByRole("switch", {
      name: /add backdrop/i,
    });
    fireEvent.click(backdropCheckbox);
    const shadowCheckbox = screen.getByRole("switch", {
      name: /add shadow/i,
    });
    fireEvent.click(shadowCheckbox);

    expect(contentCard).toHaveAttribute(
      "data-shadow",
      "0px 8px 16px #000000",
    );
    expect(contentCard).toHaveStyle({
      left: "64px",
      top: "64px",
      boxShadow: "0px 8px 16px #000000",
    });

    // Switch to radial-gradient fill and verify preview style
    fireEvent.change(screen.getByRole("combobox", { name: "Backdrop fill" }), {
      target: { value: "radial-gradient" },
    });
    const preview = screen.getByTestId("direct-layout-backdrop-preview");
    expect(preview).toHaveAttribute("data-fill-kind", "radial-gradient");
    expect(preview).toHaveStyle({
      backgroundImage: "radial-gradient(circle, #e8edf5, #6c5ce7)",
    });

    // Uncheck shadow -> resets shadow style to none while preserving inset offset
    fireEvent.click(shadowCheckbox);
    expect(contentCard).toHaveAttribute("data-shadow", "none");
    expect(contentCard).toHaveStyle({
      left: "64px",
      top: "64px",
      boxShadow: "none",
    });

    // Uncheck backdrop -> resets stage dimensions, contentCard offsets/radius, and layer offsets to (0, 0)
    fireEvent.click(backdropCheckbox);
    expect(
      screen.queryByTestId("direct-layout-backdrop-preview"),
    ).toBeNull();
    expect(stage).toHaveAttribute("data-output-width", "400");
    expect(stage).toHaveAttribute("data-output-height", "300");
    expect(stage).toHaveStyle({ width: "400px", height: "300px" });
    expect(contentCard).toHaveStyle({
      left: "0px",
      top: "0px",
      width: "400px",
      height: "300px",
      borderRadius: "0px",
      boxShadow: "none",
    });
    expect(layer1).toHaveStyle({
      left: "0px",
      top: "0px",
      width: "400px",
      height: "300px",
    });
  });
});
