import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useColumnInset } from "../layout";
import { TypeStack } from "../components/Type";
import { Glyph } from "../components/Glyph";
import { enter, rise, stagger } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Left-aligned points on raised chips. Use for "what you get" beats. */
export const Bullets: React.FC<SceneProps<"bullets">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const inset = useColumnInset();
  const { fps } = useVideoConfig();
  const delay = scene.heading ? 7 : 0;
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "center",
        gap: base * 0.8,
        padding: `${base * 1.6}px ${inset + base * 0.7}px`,
      }}
    >
      {scene.heading ? (
        <TypeStack lines={scene.heading} theme={theme} base={base} font={font} />
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.3, width: "100%" }}>
        {scene.items.map((it, i) => {
          const p = enter(frame, fps, delay + stagger(i, fps, 80), "snap");
          return (
            <div
              key={i}
              style={{
                ...rise(p, base * 0.4),
                display: "flex",
                alignItems: "center",
                gap: base * 0.34,
                background: theme.surface,
                borderRadius: base * 0.36,
                padding: `${base * 0.36}px ${base * 0.46}px`,
                boxShadow: theme.shadowSoft,
              }}
            >
              <Glyph
                name={it.icon ?? "check"}
                size={base * 0.6}
                color={it.accent ? theme.accent : theme.text}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontFamily: font,
                    fontSize: base * 0.62,
                    fontWeight: WEIGHTS.semibold,
                    letterSpacing: "-0.02em",
                    color: theme.text,
                  }}
                >
                  {it.label}
                </span>
                {it.sub ? (
                  <span
                    style={{
                      fontFamily: font,
                      fontSize: base * 0.36,
                      fontWeight: WEIGHTS.regular,
                      color: theme.muted,
                    }}
                  >
                    {it.sub}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
