import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { Media } from "../components/Media";
import { RichCaption } from "../components/Stage";
import { Glyph } from "../components/Glyph";
import { useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

/** Two captures of the same thing, one over the other, and a handle that sweeps across to
 *  reveal the difference — it overshoots, comes back, and settles past the middle. The
 *  proof shot for a redesign, an upscale, a cleanup, a fix. */
export const BeforeAfter: React.FC<SceneProps<"beforeAfter">> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const full = scene.frame === "full";
  const W = full ? width : width * 0.86;
  const H = full ? height : W * 1.1;
  const x = interpolate(frame, [6, 6 + Math.round(fps * 0.7), 6 + Math.round(fps * 1.2), 6 + Math.round(fps * 1.6)],
    [0.96, 0.12, 0.62, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const [la, lb] = scene.labels ?? ["Before", "After"];
  const tag = (text: string, side: "l" | "r") => (
    <span style={{ position: "absolute", top: base * 0.4, [side === "l" ? "left" : "right"]: base * 0.4,
      background: side === "l" ? "rgba(0,0,0,0.6)" : theme.accent, color: side === "l" ? "#FFFFFF" : theme.onAccent,
      borderRadius: 99, padding: `${base * 0.08}px ${base * 0.26}px`, fontFamily: fonts.body, fontSize: base * 0.34,
      fontWeight: WEIGHTS.bold, letterSpacing: "0.04em", textTransform: "uppercase" } as React.CSSProperties}>{text}</span>
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: base * 0.8 }}>
      <div style={{ ...(full ? {} : arrive(0, base * 0.8, "snap", { from: 0.94 })), position: full ? "absolute" : "relative",
        inset: full ? 0 : undefined, width: W, height: H, borderRadius: full ? 0 : base * 0.4, overflow: "hidden",
        boxShadow: full ? "none" : `${theme.shadowStrong}, ${theme.shadowSoft}` }}>
        <div style={{ position: "absolute", inset: 0 }}><Media media={scene.after} /></div>
        {tag(lb, "r")}
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${((1 - x) * 100).toFixed(2)}% 0 0)` }}>
          <Media media={scene.before} />
          {tag(la, "l")}
        </div>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${x * 100}%`, width: Math.max(3, base * 0.06),
          background: "#FFFFFF", transform: "translateX(-50%)", boxShadow: "0 0 18px rgba(0,0,0,0.35)" }} />
        <div style={{ position: "absolute", top: "50%", left: `${x * 100}%`, transform: "translate(-50%,-50%)",
          width: base * 1.05, height: base * 1.05, borderRadius: "50%", background: "#FFFFFF",
          boxShadow: theme.shadowStrong, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <div style={{ transform: "scaleX(-1)" }}><Glyph name="arrow" size={base * 0.36} color="#0A0A0B" /></div>
          <Glyph name="arrow" size={base * 0.36} color="#0A0A0B" />
        </div>
      </div>
      {full ? null : <RichCaption scene={scene} />}
    </AbsoluteFill>
  );
};
