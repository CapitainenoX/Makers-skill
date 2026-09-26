import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { parse, type Token } from "../text";
import { WEIGHTS } from "../theme";
import { useKit, type TextFx } from "../kit";
import { enter, stagger, textFxStyle, TEXT_CADENCE, TEXT_SPRING } from "../motion";
import { Glyph } from "./Glyph";

/** A flowing sentence with per-word emphasis and a quick ripple reveal.
 *
 *  Each marker is a level of importance, and each level has its own face: plain words in
 *  the body face, muted; `**bold**` heavier and darker; `*serif*` in the italic serif — the
 *  editorial contrast; `__accent__` in the brand colour. Emphasised words are a touch
 *  larger: the size bump is what makes the sentence read as spoken rather than typeset. */
export const Rich: React.FC<{
  text: string | Token[];
  /** multiplier on base for the plain words */
  size?: number;
  delay?: number;
  reveal?: "word" | "all";
  align?: "center" | "left";
  /** ms between words; defaults to the effect's own cadence */
  cadence?: number;
  maxWidth?: string;
  /** entrance effect; defaults to the scene's */
  fx?: TextFx;
  /** light text for captions over footage */
  inverse?: boolean;
  /** seconds (from the scene start) at which each token is spoken — voice sync. Only the
   *  first is used: it is when the whole sentence lands */
  times?: number[];
  /** base font for plain + bold words (defaults to the body face). `serif` sets the
   *  whole sentence in the serif — quotations — with emphasis as italics */
  face?: "body" | "display" | "serif";
}> = ({
  text, size = 1, delay = 0, reveal = "word", align = "center", cadence,
  maxWidth = "88%", fx, inverse = false, face = "body", times,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { theme, fonts, base, blur, textFx, mono } = useKit();
  const effect = fx ?? textFx;
  const tokens = typeof text === "string" ? parse(text) : text;
  const px = base * size;
  const gapMs = cadence ?? TEXT_CADENCE[effect];
  const preset = TEXT_SPRING[effect];

  const serifFace = face === "serif";
  const plainColor = inverse ? "rgba(255,255,255,0.78)" : serifFace ? theme.text : theme.muted;
  const strongColor = inverse ? "#FFFFFF" : theme.text;
  const family = face === "display" ? fonts.display : serifFace ? fonts.serif : fonts.body;
  const upper = face === "display" && fonts.displayUpper;

  // A highlight and an underline are one continuous stroke, so consecutive marked words
  // share a single group. Rendering them per word gave a box around each word.
  type Group = { words: string[]; em: Token["em"]; index: number; trail?: string };
  const groups: Group[] = [];
  tokens.forEach((t, i) => {
    const last = groups[groups.length - 1];
    // Punctuation left behind by a marker ("**JSON**, not") is its own token, and the
    // flex gap would push it off the word as "JSON , not". Glue it to the group before.
    const punct = /^[,.;:!?…)\]}»"']+$/.test(t.text);
    if (punct && last && t.em === "plain") {
      last.trail = (last.trail ?? "") + t.text;
      return;
    }
    if ((t.em === "mark" || t.em === "under" || (t.em === "accent" && mono)) && last && last.em === t.em) last.words.push(t.text);
    else groups.push({ words: [t.text], em: t.em, index: i });
  });

  // Voice sync sets when the sentence lands — its first spoken word — not when each word
  // does: the whole caption ripples in at once, then holds still to be read.
  const start = typeof times?.[0] === "number" ? Math.max(0, Math.round((times[0] - 0.08) * fps)) : delay;
  const at = (i: number) => reveal === "word" ? start + stagger(i, fps, gapMs) : start;
  const lastShown = groups.reduce((acc, g, gi) => frame >= at(g.index) ? gi : acc, -1);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        alignItems: "baseline",
        gap: `${px * 0.14}px ${px * 0.24}px`,
        maxWidth,
        fontFamily: family,
        lineHeight: 1.1,
        textTransform: upper ? "uppercase" : undefined,
      }}
    >
      {groups.map((g, gi) => {
        const d = at(g.index);
        const p = enter(frame, fps, d, preset);
        const q = enter(frame - 1, fps, d, preset);
        const anim = textFxStyle(effect, p, q, px, blur);
        const strong = g.em !== "plain";
        const word = g.words.join(" ");
        const caret = effect === "type" && gi === lastShown && Math.floor(frame / 8) % 2 === 0;

        const typo: React.CSSProperties = serifFace
          ? { fontSize: px, fontWeight: 400, letterSpacing: "-0.01em",
              fontStyle: strong && fonts.serifItalic ? "italic" : "normal" }
          : {
              fontSize: strong ? px * 1.07 : px,
              fontWeight: strong ? (face === "display" ? fonts.displayWeight : WEIGHTS.black) : WEIGHTS.medium,
              letterSpacing: strong ? "-0.038em" : "-0.02em",
            };
        const wrap = (node: React.ReactNode) => (
          <span key={gi} style={anim.outer}>
            <span style={{ ...anim.inner, ...typo, position: "relative" }}>
              {node}
              {g.trail ? <span style={{ color: plainColor }}>{g.trail}</span> : null}
              {caret ? (
                <span style={{ position: "absolute", right: -px * 0.14, top: "8%", bottom: "8%",
                  width: Math.max(2, px * 0.06), background: theme.accent }} />
              ) : null}
            </span>
          </span>
        );

        if (g.em === "icon") {
          return wrap(
            <span style={{ display: "inline-flex", verticalAlign: "middle",
              transform: `translateY(${px * 0.12}px)` }}>
              <Glyph name={g.words[0]} size={px * 1.02} color={strongColor}
                surface={inverse ? "#111111" : theme.bg} />
            </span>,
          );
        }

        if (g.em === "serif") {
          return wrap(
            <span style={{ fontFamily: fonts.serif, fontStyle: fonts.serifItalic ? "italic" : "normal",
              fontWeight: 400, fontSize: px * 1.16, letterSpacing: "-0.01em",
              textTransform: "none", color: strongColor }}>
              {word}
            </span>,
          );
        }

        if (g.em === "mark") {
          // The words arrive as normal text, then the marker strokes across them and the
          // ink flips. Painting the box with the word reads as a label; the sweep reads
          // as someone highlighting a line.
          const sweepStart = d + Math.round(fps * 0.2);
          const sweepFrames = Math.max(3, Math.round(fps * 0.26));
          const sweep = interpolate(frame, [sweepStart, sweepStart + sweepFrames], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
          });
          // The ink flips only where the box has passed: flipping the whole phrase at once
          // turned the words not yet covered into dark-on-dark, and they vanished.
          const box = inverse ? "#FFFFFF" : theme.text;
          const cut = `inset(-20% ${((1 - sweep) * 100).toFixed(2)}% -20% 0)`;
          return wrap(
            <>
              <span style={{ position: "absolute", inset: `${-px * 0.06}px ${-px * 0.16}px`,
                background: box, borderRadius: px * 0.1,
                transform: `scaleX(${sweep})`, transformOrigin: "left center" }} />
              <span style={{ position: "relative", color: strongColor }}>{word}</span>
              <span style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap",
                color: inverse ? "#0A0A0B" : theme.bg, clipPath: cut }}>
                {word}
              </span>
            </>,
          );
        }

        // In black and white an accent colour would be the ink itself — it becomes an
        // underline instead, so the word is still singled out.
        if (g.em === "under" || (g.em === "accent" && mono)) {
          // A hand-drawn stroke that draws itself under the words once they have landed.
          const drawStart = d + Math.round(fps * 0.18);
          const draw = interpolate(frame, [drawStart, drawStart + Math.round(fps * 0.34)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
          });
          return wrap(
            <>
              <span style={{ position: "relative", color: strongColor }}>{word}</span>
              <svg viewBox="0 0 200 20" preserveAspectRatio="none"
                style={{ position: "absolute", left: "-4%", width: "108%", bottom: -px * 0.2,
                  height: px * 0.3, overflow: "visible" }}>
                <path d="M3 13 C 40 5, 90 5, 130 9 S 185 15, 197 8" fill="none"
                  stroke={theme.accent === theme.text ? theme.text : theme.accent}
                  strokeWidth={7} strokeLinecap="round" pathLength={1}
                  strokeDasharray="1 1" strokeDashoffset={1 - draw} />
              </svg>
            </>,
          );
        }

        return wrap(
          <span style={{ color: g.em === "accent" ? (inverse ? theme.accent : theme.accentInk)
            : strong ? strongColor : plainColor }}>
            {word}
          </span>,
        );
      })}
    </div>
  );
};
