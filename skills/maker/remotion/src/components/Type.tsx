import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Line } from "../deck";
import { WEIGHTS, type Theme } from "../theme";
import { enter, stagger, textFxStyle, TEXT_SPRING, type SpringName } from "../motion";
import { useKit, type TextFx } from "../kit";
import type { Fonts, FontRole } from "./Fonts";
import { fitSize } from "../fit";

export const resolveColor = (c: Line["c"], theme: Theme) =>
  c === "accent" ? theme.accentInk : c === "muted" ? theme.muted
    : c === "text" || !c ? theme.text : c;

/** Which face a line gets, by importance. Explicit `f` wins; an italic line is the voice
 *  and goes to the serif; a big heavy line is display; everything else is body. */
export const roleOf = (l: Line): FontRole => {
  if (l.f) return l.f;
  if (l.i) return "serif";
  const heavy = WEIGHTS[l.w ?? "black"] >= 700;
  return heavy && (l.s ?? 1) >= 1.3 ? "display" : "body";
};

export const lineTypo = (l: Line, fonts: Fonts, size: number) => {
  const role = roleOf(l);
  if (role === "display") {
    const weight = fonts.name === "impact" ? fonts.displayWeight
      : l.w ? Math.max(WEIGHTS[l.w], 500) : fonts.displayWeight;
    return { role, family: fonts.display, weight, tracking: fonts.displayTracking,
      leading: fonts.displayLeading, upper: fonts.displayUpper, italic: false, size };
  }
  if (role === "serif") {
    return { role, family: fonts.serif, weight: 400, tracking: -0.01, leading: 1.02,
      upper: false, italic: fonts.serifItalic, size: size * 1.14 };
  }
  if (role === "mono") {
    return { role, family: fonts.mono, weight: WEIGHTS[l.w ?? "medium"], tracking: -0.01,
      leading: 1.1, upper: false, italic: false, size: size * 0.9 };
  }
  const weight = WEIGHTS[l.w ?? "black"];
  return { role, family: fonts.body, weight, tracking: weight >= 700 ? -0.035 : -0.015,
    leading: 1.02, upper: false, italic: false, size };
};

/** A stack of mixed-weight lines that cascade in. This is the workhorse:
 *  a small light line above a huge black line is the entire typographic idea.
 *  Display lines are auto-fitted to the frame so they never wrap or overflow. */
export const TypeStack: React.FC<{
  lines: Line[];
  theme?: Theme;
  base?: number;
  font?: string;
  align?: "center" | "left";
  delay?: number;
  anim?: SpringName;
  staggerMs?: number;
  /** "word" pops each word in turn — narration lines land better that way */
  reveal?: "line" | "word";
  fx?: TextFx;
  /** max line width in px (defaults to 88% of the frame) */
  maxWidth?: number;
}> = ({ lines, align = "center", delay = 0, anim, staggerMs = 70, reveal = "line", fx,
        maxWidth }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { theme, fonts, base, blur, textFx } = useKit();
  const effect = fx ?? textFx;
  const preset = anim ?? TEXT_SPRING[effect];
  const maxW = maxWidth ?? width * 0.88;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
        gap: base * 0.1,
        width: "100%",
      }}
    >
      {lines.map((l, i) => {
        const lineDelay = delay + stagger(i, fps, staggerMs);
        const typo = lineTypo(l, fonts, base * (l.s ?? 1));
        const text = String(l.t);
        // Display lines stay on one line: shrink to fit instead of wrapping.
        const size = typo.role === "display" && text.length < 40
          ? fitSize(text, { family: typo.family, weight: typo.weight, size: typo.size,
              tracking: typo.tracking, maxWidth: maxW, upper: typo.upper })
          : typo.size;
        const common: React.CSSProperties = {
          fontFamily: typo.family,
          fontSize: size,
          fontWeight: typo.weight,
          fontStyle: typo.italic ? "italic" : "normal",
          color: resolveColor(l.c, theme),
          lineHeight: typo.leading,
          letterSpacing: `${typo.tracking}em`,
          textTransform: typo.upper ? "uppercase" : undefined,
          maxWidth: maxW,
          textWrap: "balance",
          whiteSpace: typo.role === "display" && text.length < 40 ? "nowrap" : undefined,
        };

        if (reveal === "word") {
          const words = text.split(/\s+/).filter(Boolean);
          return (
            <div key={i} style={common}>
              {words.map((w, j) => {
                const d = lineDelay + stagger(j, fps, 42);
                const a = textFxStyle(effect, enter(frame, fps, d, preset),
                  enter(frame - 1, fps, d, preset), size, blur);
                return (
                  <React.Fragment key={j}>
                    {j ? " " : null}
                    <span style={a.outer}><span style={a.inner}>{w}</span></span>
                  </React.Fragment>
                );
              })}
            </div>
          );
        }
        const a = textFxStyle(effect, enter(frame, fps, lineDelay, preset),
          enter(frame - 1, fps, lineDelay, preset), size, blur);
        return (
          <div key={i} style={{ ...common, ...(a.outer ?? {}), display: "block" }}>
            <span style={{ ...a.inner, display: "inline-block" }}>{text}</span>
          </div>
        );
      })}
    </div>
  );
};
