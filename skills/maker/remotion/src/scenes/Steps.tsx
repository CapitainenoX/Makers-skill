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

/** "Three steps" as big numbered cards on a rail. The rail fills as each step lands, so
 *  the viewer feels the sequence, not just reads it. */
export const Steps: React.FC<SceneProps<"steps">> = ({ scene }) => {
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const d0 = scene.heading ? 8 : 2;
  const n = scene.items.length;
  const gap = 150;
  const rail = interpolate(frame, [d0, d0 + stagger(n - 1, fps, gap) + 6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const num = base * 1.4;
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center", gap: base * 0.8,
      padding: `${base * 1.6}px ${base * 0.8}px` }}>
      {scene.heading ? <TypeStack lines={scene.heading} /> : null}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: base * 0.55,
        width: "100%" }}>
        <div style={{ position: "absolute", left: num / 2 - 2, top: num / 2, bottom: num / 2, width: 4,
          background: alpha(theme.muted, 0.18), borderRadius: 4 }}>
          <div style={{ width: "100%", height: `${rail * 100}%`, background: theme.accent, borderRadius: 4 }} />
        </div>
        {scene.items.map((it, i) => {
          const d = d0 + stagger(i, fps, gap);
          const lit = frame >= d + 4;
          return (
            <div key={i} style={{ ...arrive(d, base * 0.9, "snap", { dir: "left" }), display: "flex",
              alignItems: "center", gap: base * 0.4 }}>
              <div style={{ width: num, height: num, borderRadius: "50%", flex: "none", zIndex: 1,
                background: lit ? theme.accent : theme.surface, boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: fonts.display, fontWeight: fonts.displayWeight, fontSize: num * 0.5,
                color: lit ? theme.onAccent : theme.text }}>
                {it.icon ? <Glyph name={it.icon} size={num * 0.5} color={lit ? theme.onAccent : theme.text}
                  surface={lit ? theme.accent : theme.surface} /> : i + 1}
              </div>
              <div style={{ flex: 1, background: theme.surface, borderRadius: base * 0.36,
                padding: `${base * 0.38}px ${base * 0.5}px`, boxShadow: theme.shadowSoft,
                display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: fonts.body, fontSize: base * 0.82, fontWeight: WEIGHTS.bold,
                  letterSpacing: "-0.025em", color: theme.text }}>{it.label}</span>
                {it.sub ? <span style={{ fontFamily: fonts.body, fontSize: base * 0.48, color: theme.muted }}>
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
