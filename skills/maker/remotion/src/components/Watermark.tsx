import React from "react";
import { AbsoluteFill } from "remotion";
import type { Theme } from "../theme";

/** A faint, persistent corner mark. Deliberately low contrast: it should be
 *  legible on a re-upload and invisible while watching. */
export const Watermark: React.FC<{ text?: string; theme: Theme; base: number; font: string }> = ({
  text,
  theme,
  base,
  font,
}) => {
  if (!text) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginBottom: base * 1.6,
          fontFamily: font,
          fontSize: base * 0.34,
          fontWeight: 500,
          letterSpacing: "0.01em",
          color: theme.muted,
          opacity: 0.42,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
