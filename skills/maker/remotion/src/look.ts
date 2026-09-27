/** A "look" is the motion personality of one video: how words arrive, how the camera
 *  moves between scenes, how much motion blur, what the paper and the frames look like.
 *
 *  Why it exists: the same entrance on every video is what makes a channel feel
 *  templated after the third upload, even when every single video is well made. The deck
 *  names a look, or the seed picks one, and `mk remotion deck` hands each new video the
 *  look the channel has used least recently — so two consecutive videos never move the
 *  same way.
 *
 *  Every look keeps the house rules (restraint, one accent, elevation). What changes is
 *  the choreography.
 */

/** How a single word (or a caption group) lands. */
export type WordIn =
  | "blur"     // arrives soft, grey and slightly large, then sharpens and inks in
  | "rise"     // springs up from below — the classic
  | "mask"     // slides up out of an invisible line, like a slot
  | "swipe"    // slides in from the right with a horizontal smear
  | "stomp"    // drops from 1.7x down onto the page, hard
  | "flip"     // rotates up on its baseline, 3D
  | "track"    // letter-spacing collapses from wide to tight while it fades in
  | "type";    // characters appear one by one behind a caret

/** How one scene hands over to the next. `cut` at peak motion blur is the pro trick:
 *  the outgoing scene accelerates away, the incoming one decelerates in, and the hard
 *  cut sits in the frame where both are a smear — so it reads as one continuous move. */
export type Transition =
  | "cut" | "fade" | "whip" | "whipUp" | "zoom" | "zoomOut" | "blur" | "slide" | "spin";

export type Paper = "flat" | "studio" | "spot" | "warm";

export type LookName =
  | "studio" | "spring" | "slot" | "swipe" | "impact" | "drift" | "flip" | "terminal";

export type Look = {
  name: LookName;
  /** words in the flowing caption */
  word: WordIn;
  /** emphasised words (bold, accent, big) — a second voice so the stress lands harder */
  strong: WordIn;
  /** ms between words */
  cadence: number;
  /** the moves this look cuts with, cycled through the deck (never the same twice in a row) */
  transitions: Transition[];
  /** 0..1 — how much motion blur the moves carry */
  blur: number;
  /** default background treatment */
  paper: Paper;
  /** default frame for footage */
  frame: "slab" | "phone" | "browser" | "card";
  /** default decor families, cycled per scene */
  decor: ("burst" | "rays" | "arcs" | "blobs" | "grid" | "blueprint" | "ghost" | "none")[];
  /** words arrive a lighter grey and settle to their colour — the "ink" settle */
  inkSettle: boolean;
  /** multiplier on the flowing caption's size. The reference sets its sentence big —
   *  the type IS the visual on half the scenes, not a subtitle under it. */
  textScale: number;
};

export const LOOKS: Record<LookName, Look> = {
  // The reference: soft grey studio paper, words that blur in and ink over, zoom-throughs.
  studio: {
    name: "studio", word: "blur", strong: "blur", cadence: 70,
    transitions: ["zoom", "whip", "blur", "zoomOut", "whipUp"],
    blur: 1, paper: "studio", frame: "slab",
    decor: ["none", "burst", "blueprint", "none", "ghost"], inkSettle: true, textScale: 1.42,
  },
  spring: {
    name: "spring", word: "rise", strong: "stomp", cadence: 55,
    transitions: ["cut", "slide", "cut", "zoom"],
    blur: 0.5, paper: "flat", frame: "phone",
    decor: ["rays", "arcs", "blobs", "grid"], inkSettle: false, textScale: 1.15,
  },
  slot: {
    name: "slot", word: "mask", strong: "mask", cadence: 60,
    transitions: ["whipUp", "cut", "slide", "whipUp"],
    blur: 0.7, paper: "spot", frame: "browser",
    decor: ["blueprint", "none", "arcs", "none"], inkSettle: false, textScale: 1.3,
  },
  swipe: {
    name: "swipe", word: "swipe", strong: "swipe", cadence: 60,
    transitions: ["whip", "whip", "zoom", "whip"],
    blur: 1, paper: "studio", frame: "slab",
    decor: ["none", "rays", "none", "grid"], inkSettle: true, textScale: 1.38,
  },
  impact: {
    name: "impact", word: "rise", strong: "stomp", cadence: 80,
    transitions: ["zoom", "cut", "spin", "zoomOut"],
    blur: 0.9, paper: "spot", frame: "slab",
    decor: ["burst", "none", "burst", "ghost"], inkSettle: false, textScale: 1.5,
  },
  drift: {
    name: "drift", word: "track", strong: "blur", cadence: 90,
    transitions: ["blur", "zoomOut", "blur", "slide"],
    blur: 0.8, paper: "warm", frame: "card",
    decor: ["blobs", "none", "arcs", "none"], inkSettle: true, textScale: 1.2,
  },
  flip: {
    name: "flip", word: "flip", strong: "flip", cadence: 60,
    transitions: ["slide", "spin", "whipUp", "zoom"],
    blur: 0.7, paper: "flat", frame: "slab",
    decor: ["grid", "none", "rays", "blueprint"], inkSettle: false, textScale: 1.3,
  },
  terminal: {
    name: "terminal", word: "type", strong: "stomp", cadence: 45,
    transitions: ["cut", "whip", "cut", "zoom"],
    blur: 0.6, paper: "spot", frame: "browser",
    decor: ["blueprint", "none", "grid", "none"], inkSettle: false, textScale: 1.2,
  },
};

export const LOOK_NAMES = Object.keys(LOOKS) as LookName[];

export type LookOverride = Partial<Omit<Look, "name">> & { name?: LookName };

/** Resolve the deck's look: an explicit name (plus per-field overrides), or one picked
 *  from the seed so that an unconfigured deck still differs from the last one. */
export const resolveLook = (spec: LookName | LookOverride | undefined, seed: number): Look => {
  if (typeof spec === "string") return LOOKS[spec] ?? LOOKS.studio;
  const base = spec?.name ? LOOKS[spec.name] ?? LOOKS.studio
    : LOOKS[LOOK_NAMES[seed % LOOK_NAMES.length]];
  return { ...base, ...(spec ?? {}), name: base.name } as Look;
};

/** The renderer's currently active look. Pure helpers (`rise`, word entrances) read it
 *  so all twenty scene components pick up the look without each one threading a prop.
 *  Safe because one bundle renders one deck, and Deck sets it before any child renders. */
let ACTIVE: Look = LOOKS.studio;
export const setActiveLook = (l: Look) => { ACTIVE = l; };
export const activeLook = () => ACTIVE;

/** One hand-over per scene boundary. Scene 0 has none (it is the hook — it just lands).
 *  An explicit `transition` wins; otherwise the look's list is walked from a seeded offset,
 *  skipping any move that would repeat the previous one. */
export const planTransitions = (
  scenes: { transition?: { type: Transition } }[], look: Look, seed: number,
): (Transition | undefined)[] => {
  const list = look.transitions.filter((t) => t !== "fade");
  const out: (Transition | undefined)[] = [];
  let prev: Transition | undefined;
  scenes.forEach((s, i) => {
    if (i === 0) { out.push(undefined); return; }
    let t: Transition = s.transition?.type ?? list[(i + seed) % list.length] ?? "cut";
    if (!s.transition && t === prev && list.length > 1) t = list[(i + seed + 1) % list.length];
    out.push(t);
    prev = t;
  });
  return out;
};
