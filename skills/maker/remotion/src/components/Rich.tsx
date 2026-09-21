import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { parse, type Token } from "../text";
import { WEIGHTS, type Theme } from "../theme";
import { enter, rise, stagger } from "../motion";

/** A flowing sentence with per-word emphasis and a word-by-word reveal.
 *  Emphasised words are heavier, darker and a touch larger — the size bump is what
 *  makes the sentence read as spoken rather than typeset. */
export const Rich: React.FC<{
  text: string | Token[];
  theme: Theme;
  base: number;
  font: string;
  /** multiplier on base for the plain words */
  size?: number;
  delay?: number;
  reveal?: "word" | "all";
  align?: "center" | "left";
  /** ms between words */
  cadence?: number;
  maxWidth?: string;
}> = ({
  text, theme, base, font, size = 1, delay = 0,
  reveal = "word", align = "center", cadence = 55, maxWidth = "88%",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = typeof text === "string" ? parse(text) : text;
  const px = base * size;

  // A highlight is one continuous marker stroke, so consecutive ==marked== words share a
  // single box. Rendering them per-word gave a separate black rectangle around each word.
  type Group = { words: string[]; em: Token["em"]; index: number };
  const groups: Group[] = [];
  tokens.forEach((t, i) => {
    const last = groups[groups.length - 1];
    if (t.em === "mark" && last && last.em === "mark") last.words.push(t.text);
    else groups.push({ words: [t.text], em: t.em, index: i });
  });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        alignItems: "baseline",
        gap: `${px * 0.16}px ${px * 0.24}px`,
        maxWidth,
        fontFamily: font,
        lineHeight: 1.08,
      }}
    >
      {groups.map((t, gi) => {
        const p = reveal === "word"
          ? enter(frame, fps, delay + stagger(t.index, fps, cadence), "snap")
          : enter(frame, fps, delay, "snap");
        const strong = t.em === "bold" || t.em === "accent" || t.em === "mark";
        const color =
          t.em === "accent" ? theme.accent
          : t.em === "mark" ? theme.bg
          : strong ? theme.text
          : theme.muted;
        return (
          <span
            key={gi}
            style={{
              ...rise(p, px * 0.26),
              display: "inline-block",
              fontSize: strong ? px * 1.07 : px,
              fontWeight: strong ? WEIGHTS.black : WEIGHTS.medium,
              letterSpacing: strong ? "-0.038em" : "-0.02em",
              color,
              ...(t.em === "mark"
                ? {
                    background: theme.text,
                    borderRadius: px * 0.12,
                    padding: `${px * 0.06}px ${px * 0.16}px`,
                  }
                : {}),
            }}
          >
            {t.words.join(" ")}
          </span>
        );
      })}
    </div>
  );
};
