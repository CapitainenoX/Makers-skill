import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { Glyph } from "../components/Glyph";
import { enter, rise, stagger } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

type Action = { icon?: string; label?: string; accent?: boolean };

const DEFAULTS: Action[] = [
  { icon: "thumbsUp", label: "Like" },
  { icon: "bell", label: "Subscribe", accent: true },
  { icon: "comment", label: "Comment" },
];

/** The ask. A short that never asks gets watched and forgotten; the action has to be
 *  named, on screen, while the payoff is still warm. Each button lands, then pulses once
 *  — the pulse is what the eye actually follows. */
export const Cta: React.FC<SceneProps<"cta">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const items: Action[] = scene.actions?.length ? scene.actions : DEFAULTS;
  const size = width * (scene.size ?? 0.19);

  return (
    <Stage scene={scene} theme={theme} base={base} font={font}>
      <div style={{ display: "flex", gap: size * 0.34, alignItems: "flex-start" }}>
        {items.map((it, i) => {
          const delay = stagger(i, fps, 110);
          const p = enter(frame, fps, delay, "pop");
          // one deliberate pulse after it settles, so the row does not go inert
          const pulseAt = delay + Math.round(fps * 0.55);
          const pulse = interpolate(
            frame,
            [pulseAt, pulseAt + Math.round(fps * 0.14), pulseAt + Math.round(fps * 0.34)],
            [1, 1.12, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.inOut(Easing.quad) },
          );
          const r = rise(p, size * 0.4);
          const highlight = it.accent ?? false;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column",
              alignItems: "center", gap: size * 0.16 }}>
              <div
                style={{
                  opacity: r.opacity,
                  transform: `${r.transform} scale(${pulse})`,
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: highlight ? theme.text : theme.surface,
                  boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Glyph
                  name={it.icon ?? DEFAULTS[i % DEFAULTS.length].icon}
                  size={size * 0.5}
                  color={highlight ? theme.bg : theme.text}
                />
              </div>
              <span style={{ opacity: r.opacity, fontFamily: font, fontSize: size * 0.2,
                fontWeight: WEIGHTS.bold, letterSpacing: "-0.02em",
                color: highlight ? theme.text : theme.muted, whiteSpace: "nowrap" }}>
                {it.label ?? DEFAULTS[i % DEFAULTS.length].label}
              </span>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};
