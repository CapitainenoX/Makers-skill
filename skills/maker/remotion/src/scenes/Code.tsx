import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayoutWidth } from "../layout";
import { enter, rise, stagger } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

const MONO = '"SF Mono", "JetBrains Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';

/** A terminal card whose lines type on one after another. Proof beats claims. */
export const Code: React.FC<SceneProps<"code">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const width = useLayoutWidth();
  const p = enter(frame, fps, 0, "snap");
  const prompt = scene.prompt ?? "$";
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `0 ${base * 0.7}px` }}>
      <div
        style={{
          ...rise(p, base * 0.5),
          width: width * 0.84,
          borderRadius: base * 0.42,
          background: theme.bg === "#F4F3F1" ? "#15161A" : theme.surface,
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: base * 0.16,
            padding: `${base * 0.3}px ${base * 0.36}px`,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span key={c} style={{ width: base * 0.17, height: base * 0.17, borderRadius: 999, background: c }} />
          ))}
          {scene.title ? (
            <span
              style={{
                marginLeft: base * 0.2,
                fontFamily: font,
                fontSize: base * 0.3,
                fontWeight: WEIGHTS.medium,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {scene.title}
            </span>
          ) : null}
        </div>
        <div style={{ padding: base * 0.44, display: "flex", flexDirection: "column", gap: base * 0.18 }}>
          {scene.lines.map((l, i) => {
            const q = enter(frame, fps, 5 + stagger(i, fps, 140), "smooth");
            const isCmd = l.startsWith(prompt);
            return (
              <div
                key={i}
                style={{
                  opacity: Math.min(1, q * 1.6),
                  transform: `translateX(${(1 - q) * base * 0.12}px)`,
                  fontFamily: MONO,
                  fontSize: base * 0.36,
                  lineHeight: 1.45,
                  color: isCmd ? "#E8E8E4" : "rgba(232,232,228,0.62)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {l}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
