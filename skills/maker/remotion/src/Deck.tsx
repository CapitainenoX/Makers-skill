import React from "react";
import {
  AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { seedOf, variantFor, variantStyle } from "./motion";
import { DEFAULTS, layout, type Deck as DeckType, type Scene } from "./deck";
import { buildTheme } from "./theme";
import { useFonts } from "./components/Fonts";
import { Decor } from "./components/Decor";
import { Backdrop } from "./components/Backdrop";
import { Watermark } from "./components/Watermark";
import { Ghost } from "./components/Ghost";
import { Hud } from "./components/Hud";
import { parse } from "./text";
import { MotionBlurDefs } from "./components/MotionBlur";
import { Layers } from "./components/Layers";
import { Kit, TEXT_FX, useKit, type KitValue, type MotionLanguage } from "./kit";
import { phaseStyle, type Transition } from "./transitions";
import { RENDERERS } from "./scenes";

const LANGUAGES: MotionLanguage[] = ["clean", "punchy", "soft", "graphic"];

/** Wraps one scene: its floor, its decor, its slow push, its arrival and its departure. */
const SceneFrame: React.FC<{
  scene: Scene;
  index: number;
  seed: number;
  zoom: number;
  frames: number;
  inT?: Transition;
  inFrames: number;
  outT?: Transition;
  outFrames: number;
  isLast: boolean;
  deckDecor: DeckType["decor"];
  deckBackdrop: DeckType["backdrop"];
  ghost?: string;
  /** whole-frame punch-ins on emphasised words — off by default (they read as dizzy) */
  punchOn?: boolean;
  children: React.ReactNode;
}> = ({ scene, index, seed, zoom, frames, inT, inFrames, outT, outFrames, isLast,
        deckDecor, deckBackdrop, ghost, punchOn = false, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { theme, blur, mono } = useKit();

  // Alternating push-in and pull-out across the deck, so the drift itself is not monotone.
  // A pull-out starts slightly in and settles at 1 — the frame never shrinks below its
  // own size, which would expose the page at the edges of a full-bleed scene.
  const amount = Math.max(0, Math.min(0.2, scene.zoom ?? zoom));
  const k = interpolate(frame, [0, Math.max(1, frames + outFrames)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Off by default (deck.zoom 0): an eased push stacked with punch-ins made viewers
  // dizzy, and even a constant 2.5 % drift re-rasterised every glyph at a new scale each
  // frame — text shimmered, read as vibrating. The camera must never be the event; motion
  // belongs to what arrives. A deck may still opt in with `zoom`.
  const ke = k;
  const push = 1 + amount * ((index + seed) % 2 === 0 ? ke : 1 - ke);

  // Punches: when the voice hits an emphasised word (a **bold**, __accent__ or ==mark==
  // token of the caption, synced by `mk remotion sync`) or names a list item, the whole
  // frame kicks in by ~2.5 % and settles. It is the editor's "punch-in on the beat" —
  // energy that lands on meaning, not on a clock.
  const punchTimes: number[] = [];
  if (scene.cues?.words && scene.rich) {
    parse(scene.rich).forEach((t, i) => {
      const at = scene.cues?.words?.[i];
      if (t.em !== "plain" && t.em !== "icon" && typeof at === "number") punchTimes.push(at);
    });
  }
  (scene.cues?.items ?? []).forEach((at, i) => { if (i > 0) punchTimes.push(at); });
  if (typeof scene.cues?.value === "number") punchTimes.push(scene.cues.value);
  const punch = !punchOn ? 0 : punchTimes.reduce((acc, at) => {
    const f = frame - Math.round(at * fps);
    if (f < 0 || f > 20) return acc;
    const up = f <= 6
      ? interpolate(f, [0, 6], [0, 1], { easing: Easing.inOut(Easing.sin) })
      : interpolate(f, [6, 20], [1, 0], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
    return Math.max(acc, up);
  }, 0);
  const zoomNow = push * (1 + 0.018 * punch);

  // On a cut the block arrives by itself; under a transition the transition is the arrival.
  const v = inFrames > 0
    ? { opacity: 1, transform: undefined as string | undefined }
    : variantStyle(
        variantFor(index, scene.variant, seed),
        interpolate(frame, [0, Math.round(fps * 0.34)], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
        }),
        width * 0.055,
      );

  const inPhase = inT && inFrames > 0 && frame < inFrames
    ? phaseStyle(inT, "in", frame / inFrames, (frame - 1) / inFrames, width, height, theme.accent, blur)
    : null;
  const outPhase = outT && outFrames > 0 && frame >= frames
    ? phaseStyle(outT, "out", (frame - frames) / outFrames, (frame - frames - 1) / outFrames,
        width, height, theme.accent, blur)
    : null;

  const fadeOut = isLast
    ? interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  const phase = { ...(outPhase?.style ?? {}), ...(inPhase?.style ?? {}) };
  const phaseOpacity = (phase.opacity as number | undefined) ?? 1;
  const overlays = [...(inPhase?.overlay ?? []), ...(outPhase?.overlay ?? [])];

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ ...phase, opacity: phaseOpacity * fadeOut, overflow: "hidden" }}>
        <Backdrop kind={scene.backdrop ?? deckBackdrop} bg={scene.bg ?? theme.bg} index={index} />
        {scene.decor || deckDecor || !mono
          ? <Decor spec={scene.decor ?? deckDecor} theme={theme} seed={seed} index={index + 1} />
          : null}
        <Ghost text={ghost} index={index + seed} />
        <AbsoluteFill
          style={{
            opacity: v.opacity as number,
            transform: `scale(${zoomNow.toFixed(5)}) ${v.transform ?? ""}`.trim(),
            // Rasterise the scene once and scale the bitmap: re-rendering text at a new
            // scale every frame makes the glyphs shimmer and step — the jitter of a slow zoom.
            willChange: "transform",
          }}
        >
          {children}
        </AbsoluteFill>
        <Layers layers={scene.layers} sceneFrames={frames} />
      </AbsoluteFill>
      {overlays.map((o, i) => (
        <AbsoluteFill key={i} style={{ background: o.background, clipPath: o.clipPath,
          opacity: o.opacity ?? 1 }} />
      ))}
    </AbsoluteFill>
  );
};

/** The word a scene is about, for its ghost: an explicit `ghost`, else the first bold
 *  word of its sentence, else its label / value / title. Scenes that are already big
 *  type, or already full of images, get none. */
const NO_GHOST = new Set(["kinetic", "chapter", "split", "gallery", "tiles", "beforeAfter", "focus"]);
const ghostFor = (scene: Scene, on: boolean): string | undefined => {
  if (scene.ghost === false) return undefined;
  if (typeof scene.ghost === "string") return scene.ghost;
  if (!on || NO_GHOST.has(scene.type)) return undefined;
  if (scene.type === "media" && (scene.frame ?? "card") === "full") return undefined;
  const any = scene as Record<string, unknown>;
  if (scene.type === "stat") return String(scene.value);
  const bold = scene.rich ? parse(scene.rich).find((t) => t.em === "bold" || t.em === "accent" || t.em === "mark") : undefined;
  if (bold) return bold.text.replace(/[^\p{L}\p{N}]/gu, "");
  for (const k of ["label", "title", "value"]) {
    if (typeof any[k] === "string" && (any[k] as string).length <= 14) return any[k] as string;
  }
  // a heading's last word ("il fait tout" -> "tout")
  const head = (any.heading ?? any.lines) as { t?: string }[] | undefined;
  const t = Array.isArray(head) ? head.map((l) => l?.t).filter(Boolean).pop() : undefined;
  return t ? String(t).split(/\s+/).pop() : undefined;
};

export const Deck: React.FC<DeckType> = (deck) => {
  const { width, durationInFrames, fps } = useVideoConfig();
  const seed = seedOf(deck.seed);
  // Black and white is the house style; `style: "color"` opts into the accent.
  const mono = (deck.style ?? "mono") === "mono";
  const theme = buildTheme(deck.theme ?? DEFAULTS.theme, deck.brand?.accent, mono);
  const inverted = deck.scenes.map((s) => !!s.invert);
  const themeFor = (i: number) => inverted[i]
    ? buildTheme(deck.theme ?? DEFAULTS.theme, deck.brand?.accent, mono, true) : theme;
  const { fonts, ready } = useFonts(deck.typeset, deck.brand?.font);
  const base = width * (deck.baseSize ?? DEFAULTS.baseSize);
  // The black-and-white house style moves in hard edges and masks ("graphic"); a colour
  // deck left unset takes one from its seed.
  const language = deck.motion?.language
    ?? ((deck.style ?? "mono") === "mono" ? "graphic" : LANGUAGES[seed % LANGUAGES.length]);
  const kit: KitValue = {
    theme, fonts, base, seed, language,
    blur: deck.motion?.blur ?? 1,
    textFx: "rise",
    logos: deck.logos ?? (mono ? "mono" : "auto"),
    mono,
  };
  const { places } = layout(deck);

  // Nothing paints until every face is loaded: auto-fitted lines are measured on the
  // first paint, and measuring against the fallback font sizes them wrong for good.
  if (!ready) return <AbsoluteFill style={{ background: theme.bg }} />;

  return (
    <Kit.Provider value={kit}>
      <AbsoluteFill style={{ background: theme.bg }}>
        <MotionBlurDefs />

        {deck.scenes.map((scene, i) => {
          const place = places[i];
          const Renderer = RENDERERS[scene.type] as React.FC<any> | undefined;
          if (!Renderer) return null;
          const fxList = TEXT_FX[language];
          const sceneTheme = themeFor(i);
          const sceneKit: KitValue = {
            ...kit,
            theme: sceneTheme,
            textFx: scene.textFx ?? fxList[(i + seed) % fxList.length],
            cues: scene.cues,
          };
          return (
            <Sequence key={i} from={place.start} durationInFrames={place.frames + place.outFrames}
              name={`${i} ${scene.type}`}>
              <Kit.Provider value={sceneKit}>
                <SceneFrame
                  scene={scene}
                  index={i}
                  seed={seed}
                  zoom={deck.zoom ?? 0}
                  frames={place.frames}
                  inT={scene.transition}
                  inFrames={place.inFrames}
                  outT={deck.scenes[i + 1]?.transition}
                  outFrames={place.outFrames}
                  isLast={i === deck.scenes.length - 1}
                  deckDecor={deck.decor}
                  deckBackdrop={deck.backdrop}
                  ghost={ghostFor(scene, deck.ghost ?? mono)}
                  punchOn={deck.motion?.punch ?? false}
                >
                  <Renderer
                    scene={scene}
                    theme={sceneTheme}
                    base={base}
                    font={fonts.body}
                    fonts={fonts}
                    durationInFrames={place.frames}
                  />
                </SceneFrame>
              </Kit.Provider>
            </Sequence>
          );
        })}

        {deck.hud ?? mono
          ? <Hud places={places} inverted={inverted} handle={deck.brand?.watermark} />
          : <Watermark text={deck.brand?.watermark} theme={theme} base={base} font={fonts.mono} />}

        {deck.audio?.src ? (
          <Audio
            src={deck.audio.src.startsWith("http") ? deck.audio.src : staticFile(deck.audio.src)}
            volume={(f) => {
              const fin = Math.round((deck.audio?.fadeIn ?? 0.4) * fps);
              const fout = Math.round((deck.audio?.fadeOut ?? 1.2) * fps);
              const gain = 10 ** ((deck.audio?.gain ?? -19) / 20);
              const up = fin > 0 ? interpolate(f, [0, fin], [0, 1], { extrapolateRight: "clamp" }) : 1;
              const down = fout > 0
                ? interpolate(f, [durationInFrames - fout, durationInFrames], [1, 0], {
                    extrapolateLeft: "clamp", extrapolateRight: "clamp",
                  })
                : 1;
              return gain * up * down;
            }}
          />
        ) : null}
      </AbsoluteFill>
    </Kit.Provider>
  );
};
