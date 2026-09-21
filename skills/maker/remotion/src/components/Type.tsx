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
  /** "word" pops each word in turn — narration lines land better that way */
  reveal?: "line" | "word";
}> = ({ lines, theme, base, font, align = "center", delay = 0, anim = "snap",
        staggerMs = 70, reveal = "line" }) => {
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
        const lineDelay = delay + stagger(i, fps, staggerMs);
        const p = enter(frame, fps, lineDelay, anim);
        const size = base * (l.s ?? 1);
        const weight = WEIGHTS[l.w ?? "black"];
        const words = reveal === "word" ? String(l.t).split(/(\s+)/) : null;
        return (
          <div
            key={i}
            style={{
              ...(words ? { opacity: 1, transform: "none" } : rise(p, size * 0.34)),
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
            {words
              ? words.map((w, j) =>
                  /^\s+$/.test(w) ? (
                    <span key={j}> </span>
                  ) : (
                    <span
                      key={j}
                      style={{
                        display: "inline-block",
                        ...rise(
                          enter(frame, fps, lineDelay + stagger(j, fps, 42), anim),
                          size * 0.3,
                        ),
                      }}
                    >
                      {w}
                    </span>
                  ),
                )
              : l.t}
          </div>
        );
      })}
    </div>
  );
};
