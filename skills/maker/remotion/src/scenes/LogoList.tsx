import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TypeStack, resolveColor } from "../components/Type";
import { Glyph } from "../components/Glyph";
import { enter, rise, stagger } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Icon + label rows that cascade. Each row is one idea; the stagger is what
 *  makes it read as a list being revealed rather than a table appearing. */
export const LogoList: React.FC<SceneProps<"logoList">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headDelay = 0;
  const rowsDelay = scene.heading ? 7 : 0;
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "center",
        gap: base * 0.85,
        padding: `${base * 1.6}px ${base * 0.85}px`,
      }}
    >
      {scene.heading ? (
        <TypeStack lines={scene.heading} theme={theme} base={base} font={font} delay={headDelay} />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.42 }}>
        {scene.items.map((it, i) => {
          const p = enter(frame, fps, rowsDelay + stagger(i, fps, 85), "snap");
          return (
            <div
              key={i}
              style={{
                ...rise(p, base * 0.42),
                display: "flex",
                alignItems: "center",
                gap: base * 0.42,
              }}
            >
              <Glyph
                name={it.icon}
                size={base * 0.92}
                color={it.accent ? theme.accent : theme.text}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontFamily: font,
                    fontSize: base * 0.98,
                    fontWeight: WEIGHTS.medium,
                    letterSpacing: "-0.02em",
                    color: resolveColor(it.accent ? "accent" : "text", theme),
                  }}
                >
                  {it.label}
                </span>
                {it.sub ? (
                  <span
                    style={{
                      fontFamily: font,
                      fontSize: base * 0.42,
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

      {scene.footer ? (
        <TypeStack
          lines={scene.footer}
          theme={theme}
          base={base}
          font={font}
          delay={rowsDelay + stagger(scene.items.length, fps, 85)}
        />
      ) : null}
    </AbsoluteFill>
  );
};
