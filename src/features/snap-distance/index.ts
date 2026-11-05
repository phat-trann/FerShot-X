import type { Point } from "../../contracts/editor";

export interface SnapCandidate {
  readonly point: Point;
  readonly index: number;
  readonly distance: number;
}

const MAX_CANDIDATES = 1024;

function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

export function findNearestSnapCandidate(
  target: Point,
  candidates: readonly Point[],
  tolerance: number,
): SnapCandidate | null {
  finite(target.x, "target.x");
  finite(target.y, "target.y");
  finite(tolerance, "tolerance");
  if (tolerance < 0) throw new RangeError("tolerance must be nonnegative");
  if (!Array.isArray(candidates) || candidates.length > MAX_CANDIDATES) {
    throw new RangeError("candidate list is too large");
  }

  let best: SnapCandidate | null = null;
  const maxDistance = tolerance * tolerance;
  if (!Number.isFinite(maxDistance)) throw new RangeError("tolerance is too large");
  candidates.forEach((point, index) => {
    finite(point.x, "candidate.x");
    finite(point.y, "candidate.y");
    const dx = point.x - target.x;
    const dy = point.y - target.y;
    const squared = dx * dx + dy * dy;
    if (!Number.isFinite(squared)) throw new RangeError("candidate distance must be finite");
    if (squared <= maxDistance && (best === null || squared < best.distance ** 2)) {
      best = { point: { ...point }, index, distance: Math.sqrt(squared) };
    }
  });
  return best;
}
