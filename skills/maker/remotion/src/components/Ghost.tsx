import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useKit } from "../kit";
import { alpha } from "../color";

/** A giant outlined word behind the scene — the scene's keyword, three times wider than
 *  the frame, sliding in and travelling behind the block. It fills the dead space above and below a small block
 *  with texture instead of decoration, and it is pure ink: it works in black and white.
 *  Low contrast on purpose: it is read by the eye, not by the viewer. */
export const Ghost: React.FC<{ text?: string; index: number }> = ({ text, index }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const { theme, fonts } = useKit();
  if (!text) return null;
  const word = fonts.displayUpper ? text.toUpperCase() : text;
  const dir = index % 2 === 0 ? -1 : 1;
  // Slides in with the scene, then keeps travelling for as long as the scene is up: the
  // main block holds still to be read, the background stays alive. The steady part moves
  // a whole number of pixels per frame and lands on whole pixels — a slow sub-pixel drift
  // re-rasterises the thin outline at a new offset every frame and it shimmers.
  const slide = interpolate(frame, [0, Math.round(fps * 0.6)], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const speed = Math.max(1, Math.round((2 * width) / 1080));
  const x = Math.round(dir * 0.2 * width - (dir > 0 ? width * 0.4 : width * 0.1)
    + dir * 0.25 * width * slide - dir * speed * frame);
  const inP = interpolate(frame, [0, Math.round(fps * 0.5)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const size = Math.min(height * 0.34, (width * 2.6) / Math.max(3, word.length));
  // top band or bottom band, alternating, so the ghost sits where the frame is empty
  const top = index % 2 === 0 ? "7%" : "69%";
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top, left: 0, whiteSpace: "nowrap", willChange: "transform",
        transform: `translate3d(${x}px, 0, 0)`,
        fontFamily: fonts.display, fontWeight: fonts.displayWeight, fontSize: size,
        lineHeight: 1, letterSpacing: `${fonts.displayTracking}em`,
        color: "transparent",
        WebkitTextStroke: `${Math.max(1.5, width * 0.0022)}px ${alpha(theme.text, 0.13 * inP)}`,
      }}>
        {word}
      </div>
    </AbsoluteFill>
  );
};
