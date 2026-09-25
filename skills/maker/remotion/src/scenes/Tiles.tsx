import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { Device } from "../components/Device";
import { stagger, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { RichCaption } from "../components/Stage";
import type { SceneProps } from "./types";

/** Two to four sources floating at different depths. Reads as a product shelf rather
 *  than a grid: each tile has its own scale, angle and arrival — and keeps bobbing
 *  on its own phase after it lands, so the shelf never freezes. */
export const Tiles: React.FC<SceneProps<"tiles">> = ({ scene }) => {
  const { width, height, fps } = useVideoConfig();
  const { kit, arrive, frame } = useAnim();
  const { theme, fonts, base } = kit;
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
  const dirs = ["left", "right", "up", "down"] as const;

  return (
    <AbsoluteFill>
      {scene.items.map((it, i) => {
        const a = auto[i] ?? { x: 0.5, y: 0.5, s: 0.4, r: 0 };
        const x = it.x ?? a.x;
        const y = it.y ?? a.y;
        const s = (it.scale ?? a.s) * aspectAdjust(it.frame);
        const rot = it.rotate ?? a.r;
        const bob = Math.sin(frame / fps * 1.3 + i * 1.9) * base * 0.12;
        return (
          <div key={i} style={{ position: "absolute", left: x * width, top: y * height,
            transform: `translate(-50%,-50%) translateY(${bob.toFixed(2)}px) rotate(${rot}deg)` }}>
            <div style={{ ...arrive(stagger(i, fps, 110), base * 1.6, "pop", { dir: dirs[i % 4], from: 0.85 }),
              display: "flex", flexDirection: "column", alignItems: "center", gap: base * 0.2 }}>
              <Device kind={it.frame ?? "card"} media={it.media} width={width * s} theme={theme} radius={base} />
              {it.label ? (
                <span style={{ fontFamily: fonts.body, fontSize: base * 0.36, fontWeight: WEIGHTS.semibold,
                  color: theme.muted }}>{it.label}</span>
              ) : null}
            </div>
          </div>
        );
      })}
      {scene.lines ? (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center",
          padding: `${base * 1.6}px ${base * 0.8}px`, pointerEvents: "none" }}>
          <TypeStack lines={scene.lines} />
        </AbsoluteFill>
      ) : null}
      {scene.rich ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center",
          padding: `${base * 2.2}px ${base * 0.7}px`, pointerEvents: "none" }}>
          <RichCaption scene={scene} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
