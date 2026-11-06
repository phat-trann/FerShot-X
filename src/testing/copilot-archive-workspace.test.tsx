// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceArchive } from "../Workspace.archive";

const mocks = vi.hoisted(() => ({ create: vi.fn(), importInto: vi.fn(), exportFrom: vi.fn(), cancel: vi.fn(), commit: undefined as undefined | ((candidate: unknown, revision: number) => boolean) }));
vi.mock("../platform/archive", () => ({ createLocalArchiveWorkflow: mocks.create }));
const snapshot = { revision: 4, images: [], selectedId: null, annotations: {} };
function props() { return { imageCount: 1, blocked: false, snapshot: vi.fn(() => snapshot), commit: vi.fn(() => true), run: async (operation: () => Promise<void>) => operation() }; }

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockImplementation(commit => { mocks.commit = commit; return { importInto: mocks.importInto, exportFrom: mocks.exportFrom, cancel: mocks.cancel }; });
  mocks.importInto.mockResolvedValue({ status: "committed" }); mocks.exportFrom.mockResolvedValue("saved");
});

describe("archive workspace operation lifecycle", () => {
  it("starts only explicitly, suppresses duplicate import and forwards cancel", async () => {
    let finish!: (value: { status: string }) => void;
    mocks.importInto.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const input = props(); render(<WorkspaceArchive {...input} />);
    expect(mocks.create).not.toHaveBeenCalled(); expect(input.snapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Import archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Import archive" }));
    expect(mocks.importInto).toHaveBeenCalledTimes(1);
    expect(mocks.importInto).toHaveBeenCalledWith(snapshot);
    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/ }));
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ status: "cancelled" }); });
    expect(screen.getByRole("status")).toHaveTextContent("cancelled");
  });

  it("shows conflict without claiming a committed import, and successful export status", async () => {
    mocks.importInto.mockResolvedValue({ status: "conflict" }); render(<WorkspaceArchive {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Import archive" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("not committed"));
    fireEvent.click(screen.getByRole("button", { name: "Export archive" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("exported"));
  });

  it("reports a failed operation and restores enabled actions", async () => {
    mocks.exportFrom.mockRejectedValue(new Error("synthetic write rejected")); render(<WorkspaceArchive {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Export archive" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("synthetic write rejected"));
    expect(screen.getByRole("button", { name: "Export archive" })).toBeEnabled();
  });

  it("cancels on unmount and refuses a late commit into the library", async () => {
    let finish!: (value: { status: string }) => void;
    mocks.importInto.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const input = props(); const view = render(<WorkspaceArchive {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Import archive" })); view.unmount();
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.commit?.(snapshot, 4)).toBe(false); expect(input.commit).not.toHaveBeenCalled();
    await act(async () => { finish({ status: "cancelled" }); });
  });
});
