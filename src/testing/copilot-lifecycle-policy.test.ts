import { describe, expect, it } from "vitest";
import {
  LifecyclePolicy,
  dispatchLifecycleEffects,
  type LifecycleCapabilities,
} from "../features/lifecycle-policy";

const capabilities: LifecycleCapabilities = {
  capture: ["fullscreen", "area", "window"],
  tools: ["select", "arrow"],
  save: true,
  print: true,
  show: true,
  close: true,
  editor: true,
};

const context = {
  documentId: "image-1",
  revision: 2,
  imageIds: ["image-1"],
  dirty: true,
  busy: false,
  editable: false,
};

describe("LifecyclePolicy public invariants", () => {
  it("suppresses duplicate intent IDs without repeating effects", () => {
    const policy = new LifecyclePolicy(capabilities, { confirmCleanClose: false });
    const intent = {
      id: "capture-1",
      kind: "action" as const,
      origin: "button" as const,
      action: { kind: "capture" as const, mode: "area" as const },
    };

    const first = policy.handle(intent);
    const second = policy.handle(intent);

    expect(first.accepted).toBe(true);
    expect(second).toEqual({ accepted: false, reason: "duplicate-intent", effects: [] });
  });

  it("requires confirmation for an external deep link and rejects stale tokens", () => {
    const policy = new LifecyclePolicy(capabilities, { confirmCleanClose: false });
    policy.setContext(context);
    const pending = policy.handle({
      id: "link-1",
      kind: "deep-link",
      url: "ferby://editor?imageId=image-1",
    });
    const token = pending.effects[0]?.kind === "confirm-external" ? pending.effects[0].token : "";

    expect(pending.accepted).toBe(true);
    expect(policy.confirm("wrong-token", "accept").reason).toBe("stale-confirmation");
    expect(policy.confirm(token, "accept").effects[0]).toMatchObject({
      kind: "action",
      action: { kind: "editor", imageId: "image-1" },
    });
  });

  it("invalidates pending save confirmation when the document revision changes", () => {
    const policy = new LifecyclePolicy(capabilities, { confirmCleanClose: false });
    policy.setContext(context);
    const close = policy.handle({
      id: "close-1",
      kind: "action",
      origin: "button",
      action: { kind: "close" },
    });
    const token = close.effects[0]?.kind === "confirm-close" ? close.effects[0].token : "";
    const save = policy.confirm(token, "save");
    expect(save.effects[0]?.kind).toBe("save-before-close");

    policy.setContext({ ...context, revision: 3 });
    expect(policy.resolveSave(token, "saved", 2).reason).toBe("stale-save-result");
  });

  it("dispatches only accepted effects", () => {
    const seen: string[] = [];
    dispatchLifecycleEffects(
      { accepted: false, reason: "busy", effects: [] },
      (effect) => seen.push(effect.kind),
    );
    dispatchLifecycleEffects(
      { accepted: true, reason: null, effects: [{
        kind: "action",
        action: { kind: "show" },
        documentId: null,
        revision: 0,
      }] },
      (effect) => seen.push(effect.kind),
    );

    expect(seen).toEqual(["action"]);
  });
});
