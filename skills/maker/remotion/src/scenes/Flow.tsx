import React from "react";
import { Easing, interpolate, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { Glyph } from "../components/Glyph";
import { TypeStack } from "../components/Type";
import { stagger, useAnim, cueAt } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha, mix } from "../color";
import type { SceneProps } from "./types";

/** A labelled pipeline on a white card — input, steps, output. The spine fills as each
 *  step lights up in turn, which is what turns a list into a mechanism. */
export const Flow: React.FC<SceneProps<"flow">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const W = width * 0.88;
  const stepGap = 130;
  const n = scene.steps.length;
  return (
    <Stage scene={scene}>
      {scene.lines ? <TypeStack lines={scene.lines} /> : null}
      <div style={{ ...arrive(0, base * 0.8, "snap", { from: 0.94 }), width: W, background: theme.surface,
        borderRadius: base * 0.5, boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
        padding: `${base * 0.8}px ${base * 0.6}px`, display: "flex", flexDirection: "column",
        alignItems: "flex-start", gap: base * 0.1 }}>
        {scene.title ? (
          <span style={{ alignSelf: "center", fontFamily: fonts.body, fontSize: base * 0.74,
            fontWeight: WEIGHTS.bold, letterSpacing: "-0.02em", color: theme.text, marginBottom: base * 0.3 }}>
            {scene.title}
          </span>
        ) : null}
        {scene.steps.map((st, i) => {
          const d = cueAt(kit.cues, "items", i, fps, 5 + stagger(i, fps, stepGap));
          const last = i === n - 1;
          // lighting up is a 5-frame fade, not a switch: an instant grey-to-black flip
          // across a whole row reads as a flicker
          const litAt = kit.cues?.items ? cueAt(kit.cues, "items", i, fps, 0) + 3
            : 5 + stagger(i + 1, fps, stepGap);
          const litK = interpolate(frame, [litAt, litAt + 5], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const off = mix(theme.surface, theme.muted, 0.16);
          const link = interpolate(frame, [d + 2, d + 2 + Math.round(fps * 0.14)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const dot = base * 0.82;
          return (
            <React.Fragment key={i}>
              <div style={{ ...arrive(d, base * 0.5, "snap", { dir: "left" }), display: "flex",
                alignItems: "center", gap: base * 0.3, marginLeft: base * 0.3 }}>
                <span style={{ width: dot, height: dot, borderRadius: "50%", flex: "none",
                  background: mix(off, theme.accent, litK),
                  color: mix(theme.text, theme.onAccent, litK),
                  boxShadow: `0 0 0 ${base * 0.08 * litK}px ${alpha(theme.accent, 0.2)}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: fonts.mono, fontSize: base * 0.38, fontWeight: WEIGHTS.bold }}>
                  {i + 1}
                </span>
                {st.icon ? <Glyph name={st.icon} size={base * 0.62} color={mix(theme.muted, theme.text, litK)}
                  surface={theme.surface} /> : null}
                <span style={{ fontFamily: fonts.body, fontSize: base * 0.72, fontWeight: WEIGHTS.semibold,
                  letterSpacing: "-0.02em", color: mix(theme.muted, theme.text, litK) }}>
                  {st.label}
                </span>
              </div>
              {!last ? (
                <div style={{ marginLeft: base * 0.3 + dot / 2 - Math.max(1.5, base * 0.03),
                  width: Math.max(3, base * 0.06), height: base * 0.5, borderRadius: 99,
                  background: alpha(theme.muted, 0.18), overflow: "hidden" }}>
                  <div style={{ width: "100%", height: `${link * 100}%`, background: theme.accent }} />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </Stage>
  );
};
