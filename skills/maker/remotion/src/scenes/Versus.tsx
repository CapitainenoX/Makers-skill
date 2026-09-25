import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useAnim, enter } from "../motion";
import { Chip } from "../components/Chip";
import { Media } from "../components/Media";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { RichCaption } from "../components/Stage";
import type { Side } from "../deck";
import type { SceneProps } from "./types";

/** Two contenders face off: each side slides in from its edge, then the VS badge slams
 *  down between them with a shake. The winner (`accent: true`) keeps the colour. */
export const Versus: React.FC<SceneProps<"versus">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const slamAt = 9;
  const slam = enter(frame, fps, slamAt, "slam");
  const shakeT = frame - slamAt - 3;
  const shake = shakeT >= 0 && shakeT < 8 ? Math.sin(shakeT * 2.6) * base * 0.12 * (1 - shakeT / 8) : 0;
  const colW = width * 0.42;

  const side = (s: Side, i: 0 | 1) => (
    <div style={{ ...arrive(i * 3, width * 0.5, "snap", { dir: i === 0 ? "right" : "left" }),
      width: colW, display: "flex", flexDirection: "column", alignItems: "center", gap: base * 0.3 }}>
      {s.media ? (
        <div style={{ width: colW * 0.9, aspectRatio: "1", borderRadius: base * 0.4, overflow: "hidden",
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          outline: s.accent ? `${base * 0.08}px solid ${theme.accent}` : "none" }}>
          <Media media={s.media} />
        </div>
      ) : (
        <Chip icon={s.icon ?? "cube"} size={colW * 0.7} />
      )}
      <span style={{ fontFamily: fonts.display, fontWeight: fonts.displayWeight, fontSize: base * 1.15,
        letterSpacing: `${fonts.displayTracking}em`, textTransform: fonts.displayUpper ? "uppercase" : undefined,
        color: s.accent ? theme.accentInk : theme.text, textAlign: "center", lineHeight: 1 }}>{s.label}</span>
      {s.sub ? <span style={{ fontFamily: fonts.body, fontSize: base * 0.5, color: theme.muted,
        textAlign: "center" }}>{s.sub}</span> : null}
      {(s.items ?? []).map((it, k) => (
        <span key={k} style={{ ...arrive(16 + k * 3 + i * 2, base * 0.3, "snap"), fontFamily: fonts.body,
          fontSize: base * 0.56, fontWeight: WEIGHTS.semibold, color: s.accent ? theme.text : theme.muted,
          background: s.accent ? alpha(theme.accent, 0.1) : alpha(theme.muted, 0.1), borderRadius: 99,
          padding: `${base * 0.1}px ${base * 0.32}px` }}>{it}</span>
      ))}
    </div>
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: base * 0.9,
      transform: `translateX(${shake.toFixed(2)}px)` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: width * 0.08,
        position: "relative" }}>
        {side(scene.left, 0)}
        {side(scene.right, 1)}
        <div style={{ position: "absolute", left: "50%", top: colW * 0.35,
          transform: `translate(-50%,-50%) scale(${(2.4 - 1.4 * slam).toFixed(4)}) rotate(${(-8 * slam).toFixed(2)}deg)`,
          opacity: Math.min(1, slam * 3), background: theme.text, color: theme.bg, borderRadius: base * 0.24,
          padding: `${base * 0.12}px ${base * 0.3}px`, fontFamily: fonts.display,
          fontWeight: fonts.displayWeight, fontSize: base * 1.1, letterSpacing: "-0.02em",
          textTransform: "uppercase", boxShadow: theme.shadowStrong }}>
          {scene.badge ?? "vs"}
        </div>
      </div>
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
