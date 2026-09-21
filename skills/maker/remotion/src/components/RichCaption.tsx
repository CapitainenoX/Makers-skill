import React from "react";
import { Rich } from "./Rich";
import type { Scene } from "../deck";
import type { Theme } from "../theme";

/** The flowing caption, for scenes that lay themselves out rather than using Stage. */
export const RichCaption: React.FC<{
  scene: Scene;
  theme: Theme;
  base: number;
  font: string;
}> = ({ scene, theme, base, font }) =>
  scene.rich ? (
    <Rich
      text={scene.rich}
      theme={theme}
      base={base}
      font={font}
      size={scene.richSize ?? 1.02}
      delay={scene.richDelay ?? 6}
    />
  ) : null;
