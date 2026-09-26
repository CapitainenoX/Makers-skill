import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { blurFilter, cueAt, enter, useAnim } from "../motion";
import { parse, strip } from "../text";
import { fitSize } from "../fit";
import type { SceneProps } from "./types";

/** Full-frame kinetic type — the pattern interrupt made of words alone.
 *
 *  - `stack`: every line fills the width at its own size (the "justified poster"), each
 *    one rising out of a mask in turn.
 *  - `punch`: one line at a time, huge, slamming in and replacing the last — for a
 *    three-word hook or a countdown.
 *  - `slide`: lines whip in from alternating sides with a horizontal smear.
 *
 *  Inside a line, `**x**` stays in the ink, `__x__` takes the accent, `*x*` switches to
 *  the italic serif — mixing a condensed grotesque with an italic serif in the same
 *  poster is the most "designed" thing type can do. */
export const Kinetic: React.FC<SceneProps<"kinetic">> = ({ scene, durationInFrames }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame } = useAnim();
  const { theme, fonts, base } = kit;
  const style = scene.style ?? "stack";
  const lines = scene.lines.length ? scene.lines : [" "];
  const maxW = width * 0.88;

  const renderLine = (line: string, size: number) => {
    // consecutive accent words share one reversed block ("one line", not "one" "line")
    const tokens = parse(line).reduce<ReturnType<typeof parse>>((acc, t) => {
      const last = acc[acc.length - 1];
      if (last && last.em === "accent" && t.em === "accent") last.text += ` ${t.text}`;
      else acc.push({ ...t });
      return acc;
    }, []);
    // same rule as a rich caption: once a line has bold words, the plain ones step back
    const hasBold = tokens.some((t) => t.em === "bold");
    return (
    <>
      {tokens.map((t, j) => {
        const serif = t.em === "serif";
        return (
          <React.Fragment key={j}>
            {j ? " " : null}
            <span style={{
              fontFamily: serif ? fonts.serif : fonts.display,
              fontStyle: serif && fonts.serifItalic ? "italic" : "normal",
              fontWeight: serif ? 400 : fonts.displayWeight,
              textTransform: !serif && fonts.displayUpper ? "uppercase" : "none",
              fontSize: serif ? size * 1.08 : size,
              letterSpacing: serif ? "-0.02em" : `${fonts.displayTracking}em`,
              color: t.em === "accent" ? (kit.mono ? theme.bg : theme.accentInk)
                : t.em === "plain" && hasBold ? theme.muted : theme.text,
              ...(t.em === "accent" && kit.mono ? { background: theme.text, padding: "0 0.08em",
                boxDecorationBreak: "clone" as const } : {}),
            }}>{t.text}</span>
          </React.Fragment>
        );
      })}
    </>
    );
  };
  const sizeFor = (line: string, cap: number) => fitSize(strip(line), { family: fonts.display,
    weight: fonts.displayWeight, size: cap, tracking: fonts.displayTracking, maxWidth: maxW,
    upper: fonts.displayUpper, floor: 0.3 });

  if (style === "punch") {
    // one line at a time: on its spoken word when synced, else evenly
    const per = Math.max(1, Math.floor(durationInFrames / lines.length));
    // every line holds at least 0.8 s, even when the voice says the next one sooner —
    // a line replaced after a third of a second is a line nobody read
    const hold = Math.round(fps * 0.8);
    const startOf = (i: number): number =>
      i === 0 ? cueAt(kit.cues, "items", 0, fps, 0)
        : Math.max(cueAt(kit.cues, "items", i, fps, i * per), startOf(i - 1) + hold);
    let idx = 0;
    lines.forEach((_, i) => { if (frame >= startOf(i)) idx = i; });
    const local = frame - startOf(idx);
    const p = enter(local, fps, 0, "slam");
    const q = enter(local - 1, fps, 0, "slam");
    const size = sizeFor(lines[idx], base * 3.2);
    const scale = 1.35 - 0.35 * p;
    const v = (q - p) * 0.35 * size;
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: `scale(${scale.toFixed(4)})`, opacity: Math.min(1, p * 3),
          filter: v ? `blur(${Math.min(12, Math.abs(v) * 0.4).toFixed(2)}px)` : undefined,
          lineHeight: fonts.displayLeading, textAlign: "center", whiteSpace: "nowrap",
          fontFamily: fonts.display, fontSize: size }}>
          {renderLine(lines[idx], size)}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: scene.align === "left" ? "flex-start" : "center",
      padding: `0 ${width * 0.06}px`, gap: base * 0.08 }}>
      {lines.map((line, i) => {
        const size = sizeFor(line, base * (lines.length <= 2 ? 3.2 : 2.4));
        const d = cueAt(kit.cues, "items", i, fps, 2 + i * Math.round(fps * 0.11));
        if (style === "slide") {
          const p = enter(frame, fps, d, "snap");
          const q = enter(frame - 1, fps, d, "snap");
          const side = i % 2 === 0 ? -1 : 1;
          const dist = width * 0.9;
          return (
            <div key={i} style={{ lineHeight: fonts.displayLeading, whiteSpace: "nowrap",
              fontFamily: fonts.display, fontSize: size,
              transform: `translateX(${(side * (1 - p) * dist).toFixed(2)}px)`,
              filter: blurFilter((q - p) * side * dist, 0, kit.blur * 1.4) }}>
              {renderLine(line, size)}
            </div>
          );
        }
        const m = interpolate(frame, [d, d + Math.round(fps * 0.42)], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
        const mv = interpolate(frame - 1, [d, d + Math.round(fps * 0.42)], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
        return (
          <div key={i} style={{ overflow: "hidden", lineHeight: fonts.displayLeading,
            fontFamily: fonts.display, fontSize: size,
            // once landed, lines keep sliding a little in opposite directions: parallax
            // that keeps a poster alive without moving what the eye is reading
            transform: `translate3d(${((i % 2 ? 1 : -1) * interpolate(frame, [d, d + durationInFrames], [0, width * 0.035], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp" })).toFixed(2)}px, 0, 0)`, willChange: "transform",
            paddingBottom: size * 0.08, marginBottom: -size * 0.08, whiteSpace: "nowrap" }}>
            <div style={{ transform: `translateY(${((1 - m) * 105).toFixed(2)}%)`,
              filter: blurFilter(0, (m - mv) * size, kit.blur) }}>
              {renderLine(line, size)}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
