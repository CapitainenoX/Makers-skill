import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { enter, stagger, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { Glyph } from "../components/Glyph";
import { RichCaption } from "../components/Stage";
import type { SceneProps } from "./types";

/** Two stacked columns — before/after, them/us. The left side is struck through as the
 *  right one lands and carries the accent, so the eye lands where the argument does. */
export const Compare: React.FC<SceneProps<"compare">> = ({ scene }) => {
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;

  const col = (side: "left" | "right", delay: number) => {
    const data = scene[side];
    const win = side === "right";
    return (
      <div style={{ ...arrive(delay, base * 1.2, "snap", { dir: win ? "left" : "right" }),
        background: win ? theme.surface : "transparent",
        border: win ? "none" : `${Math.max(2, base * 0.035)}px dashed ${alpha(theme.muted, 0.35)}`,
        borderRadius: base * 0.46, padding: base * 0.62,
        boxShadow: win ? `${theme.shadowStrong}, ${theme.shadowSoft}` : "none",
        display: "flex", flexDirection: "column", gap: base * 0.26 }}>
        <div style={{ fontFamily: fonts.display, fontSize: base * 0.82, fontWeight: fonts.displayWeight,
          letterSpacing: `${fonts.displayTracking}em`, textTransform: fonts.displayUpper ? "uppercase" : undefined,
          color: win ? theme.accentInk : theme.muted }}>
          {data.label}
        </div>
        {data.items.map((it, i) => {
          const d = delay + 4 + stagger(i, fps, 70);
          const strike = win ? 0 : interpolate(frame, [d + 14, d + 24], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: base * 0.24,
              opacity: Math.min(1, enter(frame, fps, d, "smooth") * 1.5) }}>
              <Glyph name={win ? "check" : "cross"} size={base * 0.42}
                color={win ? theme.accent : alpha(theme.muted, 0.8)} />
              <span style={{ position: "relative", fontFamily: fonts.body, fontSize: base * 0.56,
                fontWeight: WEIGHTS.medium, lineHeight: 1.25, color: win ? theme.text : theme.muted }}>
                {it}
                {!win ? (
                  <span style={{ position: "absolute", left: 0, top: "54%", height: Math.max(2, base * 0.04),
                    width: `${strike * 100}%`, background: alpha(theme.muted, 0.8) }} />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column",
      gap: base * 0.4, padding: `${base * 1.6}px ${base * 0.7}px` }}>
      {col("left", 0)}
      {col("right", 10)}
      <div style={{ alignSelf: "center" }}><RichCaption scene={scene} /></div>
    </AbsoluteFill>
  );
};
