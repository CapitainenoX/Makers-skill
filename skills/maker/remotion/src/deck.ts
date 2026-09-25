import type { ThemeName, WeightName } from "./theme";
import type { SpringName, Variant, Dir } from "./motion";
import type { DecorSpec } from "./components/Decor";
import type { BackdropKind } from "./components/Backdrop";
import type { FontRole, TypesetName } from "./components/Fonts";
import type { MotionLanguage, TextFx } from "./kit";
import type { Transition } from "./transitions";
import { transitionFrames } from "./transitions";
import type { ChipFill } from "./components/Chip";

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
  /** italic — the narration voice; rendered in the serif */
  i?: boolean;
  /** force a face: display | body | serif | mono. Left unset it follows importance:
   *  big + heavy -> display, italic -> serif, the rest -> body */
  f?: FontRole;
};

/** Every visual source in the deck. `out` matters — it is what lets a short loop fill a
 *  longer scene. */
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
  /** a tall screenshot scrolls from top to bottom over the scene */
  scroll?: boolean;
  /** slow Ken Burns on a still: 0.08 = 8% push */
  kenBurns?: number;
};

/** Shorthand: a bare path means an auto-detected, muted, looping source. */
export type MediaRef = Media | string;

export type Frame = "full" | "card" | "phone" | "browser" | "none";

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
  | "sparkle" | "dot" | "bolt" | "check" | "arrow" | "terminal" | "gear" | "folder"
  | "cube" | "chat" | "cloud" | "lock" | "rocket" | "code" | "database" | "thumbsUp"
  | "bell" | "comment" | "share" | "star" | "square" | "circle" | "triangle" | "plus"
  | "heart" | "play" | "search" | "user" | "clock" | "globe" | "fire" | "cross" | "eye"
  | "download" | "link" | "chart" | "mic" | "image" | "music" | "key" | "trophy" | "flag"
  | "cursor" | "warning" | "money";

export type Item = {
  label: string;
  /** a built-in glyph, or a path to a logo / image in public/ */
  icon?: Glyph | string;
  sub?: string;
  accent?: boolean;
};

export type ChipSpec = {
  /** a built-in glyph name, or a path to a logo in public/ */
  icon?: string;
  label?: string;
  accent?: boolean;
  shape?: "circle" | "squircle";
  /** surface (white chip) · brand (filled with the logo's colour) · accent · ink · ghost */
  fill?: ChipFill;
  /** auto (default: brand colour unless it would not read) · brand · mono · accent · #hex */
  tint?: string;
};

/** A complementary element layered over any scene: a sticker, a pointer, a burst, a
 *  notification. One or two per scene is what makes a frame feel produced; five is noise. */
export type Layer = {
  kind: "image" | "icon" | "badge" | "arrow" | "burst" | "cursor" | "toast" | "scribble"
    | "sparkles" | "label" | "emoji";
  /** centre, 0-1 of the frame */
  x: number;
  y: number;
  /** seconds into the scene it appears / leaves */
  at?: number;
  until?: number;
  /** width as a fraction of the frame (images, icons, toasts) */
  size?: number;
  rotate?: number;
  /** image / icon path, or a glyph name */
  src?: string;
  /** badge / label / toast / emoji text */
  text?: string;
  sub?: string;
  /** arrow and cursor end point, 0-1 of the frame */
  to?: [number, number];
  shape?: "circle" | "rounded" | "sticker" | "none";
  /** "accent" | "text" | "muted" | any CSS colour */
  color?: string;
  /** how it arrives */
  fx?: "pop" | "drop" | "slide" | "spin" | "fade";
  /** idle bob after it lands */
  float?: boolean;
  tint?: string;
};

type Base = {
  /** seconds */
  duration: number;
  /** how this scene arrives from the previous one. Omit it and `mk remotion` picks one
   *  from the deck's motion language (or cuts) — see references/deck-schema.md */
  transition?: Transition;
  /** override the deck background for this scene */
  bg?: string;
  backdrop?: BackdropKind;
  /** where the block sits. Default `center` */
  anchor?: "top" | "center" | "bottom";
  /** the flowing caption. Markers: **bold** __accent__ *serif* ~~underline~~
   *  ==highlight== [[icon]] */
  rich?: string;
  /** multiplier on the base type size for the rich caption (default 1.02) */
  richSize?: number;
  /** frames to wait before the caption starts revealing (default 6) */
  richDelay?: number;
  /** caption below the visual (default) or above it */
  captionAt?: "below" | "above";
  /** how the words arrive. Left unset it rotates within the deck's motion language */
  textFx?: TextFx;
  /** bleed shapes behind this scene; overrides the deck-level decor */
  decor?: DecorSpec;
  /** how this scene's block arrives on a cut. Left unset it rotates by index and seed */
  variant?: Variant;
  /** slow push on this scene, as a fraction (0.035 default). 0 holds it perfectly still. */
  zoom?: number;
  /** complementary elements over the scene */
  layers?: Layer[];
  /** the negative: black page, white ink (or the reverse on a dark deck). Left unset,
   *  `mk remotion` inverts some scenes on a rhythm in the black-and-white style */
  invert?: boolean;
  /** the giant outlined word behind the scene; false for none. Defaults to the
   *  scene's keyword in the black-and-white style */
  ghost?: string | false;
};

export const justify = (a?: "top" | "center" | "bottom") =>
  a === "top" ? "flex-start" : a === "bottom" ? "flex-end" : "center";

export type Half = {
  media?: MediaRef;
  /** a rich sentence */
  text?: string;
  label?: string;
  icon?: string;
  bg?: string;
};

export type Side = {
  label: string;
  icon?: string;
  media?: MediaRef;
  sub?: string;
  items?: string[];
  accent?: boolean;
};

export type Scene = Base &
  (
    | { type: "textStack"; lines: Line[]; align?: "center" | "left"; anim?: SpringName;
        reveal?: "line" | "word" }
    | { type: "pill"; label: string; icon?: string; lines?: Line[]; sub?: string }
    | { type: "logoList"; heading?: Line[]; items: Item[]; footer?: Line[] }
    | { type: "card"; lines?: Line[]; media?: MediaRef; src?: string;
        device?: "phone" | "browser" | "none"; gradient?: [string, string];
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
    | { type: "quote"; text: string; author?: string; role?: string; avatar?: string }
    | { type: "progress"; heading?: Line[];
        items: { label: string; value: number; sub?: string; accent?: boolean }[] }
    | { type: "chips"; items: ChipSpec[]; lines?: Line[]; columns?: number; size?: number }
    | { type: "diagram"; hub?: ChipSpec; nodes: ChipSpec[]; lines?: Line[];
        connector?: "dashed" | "solid"; layout?: "grid" | "fan" | "cross"; size?: number }
    | { type: "flow"; title?: string; steps: { label: string; icon?: string }[];
        lines?: Line[] }
    | { type: "mock"; kind?: "prompt" | "search" | "message"; text: string;
        meta?: string; badge?: string; lines?: Line[]; chip?: ChipSpec; typing?: boolean }
    | { type: "cta"; actions?: { icon?: string; label?: string; accent?: boolean }[];
        size?: number }
    | { type: "bullets"; heading?: Line[]; items: Item[] }
    | { type: "stat"; value: string; label?: string; sub?: string; countUp?: boolean;
        style?: "count" | "roll"; ring?: number; icon?: string }
    | { type: "code"; title?: string; lines: string[]; prompt?: string; typing?: boolean }
    | { type: "compare"; left: { label: string; items: string[] };
        right: { label: string; items: string[] } }
    | { type: "outro"; lines: Line[]; handle?: string; icon?: string }
    // ---- structure and pattern interrupts
    | { type: "kinetic"; lines: string[]; style?: "stack" | "punch" | "slide";
        align?: "center" | "left" }
    | { type: "chapter"; number?: string; title: string; sub?: string; invert?: boolean }
    | { type: "split"; a: Half; b: Half; dir?: "rows" | "columns"; divider?: string }
    | { type: "versus"; left: Side; right: Side; badge?: string }
    | { type: "steps"; heading?: Line[]; items: { label: string; sub?: string; icon?: string }[] }
    | { type: "timeline"; heading?: Line[];
        items: { date: string; label: string; sub?: string; accent?: boolean; icon?: string }[] }
    | { type: "checklist"; heading?: Line[];
        items: { label: string; done?: boolean; sub?: string }[] }
    | { type: "chart"; kind?: "bar" | "column" | "line"; heading?: Line[]; unit?: string;
        max?: number; items: { label: string; value: number; accent?: boolean; icon?: string }[] }
    | { type: "orbit"; hub?: ChipSpec; nodes: ChipSpec[]; speed?: number; size?: number }
    // ---- footage and complementary images
    | { type: "gallery"; items: { media: MediaRef; label?: string }[];
        layout?: "grid" | "fan" | "stack"; focus?: number }
    | { type: "focus"; media: MediaRef; x: number; y: number; magnify?: number; label?: string;
        frame?: Frame; at?: number }
    | { type: "beforeAfter"; before: MediaRef; after: MediaRef; labels?: [string, string];
        frame?: Frame }
    | { type: "notify"; items: { app?: string; icon?: string; title: string; body?: string;
        time?: string }[] }
    | { type: "post"; name: string; handle?: string; avatar?: string; text: string;
        media?: MediaRef; verified?: boolean; likes?: string; reposts?: string;
        replies?: string }
  );

export type Deck = {
  width?: number;
  height?: number;
  fps?: number;
  theme?: ThemeName;
  /** the type system: studio | editorial | impact | tech | playful */
  typeset?: TypesetName;
  brand?: {
    accent?: string;
    /** CSS font-family placed in front of the typeset's display and body faces */
    font?: string;
    /** faint corner mark, like a site address */
    watermark?: string;
  };
  /** base type size as a fraction of the canvas width (0.058 ≈ 63px at 1080) */
  baseSize?: number;
  audio?: { src: string; gain?: number; fadeIn?: number; fadeOut?: number };
  /** bleed shapes behind every scene, so the top and bottom of the frame are never dead */
  decor?: DecorSpec;
  /** the page behind every scene: plain | spotlight | mesh | grain | dots | lines */
  backdrop?: BackdropKind;
  /** any string — the video's slug works. It shifts the entrance rotation, the push
   *  direction and the decor family, so each video moves differently from the last. */
  seed?: string | number;
  /** default slow push per scene (0.035). Set 0 for a completely static deck. */
  zoom?: number;
  motion?: {
    /** clean | punchy | soft | graphic — the family of transitions and text effects */
    language?: MotionLanguage;
    /** motion-blur strength, 0 disables (default 1) */
    blur?: number;
    /** "auto" (default): `mk remotion` fills in transitions from the language.
     *  "cut": every scene cuts unless it names a transition */
    transitions?: "auto" | "cut";
  };
  /** "mono" (default): strict black and white — no accent, logos in ink, inverted scenes
   *  for rhythm. "color": the brand accent and logo colours come back */
  style?: "mono" | "color";
  /** the editorial frame: scene counter, handle, progress bar (default on in mono) */
  hud?: boolean;
  /** giant outlined keyword behind each scene (default on in mono) */
  ghost?: boolean;
  /** how logo files are coloured: auto (brand colour unless unreadable) · brand · mono.
   *  Default mono in the black-and-white style */
  logos?: "auto" | "brand" | "mono";
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

export type Placement = {
  /** first frame of the scene — the cut point */
  start: number;
  /** the scene's own length */
  frames: number;
  /** frames the scene takes to transition in (they start at `start`) */
  inFrames: number;
  /** frames the scene stays on screen past its end, under the next scene's transition */
  outFrames: number;
};

/** Lay the scenes out on the timeline.
 *
 *  Cuts sit exactly where the durations add up to — the same arithmetic `mk mix` uses to
 *  put a one-shot on every cut. A transition never shortens the video: the incoming
 *  scene starts on the cut and animates in, while the outgoing one is held on screen for
 *  those frames underneath it. */
export const layout = (deck: Deck): { places: Placement[]; total: number } => {
  const fps = deck.fps ?? DEFAULTS.fps;
  let at = 0;
  const own = deck.scenes.map((s) => sceneFrames(s, fps));
  const places = deck.scenes.map((s, i) => {
    const frames = own[i];
    const inFrames = i === 0 ? 0 : Math.min(transitionFrames(s.transition, fps), frames - 1);
    const next = deck.scenes[i + 1];
    const outFrames = next ? Math.min(transitionFrames(next.transition, fps), own[i + 1] - 1) : 0;
    const place = { start: at, frames, inFrames, outFrames: Math.max(0, outFrames) };
    at += frames;
    return place;
  });
  return { places, total: Math.max(1, at) };
};

export const totalFrames = (deck: Deck) => layout(deck).total;

export type { Dir };
