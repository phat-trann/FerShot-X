import { describe, expect, it, vi } from "vitest";
import { LifecyclePolicy, dispatchLifecycleEffects, type LifecycleCapabilities } from ".";
const capabilities: LifecycleCapabilities = { capture: ["area"], tools: ["rectangle", "select"], save: true, print: true, show: true, close: true, editor: true };
const context = { documentId: "a", revision: 1, imageIds: ["a", "b"], dirty: true, busy: false, editable: false };
function policy(c = capabilities) { const p = new LifecyclePolicy(c, { confirmCleanClose: false }); p.setContext(context); return p; }
const close = (id = "close") => ({ id, kind: "action", origin: "button", action: { kind: "close" } } as const);
describe("application lifecycle policy", () => {
  it.each([{ editable: true }, { busy: true }])("blocks unsafe hotkeys in context %j", patch => {
    const p = policy(); p.setContext({ ...context, ...patch });
    expect(p.handle({ id: "hotkey", kind: "action", origin: "hotkey", action: { kind: "capture", mode: "area" } }).effects).toEqual([]);
  });
  it("ignores composing/repeated/editor-input shortcuts and honors declared tool capability", () => {
    const p = policy();
    for (const [n, input] of [{ key: "r", isComposing: true }, { key: "r", repeat: true }, { key: "r", target: { tagName: "INPUT" } }].entries()) {
      expect(p.handle({ id: `ignored-${n}`, kind: "shortcut", input }).accepted).toBe(false);
    }
    expect(p.handle({ id: "tool", kind: "shortcut", input: { key: "r" } }).effects).toMatchObject([{ kind: "action", action: { kind: "tool", tool: "rectangle" } }]);
    expect(p.handle({ id: "unsupported", kind: "shortcut", input: { key: "p" } }).reason).toBe("capability-unavailable");
  });
  it("suppresses repeated intent IDs and rejects unknown routes or unavailable capture modes", () => {
    const p = policy(), intent = { id: "show", kind: "action", origin: "button", action: { kind: "show" } } as const;
    expect(p.handle(intent).accepted).toBe(true); expect(p.handle(intent).reason).toBe("duplicate-intent");
    expect(p.handle({ id: "url", kind: "deep-link", url: "ferby://unknown" }).accepted).toBe(false);
    expect(p.handle({ id: "mode", kind: "deep-link", url: "ferby://capture?mode=fullscreen" }).reason).toBe("capability-unavailable");
  });
  it("requires explicit external confirmation without directly executing an allowed capture", () => {
    const p = policy(), first = p.handle({ id: "external", kind: "deep-link", url: "ferby://capture?mode=area" });
    expect(first.effects[0]?.kind).toBe("confirm-external");
    expect(p.confirm(p.state.pendingToken!, "discard").accepted).toBe(false);
    const confirmed = p.confirm(p.state.pendingToken!, "accept"), handler = vi.fn(); dispatchLifecycleEffects(confirmed, handler);
    expect(handler).toHaveBeenCalledOnce(); expect(confirmed.effects).toMatchObject([{ kind: "action", action: { kind: "capture", mode: "area" } }]);
  });
  it("never closes a dirty document before discard confirmation and rejects stale tokens", () => {
    const p = policy(); expect(p.handle(close()).effects[0]?.kind).toBe("confirm-close");
    expect(p.confirm("wrong", "discard").accepted).toBe(false);
    expect(p.confirm(p.state.pendingToken!, "discard").effects[0]).toMatchObject({ kind: "action", action: { kind: "close" }, revision: 1 });
    expect(p.state.phase).toBe("close-requested"); p.resolveClose(false); expect(p.state.phase).toBe("open");
  });
  it.each(["failed", "cancelled"] as const)("keeps the document open when save-before-close is %s", status => {
    const p = policy(); p.handle(close()); const token = p.state.pendingToken!;
    expect(p.confirm(token, "save").effects[0]?.kind).toBe("save-before-close");
    expect(p.resolveSave(token, status, 1).effects).toEqual([]); expect(p.state.phase).toBe("open"); expect(p.state.context.dirty).toBe(true);
  });
  it("closes only after a successful save for the confirmed revision", () => {
    const p = policy(); p.handle(close()); const token = p.state.pendingToken!; p.confirm(token, "save");
    expect(p.resolveSave(token, "saved", 2).accepted).toBe(false);
    expect(p.resolveSave(token, "saved", 1).effects).toMatchObject([{ kind: "action", action: { kind: "close" } }]);
  });
  it("invalidates pending confirmations and late saves when the document revision changes", () => {
    const p = policy(); p.handle(close()); const token = p.state.pendingToken!; p.confirm(token, "save"); p.setContext({ ...context, revision: 2 });
    expect(p.resolveSave(token, "saved", 1).effects).toEqual([]); expect(p.confirm(token, "discard").accepted).toBe(false);
  });
  it("cannot enable unavailable save through a preference or confirmation choice", () => {
    const p = policy({ ...capabilities, save: false }); p.handle(close());
    expect(p.confirm(p.state.pendingToken!, "save").accepted).toBe(false);
    expect(p.confirm(p.state.pendingToken!, "cancel").effects).toEqual([]);
    expect(p.handle({ id: "missing-image", kind: "deep-link", url: "ferby://editor?imageId=missing" }).accepted).toBe(false);
  });
});
