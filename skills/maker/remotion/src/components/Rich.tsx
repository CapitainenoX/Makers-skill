import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
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
  type Group = { words: string[]; em: Token["em"]; index: number; trail?: string };
  const groups: Group[] = [];
  tokens.forEach((t, i) => {
    const last = groups[groups.length - 1];
    // Punctuation left behind by a marker ("**JSON**, not") is its own token, and the
    // flex gap would push it off the word as "JSON , not". Glue it to the group before.
    const punct = /^[,.;:!?…)\]}»"']+$/.test(t.text);
    if (punct && last) {
      last.trail = (last.trail ?? "") + t.text;
      return;
    }
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
        const base3 = rise(p, px * 0.26);
        const typo: React.CSSProperties = {
          display: "inline-block",
          fontSize: strong ? px * 1.07 : px,
          fontWeight: strong ? WEIGHTS.black : WEIGHTS.medium,
          letterSpacing: strong ? "-0.038em" : "-0.02em",
        };

        if (t.em === "mark") {
          // The words arrive as normal text, then the marker strokes across them and the
          // ink flips. Painting the box at the same instant as the word reads as a static
          // label; the sweep reads as someone highlighting a line.
          const wordDelay = delay + stagger(t.index, fps, cadence);
          const sweepStart = wordDelay + Math.round(fps * 0.2);
          const sweepFrames = Math.max(3, Math.round(fps * 0.26));
          const sweep = interpolate(frame, [sweepStart, sweepStart + sweepFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const inked = interpolate(
            frame,
            [sweepStart + sweepFrames * 0.35, sweepStart + sweepFrames * 0.75],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <span key={gi} style={{ ...base3, ...typo, position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  inset: `${-px * 0.06}px ${-px * 0.16}px`,
                  background: theme.text,
                  borderRadius: px * 0.1,
                  transform: `scaleX(${sweep})`,
                  transformOrigin: "left center",
                }}
              />
              <span
                style={{
                  position: "relative",
                  color: inked > 0.5 ? theme.bg : theme.text,
                  transition: "none",
                }}
              >
                {t.words.join(" ")}
              </span>
              {t.trail ? (
                <span style={{ position: "relative", color: theme.muted }}>{t.trail}</span>
              ) : null}
            </span>
          );
        }

        return (
          <span
            key={gi}
            style={{
              ...base3,
              ...typo,
              color: t.em === "accent" ? theme.accent : strong ? theme.text : theme.muted,
            }}
          >
            {t.words.join(" ")}
            {t.trail ? <span style={{ color: theme.muted }}>{t.trail}</span> : null}
          </span>
        );
      })}
    </div>
  );
};
