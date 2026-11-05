// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LibraryPanel } from "./LibraryPanel";
import type { ImageDocument } from "../../contracts/media";

const SYNTHETIC_IMAGES: readonly ImageDocument[] = [
  {
    id: "img-1",
    name: "fullscreen-dashboard.png",
    src: "blob:synthetic-1",
    width: 1920,
    height: 1080,
    mimeType: "image/png",
    byteSize: 204800,
  },
  {
    id: "img-2",
    name: "receipt-crop.jpeg",
    src: "blob:synthetic-2",
    width: 640,
    height: 480,
    mimeType: "image/jpeg",
    byteSize: 51200,
  },
];

afterEach(() => {
  cleanup();
});

describe("LibraryPanel", () => {
  it("renders empty state when no session images are supplied", () => {
    render(
      <LibraryPanel
        images={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /no images in session library/i,
    );
  });

  it("filters items by query, shows no-match message, and clears filter", () => {
    render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const searchInput = screen.getByRole("searchbox", {
      name: /filter library images/i,
    });
    fireEvent.change(searchInput, { target: { value: "receipt" } });

    expect(
      screen.getByRole("button", { name: "Select receipt-crop.jpeg" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select fullscreen-dashboard.png" }),
    ).toBeNull();

    fireEvent.change(searchInput, { target: { value: "nonexistent-item" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      /no images match “nonexistent-item”/i,
    );

    fireEvent.click(screen.getByRole("button", { name: /clear filter/i }));
    expect(
      screen.getByRole("button", { name: "Select fullscreen-dashboard.png" }),
    ).toBeInTheDocument();
  });

  it("reflects selectedId state and triggers onSelect and onRemove without revoking object URLs", () => {
    const onSelect = vi.fn<(id: string) => void>();
    const onRemove = vi.fn<(id: string) => void>();
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={onSelect}
        onRemove={onRemove}
      />,
    );

    const firstSelect = screen.getByRole("button", {
      name: "Select fullscreen-dashboard.png",
    });
    const secondSelect = screen.getByRole("button", {
      name: "Select receipt-crop.jpeg",
    });

    expect(firstSelect).toHaveAttribute("aria-pressed", "true");
    expect(secondSelect).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(secondSelect);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("img-2");

    fireEvent.click(
      screen.getByRole("button", { name: "Remove fullscreen-dashboard.png" }),
    );
    expect(onRemove).toHaveBeenCalledExactlyOnceWith("img-1");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(revokeSpy).not.toHaveBeenCalled();

    revokeSpy.mockRestore();
  });

  it("toggles between list and grid presentation and supports arrow-key navigation", () => {
    render(
      <LibraryPanel
        images={SYNTHETIC_IMAGES}
        selectedId="img-1"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const panel = screen.getByRole("region", { name: /session library/i });
    const listBtn = screen.getByRole("button", { name: /list view/i });
    const gridBtn = screen.getByRole("button", { name: /grid view/i });

    expect(panel).toHaveAttribute("data-layout", "list");
    expect(listBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(gridBtn);
    expect(panel).toHaveAttribute("data-layout", "grid");
    expect(gridBtn).toHaveAttribute("aria-pressed", "true");
    expect(listBtn).toHaveAttribute("aria-pressed", "false");

    const firstSelect = screen.getByRole("button", {
      name: "Select fullscreen-dashboard.png",
    });
    const secondSelect = screen.getByRole("button", {
      name: "Select receipt-crop.jpeg",
    });

    firstSelect.focus();
    expect(firstSelect).toHaveFocus();

    fireEvent.keyDown(firstSelect, { key: "ArrowDown" });
    expect(secondSelect).toHaveFocus();

    fireEvent.keyDown(secondSelect, { key: "ArrowUp" });
    expect(firstSelect).toHaveFocus();
  });
});

