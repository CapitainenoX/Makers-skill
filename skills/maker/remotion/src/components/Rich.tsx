import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BREAK, parse, type Token } from "../text";
import { WEIGHTS, type Theme } from "../theme";
import { stagger, wordIn, wordProgress } from "../motion";
import { activeLook, type WordIn } from "../look";

/** A flowing sentence with per-word emphasis and a word-by-word reveal.
 *
 *  How the words arrive is the active look's business (blur-in, slot, swipe, stomp…), so
 *  the same deck text moves differently from one video to the next. Emphasised words take
 *  the look's `strong` entrance — a second voice, so the stress lands harder than the
 *  words around it. In looks with `inkSettle`, a word arrives pale and darkens as it
 *  lands: the eye is pulled to whichever word is still settling. */
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
  /** ms between words; defaults to the look's cadence */
  cadence?: number;
  maxWidth?: string;
  /** force an entrance instead of the look's */
  entrance?: WordIn;
}> = ({
  text, theme, base, font, size = 1, delay = 0,
  reveal = "word", align = "center", cadence, maxWidth = "88%", entrance,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const look = activeLook();
  const tokens = typeof text === "string" ? parse(text) : text;
  const px = base * size * look.textScale;
  const ms = cadence ?? look.cadence;

  // A highlight or an underline is one continuous stroke, so consecutive marked words
  // share one box. Rendering them per word gave a separate rectangle around each word.
  type Group = { words: string[]; em: Token["em"]; index: number; trail?: string };
  const groups: Group[] = [];
  tokens.forEach((t, i) => {
    const last = groups[groups.length - 1];
    // Punctuation left behind by a marker ("**JSON**, not") is its own token, and the
    // flex gap would push it off the word as "JSON , not". Glue it to the group before.
    const punct = /^[,.;:!?…)\]}»"']+$/.test(t.text);
    if (t.text === BREAK) {
      groups.push({ words: [], em: "plain", index: i });
      return;
    }
    if (punct && last) {
      last.trail = (last.trail ?? "") + t.text;
      return;
    }
    if ((t.em === "mark" || t.em === "under") && last && last.em === t.em) last.words.push(t.text);
    else groups.push({ words: [t.text], em: t.em, index: i });
  });

  const ghostInk = `color-mix(in srgb, ${theme.muted} 45%, ${theme.bg})`;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        alignItems: "baseline",
        gap: `${px * 0.14}px ${px * 0.24}px`,
        maxWidth,
        fontFamily: font,
        lineHeight: 1.06,
      }}
    >
      {groups.map((g, gi) => {
        if (!g.words.length) return <span key={gi} style={{ flexBasis: "100%", height: 0 }} />;
        const strong = g.em !== "plain" && g.em !== "italic";
        const kind: WordIn = entrance ?? (strong ? look.strong : look.word);
        const wordDelay = reveal === "word" ? delay + stagger(g.index, fps, ms) : delay;
        const chars = g.words.join(" ").length;
        const p = wordProgress(kind, frame, fps, wordDelay, chars);
        const prev = wordProgress(kind, frame - 1, fps, wordDelay, chars);
        const move = wordIn(kind, p, px, prev);

        const scale = g.em === "big" ? 1.55 : strong ? 1.07 : g.em === "italic" ? 1.03 : 1;
        const finalColor =
          g.em === "accent" ? theme.accent
          : g.em === "plain" ? theme.muted
          : theme.text;
        const ink = look.inkSettle ? move.ink : 1;
        const color = ink >= 1 ? finalColor
          : `color-mix(in srgb, ${finalColor} ${(ink * 100).toFixed(0)}%, ${ghostInk})`;

        const typo: React.CSSProperties = {
          display: "inline-block",
          position: "relative",
          fontSize: px * scale,
          fontWeight: g.em === "plain" ? WEIGHTS.medium
            : g.em === "italic" ? WEIGHTS.bold : WEIGHTS.black,
          fontStyle: g.em === "italic" ? "italic" : "normal",
          letterSpacing: strong ? (g.em === "big" ? "-0.05em" : "-0.038em") : "-0.02em",
          lineHeight: g.em === "big" ? 0.95 : undefined,
        };

        // Marker and underline strokes start once the word has landed, so they read as
        // someone marking the line, not as a label that arrived with it.
        const strokeStart = wordDelay + Math.round(fps * 0.2);
        const strokeFrames = Math.max(3, Math.round(fps * (g.em === "under" ? 0.32 : 0.26)));
        const sweep = interpolate(frame, [strokeStart, strokeStart + strokeFrames], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        let body: React.ReactNode;
        if (g.em === "mark") {
          const inked = interpolate(
            frame,
            [strokeStart + strokeFrames * 0.35, strokeStart + strokeFrames * 0.75],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          body = (
            <>
              <span
                style={{
                  position: "absolute",
                  inset: `${-px * 0.08}px ${-px * 0.2}px`,
                  background: theme.text,
                  borderRadius: px * 0.14,
                  boxShadow: `0 ${px * 0.25}px ${px * 0.5}px rgba(0,0,0,${0.22 * sweep})`,
                  transform: `scaleX(${sweep})`,
                  transformOrigin: "left center",
                }}
              />
              <span style={{ position: "relative", color: inked > 0.5 ? theme.bg : theme.text }}>
                {g.words.join(" ")}
              </span>
            </>
          );
        } else if (g.em === "ghost") {
          // Heavy but pale, with a soft vertical falloff — the counterweight to a black word.
          body = (
            <span
              style={{
                background: `linear-gradient(180deg, ${theme.muted} 0%, ${ghostInk} 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                opacity: 0.35 + 0.65 * ink,
              }}
            >
              {g.words.join(" ")}
            </span>
          );
        } else {
          body = <span style={{ color }}>{g.words.join(" ")}</span>;
        }

        const underline = g.em === "under" ? (
          <svg
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: "-6%",
              width: "112%",
              bottom: -px * 0.26,
              height: px * 0.3,
              overflow: "visible",
              clipPath: `inset(-50% ${(100 - sweep * 100).toFixed(1)}% -50% 0)`,
            }}
          >
            {/* a brush stroke: thin at the ends, heavy through the middle */}
            <path d="M1 12 C 40 5, 120 2, 199 6 C 150 9, 70 14, 3 18 Z" fill={theme.text} />
          </svg>
        ) : null;

        const inner = (
          <span style={{ ...typo, ...move.inner }}>
            {body}
            {underline}
            {g.trail ? <span style={{ color: theme.muted }}>{g.trail}</span> : null}
          </span>
        );
        return move.outer ? (
          <span key={gi} style={move.outer}>{inner}</span>
        ) : (
          <React.Fragment key={gi}>{inner}</React.Fragment>
        );
      })}
    </div>
  );
};
