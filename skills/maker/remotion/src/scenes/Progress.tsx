import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useColumnInset } from "../layout";
import { TypeStack } from "../components/Type";
import { enter, rise, stagger } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Bars that fill. A number you watch arrive is more convincing than a number that is
 *  simply printed. */
export const Progress: React.FC<SceneProps<"progress">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const inset = useColumnInset();
  const { fps } = useVideoConfig();
  const delay = scene.heading ? 7 : 0;
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "stretch",
        gap: base * 0.8,
        padding: `${base * 1.6}px ${inset + base * 0.8}px`,
      }}
    >
      {scene.heading ? (
        <TypeStack lines={scene.heading} theme={theme} base={base} font={font} />
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.46 }}>
        {scene.items.map((it, i) => {
          const p = enter(frame, fps, delay + stagger(i, fps, 110), "smooth");
          const target = Math.max(0, Math.min(1, it.value));
          return (
            <div key={i} style={{ ...rise(p, base * 0.3), display: "flex",
              flexDirection: "column", gap: base * 0.16 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "baseline", fontFamily: font }}>
                <span style={{ fontSize: base * 0.5, fontWeight: WEIGHTS.semibold,
                  color: theme.text }}>{it.label}</span>
                <span style={{ fontSize: base * 0.44, fontWeight: WEIGHTS.bold,
                  color: it.accent ? theme.accent : theme.muted }}>
                  {it.sub ?? `${Math.round(target * p * 100)}%`}
                </span>
              </div>
              <div style={{ height: base * 0.26, borderRadius: 999,
                background: `${theme.muted}26`, overflow: "hidden" }}>
                <div style={{ width: `${target * p * 100}%`, height: "100%",
                  borderRadius: 999,
                  background: it.accent ? theme.accent : theme.text }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
