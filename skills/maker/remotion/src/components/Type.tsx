import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Line } from "../deck";
import { WEIGHTS, type Theme } from "../theme";
import { stagger, wordIn, wordProgress } from "../motion";
import type { SpringName } from "../motion";
import { activeLook } from "../look";

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
  const look = activeLook();
  // `anim` still selects the spring for decks that name one; otherwise the look decides.
  const kind = anim && anim !== "snap" ? (anim === "pop" ? "stomp" : "rise") : look.word;
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
        const size = base * (l.s ?? 1);
        const weight = WEIGHTS[l.w ?? "black"];
        const words = reveal === "word" ? String(l.t).split(/(\s+)/) : null;
        const lineP = wordProgress(kind, frame, fps, lineDelay, String(l.t).length);
        const lineMove = wordIn(kind, lineP, size,
          wordProgress(kind, frame - 1, fps, lineDelay, String(l.t).length));
        const ink = (m: { ink: number }) => (look.inkSettle ? m.ink : 1);
        const colour = resolveColor(l.c, theme);
        const settle = (k: number) => k >= 1 ? colour
          : `color-mix(in srgb, ${colour} ${(k * 100).toFixed(0)}%, ` +
            `color-mix(in srgb, ${theme.muted} 45%, ${theme.bg}))`;
        const block = (
          <div
            key={i}
            style={{
              ...(words ? {} : lineMove.inner),
              fontFamily: font,
              fontSize: size,
              fontWeight: weight,
              fontStyle: l.i ? "italic" : "normal",
              color: words ? colour : settle(ink(lineMove)),
              lineHeight: 1.0,
              letterSpacing: !words && lineMove.inner.letterSpacing
                ? lineMove.inner.letterSpacing
                : weight >= 700 ? "-0.035em" : "-0.015em",
              maxWidth: "94%",
              textWrap: "balance",
            }}
          >
            {words
              ? words.map((w, j) => {
                  if (/^\s+$/.test(w)) return <span key={j}> </span>;
                  const d = lineDelay + stagger(j, fps, look.cadence * 0.8);
                  const m = wordIn(kind, wordProgress(kind, frame, fps, d, w.length), size,
                    wordProgress(kind, frame - 1, fps, d, w.length));
                  const inner = (
                    <span key={j} style={{ display: "inline-block", color: settle(ink(m)),
                      ...m.inner }}>
                      {w}
                    </span>
                  );
                  return m.outer ? <span key={j} style={m.outer}>{inner}</span> : inner;
                })
              : l.t}
          </div>
        );
        return !words && lineMove.outer ? (
          <div key={i} style={{ ...lineMove.outer, display: "block" }}>{block}</div>
        ) : block;
      })}
    </div>
  );
};
