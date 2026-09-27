import type { ThemeName, WeightName } from "./theme";
import type { SpringName, Variant } from "./motion";
import type { DecorSpec } from "./components/Decor";
import type { LookName, LookOverride, Paper, Transition } from "./look";

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

/** Every visual source in the deck. Footage is the point: a screen recording sitting
 *  inside a device shell stops reading as "a clip" and starts reading as product design.
 *  `out` matters — it is what lets a short loop fill a longer scene. */
export type Media = {
  src: string;
  kind?: "video" | "image" | "auto";
  /** seconds into the source */
  in?: number;
  /** seconds into the source; set it so a short clip can loop under a longer scene */
  out?: number;
  speed?: number;
  /** default true — a bed under a voice is the deck's job, not a clip's */
  mute?: boolean;
  /** default true when `out` is known */
  loop?: boolean;
  fit?: "cover" | "contain";
};

/** Shorthand: a bare path means an auto-detected, muted, looping source. */
export type MediaRef = Media | string;

/** `slab` is the reference frame: a thick light bevel with a long soft shadow. */
export type Frame = "full" | "card" | "phone" | "browser" | "slab" | "none";

export type Mark = {
  x: number;
  y: number;
  kind?: "ring" | "arrow" | "box" | "dot";
  label?: string;
  /** seconds into the scene */
  at?: number;
  size?: number;
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
  /** how this scene takes over from the one before. Left unset, the deck's look picks
   *  one, rotating so no two consecutive hand-overs are the same move. `fade` overlaps
   *  the two scenes; every other move cuts at peak motion blur. */
  transition?: { type: Transition; duration?: number };
  /** override the deck background for this scene */
  bg?: string;
  /** where the block sits. Default `center`: the reference optically centres the whole
   *  composition and fills the edges with decor rather than pinning content to the top. */
  anchor?: "top" | "center" | "bottom";
  /** the flowing caption under the visual — the signature of this look.
   *  Markers: **bold**, __accent__, ==highlight==.
   *  e.g. "every **AI assistant** you have ever used **works** this way" */
  rich?: string;
  /** multiplier on the base type size for the rich caption (default 1.02) */
  richSize?: number;
  /** frames to wait before the caption starts revealing (default 6) */
  richDelay?: number;
  /** bleed shapes behind this scene; overrides the deck-level decor */
  decor?: DecorSpec;
  /** how this scene's block arrives. Left unset it rotates by index and the deck seed,
   *  which is what stops eleven scenes from entering eleven times the same way — and
   *  stops two videos from sharing the same sequence. */
  variant?: Variant;
  /** slow push on this scene, as a fraction (0.035 default). 0 holds it perfectly still. */
  zoom?: number;
};

export const justify = (a?: "top" | "center" | "bottom") =>
  a === "top" ? "flex-start" : a === "bottom" ? "flex-end" : "center";

export type ChipSpec = {
  /** a built-in glyph name, or a path to the creator's own logo in public/ */
  icon?: string;
  label?: string;
  accent?: boolean;
  shape?: "circle" | "squircle";
};

export type Scene = Base &
  (
    | { type: "textStack"; lines: Line[]; align?: "center" | "left"; anim?: SpringName;
        reveal?: "line" | "word" }
    | { type: "pill"; label: string; lines?: Line[]; sub?: string }
    | { type: "logoList"; heading?: Line[]; items: Item[]; footer?: Line[] }
    | { type: "card"; lines?: Line[]; media?: MediaRef; src?: string;
        device?: "phone" | "browser" | "slab" | "none"; gradient?: [string, string];
        caption?: Line[]; float?: number; tilt?: number }
    | { type: "media"; media: MediaRef; frame?: Frame; lines?: Line[];
        position?: "top" | "bottom"; scrim?: boolean; scale?: number;
        float?: number; tilt?: number }
    | { type: "tiles"; lines?: Line[];
        items: { media: MediaRef; x?: number; y?: number; scale?: number;
                 rotate?: number; frame?: Frame; label?: string }[] }
    | { type: "annotate"; media: MediaRef; frame?: Frame; lines?: Line[];
        marks: Mark[]; scale?: number }
    | { type: "marquee"; lines?: Line[]; items: string[]; speed?: number; rows?: 1 | 2 }
    | { type: "quote"; text: string; author?: string; role?: string }
    | { type: "progress"; heading?: Line[];
        items: { label: string; value: number; sub?: string; accent?: boolean }[] }
    | { type: "chips"; items: ChipSpec[]; lines?: Line[]; columns?: number; size?: number }
    | { type: "diagram"; hub?: ChipSpec; nodes: ChipSpec[]; lines?: Line[];
        connector?: "dashed" | "solid"; layout?: "grid" | "fan" | "cross"; size?: number }
    | { type: "flow"; title?: string; steps: { label: string; icon?: string }[];
        lines?: Line[] }
    | { type: "mock"; kind?: "prompt" | "search" | "message"; text: string;
        meta?: string; badge?: string; lines?: Line[]; chip?: ChipSpec }
    | { type: "cta"; actions?: { icon?: string; label?: string; accent?: boolean }[];
        size?: number }
    | { type: "toast";
        /** one to three notifications; `text` takes **bold** for the number */
        items: { title: string; text: string; icon?: string }[];
        /** a chip on the dashed path between the first two — the thing that changed it */
        link?: ChipSpec; color?: string }
    | { type: "pixel"; text: string; frame?: Frame; color?: string }
    | { type: "bullets"; heading?: Line[]; items: Item[] }
    | { type: "stat"; value: string; label?: string; sub?: string; countUp?: boolean }
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
  /** bleed shapes behind every scene, so the top and bottom of the frame are never dead */
  decor?: DecorSpec;
  /** any string — the video's slug works. It shifts the entrance rotation, the push
   *  direction and the decor family, so each video moves differently from the last. */
  seed?: string | number;
  /** the motion personality: `studio` `spring` `slot` `swipe` `impact` `drift` `flip`
   *  `terminal`, or `{ "name": "studio", "blur": 0.6, … }` to adjust one. Left unset, the
   *  seed picks one — and `mk remotion deck` writes the one this channel used least
   *  recently, so consecutive videos never move the same way. */
  look?: LookName | LookOverride;
  /** the surface: `studio` (grey sweep, the reference), `spot`, `warm`, `flat` */
  paper?: Paper;
  /** default slow push per scene (0.035). Set 0 for a completely static deck. */
  zoom?: number;
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
