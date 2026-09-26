import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { blurFilter, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { fitSize } from "../fit";
import { Glyph } from "../components/Glyph";
import { RichCaption } from "../components/Stage";
import { justify } from "../deck";
import type { SceneProps } from "./types";

const splitValue = (value: string) => {
  const m = /^([^\d]*)([\d.,   ]*\d)(.*)$/.exec(value);
  return m ? { pre: m[1], digits: m[2], post: m[3] } : null;
};

/** One enormous number. The whole frame is the number; everything else whispers.
 *
 *  `count` ramps the value up; `roll` spins each digit like an odometer, the right-most
 *  fastest, with a vertical smear while it spins. Both are monotonic — a spring
 *  oscillates, and a counter that reads 1,240 -> 1,228 -> 1,240 looks broken. */
export const Stat: React.FC<SceneProps<"stat">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive, ramp } = useAnim();
  const { theme, fonts, base } = kit;
  // The count lands exactly when the number is said (voice sync), else ~0.9 s in.
  const spoken = kit.cues?.value;
  const runF = Math.round(fps * (typeof spoken === "number" ? 1.2 : 0.9));
  const endF = typeof spoken === "number" ? Math.max(runF, Math.round((spoken + 0.1) * fps)) : 2 + runF;
  const startF = Math.max(2, endF - runF);
  const count = ramp(startF, endF - startF, Easing.out(Easing.cubic));
  const countPrev = interpolate(frame - 1, [startF, endF], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const value = String(scene.value);
  const parts = scene.countUp === false ? null : splitValue(value);
  const style = scene.style ?? "count";
  const ring = scene.ring;
  const upper = fonts.displayUpper;
  const numSize = fitSize(value, { family: fonts.display, weight: fonts.displayWeight,
    size: base * (ring !== undefined ? 2.3 : 3.1), tracking: fonts.displayTracking - 0.01,
    maxWidth: width * (ring !== undefined ? 0.56 : 0.86), upper });

  const numStyle: React.CSSProperties = {
    fontFamily: fonts.display, fontSize: numSize, fontWeight: fonts.displayWeight,
    letterSpacing: `${fonts.displayTracking - 0.01}em`, lineHeight: 1, color: theme.accentInk,
    textTransform: upper ? "uppercase" : undefined, fontVariantNumeric: "tabular-nums",
    display: "flex", alignItems: "baseline", whiteSpace: "nowrap",
  };

  let number: React.ReactNode = value;
  // `from` makes a year or a big number arrive from somewhere near it (1990 -> 2000)
  // instead of from zero, which reads as a glitch for anything that is not a count.
  if (parts && style === "roll") {
    // A real odometer: one continuous value; the units column turns with it and every
    // higher column only flips during the carry (…999 -> …000), the way the wheels of a
    // meter move. Half-turned columns never sit on screen for more than a few frames.
    const chars = parts.digits.split("");
    const digitIdx = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
    const target = Number(chars.filter((c) => /\d/.test(c)).join(""));
    const from = scene.from !== undefined ? Number(scene.from) : Math.max(0, target - 19);
    const val = from + (target - from) * count;
    const valPrev = from + (target - from) * countPrev;
    number = (
      <>
        {parts.pre}
        {chars.map((c, i) => {
          if (!/\d/.test(c)) return <span key={i}>{c}</span>;
          const k = digitIdx.length - 1 - digitIdx.indexOf(i);   // 0 = units
          const unit = 10 ** k;
          const digitAt = (v: number) => Math.floor(v / unit) % 10;
          const fracAt = (v: number) => k === 0 ? v - Math.floor(v)
            : Math.max(0, Math.min(1, (v % unit) - (unit - 1)));
          const cur = digitAt(val);
          const frac = count >= 1 ? 0 : fracAt(val);
          const nxt = (cur + 1) % 10;
          const speed = Math.abs((digitAt(val) + fracAt(val)) - (digitAt(valPrev) + fracAt(valPrev)));
          const smear = blurFilter(0, Math.min(speed, 1.5) * numSize * 0.18, kit.blur);
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", overflow: "hidden",
              clipPath: "inset(0)" }}>
              <span style={{ visibility: "hidden" }}>{c}</span>
              <span style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: "center",
                transform: `translateY(${(-frac * 100).toFixed(2)}%)`, filter: smear }}>{cur}</span>
              {frac > 0.001 ? (
                <span style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: "center",
                  transform: `translateY(${((1 - frac) * 100).toFixed(2)}%)`, filter: smear }}>{nxt}</span>
              ) : null}
            </span>
          );
        })}
        {parts.post}
      </>
    );
  } else if (parts) {
    const decimals = (parts.digits.split(".")[1] ?? "").length;
    const target = parseFloat(parts.digits.replace(/[,   ]/g, ""));
    if (isFinite(target)) {
      // "1,165,980" and "1 165 980" both count up in the style they were written in
      const sep = /\d([,   ])\d{3}/.exec(parts.digits)?.[1] ?? null;
      const base0 = scene.from !== undefined ? Number(scene.from) : 0;
      const now = base0 + (target - base0) * count;
      const text = decimals ? now.toFixed(decimals)
        : sep ? String(Math.round(now)).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
        : String(Math.round(now));
      number = `${parts.pre}${text}${parts.post}`;
    }
  }

  const R = 46;
  const ringSize = width * 0.7;
  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center", gap: base * 0.28,
      padding: `${base * 1.6}px ${base * 0.7}px`, textAlign: "center" }}>
      {scene.kicker ? (
        <div style={{ ...arrive(0, base * 0.4, "snap"), fontFamily: fonts.mono, fontSize: base * 0.5,
          letterSpacing: "0.08em", textTransform: "uppercase", color: theme.muted }}>
          {scene.kicker}
        </div>
      ) : null}
      {scene.icon ? (
        <div style={arrive(0, base * 0.5, "pop", { from: 0.5 })}>
          <Glyph name={scene.icon} size={base * 1.3} color={theme.accent} surface={theme.bg} />
        </div>
      ) : null}
      {ring !== undefined ? (
        <div style={{ ...arrive(0, base * 0.6, "pop", { from: 0.85 }), filter: undefined, position: "relative",
          width: ringSize, height: ringSize, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 100 100" width={ringSize} height={ringSize} style={{ position: "absolute", inset: 0 }}>
            <circle cx="50" cy="50" r={R} fill="none" stroke={alpha(theme.muted, 0.16)} strokeWidth="5" />
            <circle cx="50" cy="50" r={R} fill="none" stroke={theme.accent} strokeWidth="5"
              strokeLinecap="round" pathLength={1} strokeDasharray="1 1"
              strokeDashoffset={1 - Math.max(0, Math.min(1, ring)) * count} transform="rotate(-90 50 50)" />
          </svg>
          <div style={numStyle}>{number}</div>
        </div>
      ) : (
        // no motion-blur filter on this block: a url() filter on an ancestor makes
        // Chromium ignore the digit strips' clipping, and two rows of digits show
        <div style={{ ...arrive(Math.max(0, startF - 4), base * 0.9, "pop", { from: 0.7 }), filter: undefined,
          ...numStyle }}>{number}</div>
      )}
      {scene.label ? (
        <div style={{ ...arrive(6, base * 0.4, "smooth"), fontFamily: fonts.body, fontSize: base * 0.95,
          fontWeight: WEIGHTS.black, letterSpacing: "-0.035em", color: theme.text }}>
          {scene.label}
        </div>
      ) : null}
      {scene.sub ? (
        <div style={{ ...arrive(11, base * 0.3, "smooth"), fontFamily: fonts.serif, fontStyle: "italic",
          fontSize: base * 0.62, color: theme.muted }}>
          {scene.sub}
        </div>
      ) : null}
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
