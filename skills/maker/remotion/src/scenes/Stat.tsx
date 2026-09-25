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
  const count = ramp(2, Math.round(fps * 0.9), Easing.out(Easing.cubic));
  const countPrev = interpolate(frame - 1, [2, 2 + Math.round(fps * 0.9)], [0, 1], {
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
  if (parts && style === "roll") {
    const chars = parts.digits.split("");
    const digitIdx = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
    number = (
      <>
        {parts.pre}
        {chars.map((c, i) => {
          if (!/\d/.test(c)) return <span key={i}>{c}</span>;
          const order = digitIdx.length - 1 - digitIdx.indexOf(i); // 0 = right-most
          const spins = Math.max(0, 2 - Math.floor(order / 2));
          const target = Number(c) + 10 * spins;
          const pos = target * count;
          const v = (target * count - target * countPrev) * numSize;
          return (
            <span key={i} style={{ display: "inline-block", height: "1em", overflow: "hidden",
              lineHeight: 1, verticalAlign: "bottom" }}>
              <span style={{ display: "flex", flexDirection: "column",
                transform: `translateY(${(-pos).toFixed(3)}em)`, filter: blurFilter(0, v, kit.blur) }}>
                {Array.from({ length: target + 1 }).map((_, k) => (
                  <span key={k} style={{ height: "1em" }}>{k % 10}</span>
                ))}
              </span>
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
      const now = target * count;
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
      {scene.icon ? (
        <div style={arrive(0, base * 0.5, "pop", { from: 0.5 })}>
          <Glyph name={scene.icon} size={base * 1.3} color={theme.accent} surface={theme.bg} />
        </div>
      ) : null}
      {ring !== undefined ? (
        <div style={{ ...arrive(0, base * 0.6, "pop", { from: 0.85 }), position: "relative",
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
        <div style={{ ...arrive(0, base * 0.9, "pop", { from: 0.7 }), ...numStyle }}>{number}</div>
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
