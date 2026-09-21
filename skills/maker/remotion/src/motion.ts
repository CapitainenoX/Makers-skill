import { Easing, interpolate, spring } from "remotion";

/** Spring presets. `pop` overshoots — that overshoot is what makes an entrance
 *  read as snappy rather than as a rectangle sliding. */
export const SPRINGS = {
  pop: { damping: 12, mass: 0.5, stiffness: 220 },
  snap: { damping: 18, mass: 0.55, stiffness: 190 },
  smooth: { damping: 26, mass: 0.9, stiffness: 120 },
  heavy: { damping: 30, mass: 1.4, stiffness: 90 },
} as const;

export type SpringName = keyof typeof SPRINGS;

/** 0 -> 1 entrance value, delayed by `delay` frames. */
export const enter = (
  frame: number,
  fps: number,
  delay = 0,
  preset: SpringName = "snap",
) => spring({ frame: frame - delay, fps, config: SPRINGS[preset] });

/** 1 -> 0 over the last `tail` frames of a scene, so scenes breathe out. */
export const exit = (frame: number, durationInFrames: number, tail = 7) =>
  interpolate(frame, [durationInFrames - tail, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

/** Items in a list cascade instead of appearing together. 60-90ms reads best. */
export const stagger = (index: number, fps: number, ms = 75) =>
  Math.round((ms / 1000) * fps) * index;

/** Entrance transform shared by every scene element. */
export const rise = (progress: number, distance = 30) => ({
  opacity: Math.min(1, progress * 1.4),
  transform: `translateY(${(1 - progress) * distance}px) scale(${
    0.965 + progress * 0.035
  })`,
});

/** Same entrance for an absolutely-positioned element that is centred on a point.
 *  Spreading `rise` next to a `translate(-50%,-50%)` silently drops the centring —
 *  the second `transform` key wins. */
export const riseAt = (progress: number, distance = 30) => {
  const r = rise(progress, distance);
  return { opacity: r.opacity, transform: `translate(-50%,-50%) ${r.transform}` };
};
