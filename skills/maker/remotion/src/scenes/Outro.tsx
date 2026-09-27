import React from "react";
import { AbsoluteFill } from "remotion";
import { TypeStack } from "../components/Type";
import { Glyph } from "../components/Glyph";
import { RichCaption } from "../components/Stage";
import { useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** The last frame should send the viewer somewhere, not just stop. */
export const Outro: React.FC<SceneProps<"outro">> = ({ scene }) => {
  const { kit, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center",
      gap: base * 0.8, padding: `${base * 1.6}px ${base * 0.8}px` }}>
      <TypeStack lines={scene.lines} />
      {scene.handle ? (
        <div style={{ ...arrive(8, base * 0.6, "pop", { from: 0.8 }), display: "flex", alignItems: "center",
          gap: base * 0.28, background: theme.surface, borderRadius: 9999,
          padding: `${base * 0.3}px ${base * 0.6}px`, boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}` }}>
          <Glyph name={scene.icon ?? "sparkle"} size={base * 0.6} color={theme.accent} surface={theme.surface} />
          <span style={{ fontFamily: fonts.mono, fontSize: base * (scene.handle.length > 18 ? 0.38 : 0.52),
            fontWeight: WEIGHTS.semibold, letterSpacing: "-0.02em", color: theme.text }}>
            {scene.handle}
          </span>
        </div>
      ) : null}
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
