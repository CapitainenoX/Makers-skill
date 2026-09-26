import type React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useKit, type TextFx } from "./kit";

/** Spring presets: fast (in place in ~0.25-0.35 s, so the words can be read at once)
 *  and damped close to critical. The first set was soft and underdamped: entrances took
 *  most of a second, and the long decaying oscillation at the end read as the element
 *  vibrating in place. `pop` keeps one small overshoot, which is what makes it snappy. */
export const SPRINGS = {
  pop: { damping: 21, mass: 0.5, stiffness: 340 },
  snap: { damping: 28, mass: 0.5, stiffness: 360 },
  smooth: { damping: 30, mass: 0.7, stiffness: 240 },
  heavy: { damping: 32, mass: 1, stiffness: 200 },
  // a hard, fast arrival with one small bounce — slams, VS badges, stamps
  slam: { damping: 24, mass: 0.6, stiffness: 520 },
} as const;

export type SpringName = keyof typeof SPRINGS;

/** 0 -> 1 entrance value, delayed by `delay` frames. Once within a hair of rest it is
 *  exactly 1: a spring's tail keeps moving things by fractions of a pixel for a second,
 *  and on text that sub-pixel creep is visible as shimmer — the "vibrating" word. */
export const enter = (
  frame: number,
  fps: number,
  delay = 0,
  preset: SpringName = "snap",
) => {
  const v = spring({ frame: frame - delay, fps, config: SPRINGS[preset] });
  return Math.abs(1 - v) < 0.004 ? 1 : v;
};

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
 *  same way and two different decks almost never share a sequence.
 *  `toolbelt/remotion.py:seed_of` is the same hash — keep them in step. */
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

// ------------------------------------------------------------------ motion blur
/** Directional motion blur, the cheap way: a bank of SVG Gaussian filters blurred along
 *  one axis only (defined once in `MotionBlurDefs`), picked by the element's speed on
 *  that frame. A real shutter smears along the direction of travel — an isotropic
 *  `blur()` reads as out-of-focus, not as fast. */
export const MB_LEVELS = 30;
export const MB_STEP = 1.5;

/** CSS filter for something moving at (vx, vy) px per frame. `k` scales the smear. */
export const blurFilter = (vx: number, vy: number, k = 1): string | undefined => {
  if (!k) return undefined;
  const sx = Math.abs(vx) * 0.42 * k;
  const sy = Math.abs(vy) * 0.42 * k;
  const big = Math.max(sx, sy);
  // Below the threshold the element still goes through an (identity) SVG filter. Dropping
  // the filter when motion stops switched the element to another rendering path, and
  // the text visibly jumped half a pixel on that frame — the "stutter" at the end of
  // every entrance. One path, start to finish.
  if (big < 0.9) return "url(#mb0)";
  const level = Math.max(1, Math.min(MB_LEVELS, Math.round(big / MB_STEP)));
  if (sx >= sy * 2.2) return `url(#mbx${level})`;
  if (sy >= sx * 2.2) return `url(#mby${level})`;
  return `url(#mbd${level})`;
};

export type Dir = "up" | "down" | "left" | "right";

const DIR_VEC: Record<Dir, [number, number]> = {
  up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0],
};

/** Frame-bound animation helpers: entrances carry motion blur proportional to their
 *  speed, so fast things smear and settle sharp. Use inside a component body. */
export const useAnim = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kit = useKit();

  const at = (delay = 0, preset: SpringName = "snap") => enter(frame, fps, delay, preset);

  /** An element arriving: fades up over `dist` px from `dir`, scaling from `from`.
   *  Returns a style — spread it on the element. `centered` keeps a translate(-50%,-50%). */
  const arrive = (
    delay = 0,
    dist = 30,
    preset: SpringName = "snap",
    o: { dir?: Dir; from?: number; centered?: boolean; rotate?: number; fade?: boolean } = {},
  ): React.CSSProperties => {
    const p = enter(frame, fps, delay, preset);
    const q = enter(frame - 1, fps, delay, preset);
    const [dx, dy] = DIR_VEC[o.dir ?? "up"];
    const t = 1 - p;
    const from = o.from ?? 0.965;
    const scale = from + (1 - from) * p;
    const rot = o.rotate ? ` rotate(${(o.rotate * t).toFixed(2)}deg)` : "";
    const move = `translate(${(dx * t * dist).toFixed(2)}px, ${(dy * t * dist).toFixed(2)}px)`;
    const v = (p - q) * dist;
    return {
      opacity: o.fade === false ? 1 : Math.min(1, p * 1.4),
      transform: `${o.centered ? "translate(-50%,-50%) " : ""}${move} scale(${scale.toFixed(4)})${rot}`,
      filter: blurFilter(dx * v, dy * v, kit.blur),
    };
  };

  /** A value that ramps monotonically — counters, bars, strokes. Never springs. */
  const ramp = (start: number, frames: number, ease = Easing.out(Easing.cubic)) =>
    interpolate(frame, [start, start + Math.max(1, frames)], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease,
    });

  return { frame, fps, kit, at, arrive, ramp };
};

// ------------------------------------------------------------------ text effects
/** How one word (or line) arrives under a given effect. `outer` wraps it (the clip for
 *  `mask`), `inner` moves. `p`/`q` are this frame's and last frame's progress. */
export const textFxStyle = (
  fx: TextFx,
  p: number,
  q: number,
  size: number,
  blurK = 1,
): { outer?: React.CSSProperties; inner: React.CSSProperties } => {
  const t = 1 - p;
  switch (fx) {
    case "mask": {
      const c = Math.min(1, p);
      const v = (Math.min(1, p) - Math.min(1, q)) * size * 1.1;
      return {
        outer: { display: "inline-block", overflow: "hidden", verticalAlign: "bottom",
          paddingBottom: size * 0.12, marginBottom: -size * 0.12,
          paddingTop: size * 0.04, marginTop: -size * 0.04 },
        inner: { display: "inline-block", transform: `translateY(${((1 - c) * 108).toFixed(2)}%)`,
          filter: blurFilter(0, v, blurK) },
      };
    }
    case "blur":
      return { inner: { display: "inline-block", opacity: Math.min(1, p * 1.3),
        filter: t > 0.01 ? `blur(${(t * size * 0.22).toFixed(2)}px)` : undefined,
        transform: `scale(${(1.06 - 0.06 * p).toFixed(4)})` } };
    case "pop":
      return { inner: { display: "inline-block", opacity: Math.min(1, p * 2),
        transform: `scale(${(0.35 + 0.65 * p).toFixed(4)})` } };
    case "slide": {
      const v = (p - q) * size * 0.8;
      return { inner: { display: "inline-block", opacity: Math.min(1, p * 1.5),
        transform: `translateX(${(-t * size * 0.8).toFixed(2)}px)`,
        filter: blurFilter(v, 0, blurK) } };
    }
    case "type":
      return { inner: { display: "inline-block", opacity: p > 0.02 ? 1 : 0 } };
    case "rise":
    default: {
      const v = (p - q) * size * 0.3;
      return { inner: { display: "inline-block", opacity: Math.min(1, p * 1.4),
        transform: `translateY(${(t * size * 0.3).toFixed(2)}px) scale(${(0.965 + p * 0.035).toFixed(4)})`,
        filter: blurFilter(0, v, blurK) } };
    }
  }
};

/** The spring each text effect rides. Mask and blur must not overshoot: an overshooting
 *  mask clips the top of the letters, an overshooting blur flickers. */
export const TEXT_SPRING: Record<TextFx, SpringName> = {
  rise: "snap", mask: "snap", blur: "smooth", pop: "pop", slide: "snap", type: "snap",
};

/** Cadence between words, in ms. Tight on purpose: a sentence arrives as one quick
 *  ripple and is readable almost at once. Revealing it word by word with the voice made
 *  the caption change on every word — nobody can read a moving sentence. */
export const TEXT_CADENCE: Record<TextFx, number> = {
  rise: 32, mask: 38, blur: 32, pop: 32, slide: 32, type: 28,
};

// ------------------------------------------------------------------ voice cues
/** The frame an item should land on: its voice cue when the deck was synced to the
 *  narration (landing a hair before the word, so the eye and the ear agree), otherwise
 *  the scene's own stagger. */
export const cueAt = (
  cues: { items?: number[]; words?: number[]; value?: number } | undefined,
  key: "items" | "words",
  i: number,
  fps: number,
  fallback: number,
): number => {
  const t = cues?.[key]?.[i];
  return typeof t === "number" ? Math.max(0, Math.round((t - 0.08) * fps)) : fallback;
};
