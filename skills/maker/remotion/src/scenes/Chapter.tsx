import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { useAnim } from "../motion";
import { alpha } from "../color";
import { fitSize } from "../fit";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

/** A chapter wall: the frame inverts (a dark slab on a light deck), a huge number slides
 *  up, the title follows, a rule draws under it. Resets the viewer's attention clock —
 *  use it once or twice in a long short, never twice in a row. */
export const Chapter: React.FC<SceneProps<"chapter">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const invert = scene.invert !== false;
  const bg = invert ? theme.panel : "transparent";
  const fg = invert ? theme.onPanel : theme.text;
  const num = scene.number ?? "";
  const rule = interpolate(frame, [10, 10 + Math.round(fps * 0.5)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const slab = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const titleSize = fitSize(scene.title, { family: fonts.display, weight: fonts.displayWeight,
    size: base * 1.7, tracking: fonts.displayTracking, maxWidth: width * 0.84, upper: fonts.displayUpper });

  return (
    <AbsoluteFill>
      {invert ? (
        <AbsoluteFill style={{ background: bg, clipPath: `inset(${((1 - slab) * 50).toFixed(2)}% 0 ${((1 - slab) * 50).toFixed(2)}% 0)` }} />
      ) : null}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start",
        padding: `0 ${width * 0.08}px`, gap: base * 0.3 }}>
        {num ? (
          <div style={{ overflow: "hidden", lineHeight: 0.9 }}>
            <div style={{ ...arrive(3, base * 2.5, "snap", { fade: false, from: 1 }),
              fontFamily: fonts.display, fontWeight: fonts.displayWeight, fontSize: base * 4.2,
              letterSpacing: `${fonts.displayTracking}em`, color: invert ? theme.accent === theme.text ? fg : theme.accent : theme.accentInk,
              WebkitTextStroke: invert && theme.accent === theme.text ? `${base * 0.04}px ${fg}` : undefined,
              WebkitTextFillColor: invert && theme.accent === theme.text ? "transparent" : undefined }}>
              {num}
            </div>
          </div>
        ) : null}
        <div style={{ ...arrive(8, base * 0.8, "snap"), fontFamily: fonts.display, fontSize: titleSize,
          fontWeight: fonts.displayWeight, letterSpacing: `${fonts.displayTracking}em`,
          textTransform: fonts.displayUpper ? "uppercase" : undefined, lineHeight: fonts.displayLeading,
          color: fg, whiteSpace: "nowrap" }}>
          {scene.title}
        </div>
        <div style={{ height: Math.max(3, base * 0.07), width: `${rule * 38}%`,
          background: invert ? alpha(fg, 0.5) : theme.accent, borderRadius: 99 }} />
        {scene.sub ? (
          <div style={{ ...arrive(14, base * 0.4, "smooth"), fontFamily: fonts.serif, fontStyle: "italic",
            fontSize: base * 0.72, color: invert ? alpha(fg, 0.7) : theme.muted, fontWeight: WEIGHTS.regular }}>
            {scene.sub}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
