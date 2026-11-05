import { describe, expect, it, vi } from "vitest";
import { RecognitionController, MAX_RECOGNITION_OUTPUT_BYTES, type RecognitionBackendResult, type RecognitionRequest } from ".";
const image = { id: "image", revision: 1, width: 2, height: 2, byteSize: 16 };
const raw = (text = "a\r\nb"): RecognitionBackendResult => ({ text, codes: [] });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
describe("recognition workflow", () => {
  it("rejects an old completion after a newer request without replacing its result", async () => {
    const a = deferred<RecognitionBackendResult>(), b = deferred<RecognitionBackendResult>();
    const c = new RecognitionController({ languages: async () => ["en-US"], recognize: vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise) });
    c.select(image); await c.loadLanguages(); const first = c.recognize("text", { language: "en-US" });
    const next = c.recognize("qr"); b.resolve(raw("new")); expect((await next)?.rawText).toBe("new");
    a.resolve(raw("old")); expect(await first).toBeNull(); expect(c.state.result?.rawText).toBe("new");
  });
  it("isolates closing or replacing an image and snapshots its revision", async () => {
    const d = deferred<RecognitionBackendResult>(); const recognize = vi.fn((_request: RecognitionRequest, _signal: AbortSignal) => d.promise);
    const c = new RecognitionController({ languages: async () => [], recognize }); const source = { ...image };
    c.select(source); source.revision = 99; const pending = c.recognize("qr"); c.select(null);
    d.resolve(raw()); expect(await pending).toBeNull(); expect(c.state.result).toBeNull();
    expect(recognize.mock.calls[0]?.[0].source.revision).toBe(1);
  });
  it("preserves raw text, normalizes only display text and treats QR URLs as inert strings", async () => {
    const result = { text: "a\r\nb", codes: [{ id: "q", payload: "javascript:alert(1)" }] };
    const c = new RecognitionController({ languages: async () => ["vi-VN"], recognize: async () => result });
    c.select(image); await c.loadLanguages(); const out = await c.recognize("text", { language: "vi-VN", preserveLineBreaks: false });
    result.codes[0]!.payload = "changed";
    expect(out?.rawText).toBe("a\r\nb"); expect(out?.displayText).toBe("a b"); expect(out?.codes[0]?.payload).toBe("javascript:alert(1)");
    expect(Object.isFrozen(out?.codes[0])).toBe(true);
  });
  it("rejects source/language bounds before invoking the backend", async () => {
    const recognize = vi.fn(); const c = new RecognitionController({ languages: async () => ["en-US"], recognize });
    expect(() => c.select({ ...image, width: 20_000 })).toThrow(); c.select(image);
    await expect(c.recognize("text", { language: "en-US" })).rejects.toThrow("runtime"); await c.loadLanguages();
    await expect(c.recognize("text", { language: "xx" })).rejects.toThrow("runtime"); expect(recognize).not.toHaveBeenCalled();
  });
  it("clears stale language capability after discovery failure and can retry", async () => {
    const languages = vi.fn().mockResolvedValueOnce(["en-US"]).mockRejectedValueOnce(new Error("offline SDK")).mockResolvedValueOnce(["ja-JP"]);
    const c = new RecognitionController({ languages, recognize: async () => raw() }); c.select(image);
    await c.loadLanguages(); await expect(c.loadLanguages()).rejects.toThrow("SDK"); expect(c.state.languages).toEqual([]);
    expect(await c.loadLanguages()).toEqual(["ja-JP"]);
  });
  it("rejects oversized or malformed output, recovers and accepts empty results", async () => {
    const recognize = vi.fn().mockResolvedValueOnce(raw("x".repeat(MAX_RECOGNITION_OUTPUT_BYTES + 1)))
      .mockResolvedValueOnce({ text: "", codes: [{ id: "q", payload: 42 }] }).mockResolvedValueOnce(raw(""));
    const c = new RecognitionController({ languages: async () => [], recognize }); c.select(image);
    await expect(c.recognize("qr")).rejects.toThrow("bounds"); await expect(c.recognize("qr")).rejects.toThrow("QR");
    expect((await c.recognize("qr"))?.rawText).toBe(""); expect(c.state.phase).toBe("done");
  });
  it("discards language discovery that finishes after disposal", async () => {
    const d = deferred<string[]>(); const c = new RecognitionController({ languages: () => d.promise, recognize: async () => raw() });
    const pending = c.loadLanguages(); c.dispose(); d.resolve(["en-US"]); expect(await pending).toBeNull(); expect(c.state.languages).toEqual([]);
  });
});
