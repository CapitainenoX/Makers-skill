import { useVideoConfig } from "remotion";

/** The width scenes lay out against. Portrait: the frame's own width. Landscape: capped at
 *  1.15x the height, so a 16:9 frame gets a centred content area at the same proportions
 *  as a Short instead of chips and cards sized from 1920 px next to type sized from 1080. */
export const layoutWidth = (width: number, height: number) =>
  Math.min(width, Math.round(height * 1.15));

/** `useVideoConfig`, with `width` replaced by the layout width. Scenes use this; full-bleed
 *  layers (backdrop, ghost, HUD, transitions) keep the real frame size. */
export const useFrameSize = () => {
  const c = useVideoConfig();
  return { ...c, width: layoutWidth(c.width, c.height), frameWidth: c.width };
};
