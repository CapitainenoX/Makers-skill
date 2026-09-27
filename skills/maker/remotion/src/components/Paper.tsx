import React from "react";
import { AbsoluteFill } from "remotion";
import type { Paper as PaperKind } from "../look";
import type { Theme } from "../theme";

const isLight = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 140;
};

/** The surface everything sits on. Pure white reads as a slide; the reference sits on a
 *  soft grey studio sweep — darker at the top edge, lit in the middle — so white cards
 *  separate from it and the frame has depth before anything has moved. */
export const paperColor = (kind: PaperKind, theme: Theme) =>
  kind === "flat" || !isLight(theme.bg) ? theme.bg : kind === "warm" ? "#F4F2EE" : "#F1F1F0";

export const Paper: React.FC<{ kind: PaperKind; theme: Theme }> = ({ kind, theme }) => {
  const light = isLight(theme.bg);
  const bg = paperColor(kind, theme);
  const layers: string[] = [];
  if (kind === "studio") {
    layers.push(
      light
        ? "linear-gradient(180deg, rgba(0,0,0,0.11) 0%, rgba(0,0,0,0.035) 7%, rgba(0,0,0,0) 16%)"
        : "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 18%)",
      light
        ? "radial-gradient(ellipse 75% 45% at 50% 48%, rgba(255,255,255,0.75), rgba(255,255,255,0) 70%)"
        : "radial-gradient(ellipse 75% 45% at 50% 48%, rgba(255,255,255,0.06), rgba(255,255,255,0) 70%)",
      light
        ? "linear-gradient(0deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 14%)"
        : "linear-gradient(0deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 14%)",
    );
  } else if (kind === "spot") {
    layers.push(
      light
        ? "radial-gradient(ellipse 90% 62% at 50% 46%, #FFFFFF 0%, rgba(255,255,255,0) 100%)"
        : "radial-gradient(ellipse 90% 62% at 50% 46%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)",
      light
        ? "radial-gradient(ellipse 140% 100% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.09) 100%)"
        : "radial-gradient(ellipse 140% 100% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)",
    );
  } else if (kind === "warm") {
    layers.push(
      "radial-gradient(ellipse 130% 90% at 50% 45%, rgba(0,0,0,0) 60%, rgba(60,40,20,0.07) 100%)",
    );
  }
  return <AbsoluteFill style={{ background: [...layers, bg].join(", ") }} />;
};
