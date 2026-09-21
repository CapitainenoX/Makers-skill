import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { enter, rise } from "../motion";
import { Device, useFloat } from "../components/Device";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** A raised card holding a screenshot or a device mockup, with text above and
 *  below. The gradient inside the card is what stops a flat screenshot from
 *  looking pasted onto the page. */
export const Card: React.FC<SceneProps<"card">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const p = enter(frame, fps, scene.lines ? 5 : 0, "snap");
  const g = scene.gradient ?? ["#A9A6D8", "#8FB4DE"];
  const drift = useFloat(scene.float ?? 0, scene.tilt ?? 0);
  const media = scene.media ?? scene.src;
  const cardW = width * 0.72;
  const device = scene.device ?? "phone";

  const inner = (
    <Device
      kind={device}
      media={media}
      width={device === "phone" ? cardW * 0.46 : cardW * 0.9}
      theme={theme}
      radius={base}
    />
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "center",
        gap: base * 0.7,
        padding: `${base * 1.6}px ${base * 0.8}px`,
      }}
    >
      {scene.lines ? (
        <TypeStack lines={scene.lines} theme={theme} base={base} font={font} />
      ) : null}

      <div
        style={{
          ...rise(p, base * 0.55),
          ...drift,
          width: cardW,
          padding: base * 0.55,
          borderRadius: base * 0.5,
          background: `linear-gradient(145deg, ${g[0]}, ${g[1]})`,
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {inner}
      </div>

      {scene.caption ? (
        <TypeStack lines={scene.caption} theme={theme} base={base} font={font} delay={11} />
      ) : null}
    </AbsoluteFill>
  );
};
