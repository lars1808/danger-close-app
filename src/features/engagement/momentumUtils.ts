export const MOMENTUM_MIN = -3;
export const MOMENTUM_MAX = 5;
export const MOMENTUM_DEFAULT = 0;

export const MOMENTUM_VALUES = Array.from(
  { length: MOMENTUM_MAX - MOMENTUM_MIN + 1 },
  (_, index) => MOMENTUM_MIN + index,
);

export function clampMomentum(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return MOMENTUM_DEFAULT;
  }

  if (value <= MOMENTUM_MIN) {
    return MOMENTUM_MIN;
  }

  if (value >= MOMENTUM_MAX) {
    return MOMENTUM_MAX;
  }

  return Math.round(value);
}
