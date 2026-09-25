import type React from "react";
import { Easing } from "remotion";
import { blurFilter, type Dir } from "./motion";

/** Every transition answers "what does this cut say?":
 *
 *  | type    | says                                             |
 *  |---------|--------------------------------------------------|
 *  | cut     | next. Free, invisible, right most of the time    |
 *  | fade    | time passed — chapter breaks only                |
 *  | slide   | the next card lands on top of this one           |
 *  | push    | same world, moved along                          |
 *  | whip    | elsewhere, now — a fast pan with a real smear    |
 *  | zoom    | going deeper into the same subject               |
 *  | blur    | a soft change of thought                         |
 *  | wipe    | a clean graphic replacement                      |
 *  | iris    | focus: the new idea opens from a point           |
 *  | panel   | a coloured slab sweeps across — a chapter wall   |
 *  | flash   | impact, punchline. Twice per video at most       |
 *  | blinds  | a graphic, rhythmic reveal in strips             |
 */
export type TransitionType =
  | "cut" | "fade" | "slide" | "push" | "whip" | "zoom" | "blur"
  | "wipe" | "iris" | "panel" | "flash" | "blinds";

export type Transition = {
  type: TransitionType;
  /** seconds */
  duration?: number;
  dir?: Dir;
  /** iris origin, 0-1 of the frame */
  at?: [number, number];
  /** panel / flash colour; defaults to the accent / white */
  color?: string;
};

export const TRANSITION_SECONDS: Record<TransitionType, number> = {
  cut: 0, fade: 0.3, slide: 0.36, push: 0.4, whip: 0.26, zoom: 0.34, blur: 0.32,
  wipe: 0.38, iris: 0.42, panel: 0.52, flash: 0.2, blinds: 0.44,
};

export const transitionFrames = (t: Transition | undefined, fps: number) =>
  !t || t.type === "cut" ? 0 : Math.max(2, Math.round((t.duration ?? TRANSITION_SECONDS[t.type]) * fps));

const EASE: Record<TransitionType, (x: number) => number> = {
  cut: (x) => x,
  fade: Easing.inOut(Easing.quad),
  slide: Easing.out(Easing.exp),
  push: Easing.inOut(Easing.cubic),
  whip: Easing.inOut(Easing.exp),
  zoom: Easing.inOut(Easing.cubic),
  blur: Easing.inOut(Easing.quad),
  wipe: Easing.inOut(Easing.cubic),
  iris: Easing.inOut(Easing.cubic),
  panel: Easing.inOut(Easing.quad),
  flash: (x) => x,
  blinds: Easing.inOut(Easing.cubic),
};

export const ease = (t: TransitionType, x: number) =>
  EASE[t](Math.max(0, Math.min(1, x)));

const vec = (d: Dir = "left"): [number, number] =>
  d === "left" ? [-1, 0] : d === "right" ? [1, 0] : d === "up" ? [0, -1] : [0, 1];

export type PhaseStyle = {
  style: React.CSSProperties;
  /** something drawn above the scene's content (panel, flash) */
  overlay?: { background: string; clipPath?: string; opacity?: number }[];
};

/** Style for one side of a transition.
 *
 *  `phase` "in" is the incoming scene, whose progress `p` runs 0 -> 1 over the overlap;
 *  "out" is the outgoing one over the same frames. `pv` is last frame's progress, used
 *  to measure speed for the motion blur. `dir` is the direction of travel: "left" means
 *  content moves toward the left edge, so the incoming scene enters from the right. */
export const phaseStyle = (
  t: Transition,
  phase: "in" | "out",
  p: number,
  pv: number,
  W: number,
  H: number,
  accent: string,
  blurK: number,
): PhaseStyle => {
  const [dx, dy] = vec(t.dir);
  const span = dx ? W : H;
  const e = ease(t.type, p);
  const ev = ease(t.type, pv);
  const v = (e - ev) * span;

  switch (t.type) {
    case "fade":
      return phase === "in" ? { style: { opacity: e } } : { style: {} };

    case "blur":
      return phase === "in"
        ? { style: { opacity: e, filter: `blur(${((1 - e) * 26).toFixed(2)}px)`,
            transform: `scale(${(1.04 - 0.04 * e).toFixed(4)})` } }
        : { style: { filter: `blur(${(e * 26).toFixed(2)}px)`,
            transform: `scale(${(1 + 0.05 * e).toFixed(4)})` } };

    case "slide":
      // the new card lands over the old one, which sinks back a little
      return phase === "in"
        ? { style: {
            transform: `translate(${(-dx * (1 - e) * W).toFixed(1)}px, ${(-dy * (1 - e) * H).toFixed(1)}px)`,
            filter: blurFilter(dx * v, dy * v, blurK),
            boxShadow: "0 0 50px rgba(0,0,0,0.12)" } }
        : { style: { transform: `scale(${(1 - 0.07 * e).toFixed(4)})`,
            filter: `brightness(${(1 - 0.25 * e).toFixed(3)})` } };

    case "push":
    case "whip": {
      const k = t.type === "whip" ? 1.8 : 0.8;
      const off = phase === "in" ? 1 - e : -e;
      return { style: {
        transform: `translate(${(-dx * off * W).toFixed(1)}px, ${(-dy * off * H).toFixed(1)}px)`,
        filter: blurFilter(dx * v, dy * v, blurK * k) } };
    }

    case "zoom":
      return phase === "in"
        ? { style: { opacity: Math.min(1, e * 1.6),
            transform: `scale(${(0.72 + 0.28 * e).toFixed(4)})`,
            filter: e < 0.98 ? `blur(${((1 - e) * 14).toFixed(2)}px)` : undefined } }
        : { style: { opacity: 1 - e,
            transform: `scale(${(1 + 0.9 * e).toFixed(4)})`,
            filter: `blur(${(e * 16).toFixed(2)}px)` } };

    case "wipe": {
      if (phase === "out") return { style: {} };
      const c = ((1 - e) * 100).toFixed(2);
      const inset = dx < 0 ? `inset(0 0 0 ${c}%)` : dx > 0 ? `inset(0 ${c}% 0 0)`
        : dy < 0 ? `inset(${c}% 0 0 0)` : `inset(0 0 ${c}% 0)`;
      return { style: { clipPath: inset } };
    }

    case "iris": {
      if (phase === "out") return { style: { transform: `scale(${(1 + 0.04 * e).toFixed(4)})` } };
      const [x, y] = t.at ?? [0.5, 0.5];
      return { style: { clipPath: `circle(${(e * 118).toFixed(2)}% at ${x * 100}% ${y * 100}%)` } };
    }

    case "panel": {
      // Two slabs cross the frame: the scene underneath is swapped while it is covered.
      if (phase === "out") return { style: {} };
      // A slab at progress a covers [2a-1, 2a] of the travel axis, measured from the
      // side it enters: fully covering at a = 0.5, gone at a = 1.
      const slab = (a: number) => {
        const s0 = (Math.max(0, 2 * a - 1) * 100).toFixed(2);
        const s1 = ((1 - Math.min(1, 2 * a)) * 100).toFixed(2);
        return dx < 0 ? `inset(0 ${s0}% 0 ${s1}%)` : dx > 0 ? `inset(0 ${s1}% 0 ${s0}%)`
          : dy < 0 ? `inset(${s1}% 0 ${s0}% 0)` : `inset(${s0}% 0 ${s1}% 0)`;
      };
      const lead = Math.min(1, e * 1.15);
      const trail = Math.max(0, e * 1.15 - 0.15);
      return {
        style: { opacity: e >= 0.52 ? 1 : 0 },
        overlay: [
          { background: accent, clipPath: slab(lead) },
          { background: t.color ?? "#0A0A0B", clipPath: slab(trail) },
        ],
      };
    }

    case "flash": {
      const peak = 1 - Math.abs(p - 0.5) * 2;
      return phase === "in"
        ? { style: { opacity: p >= 0.5 ? 1 : 0,
            transform: `scale(${(1.06 - 0.06 * Math.min(1, Math.max(0, (p - 0.5) * 2))).toFixed(4)})` },
            overlay: [{ background: t.color ?? "#FFFFFF", opacity: Math.max(0, peak) }] }
        : { style: {} };
    }

    case "blinds": {
      if (phase === "out") return { style: {} };
      const bands = 7;
      const w = (e * 100) / bands;
      const deg = dx ? 90 : 180;
      const g = `repeating-linear-gradient(${deg}deg, #000 0 ${w.toFixed(3)}%, transparent ${w.toFixed(3)}% ${(100 / bands).toFixed(3)}%)`;
      return { style: e >= 0.999 ? {} : { WebkitMaskImage: g, maskImage: g } };
    }

    case "cut":
    default:
      return { style: {} };
  }
};
