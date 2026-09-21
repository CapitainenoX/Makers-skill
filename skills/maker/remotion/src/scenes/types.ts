import type { Scene } from "../deck";
import type { Theme } from "../theme";

export type SceneProps<T extends Scene["type"]> = {
  scene: Extract<Scene, { type: T }>;
  theme: Theme;
  /** base type size in px, derived from canvas width */
  base: number;
  font: string;
  /** frames this scene lasts */
  durationInFrames: number;
};
