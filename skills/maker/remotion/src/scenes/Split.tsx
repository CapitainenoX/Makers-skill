import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { useAnim } from "../motion";
import { Media } from "../components/Media";
import { Rich } from "../components/Rich";
import { Glyph } from "../components/Glyph";
import { WEIGHTS } from "../theme";
import { inkOn, isDark } from "../color";
import type { Half } from "../deck";
import type { SceneProps } from "./types";

/** The frame cut in two: footage against a sentence, a problem against its fix, two
 *  tools side by side. The halves open from the divider outward, and the divider itself
 *  draws across. On a vertical canvas the default is two rows. */
export const Split: React.FC<SceneProps<"split">> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const rows = (scene.dir ?? (height > width ? "rows" : "columns")) === "rows";
  const open = interpolate(frame, [0, Math.round(fps * 0.45)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const line = interpolate(frame, [4, 4 + Math.round(fps * 0.4)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  const half = (h: Half, which: 0 | 1) => {
    const bg = h.bg ?? (which === 0 ? theme.bg : theme.panel);
    const dark = isDark(bg);
    // each half is clipped open from the divider toward its outer edge
    const c = ((1 - open) * 100).toFixed(2);
    const clip = rows
      ? which === 0 ? `inset(${c}% 0 0 0)` : `inset(0 0 ${c}% 0)`
      : which === 0 ? `inset(0 0 0 ${c}%)` : `inset(0 ${c}% 0 0)`;
    const pos: React.CSSProperties = rows
      ? { left: 0, right: 0, top: which === 0 ? 0 : "50%", height: "50%" }
      : { top: 0, bottom: 0, left: which === 0 ? 0 : "50%", width: "50%" };
    return (
      <div style={{ position: "absolute", ...pos, background: bg, clipPath: clip, overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: base * 0.4, padding: base * 0.7 }}>
        {h.media ? (
          <div style={{ position: "absolute", inset: 0 }}><Media media={h.media} /></div>
        ) : null}
        {h.media && (h.text || h.label) ? (
          <div style={{ position: "absolute", inset: 0, background:
            "linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 55%)" }} />
        ) : null}
        {h.icon ? (
          <div style={arrive(6 + which * 5, base * 0.5, "pop", { from: 0.5 })}>
            <Glyph name={h.icon} size={base * 1.8} color={dark ? "#FFFFFF" : theme.text} surface={bg} />
          </div>
        ) : null}
        {h.text ? (
          <div style={{ position: "relative", display: "flex", justifyContent: "center", width: "100%",
            marginTop: h.media ? "auto" : 0 }}>
            <Rich text={h.text} size={1.25} delay={8 + which * 6} inverse={dark || !!h.media} maxWidth="92%" />
          </div>
        ) : null}
        {h.label ? (
          <div style={{ ...arrive(10 + which * 6, base * 0.3, "snap"), position: h.media ? "absolute" : "relative",
            top: h.media ? base * 0.6 : undefined, left: h.media ? base * 0.6 : undefined,
            fontFamily: fonts.body, fontSize: base * 0.44, fontWeight: WEIGHTS.bold, letterSpacing: "0.06em",
            textTransform: "uppercase", color: h.media ? "#0A0A0B" : dark ? "#FFFFFF" : theme.muted,
            background: h.media ? "#FFFFFF" : "transparent", borderRadius: 99,
            padding: h.media ? `${base * 0.1}px ${base * 0.26}px` : 0 }}>
            {h.label}
          </div>
        ) : null}
      </div>
    );
  };

  const divider = scene.divider ?? theme.accent;
  return (
    <AbsoluteFill>
      {half(scene.a, 0)}
      {half(scene.b, 1)}
      <div style={{ position: "absolute", background: divider,
        ...(rows
          ? { left: `${(1 - line) * 50}%`, right: `${(1 - line) * 50}%`, top: "50%", height: Math.max(4, base * 0.08), transform: "translateY(-50%)" }
          : { top: `${(1 - line) * 50}%`, bottom: `${(1 - line) * 50}%`, left: "50%", width: Math.max(4, base * 0.08), transform: "translateX(-50%)" }) }} />
      <div style={{ position: "absolute", left: "50%", top: "50%",
        ...arrive(10, 0, "pop", { centered: true, from: 0 }),
        width: base * 1.1, height: base * 1.1, borderRadius: "50%", background: divider,
        display: "flex", alignItems: "center", justifyContent: "center", boxShadow: theme.shadowStrong }}>
        <Glyph name="arrow" size={base * 0.6} color={inkOn(divider)} />
      </div>
    </AbsoluteFill>
  );
};
