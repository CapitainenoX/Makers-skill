import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { Media as MediaEl } from "../components/Media";
import { Device, useFloat } from "../components/Device";
import { useAnim } from "../motion";
import { justify } from "../deck";
import { RichCaption } from "../components/Stage";
import type { SceneProps } from "./types";

/** Footage, presented. Full-bleed with a scrim and a headline, or framed in a shell.
 *  This is how a rush stops looking like a rush. */
export const MediaScene: React.FC<SceneProps<"media">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, arrive } = useAnim();
  const { theme, base } = kit;
  const drift = useFloat(scene.float ?? 0, scene.tilt ?? 0);
  const kind = scene.frame ?? "card";
  const top = scene.position !== "bottom";

  if (kind === "full") {
    return (
      <AbsoluteFill>
        <AbsoluteFill><MediaEl media={scene.media} /></AbsoluteFill>
        {scene.scrim !== false ? (
          <AbsoluteFill style={{ background: top
            ? "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 50%)"
            : "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 50%)" }} />
        ) : null}
        {scene.lines || scene.rich ? (
          <AbsoluteFill style={{ justifyContent: top ? "flex-start" : "flex-end", alignItems: "center",
            gap: base * 0.5, padding: `${base * 1.8}px ${base * 0.8}px` }}>
            {scene.lines ? <TypeStack lines={scene.lines.map((l) => ({ c: "#FFFFFF", ...l }))} /> : null}
            <RichCaption scene={scene} inverse />
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    );
  }

  const w = width * (scene.scale ?? (kind === "phone" ? 0.46 : 0.84));
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center",
      flexDirection: top ? "column" : "column-reverse", gap: base * 0.7,
      padding: `${base * 1.6}px ${base * 0.8}px` }}>
      {scene.lines ? <TypeStack lines={scene.lines} /> : null}
      <div style={arrive(scene.lines ? 4 : 0, base * 0.9, "snap", { from: 0.9 })}>
        <div style={drift}>
          <Device kind={kind} media={scene.media} width={w} theme={theme} radius={base} />
        </div>
      </div>
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
