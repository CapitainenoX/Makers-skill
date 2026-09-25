import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { TypeStack } from "../components/Type";
import { RichCaption } from "../components/Stage";
import { stagger, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** A list being ticked off: each box lands, then its check draws itself. Items marked
 *  `done: false` get a cross and a strike instead — myths, mistakes, "don't do this". */
export const Checklist: React.FC<SceneProps<"checklist">> = ({ scene }) => {
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const d0 = scene.heading ? 8 : 2;
  const box = base * 1.05;
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center", gap: base * 0.8,
      padding: `${base * 1.6}px ${base * 0.9}px` }}>
      {scene.heading ? <TypeStack lines={scene.heading} /> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.6, width: "100%" }}>
        {scene.items.map((it, i) => {
          const d = d0 + stagger(i, fps, 150);
          const tick = interpolate(frame, [d + 6, d + 6 + Math.round(fps * 0.22)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const ok = it.done !== false;
          const color = ok ? theme.accent : "#E5484D";
          return (
            <div key={i} style={{ ...arrive(d, base * 0.5, "snap"), display: "flex", alignItems: "center",
              gap: base * 0.36 }}>
              <div style={{ width: box, height: box, borderRadius: base * 0.22, flex: "none",
                border: `${Math.max(3, base * 0.06)}px solid ${tick > 0 ? color : alpha(theme.muted, 0.4)}`,
                background: tick > 0 ? alpha(color, 0.12 * tick) : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transform: `scale(${(1 + 0.12 * Math.sin(tick * Math.PI)).toFixed(4)})` }}>
                <svg width={box * 0.7} height={box * 0.7} viewBox="0 0 100 100">
                  <path d={ok ? "M18 54l22 22 44-50" : "M24 24l52 52M76 24L24 76"} fill="none"
                    stroke={color} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"
                    pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - tick} />
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ position: "relative", fontFamily: fonts.body, fontSize: base * 0.86,
                  fontWeight: WEIGHTS.semibold, letterSpacing: "-0.025em",
                  color: ok ? theme.text : theme.muted }}>
                  {it.label}
                  {!ok ? <span style={{ position: "absolute", left: 0, top: "55%", height: Math.max(2, base * 0.05),
                    width: `${tick * 100}%`, background: color }} /> : null}
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
