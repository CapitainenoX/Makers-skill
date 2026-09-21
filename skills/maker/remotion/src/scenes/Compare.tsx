import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, rise, stagger } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

/** Two stacked columns — before/after, them/us. The right side arrives second
 *  and carries the accent, so the eye lands where the argument does. */
export const Compare: React.FC<SceneProps<"compare">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const col = (side: "left" | "right", delay: number) => {
    const data = scene[side];
    const accent = side === "right";
    const p = enter(frame, fps, delay, "snap");
    return (
      <div
        style={{
          ...rise(p, base * 0.45),
          flex: 1,
          background: accent ? theme.surface : "transparent",
          border: accent ? "none" : `${Math.max(2, base * 0.035)}px solid ${theme.muted}33`,
          borderRadius: base * 0.42,
          padding: base * 0.5,
          boxShadow: accent ? theme.shadowStrong : "none",
          display: "flex",
          flexDirection: "column",
          gap: base * 0.26,
        }}
      >
        <div
          style={{
            fontFamily: font,
            fontSize: base * 0.62,
            fontWeight: WEIGHTS.black,
            letterSpacing: "-0.03em",
            color: accent ? theme.accent : theme.muted,
          }}
        >
          {data.label}
        </div>
        {data.items.map((it, i) => (
          <div
            key={i}
            style={{
              opacity: Math.min(1, enter(frame, fps, delay + 4 + stagger(i, fps, 70), "smooth") * 1.5),
              fontFamily: font,
              fontSize: base * 0.44,
              fontWeight: WEIGHTS.medium,
              lineHeight: 1.3,
              color: accent ? theme.text : theme.muted,
            }}
          >
            {it}
          </div>
        ))}
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "stretch",
        flexDirection: "column",
        gap: base * 0.4,
        padding: `${base * 2}px ${base * 0.7}px`,
      }}
    >
      {col("left", 0)}
      {col("right", 8)}
    </AbsoluteFill>
  );
};
