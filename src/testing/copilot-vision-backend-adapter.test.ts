import { describe, expect, it, vi } from "vitest";
import {
  createVisionBackendAdapter,
  type VisionAdapterPorts,
} from "../features/vision-backend-adapter";
import type {
  RecognitionRequest,
  RecognitionSource,
} from "../features/recognition-workflow";

const source: RecognitionSource = Object.freeze({
  id: "doc-vision",
  revision: 3,
  width: 2,
  height: 2,
  byteSize: 4,
});

const request: RecognitionRequest = Object.freeze({
  source,
  kind: "text",
  language: "en-US",
});

function ports(overrides: Partial<VisionAdapterPorts> = {}): VisionAdapterPorts {
  return {
    resolve: async (resolvedSource) => ({
      source: resolvedSource,
      bytes: new Uint8Array([1, 2, 3, 4]),
      release: vi.fn(),
    }),
    languages: async () => ["en-US"],
    recognize: async () => ({
      schemaVersion: 1,
      width: 2,
      height: 2,
      textBlocks: [{ text: "hello", confidence: 1 }],
      qrCodes: [],
      resolvedLanguages: ["en-US"],
      recognizedText: "hello",
    }),
    ...overrides,
  };
}

describe("Vision backend adapter independent regressions", () => {
  it("rejects a mismatched lease and releases it", async () => {
    const release = vi.fn();
    const backend = createVisionBackendAdapter(
      ports({
        resolve: async () => ({
          source: { ...source, revision: 4 },
          bytes: new Uint8Array([1, 2, 3, 4]),
          release,
        }),
      }),
    );

    await expect(backend.recognize(request, new AbortController().signal))
      .rejects.toThrow("Resolved Vision source/revision mismatch");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rejects malformed Unicode and releases the source", async () => {
    const release = vi.fn();
    const backend = createVisionBackendAdapter(
      ports({
        resolve: async (resolvedSource) => ({
          source: resolvedSource,
          bytes: new Uint8Array([1, 2, 3, 4]),
          release,
        }),
        recognize: async () => ({
          schemaVersion: 1,
          width: 2,
          height: 2,
          textBlocks: [{ text: "\ud800", confidence: 1 }],
          qrCodes: [],
          resolvedLanguages: ["en-US"],
          recognizedText: "\ud800",
        }),
      }),
    );

    await expect(backend.recognize(request, new AbortController().signal))
      .rejects.toThrow("Invalid Unicode in Vision output");
    expect(release).toHaveBeenCalledOnce();
  });

  it("copies lease bytes before transport can mutate the source buffer", async () => {
    let transported: Uint8Array | undefined;
    const original = new Uint8Array([1, 2, 3, 4]);
    const backend = createVisionBackendAdapter(
      ports({
        resolve: async (resolvedSource) => ({
          source: resolvedSource,
          bytes: original,
          release: vi.fn(),
        }),
        recognize: async (wire) => {
          transported = wire.imageBytes;
          original[0] = 99;
          return {
            schemaVersion: 1,
            width: 2,
            height: 2,
            textBlocks: [{ text: "hello", confidence: 1 }],
            qrCodes: [],
            resolvedLanguages: ["en-US"],
            recognizedText: "hello",
          };
        },
      }),
    );

    await backend.recognize(request, new AbortController().signal);
    expect(transported).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(transported).not.toBe(original);
  });

  it("aborts before transport and releases after a late resolver result", async () => {
    const controller = new AbortController();
    const release = vi.fn();
    let resolveLease!: (lease: {
      source: RecognitionSource;
      bytes: Uint8Array;
      release: () => void;
    }) => void;
    const backend = createVisionBackendAdapter(
      ports({
        resolve: async () =>
          new Promise((resolve) => {
            resolveLease = resolve;
          }),
      }),
    );
    const pending = backend.recognize(request, controller.signal);
    controller.abort();
    resolveLease({ source, bytes: new Uint8Array([1, 2, 3, 4]), release });

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(release).toHaveBeenCalledOnce();
  });
});
