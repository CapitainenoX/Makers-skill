import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { Device } from "../components/Device";
import { RichCaption } from "../components/Stage";
import { enter, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** A source with pointers that pop onto it. Cheaper and far more legible than tracking
 *  a cursor: the mark lands where the eye should already be going. Rings and boxes draw
 *  themselves; a soft pulse keeps them alive after they land. */
export const Annotate: React.FC<SceneProps<"annotate">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const kind = scene.frame ?? "browser";
  const w = width * (scene.scale ?? (kind === "phone" ? 0.46 : 0.84));

  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center",
      gap: base * 0.7, padding: `${base * 1.6}px ${base * 0.8}px` }}>
      {scene.lines ? <TypeStack lines={scene.lines} /> : null}
      <div style={{ ...arrive(scene.lines ? 4 : 0, base * 0.8, "snap", { from: 0.92 }), position: "relative" }}>
        <Device kind={kind} media={scene.media} width={w} theme={theme} radius={base} />
        {scene.marks.map((m, i) => {
          const start = Math.round((m.at ?? 0.5 + i * 0.35) * fps);
          const q = enter(frame, fps, start, "pop");
          if (frame < start) return null;
          const draw = interpolate(frame, [start, start + Math.round(fps * 0.32)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const pulse = 1 + 0.06 * Math.max(0, Math.sin((frame - start) / fps * 5 - 1.5));
          const size = (m.size ?? 0.14) * w;
          const kindMark = m.kind ?? "ring";
          const sw = Math.max(3, size * 0.07);
          return (
            <div key={i} style={{ position: "absolute", left: `${m.x * 100}%`, top: `${m.y * 100}%`,
              transform: `translate(-50%,-50%) scale(${((0.7 + q * 0.3) * pulse).toFixed(4)})`,
              opacity: Math.min(1, q * 2) }}>
              {kindMark === "ring" ? (
                <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", display: "block" }}>
                  <circle cx="50" cy="50" r="46" fill={alpha(theme.accent, 0.1)} stroke={theme.accent}
                    strokeWidth={(sw / size) * 100} pathLength={1} strokeDasharray="1 1"
                    strokeDashoffset={1 - draw} transform="rotate(-90 50 50)" strokeLinecap="round" />
                </svg>
              ) : kindMark === "box" ? (
                <svg width={size * 1.8} height={size * 0.8} viewBox="0 0 180 80" style={{ overflow: "visible", display: "block" }}>
                  <rect x="2" y="2" width="176" height="76" rx="14" fill={alpha(theme.accent, 0.08)}
                    stroke={theme.accent} strokeWidth={(sw / size) * 100} pathLength={1}
                    strokeDasharray="1 1" strokeDashoffset={1 - draw} />
                </svg>
              ) : kindMark === "dot" ? (
                <div style={{ width: size * 0.4, height: size * 0.4, borderRadius: 999,
                  background: theme.accent, boxShadow: `0 0 0 ${size * 0.22 * pulse}px ${alpha(theme.accent, 0.22)}` }} />
              ) : (
                <svg width={size * 1.4} height={size * 1.4} viewBox="0 0 100 100" style={{ display: "block" }}>
                  <path d="M12 12 L74 62 M74 62 L48 60 M74 62 L72 36" fill="none"
                    stroke={theme.accent} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"
                    pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
                </svg>
              )}
              {m.label ? (
                <div style={{ position: "absolute", left: "50%", top: "106%",
                  transform: `translateX(-50%) scale(${Math.min(1, draw * 1.3)})`, whiteSpace: "nowrap",
                  background: theme.accent, color: theme.onAccent, borderRadius: 999,
                  padding: `${base * 0.12}px ${base * 0.28}px`, fontFamily: fonts.body,
                  fontSize: base * 0.32, fontWeight: WEIGHTS.bold, boxShadow: theme.shadowStrong }}>
                  {m.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
