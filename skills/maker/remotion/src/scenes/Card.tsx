import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { useAnim } from "../motion";
import { Device, useFloat } from "../components/Device";
import { justify } from "../deck";
import { RichCaption } from "../components/Stage";
import { mix } from "../color";
import type { SceneProps } from "./types";

/** A raised card holding a screenshot or a device mockup, with text above and
 *  below. The gradient inside the card is what stops a flat screenshot from
 *  looking pasted onto the page — and it follows the brand accent, so the card
 *  belongs to this video instead of every video. */
export const Card: React.FC<SceneProps<"card">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, arrive } = useAnim();
  const { theme, base } = kit;
  const tintBase = theme.accent === theme.text ? "#8FA3DE" : theme.accent;
  const g = scene.gradient ?? [mix(tintBase, "#FFFFFF", 0.35), mix(tintBase, "#8FB4DE", 0.55)];
  const drift = useFloat(scene.float ?? 0, scene.tilt ?? 0);
  const media = scene.media ?? scene.src;
  const cardW = width * 0.72;
  const device = scene.device ?? "phone";

  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center",
      gap: base * 0.7, padding: `${base * 1.6}px ${base * 0.8}px` }}>
      {scene.lines ? <TypeStack lines={scene.lines} /> : null}
      <div style={{ ...arrive(scene.lines ? 5 : 0, base * 0.9, "snap", { from: 0.9 }) }}>
        <div style={{ ...drift, width: cardW, padding: base * 0.55, borderRadius: base * 0.5,
          background: `linear-gradient(145deg, ${g[0]}, ${g[1]})`,
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Device kind={device} media={media} width={device === "phone" ? cardW * 0.46 : cardW * 0.9}
            theme={theme} radius={base} />
        </div>
      </div>
      {scene.caption ? <TypeStack lines={scene.caption} delay={11} /> : null}
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
