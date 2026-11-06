// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceLifecycle } from "../Workspace.lifecycle";
import type { LifecycleContext } from "../features/lifecycle-policy";

const native = vi.hoisted(() => ({
  closeWorkspace: vi.fn<() => Promise<void>>(),
  listenForWorkspaceClose: vi.fn<(handler: () => void) => Promise<() => void>>(),
  setWorkspaceOnTop: vi.fn<(enabled: boolean) => Promise<void>>(),
}));

vi.mock("../platform/native", () => native);

const context = (overrides: Partial<LifecycleContext> = {}): LifecycleContext => ({
  documentId: "image-1",
  revision: 1,
  imageIds: ["image-1"],
  dirty: true,
  busy: false,
  editable: true,
  ...overrides,
});

describe("WorkspaceLifecycle independent regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.listenForWorkspaceClose.mockResolvedValue(vi.fn());
    native.closeWorkspace.mockResolvedValue(undefined);
    native.setWorkspaceOnTop.mockResolvedValue(undefined);
  });

  it("confirms close, supports cancellation, and suppresses duplicate confirmation", async () => {
    render(<WorkspaceLifecycle context={context()} />);
    const close = screen.getByRole("button", { name: "Close workspace" });
    fireEvent.click(close);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(close);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep workspace open" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(native.closeWorkspace).not.toHaveBeenCalled();
  });

  it("suppresses close while busy and retries failed close", async () => {
    native.closeWorkspace.mockRejectedValueOnce(new Error("close failed"));
    const { rerender } = render(
      <WorkspaceLifecycle context={context({ busy: true })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close workspace" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    rerender(<WorkspaceLifecycle context={context()} />);
    fireEvent.click(screen.getByRole("button", { name: "Close workspace" }));
    fireEvent.click(screen.getByRole("button", { name: "Close and discard session" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("close failed"));
    fireEvent.click(screen.getByRole("button", { name: "Close workspace" }));
    fireEvent.click(screen.getByRole("button", { name: "Close and discard session" }));
    await waitFor(() => expect(native.closeWorkspace).toHaveBeenCalledTimes(2));
  });

  it("invalidates stale confirmation when the session revision changes", () => {
    const { rerender } = render(<WorkspaceLifecycle context={context()} />);
    fireEvent.click(screen.getByRole("button", { name: "Close workspace" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    rerender(<WorkspaceLifecycle context={context({ revision: 2 })} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(native.closeWorkspace).not.toHaveBeenCalled();
  });

  it("calls on-top only after an explicit click and reports failed toggles", async () => {
    render(<WorkspaceLifecycle context={context()} />);
    expect(native.setWorkspaceOnTop).not.toHaveBeenCalled();
    native.setWorkspaceOnTop.mockRejectedValueOnce(new Error("on-top failed"));
    fireEvent.click(screen.getByRole("button", { name: /Keep workspace on top/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("on-top failed"));
    expect(native.setWorkspaceOnTop).toHaveBeenCalledWith(true);
  });
});
