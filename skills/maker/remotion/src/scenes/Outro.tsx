import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { Glyph } from "../components/Glyph";
import { enter, rise } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** The last frame should send the viewer somewhere, not just stop. */
export const Outro: React.FC<SceneProps<"outro">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps, 8, "pop");
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "center",
        gap: base * 0.8,
        padding: `${base * 1.6}px ${base * 0.8}px`,
      }}
    >
      <TypeStack lines={scene.lines} theme={theme} base={base} font={font} />
      {scene.handle ? (
        <div
          style={{
            ...rise(p, base * 0.4),
            display: "flex",
            alignItems: "center",
            gap: base * 0.28,
            background: theme.surface,
            borderRadius: 9999,
            padding: `${base * 0.3}px ${base * 0.6}px`,
            boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          }}
        >
          <Glyph name="sparkle" size={base * 0.55} color={theme.accent} />
          <span
            style={{
              fontFamily: font,
              fontSize: base * 0.58,
              fontWeight: WEIGHTS.bold,
              letterSpacing: "-0.02em",
              color: theme.text,
            }}
          >
            {scene.handle}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
