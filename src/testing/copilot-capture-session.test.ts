import { describe, expect, it } from "vitest";
import {
  CaptureSessionController,
  type CaptureArtifact,
  type CaptureFrame,
  type CaptureSessionAdapters,
} from "../features/capture-session";

const display = {
  id: "display-1",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  scale: 1,
};

const budget = {
  maxFrames: 4,
  maxBytes: 1024,
  maxPixels: 10_000,
  overlap: 0,
};

function frame(value: string, width = 10, height = 10): CaptureFrame<string> {
  return {
    value,
    width,
    height,
    byteSize: width * height * 4,
    release: () => undefined,
  };
}

function artifact(value: string): CaptureArtifact<string> {
  return { value, release: () => undefined };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("CaptureSessionController public invariants", () => {
  it("releases a frame that resolves after cancellation", async () => {
    const pending = deferred<CaptureFrame<string>>();
    let releases = 0;
    const lateFrame = frame("late");
    lateFrame.release = () => {
      releases += 1;
    };
    const adapters: CaptureSessionAdapters<string, string> = {
      acquire: () => pending.promise,
      stitch: async () => artifact("unused"),
    };
    const controller = new CaptureSessionController(adapters, budget);
    controller.start(display);
    const capture = controller.capture();
    controller.cancel();
    pending.resolve(lateFrame);

    await expect(capture).resolves.toBe(false);
    expect(releases).toBe(1);
    expect(controller.state.phase).toBe("cancelled");
  });

  it("does not let an older session publish after a newer session starts", async () => {
    const first = deferred<CaptureFrame<string>>();
    const adapters: CaptureSessionAdapters<string, string> = {
      acquire: () => first.promise,
      stitch: async () => artifact("unused"),
    };
    const controller = new CaptureSessionController(adapters, budget);
    controller.start(display);
    const oldCapture = controller.capture();
    controller.start({ ...display, id: "display-2" });
    first.resolve(frame("old"));

    await expect(oldCapture).resolves.toBe(false);
    expect(controller.state.phase).toBe("collecting");
    expect(controller.state.frameCount).toBe(0);
  });

  it("passes a frozen frame snapshot to stitch and releases frames once", async () => {
    const captured: CaptureFrame<string>[] = [];
    let releases = 0;
    const source = frame("source");
    source.release = () => {
      releases += 1;
    };
    const adapters: CaptureSessionAdapters<string, string> = {
      acquire: async () => source,
      stitch: async (frames) => {
        captured.push(...frames);
        expect(Object.isFrozen(frames)).toBe(true);
        return artifact("stitched");
      },
    };
    const controller = new CaptureSessionController(adapters, budget);
    controller.start(display);
    await expect(controller.capture()).resolves.toBe(true);
    const result = await controller.stop();

    expect(result?.value).toBe("stitched");
    expect(captured).toHaveLength(1);
    expect(releases).toBe(1);
    expect(controller.state.phase).toBe("done");
  });

  it("suppresses duplicate acquisition side effects for a pending request", async () => {
    const pending = deferred<CaptureFrame<string>>();
    let acquisitions = 0;
    const adapters: CaptureSessionAdapters<string, string> = {
      acquire: () => {
        acquisitions += 1;
        return pending.promise;
      },
      stitch: async () => artifact("unused"),
    };
    const controller = new CaptureSessionController(adapters, budget);
    controller.start(display);
    const firstCapture = controller.capture();

    await expect(controller.capture()).rejects.toThrow("already pending");
    expect(acquisitions).toBe(1);
    controller.cancel();
    pending.resolve(frame("late"));
    await expect(firstCapture).resolves.toBe(false);
  });
});
