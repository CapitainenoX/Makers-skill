import React from "react";
import { AbsoluteFill } from "remotion";
import { TypeStack } from "../components/Type";
import { Glyph } from "../components/Glyph";
import { RichCaption } from "../components/Stage";
import { stagger, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Icon + label rows that cascade. Each row is one idea; the stagger is what
 *  makes it read as a list being revealed rather than a table appearing. */
export const LogoList: React.FC<SceneProps<"logoList">> = ({ scene }) => {
  const { kit, fps, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const rowsDelay = scene.heading ? 7 : 0;
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center",
      gap: base * 0.85, padding: `${base * 1.6}px ${base * 0.85}px` }}>
      {scene.heading ? <TypeStack lines={scene.heading} /> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.42 }}>
        {scene.items.map((it, i) => (
          <div key={i} style={{ ...arrive(rowsDelay + stagger(i, fps, 85), base * 0.9, "snap", { dir: "left" }),
            display: "flex", alignItems: "center", gap: base * 0.42 }}>
            <Glyph name={it.icon} size={base * 0.92} color={it.accent ? theme.accent : theme.text}
              surface={theme.bg} tint={it.accent ? "accent" : undefined} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: fonts.body, fontSize: base * 0.98, fontWeight: WEIGHTS.semibold,
                letterSpacing: "-0.025em", color: it.accent ? theme.accentInk : theme.text }}>
                {it.label}
              </span>
              {it.sub ? (
                <span style={{ fontFamily: fonts.body, fontSize: base * 0.42, fontWeight: WEIGHTS.regular,
                  color: theme.muted }}>{it.sub}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {scene.footer ? (
        <TypeStack lines={scene.footer} delay={rowsDelay + stagger(scene.items.length, fps, 85)} />
      ) : null}
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
