import React from "react";
import { AbsoluteFill } from "remotion";
import { useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { Rich } from "../components/Rich";
import { Media } from "../components/Media";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Someone else's words, given room — set in the serif, because a quotation is a voice,
 *  not a claim. The oversized mark does the work so the type can stay calm. */
export const Quote: React.FC<SceneProps<"quote">> = ({ scene }) => {
  const { kit, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "flex-start",
      gap: base * 0.5, padding: `${base * 1.8}px ${base * 0.9}px` }}>
      <div style={{ ...arrive(0, base * 0.5, "pop", { from: 0.6 }), fontFamily: fonts.serif,
        fontSize: base * 3.6, color: theme.accent, lineHeight: 0.6, height: base * 1.4 }}>
        &ldquo;
      </div>
      <Rich text={scene.text} size={1.24} align="left" maxWidth="96%" delay={4} cadence={40}
        face="serif" />
      {scene.author ? (
        <div style={{ ...arrive(12, base * 0.3, "smooth"), display: "flex", alignItems: "center",
          gap: base * 0.3, fontFamily: fonts.body }}>
          {scene.avatar ? (
            <div style={{ width: base * 1.1, height: base * 1.1, borderRadius: "50%", overflow: "hidden",
              boxShadow: theme.shadowSoft }}>
              <Media media={{ src: scene.avatar, fit: "cover" }} />
            </div>
          ) : (
            <span style={{ width: base * 0.6, height: Math.max(2, base * 0.05), background: theme.accent }} />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: base * 0.48, fontWeight: WEIGHTS.bold, color: theme.text }}>{scene.author}</span>
            {scene.role ? (
              <span style={{ fontSize: base * 0.36, fontWeight: WEIGHTS.regular, color: theme.muted }}>{scene.role}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
