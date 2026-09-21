import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, rise } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** One enormous number. The whole frame is the number; everything else whispers. */
export const Stat: React.FC<SceneProps<"stat">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps, 0, "pop");
  const q = enter(frame, fps, 6, "smooth");

  // Digits ride their own monotonic ramp, never the spring: a spring oscillates, and a
  // counter that reads 1,240 -> 1,228 -> 1,240 looks broken rather than lively.
  const count = interpolate(frame, [0, Math.round(fps * 0.8)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // "40K", "38s", "1,200+" -> animate the digits, keep the suffix
  const shown = (() => {
    if (scene.countUp === false) return scene.value;
    const m = /^([^\d]*)([\d.,\u00A0\u202F ]*\d)(.*)$/.exec(String(scene.value));
    if (!m) return scene.value;
    const [, pre, digits, post] = m;
    const decimals = (digits.split(".")[1] ?? "").length;
    const target = parseFloat(digits.replace(/[,\u00A0\u202F ]/g, ""));
    if (!isFinite(target)) return scene.value;
    // "1,165,980" and "1 165 980" both count up in the style they were written in
    const sepMatch = /\d([,\u00A0\u202F ])\d{3}/.exec(digits);
    const sep = sepMatch ? sepMatch[1] : null;
    const now = target * count;
    const text = decimals
      ? now.toFixed(decimals)
      : sep
        ? String(Math.round(now)).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
        : String(Math.round(now));
    return `${pre}${text}${post}`;
  })();
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "center",
        gap: base * 0.25,
        padding: `${base * 1.6}px ${base * 0.7}px`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          ...rise(p, base * 0.6),
          fontFamily: font,
          fontSize: base * 3.1,
          fontWeight: WEIGHTS.black,
          letterSpacing: "-0.055em",
          lineHeight: 0.9,
          color: theme.accent,
        }}
      >
        {shown}
      </div>
      {scene.label ? (
        <div
          style={{
            ...rise(q, base * 0.35),
            fontFamily: font,
            fontSize: base * 0.95,
            fontWeight: WEIGHTS.bold,
            letterSpacing: "-0.03em",
            color: theme.text,
          }}
        >
          {scene.label}
        </div>
      ) : null}
      {scene.sub ? (
        <div
          style={{
            ...rise(enter(frame, fps, 11, "smooth"), base * 0.3),
            fontFamily: font,
            fontSize: base * 0.45,
            fontWeight: WEIGHTS.medium,
            color: theme.muted,
          }}
        >
          {scene.sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
