import { measureText } from "@remotion/layout-utils";

/** Shrink a single display line until it fits `maxWidth`, never below `floor` of its
 *  size. A line that wraps kills the rhythm of big type; a line that overflows the frame
 *  is the most visible bug a video can have. Only called after the fonts are loaded — the
 *  deck holds its first paint until they are — so the measurement is the real face. */
export const fitSize = (
  text: string,
  o: { family: string; weight: number; size: number; tracking: number; maxWidth: number;
       upper?: boolean; floor?: number },
): number => {
  if (!text || typeof document === "undefined") return o.size;
  try {
    const { width } = measureText({
      text,
      fontFamily: o.family,
      fontSize: o.size,
      fontWeight: String(o.weight),
      letterSpacing: `${o.tracking}em`,
      textTransform: o.upper ? "uppercase" : undefined,
    });
    if (width <= o.maxWidth) return o.size;
    return Math.max(o.size * (o.floor ?? 0.55), (o.size * o.maxWidth) / width);
  } catch {
    return o.size;
  }
};
