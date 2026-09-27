import type { Scene } from "../deck";
import type { Theme } from "../theme";
import type { Fonts } from "../components/Fonts";

export type SceneProps<T extends Scene["type"]> = {
  scene: Extract<Scene, { type: T }>;
  theme: Theme;
  /** base type size in px, derived from canvas width */
  base: number;
  /** the body face — kept for older scenes; prefer `fonts` */
  font: string;
  fonts: Fonts;
  /** frames this scene lasts */
  durationInFrames: number;
};
