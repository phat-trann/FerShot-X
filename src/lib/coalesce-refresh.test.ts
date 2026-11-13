import { describe, expect, it, vi } from "vitest";
import { coalesceRefresh } from "./coalesce-refresh";
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
describe("coalesced Library refresh", () => {
  it("shares concurrent reads and awaits fresh trailing data without overlapping IO", async () => {
    const first = deferred(), last = deferred();
    const read = vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => last.promise);
    const refresh = coalesceRefresh(read);
    const a = refresh();
    expect(refresh()).toBe(a); expect(refresh()).toBe(a); await Promise.resolve(); expect(read).toHaveBeenCalledTimes(1);
    expect(refresh()).toBe(a); expect(refresh()).toBe(a);
    first.resolve(); await Promise.resolve();
    expect(read).toHaveBeenCalledTimes(2);
    let completed = false; void a.then(() => { completed = true; }); await Promise.resolve(); expect(completed).toBe(false);
    last.resolve(); await a; expect(completed).toBe(true);
    await refresh(); expect(read).toHaveBeenCalledTimes(3);
  });
  it("releases a failed read so an explicit retry can succeed", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const refresh = coalesceRefresh(read);
    await expect(refresh()).rejects.toThrow("offline"); await refresh(); expect(read).toHaveBeenCalledTimes(2);
  });
});
