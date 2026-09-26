import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
// Every face is bundled, never fetched: a font pulled from a CDN at render time fails
// offline, behind a proxy, or on a host whose CA the renderer does not trust — and a
// failed fetch took the whole render down. Only the files a frame actually uses load.
import "@fontsource-variable/inter";
import "@fontsource-variable/inter/wght-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/anton";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/bricolage-grotesque";
import { FONT_STACK } from "../theme";

/** Four roles, one per level of importance. Hierarchy is what makes type read as designed:
 *
 *  - `display` — the hook, the number, the chapter title. Loud, tight, used once per scene.
 *  - `body`    — the sentence and the labels. Quiet, legible, never competes.
 *  - `serif`   — italic emphasis and narration (`*word*` in a rich caption). The contrast
 *                between a grotesque and an italic serif is the editorial look.
 *  - `mono`    — code, handles, metadata, numbers in a table: things a machine said. */
export type FontRole = "display" | "body" | "serif" | "mono";

export type TypesetName = "studio" | "editorial" | "impact" | "tech" | "playful";

export type Fonts = Record<FontRole, string> & {
  name: TypesetName;
  displayWeight: number;
  /** letter-spacing for display type, in em */
  displayTracking: number;
  displayLeading: number;
  /** condensed display faces are drawn for capitals */
  displayUpper: boolean;
  /** a serif with a true italic, used for `*emphasis*` */
  serifItalic: boolean;
};

const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif';
const MONO_FALLBACK = 'Menlo, Consolas, "DejaVu Sans Mono", monospace';
const f = (family: string, fallback = FONT_STACK) => `"${family}", ${fallback}`;

export const TYPESETS: Record<TypesetName, Omit<Fonts, "name">> = {
  // The reference look: one grotesque at two extremes, an italic serif for the voice.
  studio: {
    display: f("Inter Variable"), body: f("Inter Variable"),
    serif: f("Instrument Serif", SERIF_FALLBACK), mono: f("JetBrains Mono Variable", MONO_FALLBACK),
    displayWeight: 800, displayTracking: -0.045, displayLeading: 0.98,
    displayUpper: false, serifItalic: true,
  },
  // A soft high-contrast serif for the big lines — essays, stories, "why" videos.
  editorial: {
    display: f("Fraunces Variable", SERIF_FALLBACK), body: f("Inter Variable"),
    serif: f("Fraunces Variable", SERIF_FALLBACK), mono: f("JetBrains Mono Variable", MONO_FALLBACK),
    displayWeight: 600, displayTracking: -0.03, displayLeading: 1.0,
    displayUpper: false, serifItalic: true,
  },
  // Condensed capitals: hype, rankings, "3 tools you need", sports energy.
  impact: {
    display: f("Anton"), body: f("Inter Variable"),
    serif: f("Instrument Serif", SERIF_FALLBACK), mono: f("JetBrains Mono Variable", MONO_FALLBACK),
    displayWeight: 400, displayTracking: 0.004, displayLeading: 0.95,
    displayUpper: true, serifItalic: true,
  },
  // A geometric grotesque with a mono sidekick: dev tools, AI, infrastructure.
  tech: {
    display: f("Space Grotesk Variable"), body: f("Inter Variable"),
    serif: f("Instrument Serif", SERIF_FALLBACK), mono: f("JetBrains Mono Variable", MONO_FALLBACK),
    displayWeight: 700, displayTracking: -0.04, displayLeading: 0.98,
    displayUpper: false, serifItalic: true,
  },
  // Rounded, characterful, a little loud: lifestyle, creators, consumer apps.
  playful: {
    display: f("Bricolage Grotesque Variable"), body: f("Bricolage Grotesque Variable"),
    serif: f("Fraunces Variable", SERIF_FALLBACK), mono: f("JetBrains Mono Variable", MONO_FALLBACK),
    displayWeight: 800, displayTracking: -0.04, displayLeading: 0.98,
    displayUpper: false, serifItalic: true,
  },
};

/** The concrete faces a typeset needs, so the render waits for all of them. */
const FACES: Record<TypesetName, string[]> = {
  studio: ['800 64px "Inter Variable"', '500 64px "Inter Variable"',
    'italic 400 64px "Instrument Serif"', '500 64px "JetBrains Mono Variable"'],
  editorial: ['600 64px "Fraunces Variable"', 'italic 500 64px "Fraunces Variable"',
    '500 64px "Inter Variable"', '500 64px "JetBrains Mono Variable"'],
  impact: ['400 64px "Anton"', '500 64px "Inter Variable"', '800 64px "Inter Variable"',
    'italic 400 64px "Instrument Serif"', '500 64px "JetBrains Mono Variable"'],
  tech: ['700 64px "Space Grotesk Variable"', '500 64px "Inter Variable"',
    'italic 400 64px "Instrument Serif"', '500 64px "JetBrains Mono Variable"'],
  playful: ['800 64px "Bricolage Grotesque Variable"', '500 64px "Bricolage Grotesque Variable"',
    'italic 500 64px "Fraunces Variable"', '500 64px "JetBrains Mono Variable"'],
};

export const resolveFonts = (typeset?: string, brandFont?: string): Fonts => {
  const name = (typeset && typeset in TYPESETS ? typeset : "studio") as TypesetName;
  const t = TYPESETS[name];
  const front = brandFont ? `${brandFont}, ` : "";
  return { name, ...t, display: front + t.display, body: front + t.body };
};

/** Waits for every face of the typeset, then lets the frame be captured. Returns `ready`
 *  so the deck can hold its first paint: measuring text before the face loads would
 *  size every auto-fitted line against the fallback font. Never stalls a render. */
export const useFonts = (typeset?: string, brandFont?: string, timeoutMs = 8000) => {
  const [handle] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  const fonts = resolveFonts(typeset, brandFont);

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setReady(true);
    };
    const faces = FACES[fonts.name];
    const load =
      typeof document !== "undefined" && document.fonts
        ? Promise.all(faces.map((face) => document.fonts.load(face).catch(() => null)))
            .then(() => document.fonts.ready)
        : Promise.resolve();
    load.then(finish).catch(finish);
    const timer = setTimeout(finish, timeoutMs);
    return () => clearTimeout(timer);
  }, [handle, timeoutMs, fonts.name]);

  // Released only after the ready render has committed: by then every logo inside it has
  // opened its own delayRender, so the frame waits for those too.
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);

  return { fonts, ready };
};
