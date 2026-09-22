import type React from "react";
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

export type Variant =
  | "up" | "down" | "left" | "right" | "scale" | "fade"
  | "zoomOut" | "tiltLeft" | "tiltRight" | "riseFar";

/** Rotated by scene index so consecutive scenes never share an entrance. */
export const VARIANTS: Variant[] = [
  "up", "left", "scale", "right", "zoomOut", "down", "tiltLeft", "riseFar",
  "fade", "tiltRight",
];

/** Turn any deck identifier into a stable offset, so the same deck always animates the
 *  same way and two different decks almost never share a sequence. */
export const seedOf = (seed?: string | number): number => {
  if (typeof seed === "number") return Math.abs(Math.round(seed));
  if (!seed) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const variantFor = (index: number, explicit?: Variant, seed = 0): Variant =>
  explicit ?? VARIANTS[(index + seed) % VARIANTS.length];

/** The whole-scene arrival, layered under each element's own spring. Deliberately small:
 *  it should read as a different angle of approach, not as a second animation. */
export const variantStyle = (v: Variant, p: number, unit: number): React.CSSProperties => {
  const t = 1 - p;
  const shift: Record<Variant, string> = {
    up: `translateY(${t * unit}px)`,
    down: `translateY(${-t * unit}px)`,
    left: `translateX(${t * unit}px)`,
    right: `translateX(${-t * unit}px)`,
    scale: `scale(${1 - t * 0.05})`,
    zoomOut: `scale(${1 + t * 0.06})`,
    riseFar: `translateY(${t * unit * 1.9}px) scale(${1 - t * 0.03})`,
    tiltLeft: `perspective(1400px) rotateY(${t * 7}deg) translateX(${t * unit * 0.5}px)`,
    tiltRight: `perspective(1400px) rotateY(${-t * 7}deg) translateX(${-t * unit * 0.5}px)`,
    fade: "none",
  };
  return { opacity: Math.min(1, p * 1.5), transform: shift[v] };
};

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
