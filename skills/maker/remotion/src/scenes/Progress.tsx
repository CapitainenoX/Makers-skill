import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { TypeStack } from "../components/Type";
import { RichCaption } from "../components/Stage";
import { stagger, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Bars that fill. A number you watch arrive is more convincing than a number that is
 *  simply printed. The fill ramps (never springs) and its percentage counts with it. */
export const Progress: React.FC<SceneProps<"progress">> = ({ scene }) => {
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const delay = scene.heading ? 7 : 0;
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "stretch", gap: base * 0.8,
      padding: `${base * 1.6}px ${base * 0.8}px` }}>
      {scene.heading ? <TypeStack lines={scene.heading} /> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.5 }}>
        {scene.items.map((it, i) => {
          const d = delay + stagger(i, fps, 110);
          const fill = interpolate(frame, [d + 3, d + 3 + Math.round(fps * 0.8)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const target = Math.max(0, Math.min(1, it.value));
          return (
            <div key={i} style={{ ...arrive(d, base * 0.4, "snap"), display: "flex",
              flexDirection: "column", gap: base * 0.16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: fonts.body, fontSize: base * 0.52, fontWeight: WEIGHTS.semibold,
                  color: theme.text }}>{it.label}</span>
                <span style={{ fontFamily: fonts.mono, fontSize: base * 0.44, fontWeight: WEIGHTS.bold,
                  color: it.accent ? theme.accentInk : theme.muted }}>
                  {it.sub ?? `${Math.round(target * fill * 100)}%`}
                </span>
              </div>
              <div style={{ height: base * 0.28, borderRadius: 999, background: alpha(theme.muted, 0.15),
                overflow: "hidden" }}>
                <div style={{ width: `${target * fill * 100}%`, height: "100%", borderRadius: 999,
                  background: it.accent ? theme.accent : theme.text }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ alignSelf: "center" }}><RichCaption scene={scene} /></div>
    </AbsoluteFill>
  );
};
