import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Media } from "../components/Media";
import { RichCaption } from "../components/Stage";
import { stagger, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

/** Several images or clips at once — the complementary shots that prove breadth.
 *  `grid` (a tight mosaic), `fan` (cards fanned like a hand), `stack` (a pile, the top
 *  card tossed aside to reveal the next). `focus` lifts one item forward after the
 *  others land. Every tile is a still or a loop, each with a slow Ken Burns. */
export const Gallery: React.FC<SceneProps<"gallery">> = ({ scene, durationInFrames }) => {
  const { width, height } = useVideoConfig();
  const { kit, fps, frame, arrive, ramp } = useAnim();
  const { theme, fonts, base } = kit;
  const items = scene.items.slice(0, 6);
  const n = items.length;
  const layout = scene.layout ?? (n <= 3 ? "fan" : "grid");
  const focus = scene.focus;
  const lift = focus !== undefined ? ramp(Math.round(fps * 0.8), Math.round(fps * 0.35)) : 0;

  const tile = (i: number, w: number, h: number, extra: React.CSSProperties) => {
    const it = items[i];
    const media = typeof it.media === "string" ? { src: it.media } : it.media;
    const isFocus = focus === i;
    const dim = focus !== undefined && !isFocus ? 1 - 0.45 * lift : 1;
    const a = arrive(stagger(i, fps, 85), base * 1.2, "pop", { from: 0.7, rotate: i % 2 ? 10 : -10 });
    return (
      <div key={i} style={{ position: "absolute", width: w, height: h, zIndex: isFocus ? 10 : i, ...extra }}>
        <div style={{ ...a, width: "100%", height: "100%", borderRadius: base * 0.34, overflow: "hidden",
          transform: `${a.transform} scale(${isFocus ? 1 + 0.12 * lift : 1})`,
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          filter: [a.filter, dim < 1 ? `brightness(${dim.toFixed(3)})` : ""].filter(Boolean).join(" ") || undefined,
          background: theme.surface }}>
          <Media media={{ kenBurns: 0.08, ...media }} />
          {it.label ? (
            <span style={{ position: "absolute", left: base * 0.2, bottom: base * 0.2, background: "#FFFFFF",
              color: "#0A0A0B", borderRadius: 99, padding: `${base * 0.06}px ${base * 0.2}px`,
              fontFamily: fonts.body, fontSize: base * 0.3, fontWeight: WEIGHTS.bold }}>{it.label}</span>
          ) : null}
        </div>
      </div>
    );
  };

  let tiles: React.ReactNode;
  const cx = width / 2;
  const cy = height * 0.44;
  if (layout === "fan") {
    const w = width * (n <= 2 ? 0.44 : 0.36);
    const h = w * 1.3;
    const spread = (width * 0.78 - w) / Math.max(1, n - 1);
    tiles = items.map((_, i) => {
      const k = i - (n - 1) / 2;
      return tile(i, w, h, { left: cx - w / 2 + k * Math.min(spread, w * 0.58), top: cy - h / 2 + Math.abs(k) * base * 0.5,
        transform: `rotate(${k * 6}deg)`, transformOrigin: "50% 100%" });
    });
  } else if (layout === "stack") {
    const w = width * 0.62;
    const h = w * 1.2;
    const per = Math.max(1, Math.floor(durationInFrames / n));
    tiles = items.map((_, i) => {
      const tossed = Math.max(0, Math.min(1, (frame - (i + 1) * per + 6) / 8));
      const r = [-4, 3, -2, 5, -3, 2][i];
      return tile(i, w, h, { left: cx - w / 2 + tossed * width, top: cy - h / 2,
        transform: `rotate(${r + tossed * 24}deg)`, zIndex: n - i, opacity: 1 - tossed * 0.3 });
    }).reverse();
  } else {
    const cols = n <= 4 ? 2 : 3;
    const rows = Math.ceil(n / cols);
    const gap = base * 0.3;
    const w = (width * 0.88 - gap * (cols - 1)) / cols;
    const h = w * (cols === 2 ? 1.15 : 1.3);
    const top = cy - (rows * h + (rows - 1) * gap) / 2;
    tiles = items.map((_, i) => tile(i, w, h, {
      left: width * 0.06 + (i % cols) * (w + gap), top: top + Math.floor(i / cols) * (h + gap) }));
  }

  return (
    <AbsoluteFill>
      {tiles}
      {scene.rich ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center",
          padding: `${base * 2.1}px ${base * 0.7}px` }}>
          <RichCaption scene={scene} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
