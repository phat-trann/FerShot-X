export interface PreviewTimerState {
  readonly startedAt: number;
  readonly timeout: number;
  readonly deadline: number;
  readonly pausedAt: number | null;
}

export interface PreviewTimerStatus {
  readonly remaining: number;
  readonly expired: boolean;
  readonly paused: boolean;
}

function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

export function createPreviewTimer(now: number, timeout: number): PreviewTimerState {
  finite(now, "now");
  finite(timeout, "timeout");
  if (timeout <= 0) throw new RangeError("timeout must be positive");
  const deadline = now + timeout;
  if (!Number.isFinite(deadline)) throw new RangeError("deadline must be finite");
  return { startedAt: now, timeout, deadline, pausedAt: null };
}

export function pausePreviewTimer(state: PreviewTimerState, now: number): PreviewTimerState {
  finite(now, "now");
  if (state.pausedAt !== null) return state;
  return { ...state, pausedAt: Math.max(now, state.startedAt) };
}

export function resumePreviewTimer(state: PreviewTimerState, now: number): PreviewTimerState {
  finite(now, "now");
  if (state.pausedAt === null) return state;
  const elapsedPause = Math.max(0, now - state.pausedAt);
  const deadline = state.deadline + elapsedPause;
  if (!Number.isFinite(deadline)) throw new RangeError("deadline must be finite");
  return { ...state, deadline, pausedAt: null };
}

export function getPreviewTimerStatus(state: PreviewTimerState, now: number): PreviewTimerStatus {
  finite(now, "now");
  const reference = state.pausedAt ?? now;
  const remaining = Math.max(0, state.deadline - reference);
  return { remaining, expired: state.pausedAt === null && remaining === 0, paused: state.pausedAt !== null };
}
