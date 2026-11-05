import { describe, expect, it } from "vitest";
import {
  OutputCoordinator,
  type OutputAdapters,
  type OutputRequest,
} from "../features/output-jobs";

const request: OutputRequest = {
  id: "job-1",
  source: {
    id: "image-1",
    revision: 1,
    name: "capture",
    src: "data:image/png;base64,AA==",
    width: 10,
    height: 10,
    mimeType: "image/png",
    byteSize: 400,
  },
  options: { format: "png", quality: 90, name: "capture" },
  actions: ["copy", "save"],
};

type MutableOutputRequest = Omit<OutputRequest, "source"> & {
  source: { -readonly [Key in keyof OutputRequest["source"]]: OutputRequest["source"][Key] };
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("OutputCoordinator public invariants", () => {
  it("reports cancellation and releases a late render artifact", async () => {
    const pending = deferred<{ value: string; release(): void }>();
    let releases = 0;
    const adapters: OutputAdapters<string> = {
      render: async () => pending.promise,
      handlers: {
        copy: async () => ({ status: "completed" }),
        save: async () => ({ status: "completed" }),
      },
    };
    const controller = new OutputCoordinator(adapters);
    controller.select({ id: "image-1", revision: 1 });
    const run = controller.run(request);
    await Promise.resolve();
    controller.cancel();
    pending.resolve({
      value: "rendered",
      release: () => {
        releases += 1;
      },
    });

    await expect(run).resolves.toMatchObject({ status: "cancelled" });
    expect(releases).toBe(1);
  });

  it("snapshots the request before the caller mutates its source", async () => {
    const seen: string[] = [];
    const adapters: OutputAdapters<string> = {
      render: async (input) => {
        seen.push(input.source.name);
        return { value: "rendered", release: () => undefined };
      },
      handlers: {
        copy: async (_value, input) => {
          seen.push(input.source.name);
          return { status: "completed" };
        },
        save: async () => ({ status: "completed" }),
      },
    };
    const mutable: MutableOutputRequest = {
      ...request,
      source: { ...request.source },
    };
    const controller = new OutputCoordinator(adapters);
    controller.select({ id: "image-1", revision: 1 });
    const run = controller.run(mutable);
    mutable.source.name = "mutated";

    await expect(run).resolves.toMatchObject({ status: "done" });
    expect(seen).toEqual(["capture", "capture"]);
  });

  it("deduplicates a pending job and does not repeat completed handlers", async () => {
    let copies = 0;
    const adapters: OutputAdapters<string> = {
      render: async () => ({ value: "rendered", release: () => undefined }),
      handlers: {
        copy: async () => {
          copies += 1;
          return { status: "completed" };
        },
        save: async () => ({ status: "completed" }),
      },
    };
    const controller = new OutputCoordinator(adapters);
    controller.select({ id: "image-1", revision: 1 });
    const first = controller.run(request);
    const second = controller.run(request);

    expect(second).toBe(first);
    await expect(first).resolves.toMatchObject({ status: "done" });
    await expect(controller.run(request)).resolves.toMatchObject({ status: "done" });
    expect(copies).toBe(1);
  });

  it("marks a thrown handler uncertain rather than claiming completion", async () => {
    const adapters: OutputAdapters<string> = {
      render: async () => ({ value: "rendered", release: () => undefined }),
      handlers: {
        copy: async () => {
          throw new Error("clipboard outcome unknown");
        },
        save: async () => ({ status: "completed" }),
      },
    };
    const controller = new OutputCoordinator(adapters);
    controller.select({ id: "image-1", revision: 1 });

    const receipt = await controller.run(request);
    expect(receipt.status).toBe("uncertain");
    expect(receipt.uncertain).toBe("copy");
    expect(receipt.completed).toEqual([]);
  });
});
