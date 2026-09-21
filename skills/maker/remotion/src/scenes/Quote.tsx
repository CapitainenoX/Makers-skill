import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, rise } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Someone else's words, given room. The oversized quote mark does the work so the
 *  type can stay the same size as everything else. */
export const Quote: React.FC<SceneProps<"quote">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps, 0, "snap");
  const q = enter(frame, fps, 9, "smooth");
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "flex-start",
        gap: base * 0.4,
        padding: `${base * 1.8}px ${base * 0.9}px`,
      }}
    >
      <div style={{ ...rise(p, base * 0.4), fontFamily: font, fontSize: base * 2.6,
        fontWeight: WEIGHTS.black, color: theme.accent, lineHeight: 0.7 }}>
        &ldquo;
      </div>
      <div style={{ ...rise(p, base * 0.45), fontFamily: font, fontSize: base * 1.02,
        fontWeight: WEIGHTS.bold, letterSpacing: "-0.03em", lineHeight: 1.18,
        color: theme.text, maxWidth: "96%" }}>
        {scene.text}
      </div>
      {scene.author ? (
        <div style={{ ...rise(q, base * 0.3), display: "flex", alignItems: "baseline",
          gap: base * 0.2, fontFamily: font }}>
          <span style={{ fontSize: base * 0.48, fontWeight: WEIGHTS.semibold, color: theme.text }}>
            {scene.author}
          </span>
          {scene.role ? (
            <span style={{ fontSize: base * 0.38, fontWeight: WEIGHTS.regular, color: theme.muted }}>
              {scene.role}
            </span>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
