import React from "react";
import { Easing, interpolate, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { Glyph } from "../components/Glyph";
import { stagger, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import type { SceneProps } from "./types";

type Action = { icon?: string; label?: string; accent?: boolean };

const DEFAULTS: Action[] = [
  { icon: "thumbsUp", label: "Like" },
  { icon: "bell", label: "Subscribe", accent: true },
  { icon: "comment", label: "Comment" },
];

/** The ask. A short that never asks gets watched and forgotten; the action has to be
 *  named, on screen, while the payoff is still warm. Each button lands, then the main one
 *  is pressed — a ring ripples out and the bell rings. The press is what the eye follows. */
export const Cta: React.FC<SceneProps<"cta">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts } = kit;
  const items: Action[] = scene.actions?.length ? scene.actions : DEFAULTS;
  const size = width * (scene.size ?? 0.19);

  return (
    <Stage scene={scene}>
      <div style={{ display: "flex", gap: size * 0.34, alignItems: "flex-start" }}>
        {items.map((it, i) => {
          const delay = stagger(i, fps, 110);
          const pressAt = delay + Math.round(fps * 0.55);
          const pulse = interpolate(frame, [pressAt, pressAt + 4, pressAt + 12],
            [1, 0.88, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.inOut(Easing.quad) });
          const ripple = interpolate(frame, [pressAt + 3, pressAt + 3 + Math.round(fps * 0.5)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const highlight = it.accent ?? false;
          const ring = highlight ? Math.sin(Math.max(0, frame - pressAt) / 2) * 14 *
            Math.max(0, 1 - Math.max(0, frame - pressAt) / (fps * 0.6)) : 0;
          return (
            <div key={i} style={{ ...arrive(delay, size * 0.5, "pop", { from: 0.4 }),
              display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.16 }}>
              <div style={{ position: "relative", width: size, height: size }}>
                {highlight && frame >= pressAt + 3 ? (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                    border: `${Math.max(2, size * 0.03)}px solid ${theme.accent}`,
                    transform: `scale(${1 + ripple * 0.6})`, opacity: 1 - ripple }} />
                ) : null}
                <div style={{ width: size, height: size, borderRadius: "50%", transform: `scale(${pulse})`,
                  background: highlight ? theme.accent : theme.surface,
                  boxShadow: highlight ? `0 ${size * 0.1}px ${size * 0.3}px ${alpha(theme.accent, 0.35)}`
                    : `${theme.shadowStrong}, ${theme.shadowSoft}`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ transform: `rotate(${ring.toFixed(2)}deg)`, transformOrigin: "50% 15%" }}>
                    <Glyph name={it.icon ?? DEFAULTS[i % DEFAULTS.length].icon} size={size * 0.5}
                      color={highlight ? theme.onAccent : theme.text}
                      surface={highlight ? theme.accent : theme.surface} />
                  </div>
                </div>
              </div>
              <span style={{ fontFamily: fonts.body, fontSize: size * 0.2, fontWeight: WEIGHTS.bold,
                letterSpacing: "-0.02em", color: highlight ? theme.text : theme.muted, whiteSpace: "nowrap" }}>
                {it.label ?? DEFAULTS[i % DEFAULTS.length].label}
              </span>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};
