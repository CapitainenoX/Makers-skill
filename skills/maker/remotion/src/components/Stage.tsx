import React from "react";
import { AbsoluteFill } from "remotion";
import { Rich } from "./Rich";
import { justify, type Scene } from "../deck";
import type { Theme } from "../theme";

/** The shared composition: a visual, then the flowing caption, centred as one block.
 *  Every scene in this look is that shape — the decor fills the edges separately. */
export const Stage: React.FC<{
  scene: Scene;
  theme: Theme;
  base: number;
  font: string;
  gap?: number;
  children: React.ReactNode;
}> = ({ scene, theme, base, font, gap = 0.95, children }) => (
  <AbsoluteFill
    style={{
      justifyContent: justify(scene.anchor ?? "center"),
      alignItems: "center",
      gap: base * gap,
      padding: `${base * 1.3}px ${base * 0.7}px`,
    }}
  >
    {children}
    {scene.rich ? (
      <Rich
        text={scene.rich}
        theme={theme}
        base={base}
        font={font}
        size={scene.richSize ?? 1.02}
        delay={scene.richDelay ?? 6}
      />
    ) : null}
  </AbsoluteFill>
);
