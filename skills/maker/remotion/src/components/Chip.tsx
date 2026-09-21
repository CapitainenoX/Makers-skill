import React from "react";
import { Img, staticFile } from "remotion";
import { Glyph } from "./Glyph";
import { WEIGHTS, type Theme } from "../theme";

/** A white circle holding a mark, lifted off the page. The reference builds most of its
 *  "works with X" beats out of these: nothing but a logo, a circle and two shadows. */
export const Chip: React.FC<{
  icon?: string;
  label?: string;
  size: number;
  theme: Theme;
  font: string;
  accent?: boolean;
  shape?: "circle" | "squircle";
}> = ({ icon, label, size, theme, font, accent, shape = "circle" }) => {
  const isFile = icon ? /[./]/.test(icon) : false;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      gap: size * 0.14 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: shape === "circle" ? "50%" : size * 0.26,
          background: theme.surface,
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isFile ? (
          <Img
            src={icon!.startsWith("http") ? icon! : staticFile(icon!)}
            style={{ width: size * 0.56, height: size * 0.56, objectFit: "contain" }}
          />
        ) : (
          <Glyph name={icon} size={size * 0.56} color={accent ? theme.accent : theme.text} />
        )}
      </div>
      {label ? (
        <span style={{ fontFamily: font, fontSize: size * 0.2, fontWeight: WEIGHTS.semibold,
          letterSpacing: "-0.02em", color: theme.muted, whiteSpace: "nowrap" }}>
          {label}
        </span>
      ) : null}
    </div>
  );
};
