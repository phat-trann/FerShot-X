import { parseFerbyIntent, type FerbyIntent } from "../deep-link-parser";
import { matchEditorShortcut, type EditorShortcutInput } from "../shortcuts/editor-shortcuts";

type CaptureMode = Extract<FerbyIntent, { kind: "capture" }>["mode"];
type Tool = NonNullable<ReturnType<typeof matchEditorShortcut>>;
export type ApplicationAction = { readonly kind: "capture"; readonly mode: CaptureMode }
  | { readonly kind: "editor"; readonly imageId: string }
  | { readonly kind: "tool"; readonly tool: Tool }
  | { readonly kind: "save" | "print" | "show" | "close" };
export interface LifecycleCapabilities {
  readonly capture: readonly CaptureMode[]; readonly tools: readonly Tool[];
  readonly save: boolean; readonly print: boolean; readonly show: boolean; readonly close: boolean; readonly editor: boolean;
}
export interface LifecycleContext {
  readonly documentId: string | null; readonly revision: number; readonly imageIds: readonly string[];
  readonly dirty: boolean; readonly busy: boolean; readonly editable: boolean;
}
export type ApplicationIntent = { readonly id: string; readonly kind: "deep-link"; readonly url: string }
  | { readonly id: string; readonly kind: "shortcut"; readonly input: EditorShortcutInput }
  | { readonly id: string; readonly kind: "action"; readonly origin: "button" | "hotkey"; readonly action: ApplicationAction };
export type LifecycleEffect = { readonly kind: "action"; readonly action: ApplicationAction; readonly documentId: string | null; readonly revision: number }
  | { readonly kind: "confirm-close" | "confirm-external"; readonly token: string; readonly canSave: boolean; readonly action: ApplicationAction }
  | { readonly kind: "save-before-close"; readonly token: string; readonly documentId: string; readonly revision: number };
export interface LifecycleDecision { readonly accepted: boolean; readonly reason: string | null; readonly effects: readonly LifecycleEffect[] }
interface Pending { token: string; action: ApplicationAction; type: "close" | "external" | "saving"; documentId: string | null; revision: number }
const modes = new Set(["fullscreen", "area", "window"]);
const tools = new Set(["select", "arrow", "rectangle", "ellipse", "pen", "text", "counter", "blur"]);
const idValid = (id: unknown): id is string => typeof id === "string" && id.length > 0 && id.length <= 256 && !/[\u0000-\u001f\u007f/\\]/.test(id);
function decision(reason: string | null, effects: readonly LifecycleEffect[] = []): LifecycleDecision {
  return Object.freeze({ accepted: reason === null, reason, effects: Object.freeze(effects.map(effect => Object.freeze(effect))) });
}
function actionCopy(action: ApplicationAction): ApplicationAction | null {
  if (!action || typeof action !== "object") return null;
  if (action.kind === "capture") return modes.has(action.mode) ? Object.freeze({ kind: "capture", mode: action.mode }) : null;
  if (action.kind === "editor") return idValid(action.imageId) ? Object.freeze({ kind: "editor", imageId: action.imageId }) : null;
  if (action.kind === "tool") return tools.has(action.tool) ? Object.freeze({ kind: "tool", tool: action.tool }) : null;
  return ["save", "print", "show", "close"].includes(action.kind) ? Object.freeze({ kind: action.kind }) : null;
}

/** In-memory arbitration only. Returned effects are declarations, not performed native operations. */
export class LifecyclePolicy {
  private readonly capabilities: LifecycleCapabilities;
  private readonly preferences: Readonly<{ confirmCleanClose: boolean }>;
  private context: LifecycleContext = Object.freeze({ documentId: null, revision: 0, imageIds: Object.freeze([]), dirty: false, busy: false, editable: false });
  private readonly seen = new Set<string>();
  private pending: Pending | null = null;
  private closeRequested = false;
  private token = 0;
  constructor(capabilities: LifecycleCapabilities, preferences: { confirmCleanClose: boolean }) {
    if (!Array.isArray(capabilities.capture) || capabilities.capture.length > 3 || !capabilities.capture.every(m => modes.has(m))
      || !Array.isArray(capabilities.tools) || capabilities.tools.length > 8 || !capabilities.tools.every(t => tools.has(t))
      || ![capabilities.save, capabilities.print, capabilities.show, capabilities.close, capabilities.editor, preferences.confirmCleanClose].every(v => typeof v === "boolean")) throw new RangeError("Invalid lifecycle configuration");
    this.capabilities = Object.freeze({ ...capabilities, capture: Object.freeze([...capabilities.capture]), tools: Object.freeze([...capabilities.tools]) });
    this.preferences = Object.freeze({ ...preferences });
  }
  get state() { return Object.freeze({ context: this.context, pendingToken: this.pending?.token ?? null, phase: this.closeRequested ? "close-requested" : this.pending?.type ?? "open", seenCount: this.seen.size }); }
  setContext(context: LifecycleContext): void {
    if (!Number.isSafeInteger(context.revision) || context.revision < 0 || !Array.isArray(context.imageIds) || context.imageIds.length > 512
      || !context.imageIds.every(idValid) || new Set(context.imageIds).size !== context.imageIds.length
      || (context.documentId !== null && !context.imageIds.includes(context.documentId))
      || ![context.dirty, context.busy, context.editable].every(v => typeof v === "boolean")) throw new RangeError("Invalid lifecycle context");
    if (context.documentId !== this.context.documentId || context.revision !== this.context.revision) this.pending = null;
    this.context = Object.freeze({ ...context, imageIds: Object.freeze([...context.imageIds]) });
  }
  private allowed(action: ApplicationAction): boolean {
    const c = this.capabilities;
    if (action.kind === "capture") return c.capture.includes(action.mode);
    if (action.kind === "tool") return this.context.documentId !== null && c.tools.includes(action.tool);
    if (action.kind === "editor") return c.editor && this.context.imageIds.includes(action.imageId);
    if (action.kind === "save" || action.kind === "print") return this.context.documentId !== null && c[action.kind];
    return c[action.kind];
  }
  private emit(action: ApplicationAction): LifecycleDecision {
    if (action.kind === "close") this.closeRequested = true;
    return decision(null, [{ kind: "action", action, documentId: this.context.documentId, revision: this.context.revision }]);
  }
  handle(intent: ApplicationIntent): LifecycleDecision {
    if (!intent || !idValid(intent.id)) return decision("invalid-intent");
    if (this.seen.has(intent.id)) return decision("duplicate-intent");
    if (this.seen.size >= 4096) return decision("intent-budget");
    this.seen.add(intent.id);
    let action: ApplicationAction | null = null, external = false;
    try {
      if (intent.kind === "deep-link") { action = actionCopy(parseFerbyIntent(intent.url)); external = true; }
      else if (intent.kind === "shortcut") {
        if (this.context.editable || typeof intent.input?.key !== "string" || intent.input.key.length > 64) return decision("text-focus-or-invalid-key");
        const tool = matchEditorShortcut(intent.input); action = tool ? { kind: "tool", tool } : null;
      } else if (intent.kind === "action" && ["button", "hotkey"].includes(intent.origin)) {
        if (intent.origin === "hotkey" && this.context.editable) return decision("text-focus");
        action = actionCopy(intent.action);
      }
    } catch { return decision("invalid-intent"); }
    if (!action) return decision("unrecognized-action");
    action = Object.freeze(action);
    if (!this.allowed(action)) return decision("capability-unavailable");
    if (this.closeRequested) return decision("close-pending");
    if (this.pending) return decision("confirmation-pending");
    if (this.context.busy && action.kind !== "show") return decision("busy");
    if (external || (action.kind === "close" && (this.context.dirty || this.preferences.confirmCleanClose))) {
      const token = `confirmation-${++this.token}`;
      this.pending = { token, action, type: external ? "external" : "close", documentId: this.context.documentId, revision: this.context.revision };
      return decision(null, [{ kind: external ? "confirm-external" : "confirm-close", token, action, canSave: this.context.documentId !== null && this.capabilities.save }]);
    }
    return this.emit(action);
  }
  confirm(token: string, choice: "accept" | "discard" | "save" | "cancel"): LifecycleDecision {
    const p = this.pending;
    if (!p || p.token !== token || p.type === "saving") return decision("stale-confirmation");
    if (choice === "cancel") { this.pending = null; return decision(null); }
    if (this.context.busy) return decision("busy");
    if (!this.allowed(p.action)) { this.pending = null; return decision("capability-unavailable"); }
    if (p.type === "external") {
      if (choice !== "accept") return decision("invalid-confirmation");
      this.pending = null; return this.emit(p.action);
    }
    if (choice === "discard") { this.pending = null; return this.emit(p.action); }
    if (choice === "save" && this.capabilities.save && p.documentId !== null) {
      this.pending = { ...p, type: "saving" };
      return decision(null, [{ kind: "save-before-close", token, documentId: p.documentId, revision: p.revision }]);
    }
    return decision("invalid-or-unavailable-confirmation");
  }
  resolveSave(token: string, status: "saved" | "cancelled" | "failed", revision: number): LifecycleDecision {
    const p = this.pending;
    if (!p || p.token !== token || p.type !== "saving" || p.revision !== revision) return decision("stale-save-result");
    if (!["saved", "cancelled", "failed"].includes(status)) return decision("invalid-save-result");
    this.pending = null;
    return status === "saved" ? this.emit(p.action) : decision("save-did-not-complete");
  }
  resolveClose(closed: boolean): void {
    if (typeof closed !== "boolean") throw new TypeError("Expected native close result");
    if (!closed) this.closeRequested = false;
  }
}

/** The caller supplies the effect handler; this module never discovers or invokes OS APIs. */
export function dispatchLifecycleEffects(decision: LifecycleDecision, handler: (effect: LifecycleEffect) => void): void {
  if (decision.accepted) for (const effect of decision.effects) handler(effect);
}
