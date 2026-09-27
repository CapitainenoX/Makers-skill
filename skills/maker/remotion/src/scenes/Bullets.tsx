import React from "react";
import { AbsoluteFill } from "remotion";
import { TypeStack } from "../components/Type";
import { Glyph } from "../components/Glyph";
import { RichCaption } from "../components/Stage";
import { stagger, useAnim, cueAt } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Left-aligned points on raised chips. Use for "what you get" beats. */
export const Bullets: React.FC<SceneProps<"bullets">> = ({ scene }) => {
  const { kit, fps, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const delay = scene.heading ? 7 : 0;
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center",
      gap: base * 0.8, padding: `${base * 1.6}px ${base * 0.7}px` }}>
      {scene.heading ? <TypeStack lines={scene.heading} /> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.3, width: "100%" }}>
        {scene.items.map((it, i) => (
          <div key={i} style={{ ...arrive(cueAt(kit.cues, "items", i, fps, delay + stagger(i, fps, 80)), base * 0.5, "snap"),
            display: "flex", alignItems: "center", gap: base * 0.34, background: theme.surface,
            borderRadius: base * 0.36, padding: `${base * 0.36}px ${base * 0.46}px`,
            boxShadow: theme.shadowSoft }}>
            <div style={{ width: base * 0.95, height: base * 0.95, borderRadius: base * 0.26, flex: "none",
              background: it.accent ? theme.accent : alpha(theme.muted, 0.12),
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Glyph name={it.icon ?? "check"} size={base * 0.56}
                color={it.accent ? theme.onAccent : theme.text}
                surface={it.accent ? theme.accent : theme.surface}
                tint={it.accent ? theme.onAccent : undefined} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: fonts.body, fontSize: base * 0.62, fontWeight: WEIGHTS.semibold,
                letterSpacing: "-0.02em", color: theme.text }}>{it.label}</span>
              {it.sub ? (
                <span style={{ fontFamily: fonts.body, fontSize: base * 0.36, fontWeight: WEIGHTS.regular,
                  color: theme.muted }}>{it.sub}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
