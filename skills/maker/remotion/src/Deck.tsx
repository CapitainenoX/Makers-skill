import React from "react";
import {
  AbsoluteFill, Audio, Sequence, interpolate, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { DEFAULTS, layout, type Deck as DeckType, type Scene } from "./deck";
import { THEMES } from "./theme";
import { useBrandFont } from "./components/BrandFont";
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

const RENDERERS = {
  textStack: TextStack, pill: Pill, logoList: LogoList, card: Card,
  bullets: Bullets, stat: Stat, code: Code, compare: Compare, outro: Outro,
} as const;

/** Wraps one scene: owns its cross-fade in and the final fade-out of the video. */
const SceneFrame: React.FC<{
  scene: Scene;
  overlap: number;
  isLast: boolean;
  children: React.ReactNode;
}> = ({ scene, overlap, isLast, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = overlap > 0
    ? interpolate(frame, [0, overlap], [0, 1], { extrapolateRight: "clamp" })
    : 1;
  const fadeOut = isLast
    ? interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 1;
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, background: scene.bg ?? "transparent" }}>
      {children}
    </AbsoluteFill>
  );
};

export const Deck: React.FC<DeckType> = (deck) => {
  const { width, durationInFrames } = useVideoConfig();
  const theme = {
    ...THEMES[deck.theme ?? DEFAULTS.theme],
    ...(deck.brand?.accent ? { accent: deck.brand.accent } : {}),
  };
  const base = width * (deck.baseSize ?? DEFAULTS.baseSize);
  const font = useBrandFont(undefined, deck.brand?.font);
  const { places } = layout(deck);

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      {deck.scenes.map((scene, i) => {
        const place = places[i];
        const Renderer = RENDERERS[scene.type] as React.FC<any>;
        if (!Renderer) return null;
        return (
          <Sequence key={i} from={place.start} durationInFrames={place.frames} name={scene.type}>
            <SceneFrame
              scene={scene}
              overlap={place.overlap}
              isLast={place.start + place.frames >= durationInFrames}
            >
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
