import { describe, expect, it, vi } from "vitest";
import { RecognitionController, type RecognitionRequest } from "../recognition-workflow";
import { createVisionBackendAdapter, VISION_ADAPTER_LIMITS, type VisionAdapterPorts, type VisionSourceLease } from "./index";

const source = { id: "source-1", revision: 3, width: 2, height: 2, byteSize: 3 };
const request: RecognitionRequest = { source, kind: "text", language: "en-US" };
const response = () => ({ schemaVersion: 1, width: 2, height: 2, recognizedText: "Hello", textBlocks: [{ text: "Hello", confidence: 0.9 }], qrCodes: [], resolvedLanguages: ["en-US"] });
function fixture() {
  const bytes = new Uint8Array([1, 2, 3]);
  const release = vi.fn();
  const ports = {
    resolve: vi.fn<VisionAdapterPorts["resolve"]>(async () => ({ source: { ...source }, bytes, release })),
    languages: vi.fn<VisionAdapterPorts["languages"]>(async () => ["en-US", "vi-VN", "en-US"]),
    recognize: vi.fn<VisionAdapterPorts["recognize"]>(async () => response()),
  } satisfies VisionAdapterPorts;
  return { bytes, release, ports, backend: createVisionBackendAdapter(ports) };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

describe("C23 injected Vision adapter", () => {
  it("integrates with C18 and copies source bytes before passing the A33-shaped request", async () => {
    const f = fixture();
    const controller = new RecognitionController(f.backend);
    controller.select(source);
    expect(await controller.loadLanguages()).toEqual(["en-US", "vi-VN"]);
    const result = await controller.recognize("text", { language: "en-US" });
    expect(result).toMatchObject({ source, rawText: "Hello", displayText: "Hello" });
    const wire = f.ports.recognize.mock.calls[0]?.[0];
    expect(wire).toMatchObject({ schemaVersion: 1, mode: "ocr", languages: ["en-US"], preserveLineBreaks: true, usesLanguageCorrection: true, maxResults: 50 });
    expect(wire?.imageBytes).not.toBe(f.bytes);
    expect(f.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("returns immutable QR values with deterministic result-local IDs", async () => {
    const f = fixture();
    const qr = { payload: "https://example.test", symbology: "QR" };
    f.ports.recognize.mockResolvedValue({ ...response(), recognizedText: "", textBlocks: [], qrCodes: [qr], resolvedLanguages: [] });
    const first = await f.backend.recognize({ source, kind: "qr" }, new AbortController().signal);
    const second = await f.backend.recognize({ source, kind: "qr" }, new AbortController().signal);
    expect(first.codes).toEqual(second.codes);
    qr.payload = "mutated";
    expect(first.codes[0]).toEqual({ id: "3:qr:0", payload: "https://example.test", symbology: "QR" });
    expect(Object.isFrozen(first.codes[0])).toBe(true);
    expect(Object.isFrozen(first.codes)).toBe(true);
    expect(f.release).toHaveBeenCalledTimes(2);
  });

  it.each([
    { ...source, revision: -1 }, { ...source, width: 0 },
    { ...source, width: 16_384, height: 16_384 },
    { ...source, byteSize: VISION_ADAPTER_LIMITS.inputBytes + 1 },
  ])("rejects invalid source metadata before resolving bytes: %j", async invalid => {
    const f = fixture();
    await expect(f.backend.recognize({ ...request, source: invalid }, new AbortController().signal)).rejects.toThrow();
    expect(f.ports.resolve).not.toHaveBeenCalled();
    expect(f.ports.recognize).not.toHaveBeenCalled();
  });

  it("rejects a stale resolver revision and releases its lease", async () => {
    const f = fixture();
    f.ports.resolve.mockResolvedValue({ source: { ...source, revision: 4 }, bytes: f.bytes, release: f.release });
    await expect(f.backend.recognize(request, new AbortController().signal)).rejects.toThrow(/mismatch/);
    expect(f.release).toHaveBeenCalledTimes(1);
    expect(f.ports.recognize).not.toHaveBeenCalled();
  });

  it.each([
    { ...response(), schemaVersion: 2 }, { ...response(), width: 3 },
    { ...response(), textBlocks: [{ text: "Hello", confidence: Number.NaN }] },
    { ...response(), recognizedText: "wrong summary" },
    { ...response(), recognizedText: "\ud800" },
    { ...response(), resolvedLanguages: ["vi-VN"] },
    { ...response(), textBlocks: Array.from({ length: 51 }, () => ({ text: "Hello", confidence: 1 })) },
    { ...response(), recognizedText: "é".repeat(140_000), textBlocks: [{ text: "é".repeat(140_000), confidence: 1 }] },
  ])("rejects malformed or over-budget transport responses", async invalid => {
    const f = fixture();
    f.ports.recognize.mockResolvedValue(invalid);
    await expect(f.backend.recognize(request, new AbortController().signal)).rejects.toThrow();
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("rejects a pre-aborted operation without invoking any port", async () => {
    const f = fixture(), abort = new AbortController(); abort.abort();
    await expect(f.backend.recognize(request, abort.signal)).rejects.toMatchObject({ name: "AbortError" });
    await expect(f.backend.languages(abort.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(f.ports.resolve).not.toHaveBeenCalled();
    expect(f.ports.languages).not.toHaveBeenCalled();
  });

  it("releases a late resolver lease after abort without dispatching recognition", async () => {
    const f = fixture(), pending = deferred<VisionSourceLease>(), abort = new AbortController();
    f.ports.resolve.mockReturnValue(pending.promise);
    const run = f.backend.recognize(request, abort.signal);
    abort.abort(); pending.resolve({ source, bytes: f.bytes, release: f.release });
    await expect(run).rejects.toMatchObject({ name: "AbortError" });
    expect(f.ports.recognize).not.toHaveBeenCalled();
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("discards even a malformed late transport response after abort", async () => {
    const f = fixture(), pending = deferred<unknown>(), abort = new AbortController();
    f.ports.recognize.mockReturnValue(pending.promise);
    const run = f.backend.recognize(request, abort.signal);
    await Promise.resolve();
    abort.abort(); pending.resolve(null);
    await expect(run).rejects.toMatchObject({ name: "AbortError" });
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("propagates language discovery failures and rejects malformed capabilities", async () => {
    const f = fixture();
    f.ports.languages.mockRejectedValueOnce(new Error("runtime unavailable"));
    await expect(f.backend.languages(new AbortController().signal)).rejects.toThrow("runtime unavailable");
    f.ports.languages.mockResolvedValue(["en_US"]);
    await expect(f.backend.languages(new AbortController().signal)).rejects.toThrow(/language/);
  });
});
