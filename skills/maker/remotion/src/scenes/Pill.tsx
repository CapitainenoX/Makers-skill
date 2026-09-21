import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { enter, rise } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** A soft raised capsule holding a name — the "product card" beat.
 *  Two shadows, not one: a wide soft one for depth, a tight one for contact. */
export const Pill: React.FC<SceneProps<"pill">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps, 0, "pop");
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "center",
        gap: base * 0.9,
        padding: `${base * 1.6}px ${base * 0.8}px`,
      }}
    >
      <div
        style={{
          ...rise(p, base * 0.5),
          background: theme.surface,
          borderRadius: 9999,
          padding: `${base * 0.46}px ${base * 1.0}px`,
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          fontFamily: font,
          fontSize: base * 1.25,
          fontWeight: WEIGHTS.black,
          letterSpacing: "-0.04em",
          color: theme.text,
          whiteSpace: "nowrap",
        }}
      >
        {scene.label}
      </div>
      {scene.lines ? (
        <TypeStack lines={scene.lines} theme={theme} base={base} font={font} delay={6} />
      ) : null}
      {scene.sub ? (
        <div
          style={{
            ...rise(enter(frame, fps, 10, "smooth"), base * 0.3),
            fontFamily: font,
            fontSize: base * 0.5,
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
