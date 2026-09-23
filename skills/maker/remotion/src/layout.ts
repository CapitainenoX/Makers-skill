import { useVideoConfig } from "remotion";

/** The width scenes lay themselves out against.
 *
 *  Every scene was designed on a vertical canvas, where the frame width is the natural
 *  measure. On a landscape canvas that same measure makes cards span the whole screen
 *  and pushes a framed clip's caption off the bottom. So on landscape the content sits
 *  in a centred column about 1.15x the height wide — the same proportions as vertical,
 *  with the extra width left to the decor. Vertical is unchanged: min() returns width. */
export const LANDSCAPE_COLUMN = 1.15;

export const layoutWidth = (width: number, height: number) =>
  Math.min(width, height * LANDSCAPE_COLUMN);

export const useLayoutWidth = () => {
  const { width, height } = useVideoConfig();
  return layoutWidth(width, height);
};

/** Horizontal inset that centres the layout column: 0 on vertical. */
export const useColumnInset = () => {
  const { width } = useVideoConfig();
  return (width - useLayoutWidth()) / 2;
};
