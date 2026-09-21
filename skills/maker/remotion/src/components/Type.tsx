import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Line } from "../deck";
import { WEIGHTS, type Theme } from "../theme";
import { enter, rise, stagger } from "../motion";
import type { SpringName } from "../motion";

export const resolveColor = (c: Line["c"], theme: Theme) =>
  c === "accent" ? theme.accent : c === "muted" ? theme.muted : c === "text" || !c ? theme.text : c;

/** A stack of mixed-weight lines that cascade in. This is the workhorse:
 *  a small light line above a huge black line is the entire typographic idea. */
export const TypeStack: React.FC<{
  lines: Line[];
  theme: Theme;
  base: number;
  font: string;
  align?: "center" | "left";
  delay?: number;
  anim?: SpringName;
  staggerMs?: number;
}> = ({ lines, theme, base, font, align = "center", delay = 0, anim = "snap", staggerMs = 70 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
        gap: base * 0.08,
        width: "100%",
      }}
    >
      {lines.map((l, i) => {
        const p = enter(frame, fps, delay + stagger(i, fps, staggerMs), anim);
        const size = base * (l.s ?? 1);
        const weight = WEIGHTS[l.w ?? "black"];
        return (
          <div
            key={i}
            style={{
              ...rise(p, size * 0.34),
              fontFamily: font,
              fontSize: size,
              fontWeight: weight,
              fontStyle: l.i ? "italic" : "normal",
              color: resolveColor(l.c, theme),
              lineHeight: 1.0,
              letterSpacing: weight >= 700 ? "-0.035em" : "-0.015em",
              maxWidth: "94%",
              textWrap: "balance",
            }}
          >
            {l.t}
          </div>
        );
      })}
    </div>
  );
};
