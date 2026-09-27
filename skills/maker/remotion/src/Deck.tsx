import React from "react";
import {
  AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { sceneMove, seedOf, variantFor, variantStyle } from "./motion";
import { planTransitions, resolveLook, setActiveLook, type Transition } from "./look";
import { Paper, paperColor } from "./components/Paper";
import { MotionBlurDefs } from "./components/MotionBlur";
import { DEFAULTS, layout, type Deck as DeckType, type Scene } from "./deck";
import { THEMES } from "./theme";
import { useDisplayFont } from "./components/Fonts";
import { Decor } from "./components/Decor";
import { Watermark } from "./components/Watermark";
import { TextStack } from "./scenes/TextStack";
import { Pill } from "./scenes/Pill";
import { LogoList } from "./scenes/LogoList";
import { Card } from "./scenes/Card";
import { Bullets } from "./scenes/Bullets";
import { Stat } from "./scenes/Stat";
import { Code } from "./scenes/Code";
import { Compare } from "./scenes/Compare";
import { Outro } from "./scenes/Outro";
import { MediaScene } from "./scenes/Media";
import { Tiles } from "./scenes/Tiles";
import { Annotate } from "./scenes/Annotate";
import { Marquee } from "./scenes/Marquee";
import { Quote } from "./scenes/Quote";
import { Progress } from "./scenes/Progress";
import { Chips } from "./scenes/Chips";
import { Diagram } from "./scenes/Diagram";
import { Flow } from "./scenes/Flow";
import { Mock } from "./scenes/Mock";
import { Cta } from "./scenes/Cta";
import { Toast } from "./scenes/Toast";
import { Pixel } from "./scenes/Pixel";

const RENDERERS = {
  textStack: TextStack, pill: Pill, logoList: LogoList, card: Card,
  bullets: Bullets, stat: Stat, code: Code, compare: Compare, outro: Outro,
  media: MediaScene, tiles: Tiles, annotate: Annotate, marquee: Marquee,
  quote: Quote, progress: Progress, chips: Chips, diagram: Diagram,
  flow: Flow, mock: Mock, cta: Cta, toast: Toast, pixel: Pixel,
} as const;

/** Wraps one scene: owns its cross-fade in and the final fade-out of the video. */
const SceneFrame: React.FC<{
  scene: Scene;
  index: number;
  seed: number;
  zoom: number;
  overlap: number;
  isLast: boolean;
  inMove?: Transition;
  outMove?: Transition;
  children: React.ReactNode;
}> = ({ scene, index, seed, zoom, overlap, isLast, inMove, outMove, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const fadeIn = overlap > 0
    ? interpolate(frame, [0, overlap], [0, 1], { extrapolateRight: "clamp" })
    : 1;
  const fadeOut = isLast
    ? interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 1;
  // Alternating push-in and pull-out across the deck, so the drift itself is not monotone.
  const amount = scene.zoom ?? zoom;
  const dir = (index + seed) % 2 === 0 ? 1 : -1;
  const own = useVideoConfig().durationInFrames;
  const k = interpolate(frame, [0, Math.max(1, own)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const push = 1 + dir * amount * k;

  // Consecutive moves alternate side, so two whips in a row do not leave the same way.
  const side = (i: number) => ((i + seed) % 2 === 0 ? 1 : -1);
  const move = sceneMove(frame, fps, durationInFrames, width, height,
    inMove, outMove, side(index), side(index + 1));
  // A scene arriving on a real move does not also need the small variant nudge.
  const arrivesOnMove = inMove && inMove !== "cut" && inMove !== "fade";

  const v = arrivesOnMove ? { opacity: 1 } as React.CSSProperties : variantStyle(
    variantFor(index, scene.variant, seed),
    interpolate(frame, [0, Math.round(fps * 0.34)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
    width * 0.055,
  );
  return (
    <AbsoluteFill style={{ background: scene.bg ?? "transparent" }}>
      <AbsoluteFill
        style={{
          ...v,
          opacity: (v.opacity as number) * fadeIn * fadeOut * move.opacity,
          transform: `${move.transform} scale(${push.toFixed(4)}) ${v.transform ?? ""}`.trim(),
          filter: move.filter,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Deck: React.FC<DeckType> = (deck) => {
  const { width, durationInFrames } = useVideoConfig();
  const seed = seedOf(deck.seed);
  const theme = {
    ...THEMES[deck.theme ?? DEFAULTS.theme],
    ...(deck.brand?.accent ? { accent: deck.brand.accent } : {}),
  };
  const base = width * (deck.baseSize ?? DEFAULTS.baseSize);
  const font = useDisplayFont(deck.brand?.font);
  const { places } = layout(deck);
  const look = resolveLook(deck.look, seed);
  setActiveLook(look);
  const paper = deck.paper ?? look.paper;
  // Words and highlights that "reverse out" use theme.bg — keep that the paper's colour.
  theme.bg = paperColor(paper, theme);
  const moves = planTransitions(deck.scenes, look, seed);
  const colourful = Boolean(deck.brand?.accent);

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <MotionBlurDefs />
      <Paper kind={paper} theme={theme} />

      {deck.scenes.map((scene, i) => {
        const place = places[i];
        const Renderer = RENDERERS[scene.type] as React.FC<any>;
        if (!Renderer) return null;
        return (
          <Sequence key={i} from={place.start} durationInFrames={place.frames} name={scene.type}>
            <SceneFrame
              scene={scene}
              index={i}
              seed={seed}
              zoom={deck.zoom ?? 0.035}
              overlap={place.overlap}
              isLast={place.start + place.frames >= durationInFrames}
              inMove={moves[i]}
              outMove={moves[i + 1]}
            >
              <Decor spec={scene.decor ?? deck.decor} theme={theme} seed={seed} index={i + 1}
                colourful={colourful} />
              <Renderer
                scene={scene}
                theme={theme}
                base={base}
                font={font}
                durationInFrames={place.frames}
              />
            </SceneFrame>
          </Sequence>
        );
      })}

      <Watermark text={deck.brand?.watermark} theme={theme} base={base} font={font} />

      {deck.audio?.src ? (
        <Audio
          src={deck.audio.src.startsWith("http") ? deck.audio.src : staticFile(deck.audio.src)}
          volume={(f) => {
            const fin = Math.round((deck.audio?.fadeIn ?? 0.4) * 30);
            const fout = Math.round((deck.audio?.fadeOut ?? 1.2) * 30);
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
  );
};
