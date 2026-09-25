import React from "react";
import { Glyph, isBuiltinGlyph } from "./Glyph";
import { brandFill, useSvgInfo, type Tint } from "./Logo";
import { useKit } from "../kit";
import { WEIGHTS } from "../theme";

export type ChipFill = "surface" | "brand" | "accent" | "ink" | "ghost";

/** A white circle holding a mark, lifted off the page. The reference builds most of its
 *  "works with X" beats out of these: nothing but a logo, a circle and two shadows.
 *
 *  The chip knows its own colour, so the mark inside is checked against it: a black
 *  GitHub mark on a dark chip, or a white one on a white chip, is switched to an ink that
 *  reads (`tint: "auto"`, the default) instead of silently disappearing. */
export const Chip: React.FC<{
  icon?: string;
  label?: string;
  size: number;
  accent?: boolean;
  shape?: "circle" | "squircle";
  /** what the chip is filled with. `brand` fills it with the logo's own colour */
  fill?: ChipFill;
  tint?: Tint;
}> = ({ icon, label, size, accent, shape = "circle", fill = "surface", tint }) => {
  const { theme, fonts } = useKit();
  const file = !!icon && !isBuiltinGlyph(icon);
  const info = useSvgInfo(file && fill === "brand" ? icon : undefined);

  let bg = theme.surface;
  let ink = accent ? theme.accent : theme.text;
  let markTint: Tint | undefined = tint;
  if (fill === "accent") {
    bg = theme.accent; ink = theme.onAccent; markTint = tint ?? theme.onAccent;
  } else if (fill === "ink") {
    bg = theme.panel; ink = theme.onPanel; markTint = tint ?? "auto";
  } else if (fill === "brand") {
    const b = brandFill(info, theme.accent);
    bg = b.fill; ink = b.ink; markTint = tint ?? b.ink;
  } else if (fill === "ghost") {
    bg = "transparent";
  } else if (accent && file) {
    markTint = tint ?? "accent";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      gap: size * 0.14 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: shape === "circle" ? "50%" : size * 0.26,
          background: bg,
          boxShadow: fill === "ghost" ? "none" : `${theme.shadowStrong}, ${theme.shadowSoft}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Glyph name={icon} size={size * (fill === "ghost" ? 0.8 : 0.54)} color={ink}
          surface={bg === "transparent" ? theme.bg : bg} tint={markTint} />
      </div>
      {label ? (
        <span style={{ fontFamily: fonts.body, fontSize: size * 0.2, fontWeight: WEIGHTS.semibold,
          letterSpacing: "-0.02em", color: theme.muted, whiteSpace: "nowrap" }}>
          {label}
        </span>
      ) : null}
    </div>
  );
};
