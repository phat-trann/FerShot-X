import type { CaptureMode } from "../../contracts/media";

export type CaptureStatus = "idle" | "selecting" | "processing" | "ready" | "cancelled" | "failed";
export interface CaptureState {
  readonly status: CaptureStatus;
  readonly jobToken: string | null;
  readonly mode: CaptureMode | null;
  readonly result?: unknown;
  readonly error?: string;
}
export type CaptureAction =
  | { type: "start"; token: string; mode: CaptureMode }
  | { type: "selected"; token: string }
  | { type: "success"; token: string; result: unknown }
  | { type: "failure"; token: string; error: string }
  | { type: "cancel"; token: string };

export const initialCaptureState: CaptureState = Object.freeze({
  status: "idle", jobToken: null, mode: null,
});

export function captureReducer(state: CaptureState, action: CaptureAction): CaptureState {
  if (action.type === "start") {
    if (state.status === "selecting" || state.status === "processing") return state;
    return { status: "selecting", jobToken: action.token, mode: action.mode };
  }
  if (action.token !== state.jobToken) return state;
  if (action.type === "selected") {
    return state.status === "selecting" ? { status: "processing", jobToken: state.jobToken, mode: state.mode } : state;
  }
  if (action.type === "success") {
    return state.status === "selecting" || state.status === "processing"
      ? { status: "ready", jobToken: state.jobToken, mode: state.mode, result: action.result } : state;
  }
  if (action.type === "failure") {
    return state.status === "selecting" || state.status === "processing"
      ? { status: "failed", jobToken: state.jobToken, mode: state.mode, error: action.error } : state;
  }
  return state.status === "selecting" || state.status === "processing"
    ? { status: "cancelled", jobToken: state.jobToken, mode: state.mode } : state;
}
