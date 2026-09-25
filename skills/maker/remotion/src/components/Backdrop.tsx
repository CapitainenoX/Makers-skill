import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha } from "../color";
import { useKit } from "../kit";

export type BackdropKind = "plain" | "spotlight" | "mesh" | "grain" | "dots" | "lines";

/** The page behind a scene. Plain is the house look; the others give a scene a
 *  different floor without changing the grammar — a spotlight for the hook, a mesh on a
 *  dark chapter, grain for an editorial deck. Always slow, always low-contrast. */
export const Backdrop: React.FC<{ kind?: BackdropKind; bg: string; index: number }> = ({
  kind = "plain", bg, index,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { theme } = useKit();
  const t = frame / fps;
  const side = index % 2 === 0 ? 1 : -1;

  if (kind === "plain") return <AbsoluteFill style={{ background: bg }} />;

  if (kind === "spotlight") {
    const x = 50 + Math.sin(t * 0.5 + index) * 12 * side;
    const y = 38 + Math.cos(t * 0.4 + index) * 6;
    return (
      <AbsoluteFill style={{ background: bg }}>
        <AbsoluteFill style={{
          background: `radial-gradient(60% 42% at ${x}% ${y}%, ${alpha(theme.accent, theme.dark ? 0.22 : 0.1)}, transparent 70%),
            radial-gradient(50% 40% at ${100 - x}% ${100 - y}%, ${alpha(theme.text, theme.dark ? 0.06 : 0.035)}, transparent 70%)`,
        }} />
      </AbsoluteFill>
    );
  }

  if (kind === "mesh") {
    const blob = (i: number, color: string, a: number) => {
      const cx = 50 + Math.sin(t * 0.35 + i * 2.1 + index) * 30;
      const cy = 50 + Math.cos(t * 0.28 + i * 1.7 + index) * 32;
      return `radial-gradient(45% 32% at ${cx}% ${cy}%, ${alpha(color, a)}, transparent 72%)`;
    };
    return (
      <AbsoluteFill style={{ background: bg }}>
        <AbsoluteFill style={{
          background: [blob(0, theme.accent, theme.dark ? 0.38 : 0.16),
            blob(1, theme.text, theme.dark ? 0.1 : 0.06),
            blob(2, theme.accent, theme.dark ? 0.2 : 0.1)].join(","),
          filter: `blur(${width * 0.02}px)`,
        }} />
      </AbsoluteFill>
    );
  }

  if (kind === "grain") {
    return (
      <AbsoluteFill style={{ background: bg }}>
        <svg width={width} height={height} style={{ position: "absolute", inset: 0,
          opacity: theme.dark ? 0.12 : 0.07, mixBlendMode: theme.dark ? "screen" : "multiply" }}>
          <filter id={`grain${index}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"
              seed={frame % 6} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain${index})`} />
        </svg>
      </AbsoluteFill>
    );
  }

  if (kind === "dots") {
    const step = width * 0.05;
    return (
      <AbsoluteFill style={{ background: bg }}>
        <AbsoluteFill style={{
          backgroundImage: `radial-gradient(${alpha(theme.muted, 0.45)} ${Math.max(1.2, width * 0.0019)}px, transparent 0)`,
          backgroundSize: `${step}px ${step}px`,
          backgroundPosition: `${(t * 6 * side) % step}px ${(t * 4) % step}px`,
          WebkitMaskImage: "radial-gradient(70% 55% at 50% 50%, #000 20%, transparent 85%)",
          maskImage: "radial-gradient(70% 55% at 50% 50%, #000 20%, transparent 85%)",
        }} />
      </AbsoluteFill>
    );
  }

  // lines: faint diagonal hairlines drifting
  const gap = width * 0.06;
  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill style={{
        backgroundImage: `repeating-linear-gradient(${side > 0 ? 115 : 65}deg, ${alpha(theme.muted, 0.14)} 0 1.5px, transparent 1.5px ${gap}px)`,
        backgroundPosition: `${(t * 10) % gap}px 0`,
        WebkitMaskImage: "linear-gradient(180deg, #000, transparent 30%, transparent 70%, #000)",
        maskImage: "linear-gradient(180deg, #000, transparent 30%, transparent 70%, #000)",
      }} />
    </AbsoluteFill>
  );
};
