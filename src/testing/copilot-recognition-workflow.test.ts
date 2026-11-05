import { describe, expect, it } from "vitest";
import {
  RecognitionController,
  type RecognitionBackend,
  type RecognitionSource,
} from "../features/recognition-workflow";

const source: RecognitionSource = {
  id: "image-1",
  revision: 3,
  width: 20,
  height: 10,
  byteSize: 800,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("RecognitionController public invariants", () => {
  it("suppresses an older recognition result after a newer request", async () => {
    const first = deferred<{ text: string; codes: [] }>();
    const second = deferred<{ text: string; codes: [] }>();
    let calls = 0;
    const backend: RecognitionBackend = {
      languages: async () => ["en"],
      recognize: async () => {
        calls += 1;
        return (calls === 1 ? first.promise : second.promise);
      },
    };
    const controller = new RecognitionController(backend);
    controller.select(source);
    await controller.loadLanguages();
    const oldRequest = controller.recognize("text", { language: "en" });
    const newRequest = controller.recognize("text", { language: "en" });
    first.resolve({ text: "old", codes: [] });
    second.resolve({ text: "new", codes: [] });

    await expect(oldRequest).resolves.toBeNull();
    await expect(newRequest).resolves.toMatchObject({ rawText: "new" });
    expect(controller.state.result?.rawText).toBe("new");
  });

  it("returns null for a result from a source that was deselected", async () => {
    const pending = deferred<{ text: string; codes: [] }>();
    const backend: RecognitionBackend = {
      languages: async () => ["en"],
      recognize: async () => pending.promise,
    };
    const controller = new RecognitionController(backend);
    controller.select(source);
    await controller.loadLanguages();
    const request = controller.recognize("text", { language: "en" });
    controller.select(null);
    pending.resolve({ text: "stale", codes: [] });

    await expect(request).resolves.toBeNull();
    expect(controller.state.result).toBeNull();
    expect(controller.state.phase).toBe("idle");
  });

  it("keeps the selected source immutable in the recognition result", async () => {
    const backend: RecognitionBackend = {
      languages: async () => ["en"],
      recognize: async () => ({ text: "hello\nworld", codes: [] }),
    };
    const controller = new RecognitionController(backend);
    controller.select(source);
    await controller.loadLanguages();
    const result = await controller.recognize("text", {
      language: "en",
      preserveLineBreaks: false,
    });

    expect(result?.source).toEqual(source);
    expect(Object.isFrozen(result?.source)).toBe(true);
    expect(result?.displayText).toBe("hello world");
  });

  it("suppresses stale language discovery and keeps only the newest list", async () => {
    const first = deferred<readonly string[]>();
    const second = deferred<readonly string[]>();
    let calls = 0;
    const backend: RecognitionBackend = {
      languages: async () => {
        calls += 1;
        return calls === 1 ? first.promise : second.promise;
      },
      recognize: async () => ({ text: "", codes: [] }),
    };
    const controller = new RecognitionController(backend);
    const oldLoad = controller.loadLanguages();
    const newLoad = controller.loadLanguages();
    first.resolve(["fr"]);
    second.resolve(["en"]);

    await expect(oldLoad).resolves.toBeNull();
    await expect(newLoad).resolves.toEqual(["en"]);
    expect(controller.state.languages).toEqual(["en"]);
  });
});
