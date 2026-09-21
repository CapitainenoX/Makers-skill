import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { Device } from "../components/Device";
import { enter, rise } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** A source with pointers that pop onto it. Cheaper and far more legible than tracking
 *  a cursor: the mark lands where the eye should already be going. */
export const Annotate: React.FC<SceneProps<"annotate">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const kind = scene.frame ?? "browser";
  const w = width * (scene.scale ?? (kind === "phone" ? 0.46 : 0.84));
  const p = enter(frame, fps, scene.lines ? 4 : 0, "snap");

  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "center",
        gap: base * 0.7,
        padding: `${base * 1.6}px ${base * 0.8}px`,
      }}
    >
      {scene.lines ? (
        <TypeStack lines={scene.lines} theme={theme} base={base} font={font} />
      ) : null}

      <div style={{ ...rise(p, base * 0.5), position: "relative" }}>
        <Device kind={kind} media={scene.media} width={w} theme={theme} radius={base} />

        {scene.marks.map((m, i) => {
          const q = enter(frame, fps, Math.round((m.at ?? 0.5 + i * 0.35) * fps), "pop");
          if (q <= 0.001) return null;
          const size = (m.size ?? 0.14) * w;
          const kindMark = m.kind ?? "ring";
          const common: React.CSSProperties = {
            position: "absolute",
            left: `${m.x * 100}%`,
            top: `${m.y * 100}%`,
            transform: `translate(-50%,-50%) scale(${0.6 + q * 0.4})`,
            opacity: Math.min(1, q * 1.6),
          };
          return (
            <div key={i} style={common}>
              {kindMark === "ring" ? (
                <div style={{ width: size, height: size, borderRadius: 999,
                  border: `${Math.max(3, size * 0.07)}px solid ${theme.accent}`,
                  boxShadow: `0 0 0 ${size * 0.18}px ${theme.accent}22` }} />
              ) : kindMark === "box" ? (
                <div style={{ width: size * 1.8, height: size * 0.8,
                  borderRadius: size * 0.16,
                  border: `${Math.max(3, size * 0.06)}px solid ${theme.accent}`,
                  background: `${theme.accent}14` }} />
              ) : kindMark === "dot" ? (
                <div style={{ width: size * 0.4, height: size * 0.4, borderRadius: 999,
                  background: theme.accent, boxShadow: `0 0 0 ${size * 0.22}px ${theme.accent}26` }} />
              ) : (
                <svg width={size * 1.4} height={size * 1.4} viewBox="0 0 100 100">
                  <path d="M12 12 L74 62 M74 62 L48 60 M74 62 L72 36" fill="none"
                    stroke={theme.accent} strokeWidth="11" strokeLinecap="round"
                    strokeLinejoin="round" />
                </svg>
              )}
              {m.label ? (
                <div style={{ position: "absolute", left: "50%", top: "104%",
                  transform: "translateX(-50%)", whiteSpace: "nowrap",
                  background: theme.accent, color: "#FFFFFF",
                  borderRadius: 999, padding: `${base * 0.12}px ${base * 0.26}px`,
                  fontFamily: font, fontSize: base * 0.3, fontWeight: WEIGHTS.bold }}>
                  {m.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
