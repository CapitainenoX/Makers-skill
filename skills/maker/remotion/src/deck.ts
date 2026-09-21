import type { ThemeName, WeightName } from "./theme";
import type { SpringName } from "./motion";

/** A "deck" is the whole video, described as data. The model writes this JSON;
 *  the components own every pixel decision. Same contract as the ffmpeg EDL:
 *  judgement in the JSON, craft in the renderer. */

export type Line = {
  /** the text */
  t: string;
  /** relative weight — mixing `light` and `black` in one stack is the look */
  w?: WeightName;
  /** size multiplier against the deck's base size (1 = base) */
  s?: number;
  /** a theme colour name or any CSS colour */
  c?: "text" | "muted" | "accent" | string;
  /** italic / oblique, used for narration lines */
  i?: boolean;
};

export type Glyph =
  | "sparkle" | "dot" | "bolt" | "check" | "arrow" | "terminal"
  | "square" | "circle" | "triangle" | "plus" | "star";

export type Item = {
  label: string;
  /** a built-in glyph, or a path to the creator's own SVG/PNG */
  icon?: Glyph | string;
  sub?: string;
  accent?: boolean;
};

type Base = {
  /** seconds */
  duration: number;
  /** cut (default) or a short crossfade into this scene */
  transition?: { type: "cut" | "fade"; duration?: number };
  /** override the deck background for this scene */
  bg?: string;
  /** where the block sits on the canvas — the reference look favours `top` */
  anchor?: "top" | "center" | "bottom";
};

export const justify = (a?: "top" | "center" | "bottom") =>
  a === "top" ? "flex-start" : a === "bottom" ? "flex-end" : "center";

export type Scene = Base &
  (
    | { type: "textStack"; lines: Line[]; align?: "center" | "left"; anim?: SpringName }
    | { type: "pill"; label: string; lines?: Line[]; sub?: string }
    | { type: "logoList"; heading?: Line[]; items: Item[]; footer?: Line[] }
    | { type: "card"; lines?: Line[]; src?: string; device?: "phone" | "browser" | "none";
        gradient?: [string, string]; caption?: Line[] }
    | { type: "bullets"; heading?: Line[]; items: Item[] }
    | { type: "stat"; value: string; label?: string; sub?: string }
    | { type: "code"; title?: string; lines: string[]; prompt?: string }
    | { type: "compare"; left: { label: string; items: string[] };
        right: { label: string; items: string[] } }
    | { type: "outro"; lines: Line[]; handle?: string }
  );

export type Deck = {
  width?: number;
  height?: number;
  fps?: number;
  theme?: ThemeName;
  brand?: {
    accent?: string;
    /** CSS font-family; leave empty to use the built-in grotesque stack */
    font?: string;
    /** faint corner mark, like a site address */
    watermark?: string;
  };
  /** base type size as a fraction of the canvas width (0.058 ≈ 63px at 1080) */
  baseSize?: number;
  audio?: { src: string; gain?: number; fadeIn?: number; fadeOut?: number };
  scenes: Scene[];
};

export const DEFAULTS = {
  width: 1080,
  height: 1920,
  fps: 30,
  theme: "light" as ThemeName,
  baseSize: 0.058,
};

export const sceneFrames = (s: Scene, fps: number) =>
  Math.max(1, Math.round((s.duration ?? 2) * fps));

export type Placement = { start: number; frames: number; overlap: number };

/** Lay the scenes out on the timeline. A `fade` transition overlaps the scene
 *  onto the one before it, so the dissolve is a real cross-fade rather than a
 *  dip through the background. A `cut` costs nothing and is the default. */
export const layout = (deck: Deck): { places: Placement[]; total: number } => {
  const fps = deck.fps ?? DEFAULTS.fps;
  let at = 0;
  const places = deck.scenes.map((s, i) => {
    const frames = sceneFrames(s, fps);
    const wants = s.transition?.type === "fade" ? s.transition.duration ?? 0.3 : 0;
    const overlap =
      i === 0 ? 0 : Math.min(Math.round(wants * fps), frames - 1, at);
    const start = Math.max(0, at - overlap);
    at = start + frames;
    return { start, frames, overlap };
  });
  return { places, total: Math.max(1, at) };
};

export const totalFrames = (deck: Deck) => layout(deck).total;
