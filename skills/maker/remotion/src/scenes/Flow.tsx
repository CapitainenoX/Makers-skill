import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useLayoutWidth } from "../layout";
import { Stage } from "../components/Stage";
import { Glyph } from "../components/Glyph";
import { TypeStack } from "../components/Type";
import { enter, rise, stagger } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

/** A labelled pipeline on a white card — input, steps, output. The dotted spine is
 *  what turns a list into a mechanism. */
export const Flow: React.FC<SceneProps<"flow">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const width = useLayoutWidth();
  const card = enter(frame, fps, 0, "snap");
  const W = width * 0.8;

  return (
    <Stage scene={scene} theme={theme} base={base} font={font}>
      {scene.lines ? (
        <TypeStack lines={scene.lines} theme={theme} base={base} font={font} />
      ) : null}
      <div
        style={{
          ...rise(card, base * 0.5),
          width: W,
          background: theme.surface,
          borderRadius: base * 0.5,
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          padding: `${base * 0.8}px ${base * 0.6}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: base * 0.14,
        }}
      >
        {scene.title ? (
          <span style={{ fontFamily: font, fontSize: base * 0.56, fontWeight: WEIGHTS.bold,
            letterSpacing: "-0.02em", color: theme.text, marginBottom: base * 0.2 }}>
            {scene.title}
          </span>
        ) : null}

        {scene.steps.map((st, i) => {
          const p = enter(frame, fps, 5 + stagger(i, fps, 130), "snap");
          const last = i === scene.steps.length - 1;
          return (
            <React.Fragment key={i}>
              <div style={{ ...rise(p, base * 0.22), display: "flex", alignItems: "center",
                gap: base * 0.3 }}>
                <span style={{ width: base * 0.56, height: base * 0.56, borderRadius: "50%",
                  background: last ? theme.accent : `${theme.muted}26`,
                  color: last ? theme.bg : theme.text,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: font, fontSize: base * 0.3, fontWeight: WEIGHTS.bold }}>
                  {i + 1}
                </span>
                {st.icon ? <Glyph name={st.icon} size={base * 0.44} color={theme.muted} /> : null}
                <span style={{ fontFamily: font, fontSize: base * 0.54,
                  fontWeight: WEIGHTS.semibold,
                  letterSpacing: "-0.02em", color: theme.text }}>
                  {st.label}
                </span>
              </div>
              {!last ? (
                <div style={{ opacity: Math.min(1, p * 1.4), display: "flex",
                  flexDirection: "column", gap: base * 0.07, alignItems: "center",
                  padding: `${base * 0.1}px 0` }}>
                  {[0, 1, 2].map((k) => (
                    <span key={k} style={{ width: base * 0.07, height: base * 0.07,
                      borderRadius: "50%", background: `${theme.muted}66` }} />
                  ))}
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </Stage>
  );
};
