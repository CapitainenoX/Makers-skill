import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { TypeStack } from "../components/Type";
import { Glyph } from "../components/Glyph";
import { RichCaption } from "../components/Stage";
import { stagger, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Dates on a spine that draws itself downward; each event pops as the line reaches it.
 *  History, a roadmap, "how we got here" — time as a shape instead of a list. */
export const Timeline: React.FC<SceneProps<"timeline">> = ({ scene }) => {
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const d0 = scene.heading ? 8 : 2;
  const n = scene.items.length;
  const gap = 170;
  const draw = interpolate(frame, [d0, d0 + stagger(n - 1, fps, gap) + 8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const dot = base * 0.62;
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center", gap: base * 0.8,
      padding: `${base * 1.6}px ${base * 0.9}px` }}>
      {scene.heading ? <TypeStack lines={scene.heading} /> : null}
      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column",
        gap: base * 0.8 }}>
        <div style={{ position: "absolute", left: base * 3.1 + base * 0.36 + dot / 2 - 1.5, top: dot / 2, bottom: dot / 2,
          width: 3, background: alpha(theme.muted, 0.18) }}>
          <div style={{ width: "100%", height: `${draw * 100}%`, background: theme.text }} />
        </div>
        {scene.items.map((it, i) => {
          const d = d0 + stagger(i, fps, gap);
          const hot = it.accent;
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: base * 0.36 }}>
              <span style={{ ...arrive(d, base * 0.3, "snap", { dir: "right" }), width: base * 3.1, flex: "none",
                textAlign: "right", fontFamily: fonts.mono, fontSize: base * 0.56, fontWeight: WEIGHTS.semibold,
                color: hot ? theme.accentInk : theme.muted, paddingTop: base * 0.04 }}>{it.date}</span>
              <span style={{ ...arrive(d, 0, "pop", { from: 0 }), width: dot, height: dot, flex: "none",
                borderRadius: "50%", background: hot ? theme.accent : theme.surface,
                border: `${Math.max(3, base * 0.06)}px solid ${hot ? theme.accent : theme.text}`,
                boxShadow: hot ? `0 0 0 ${base * 0.12}px ${alpha(theme.accent, 0.2)}` : "none", zIndex: 1 }} />
              <div style={{ ...arrive(d + 2, base * 0.6, "snap", { dir: "left" }), display: "flex",
                flexDirection: "column", gap: base * 0.04 }}>
                <span style={{ display: "flex", alignItems: "center", gap: base * 0.2, fontFamily: fonts.body,
                  fontSize: base * 0.84, fontWeight: WEIGHTS.bold, letterSpacing: "-0.025em",
                  color: theme.text, lineHeight: 1.1 }}>
                  {it.icon ? <Glyph name={it.icon} size={base * 0.8} color={theme.text} surface={theme.bg} /> : null}
                  {it.label}
                </span>
                {it.sub ? <span style={{ fontFamily: fonts.body, fontSize: base * 0.5, color: theme.muted }}>
                  {it.sub}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
