import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { Glyph } from "../components/Glyph";
import { RichCaption } from "../components/Stage";
import { useAnim } from "../motion";
import { fitSize } from "../fit";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** A soft raised capsule holding a name — the "product card" beat.
 *  Two shadows, not one: a wide soft one for depth, a tight one for contact. */
export const Pill: React.FC<SceneProps<"pill">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const iconSize = base * 1.1;
  const room = width * 0.84 - base * 2 - (scene.icon ? iconSize + base * 0.3 : 0);
  const size = fitSize(scene.label, { family: fonts.display, weight: fonts.displayWeight,
    size: base * 1.25, tracking: fonts.displayTracking, maxWidth: room, upper: fonts.displayUpper });
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center",
      gap: base * 0.9, padding: `${base * 1.6}px ${base * 0.8}px` }}>
      <div
        style={{
          ...arrive(0, base * 0.6, "pop", { from: 0.8 }),
          display: "flex", alignItems: "center", gap: base * 0.3,
          background: theme.surface,
          borderRadius: 9999,
          padding: `${base * 0.46}px ${base * 1.0}px`,
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
        }}
      >
        {scene.icon ? <Glyph name={scene.icon} size={iconSize} color={theme.accent} surface={theme.surface} /> : null}
        <span style={{ fontFamily: fonts.display, fontSize: size, fontWeight: fonts.displayWeight,
          letterSpacing: `${fonts.displayTracking}em`, color: theme.text, whiteSpace: "nowrap",
          textTransform: fonts.displayUpper ? "uppercase" : undefined, lineHeight: 1.05 }}>
          {scene.label}
        </span>
      </div>
      {scene.lines ? <TypeStack lines={scene.lines} delay={6} /> : null}
      {scene.sub ? (
        <div style={{ ...arrive(10, base * 0.3, "smooth"), fontFamily: fonts.serif,
          fontStyle: "italic", fontSize: base * 0.62, color: theme.muted }}>
          {scene.sub}
        </div>
      ) : null}
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
