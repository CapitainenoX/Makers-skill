import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { Media } from "../components/Media";
import { RichCaption } from "../components/Stage";
import { useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

/** A camera move into a capture: the whole screenshot first, then a smooth push onto
 *  the detail at (x, y) while everything else dims under a spotlight. The single most
 *  useful move for a screen recording — it does the pointing for you. */
export const Focus: React.FC<SceneProps<"focus">> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const kind = scene.frame ?? "card";
  const zoom = Math.max(1, scene.magnify ?? 2.2);
  const start = Math.round((scene.at ?? 0.35) * fps);
  const move = interpolate(frame, [start, start + Math.round(fps * 0.9)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const s = 1 + (zoom - 1) * move;
  const full = kind === "full";
  const W = full ? width : width * 0.86;
  const H = full ? height : W * 0.66;
  // translate so (x, y) of the source ends up at the centre of the window
  const tx = (0.5 - scene.x) * W * (s - 1) / s;
  const ty = (0.5 - scene.y) * H * (s - 1) / s;
  const spot = move;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: base * 0.8 }}>
      <div style={{ ...(full ? {} : arrive(0, base * 0.8, "snap", { from: 0.94 })), position: full ? "absolute" : "relative",
        inset: full ? 0 : undefined, width: W, height: H, borderRadius: full ? 0 : base * 0.4, overflow: "hidden",
        boxShadow: full ? "none" : `${theme.shadowStrong}, ${theme.shadowSoft}`, background: theme.surface }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${s.toFixed(4)}) translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`,
          transformOrigin: "50% 50%" }}>
          <Media media={scene.media} />
        </div>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(circle at 50% 50%, transparent ${(26 - 6 * spot).toFixed(1)}%, rgba(0,0,0,${(0.5 * spot).toFixed(3)}) ${(46 - 6 * spot).toFixed(1)}%)` }} />
        {scene.label && move > 0.9 ? (
          <div style={{ position: "absolute", left: "50%", top: "50%",
            ...arrive(start + Math.round(fps * 0.9), base * 0.3, "pop", { centered: true, from: 0.6 }),
            marginTop: H * 0.2, background: theme.accent, color: theme.onAccent, whiteSpace: "nowrap",
            borderRadius: 99, padding: `${base * 0.12}px ${base * 0.32}px`, fontFamily: fonts.body,
            fontSize: base * 0.4, fontWeight: WEIGHTS.bold, boxShadow: theme.shadowStrong }}>
            {scene.label}
          </div>
        ) : null}
      </div>
      {full ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: `${base * 2}px ${base * 0.7}px`,
          background: "linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 40%)" }}>
          <RichCaption scene={scene} inverse />
        </AbsoluteFill>
      ) : <RichCaption scene={scene} />}
    </AbsoluteFill>
  );
};
