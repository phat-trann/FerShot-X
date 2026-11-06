// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceRecognition } from "../Workspace.recognition";
import { RecognitionController, type RecognitionBackendResult } from "../features/recognition-workflow";

const ports = vi.hoisted(() => ({ languages: vi.fn(), copy: vi.fn() }));
vi.mock("../platform/recognition", () => ({ discoverRecognitionLanguages: ports.languages, createRecognitionSession: vi.fn() }));
vi.mock("../platform/native", () => ({ copyRecognizedText: ports.copy }));
interface ViewProps { text: string; busy: boolean; error: string | null; onRecognize: (kind: "text", language: string) => void; onCopy: (text: string) => void; onCancel: () => void }
vi.mock("../features/recognition-workspace", () => ({ RecognitionWorkspace: (props: ViewProps) => <section>
  <output data-testid="result">{props.text}</output><output data-testid="busy">{String(props.busy)}</output><output data-testid="error">{props.error}</output>
  <button onClick={() => props.onRecognize("text", "en-US")}>recognize</button>
  <button onClick={() => { props.onRecognize("text", "en-US"); props.onRecognize("text", "en-US"); }}>recognize twice</button>
  <button onClick={props.onCancel}>cancel</button>
  <button onClick={() => { props.onCopy(props.text); props.onCopy(props.text); }}>copy twice</button>
</section> }));
const image = { id: "source", src: "blob:source", name: "source.png", width: 8, height: 6, mimeType: "image/png", byteSize: 100 };
function controller(backend: (request: unknown, signal: AbortSignal) => Promise<RecognitionBackendResult>) {
  const instance = new RecognitionController({ languages: async () => ["en-US"], recognize: backend });
  instance.select({ id: image.id, revision: 1, width: 8, height: 6, byteSize: 100 });
  return instance;
}
beforeEach(() => { vi.clearAllMocks(); ports.languages.mockResolvedValue(["en-US"]); ports.copy.mockResolvedValue(undefined); });

describe("root recognition workspace asynchronous boundaries", () => {
  it("does not begin recognition on render and suppresses duplicate starts and copy calls", async () => {
    const backend = vi.fn().mockResolvedValue({ text: "result", codes: [] });
    const instance = controller(backend); await instance.loadLanguages();
    render(<WorkspaceRecognition image={image} revision={1} prepare={async () => instance} />);
    expect(backend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("recognize twice"));
    await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("result"));
    expect(backend).toHaveBeenCalledTimes(1);
    let finish!: () => void; ports.copy.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    fireEvent.click(screen.getByText("copy twice")); expect(ports.copy).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); });
  });

  it("a source revision change disposes old work and hides a late result", async () => {
    let finish!: (result: RecognitionBackendResult) => void;
    const instance = controller(() => new Promise(resolve => { finish = resolve; })); await instance.loadLanguages();
    const prepare = async () => instance;
    const view = render(<WorkspaceRecognition image={image} revision={1} prepare={prepare} />);
    fireEvent.click(screen.getByText("recognize"));
    await waitFor(() => expect(screen.getByTestId("busy")).toHaveTextContent("true"));
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    view.rerender(<WorkspaceRecognition image={image} revision={2} prepare={prepare} />);
    await act(async () => { finish({ text: "obsolete", codes: [] }); });
    expect(screen.getByTestId("result")).toBeEmptyDOMElement();
    expect(screen.getByTestId("busy")).toHaveTextContent("false");
  });

  it("cancel ignores a late backend result and permits a new interaction", async () => {
    let finish!: (result: RecognitionBackendResult) => void;
    const instance = controller(() => new Promise(resolve => { finish = resolve; })); await instance.loadLanguages();
    render(<WorkspaceRecognition image={image} revision={1} prepare={async () => instance} />);
    fireEvent.click(screen.getByText("recognize")); await waitFor(() => expect(finish).toBeTypeOf("function"));
    fireEvent.click(screen.getByText("cancel"));
    await act(async () => { finish({ text: "cancelled output", codes: [] }); });
    expect(screen.getByTestId("result")).toBeEmptyDOMElement();
    expect(screen.getByTestId("busy")).toHaveTextContent("false");
  });

  it("failed prepare clears busy and exposes the actual error", async () => {
    render(<WorkspaceRecognition image={image} revision={1} prepare={async () => { throw new Error("synthetic prepare failure"); }} />);
    fireEvent.click(screen.getByText("recognize"));
    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("synthetic prepare failure"));
    expect(screen.getByTestId("busy")).toHaveTextContent("false");
  });
});
