import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { Device } from "../components/Device";
import { enter, rise, stagger } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

/** Two to four sources floating at different depths. Reads as a product shelf rather
 *  than a grid: each tile has its own scale, angle and arrival. */
export const Tiles: React.FC<SceneProps<"tiles">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const n = scene.items.length;
  // Laid out in the lower two thirds so a heading always has room above.
  const auto = [
    [{ x: 0.5, y: 0.58, s: 0.62, r: 0 }],
    [{ x: 0.34, y: 0.5, s: 0.4, r: -5 }, { x: 0.68, y: 0.66, s: 0.4, r: 4 }],
    [{ x: 0.3, y: 0.46, s: 0.32, r: -6 }, { x: 0.7, y: 0.56, s: 0.34, r: 3 },
     { x: 0.44, y: 0.76, s: 0.3, r: 5 }],
    [{ x: 0.29, y: 0.44, s: 0.28, r: -6 }, { x: 0.69, y: 0.5, s: 0.28, r: 5 },
     { x: 0.31, y: 0.71, s: 0.28, r: 4 }, { x: 0.71, y: 0.77, s: 0.28, r: -4 }],
  ][Math.min(n, 4) - 1] ?? [];
  // A phone is ~2.2x taller than it is wide, so the same `scale` would tower over a card.
  const aspectAdjust = (f?: string) => (f === "phone" ? 0.62 : 1);

  return (
    <AbsoluteFill>
      {scene.items.map((it, i) => {
        const a = auto[i] ?? { x: 0.5, y: 0.5, s: 0.4, r: 0 };
        const x = it.x ?? a.x;
        const y = it.y ?? a.y;
        const s = (it.scale ?? a.s) * aspectAdjust(it.frame);
        const rot = it.rotate ?? a.r;
        const p = enter(frame, fps, stagger(i, fps, 110), "pop");
        const w = width * s;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x * width,
              top: y * height,
              transform: `translate(-50%,-50%) rotate(${rot}deg) translateY(${
                (1 - p) * base * 0.6
              }px) scale(${0.9 + p * 0.1})`,
              opacity: Math.min(1, p * 1.5),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: base * 0.2,
            }}
          >
            <Device
              kind={it.frame ?? "card"}
              media={it.media}
              width={w}
              theme={theme}
              radius={base}
            />
            {it.label ? (
              <span style={{ fontFamily: font, fontSize: base * 0.36,
                fontWeight: WEIGHTS.semibold, color: theme.muted }}>
                {it.label}
              </span>
            ) : null}
          </div>
        );
      })}
      {scene.lines ? (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center",
          padding: `${base * 1.6}px ${base * 0.8}px`, pointerEvents: "none" }}>
          <TypeStack lines={scene.lines} theme={theme} base={base} font={font} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
