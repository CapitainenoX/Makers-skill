import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useLayoutWidth } from "../layout";
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
}> = ({ scene, theme, base, font, gap = 0.95, children }) => {
  // keep full-width children (lists, comparisons) inside the layout column on landscape
  const { width } = useVideoConfig();
  const side = (width - useLayoutWidth()) / 2 + base * 0.7;
  return (
  <AbsoluteFill
    style={{
      justifyContent: justify(scene.anchor ?? "center"),
      alignItems: "center",
      gap: base * gap,
      padding: `${base * 1.3}px ${side}px`,
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
};
