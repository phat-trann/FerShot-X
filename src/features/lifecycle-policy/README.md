# C21 lifecycle and action policy

Arbitrates caller-provided capabilities, context, preferences and explicit intents. No global listeners, shortcut registration, URL launch, capture, persistence or native close API is used. Deep links use P37's allowlist parser and always require confirmation. In-window hotkeys respect editable focus; P03 handles composition/repeats for tool shortcuts. Dirty close requires discard or successful revision-bound save; changed document/revision invalidates pending confirmation/save results.

```ts
const policy = new LifecyclePolicy(actualAvailableCapabilities, { confirmCleanClose: false });
policy.setContext({ documentId, revision, imageIds, dirty, busy, editable });
const decision = policy.handle({ id: uniqueIntentId, kind: "deep-link", url: incomingFerbyUrl });
dispatchLifecycleEffects(decision, injectedRootEffectHandler);
// Parent sends explicit confirm/resolveSave responses; no native operation happens in the policy.
```

C13/C15 must derive actual capabilities, maintain current context, register only authorized OS routes, implement explicit confirmation UI, and report native save/close results. Effects are declarations, not evidence that actions completed. If a native close fails call resolveClose(false). Global shortcut delivery from another application needs an appropriate root context; this module does not observe that application's focus. Intent IDs are opaque and deduplicated for the policy lifetime (4096 IDs; full ledger fails closed rather than silently forgetting IDs). Create a new policy at an explicit workspace lifecycle boundary. This is documented Ferby arbitration, not recovered Shottr hotkey/lifecycle semantics. Independent Antigravity review, H01 and native acceptance remain pending.
