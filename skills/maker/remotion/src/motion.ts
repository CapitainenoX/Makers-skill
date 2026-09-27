import type React from "react";
import { Easing, interpolate, spring } from "remotion";
import { activeLook, type Transition, type WordIn } from "./look";

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

/** Isotropic blur that fades to nothing — `undefined` below a hair so a settled element
 *  carries no filter at all (a filter forces a compositing layer on every frame). */
export const softBlur = (px: number): string | undefined =>
  px > 0.15 ? `blur(${Math.min(px, 40).toFixed(2)}px)` : undefined;

/** Directional motion blur. CSS `blur()` smears in every direction, which reads as out of
 *  focus; real motion blur only smears along the move. The filters live in
 *  <MotionBlurDefs/>, quantised so a render needs a fixed set of them. */
export const MB_LEVELS = 24;
export const dirBlur = (axis: "x" | "y", px: number): string | undefined => {
  const level = Math.min(MB_LEVELS, Math.round(Math.abs(px) / 2));
  return level > 0 ? `url(#mb${axis}${level})` : undefined;
};

/** Entrance transform shared by every scene element. Arriving objects carry a little
 *  blur while they are still moving fast — the difference between a thing sliding in and
 *  a thing that was *thrown* in. The strength comes from the active look. */
export const rise = (progress: number, distance = 30): React.CSSProperties => {
  const t = Math.max(0, 1 - progress);
  return {
    opacity: Math.min(1, progress * 1.4),
    transform: `translateY(${(1 - progress) * distance}px) scale(${
      0.965 + progress * 0.035
    })`,
    filter: softBlur(t * Math.abs(distance) * 0.3 * activeLook().blur),
  };
};

/* ------------------------------------------------------------------ word entrances */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Progress of one word's entrance. Moves that must not overshoot (a blur, a slot, a
 *  type-on) ride an eased ramp; moves that should land with weight ride a spring. */
export const wordProgress = (
  kind: WordIn, frame: number, fps: number, delay: number, chars = 6,
): number => {
  const ramp = (sec: number, ease = Easing.out(Easing.cubic)) =>
    interpolate(frame - delay, [0, Math.max(1, Math.round(fps * sec))], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease,
    });
  switch (kind) {
    case "blur": return ramp(0.46, Easing.out(Easing.quad));
    case "mask": return ramp(0.36, Easing.bezier(0.2, 0.9, 0.25, 1));
    case "swipe": return ramp(0.34, Easing.out(Easing.exp));
    case "track": return ramp(0.55, Easing.out(Easing.cubic));
    case "type": return ramp(Math.max(0.12, chars * 0.035), Easing.linear);
    case "stomp": return enter(frame, fps, delay, "pop");
    case "flip": return enter(frame, fps, delay, "snap");
    default: return enter(frame, fps, delay, "snap");
  }
};

/** Style for one word mid-entrance. `outer` wraps it (only `mask` needs a clipping box).
 *  `ink` is 0..1 — how far the colour has settled from ghost grey to its own colour. */
export const wordIn = (
  kind: WordIn, p: number, px: number, prev = p,
): { outer?: React.CSSProperties; inner: React.CSSProperties; ink: number } => {
  const c = clamp01(p);
  const t = 1 - c;
  const k = activeLook().blur;
  const op = Math.min(1, c * 1.7);
  const ink = clamp01((c - 0.25) / 0.6);
  switch (kind) {
    case "blur":
      return { ink, inner: { opacity: Math.min(1, c * 2.2),
        filter: softBlur(t * px * 0.22 * k),
        transform: `translateY(${(t * px * 0.1).toFixed(2)}px) scale(${(1 + t * 0.2).toFixed(4)})` } };
    case "mask":
      return { ink: 1,
        outer: { display: "inline-block", overflow: "hidden", verticalAlign: "bottom",
          padding: `0 ${px * 0.06}px ${px * 0.12}px`, margin: `0 ${-px * 0.06}px ${-px * 0.12}px` },
        inner: { display: "inline-block", transform: `translateY(${(t * 115).toFixed(2)}%)`,
          filter: dirBlur("y", (p - prev) * px * 1.15 * 2.4 * k) } };
    case "swipe":
      return { ink, inner: { opacity: op,
        transform: `translateX(${(t * px * 1.4).toFixed(2)}px) skewX(${(-t * 14).toFixed(2)}deg)`,
        filter: dirBlur("x", (p - prev) * px * 1.4 * 2.2 * k) } };
    case "stomp":
      return { ink: 1, inner: { opacity: Math.min(1, p * 3),
        transform: `scale(${(1 + (1 - p) * 0.75).toFixed(4)})`,
        filter: softBlur(Math.max(0, 1 - p) * px * 0.16 * k) } };
    case "flip":
      return { ink: 1, inner: { opacity: op, transformOrigin: "50% 90%",
        transform: `perspective(${px * 7}px) rotateX(${((1 - p) * -88).toFixed(2)}deg)`,
        filter: softBlur(t * px * 0.05 * k) } };
    case "track":
      return { ink, inner: { opacity: Math.min(1, c * 1.3),
        letterSpacing: `${(t * 0.42 - 0.03).toFixed(3)}em`,
        filter: softBlur(t * px * 0.12 * k) } };
    case "type":
      return { ink: 1, inner: { clipPath: `inset(-20% ${(t * 100).toFixed(1)}% -20% -5%)` } };
    default: {
      const r = rise(p, px * 0.3);
      return { ink: 1, inner: r };
    }
  }
};

/* ------------------------------------------------------------- scene transitions */

type Pose = { x: number; y: number; s: number; r: number; blur: number; o: number };
const REST: Pose = { x: 0, y: 0, s: 1, r: 0, blur: 0, o: 1 };

/** Where a scene is `a` of the way through a move (0 = at rest, 1 = fully away).
 *  `dir` flips the side so consecutive whips do not all leave the same way. */
export const pose = (kind: Transition, a: number, w: number, h: number, dir: number,
                     leaving: boolean): Pose => {
  if (a <= 0) return REST;
  const e = leaving ? 1 : -1;               // leaving scenes go forward, arrivals come from behind
  // Arrivals travel less far than departures, so the frame after the cut already shows
  // the new scene — a fully empty frame at the cut reads as a dropped frame.
  if (!leaving) a *= 0.6;
  switch (kind) {
    case "whip": return { ...REST, x: -dir * e * a * w * 0.7 };
    case "whipUp": return { ...REST, y: -dir * e * a * h * 0.45 };
    case "slide": return { ...REST, x: -dir * e * a * w, o: 1 };
    case "zoom": return { ...REST, s: leaving ? 1 + a * 0.9 : 1 - a * 0.42, blur: a * 26,
      o: leaving ? 1 - a * 0.85 : 1 - a * 0.6 };
    case "zoomOut": return { ...REST, s: leaving ? 1 - a * 0.35 : 1 + a * 0.7, blur: a * 22,
      o: leaving ? 1 - a * 0.8 : 1 - a * 0.7 };
    case "blur": return { ...REST, s: 1 + (leaving ? a : -a) * 0.06, blur: a * 38, o: 1 - a * 0.9 };
    case "spin": return { ...REST, r: e * dir * a * 16, s: leaving ? 1 + a * 0.35 : 1 - a * 0.3,
      blur: a * 18, o: 1 - a * 0.7 };
    default: return REST;
  }
};

/** Frames a transition's two halves take. The arrival is longer than the departure:
 *  leaving fast and settling slowly is what makes a move feel intentional. */
export const TRANSITION_IN = 0.3;
export const TRANSITION_OUT = 0.16;

/** A scene's pose at `frame`, composed from its own arrival and the next scene's move,
 *  plus the motion blur the speed of that move earns. */
export const sceneMove = (
  frame: number, fps: number, total: number, w: number, h: number,
  inKind: Transition | undefined, outKind: Transition | undefined, inDir: number,
  outDir: number,
) => {
  const nIn = Math.max(1, Math.round(fps * TRANSITION_IN));
  const nOut = Math.max(1, Math.round(fps * TRANSITION_OUT));
  const at = (f: number): Pose => {
    let p = REST;
    if (inKind && inKind !== "cut" && inKind !== "fade" && f < nIn) {
      const a = 1 - Easing.out(Easing.cubic)(clamp01(f / nIn));
      p = pose(inKind, a, w, h, inDir, false);
    }
    if (outKind && outKind !== "cut" && outKind !== "fade" && f > total - nOut) {
      const a = Easing.in(Easing.cubic)(clamp01((f - (total - nOut)) / nOut));
      p = pose(outKind, a, w, h, outDir, true);
    }
    return p;
  };
  const now = at(frame);
  const before = at(frame - 1);
  const k = activeLook().blur;
  const vx = (now.x - before.x) * k;
  const vy = (now.y - before.y) * k;
  // The smear follows the dominant axis; zooms and spins blur evenly instead.
  const filters = [
    Math.abs(vx) > Math.abs(vy) ? dirBlur("x", vx * 0.9) : dirBlur("y", vy * 0.9),
    softBlur(now.blur * k),
  ].filter(Boolean).join(" ");
  return {
    transform: `translate(${now.x.toFixed(1)}px, ${now.y.toFixed(1)}px) ` +
      `scale(${now.s.toFixed(4)}) rotate(${now.r.toFixed(2)}deg)`,
    filter: filters || undefined,
    opacity: now.o,
    moving: now !== REST,
  };
};

/** Same entrance for an absolutely-positioned element that is centred on a point.
 *  Spreading `rise` next to a `translate(-50%,-50%)` silently drops the centring —
 *  the second `transform` key wins. */
export const riseAt = (progress: number, distance = 30) => {
  const r = rise(progress, distance);
  return { opacity: r.opacity, transform: `translate(-50%,-50%) ${r.transform}` };
};
