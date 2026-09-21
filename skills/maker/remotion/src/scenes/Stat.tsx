import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, rise } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** One enormous number. The whole frame is the number; everything else whispers. */
export const Stat: React.FC<SceneProps<"stat">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps, 0, "pop");
  const q = enter(frame, fps, 6, "smooth");
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "center",
        gap: base * 0.25,
        padding: `${base * 1.6}px ${base * 0.7}px`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          ...rise(p, base * 0.6),
          fontFamily: font,
          fontSize: base * 3.1,
          fontWeight: WEIGHTS.black,
          letterSpacing: "-0.055em",
          lineHeight: 0.9,
          color: theme.accent,
        }}
      >
        {scene.value}
      </div>
      {scene.label ? (
        <div
          style={{
            ...rise(q, base * 0.35),
            fontFamily: font,
            fontSize: base * 0.95,
            fontWeight: WEIGHTS.bold,
            letterSpacing: "-0.03em",
            color: theme.text,
          }}
        >
          {scene.label}
        </div>
      ) : null}
      {scene.sub ? (
        <div
          style={{
            ...rise(enter(frame, fps, 11, "smooth"), base * 0.3),
            fontFamily: font,
            fontSize: base * 0.45,
            fontWeight: WEIGHTS.medium,
            color: theme.muted,
          }}
        >
          {scene.sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
