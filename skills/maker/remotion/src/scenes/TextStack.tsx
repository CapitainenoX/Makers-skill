import React from "react";
import { AbsoluteFill } from "remotion";
import { TypeStack } from "../components/Type";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** Full-bleed centred typography. The spine of this style. */
export const TextStack: React.FC<SceneProps<"textStack">> = ({ scene, theme, base, font }) => (
  <AbsoluteFill
    style={{
      justifyContent: justify(scene.anchor),
      alignItems: scene.align === "left" ? "flex-start" : "center",
      padding: `${base * 1.6}px ${base * 0.9}px`,
    }}
  >
    <TypeStack
      lines={scene.lines}
      theme={theme}
      base={base}
      font={font}
      align={scene.align}
      anim={scene.anim}
      reveal={scene.reveal}
    />
  </AbsoluteFill>
);
