import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";

export type DecorKind =
  | "rays" | "blobs" | "grid" | "arcs"
  | "frame" | "lines" | "cross" | "orbit" | "bars"
  | "none";
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type DecorSpec = {
  kind?: DecorKind;
  corners?: Corner[];
  opacity?: number;
  scale?: number;
};

const place = (c: Corner, size: number, w: number, h: number): React.CSSProperties => ({
  position: "absolute",
  width: size,
  height: size,
  left: c.endsWith("left") ? -size * 0.5 : undefined,
  right: c.endsWith("right") ? -size * 0.5 : undefined,
  top: c.startsWith("top") ? -size * 0.42 : undefined,
  bottom: c.startsWith("bottom") ? -size * 0.42 : undefined,
});

/** Shapes that bleed off the edges so the top and bottom of a 9:16 frame are never
 *  dead space. Deliberately slow and low-contrast: this is wallpaper, not an event. */
const KINDS: DecorKind[] = ["rays", "frame", "arcs", "lines", "blobs", "cross", "grid", "orbit", "bars"];
const CORNER_SETS: Corner[][] = [
  ["top-left", "bottom-right"], ["top-right", "bottom-left"],
  ["top-left"], ["bottom-right"], ["top-right"], ["bottom-left"],
  ["top-left", "top-right"], ["bottom-left", "bottom-right"],
];

/** `seed` and `index` pick the family and the corners when the deck does not name them,
 *  so the border treatment differs between scenes AND between videos. */
export const Decor: React.FC<{
  spec?: DecorSpec;
  theme: Theme;
  seed?: number;
  index?: number;
}> = ({ spec, theme, seed = 0, index = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const pick = seed + index;
  const kind: DecorKind = spec?.kind ?? (spec ? "none" : KINDS[pick % KINDS.length]);
  if (kind === "none") return null;

  const t = frame / fps;
  const corners = spec?.corners ?? CORNER_SETS[pick % CORNER_SETS.length];
  const opacity = spec?.opacity ?? 0.05;
  const size = width * (spec?.scale ?? 0.82);

  // Full-frame families: they own the whole edge rather than one corner.
  if (kind === "frame" || kind === "lines" || kind === "cross" || kind === "bars") {
    return (
      <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
        <EdgeDecor kind={kind} theme={theme} t={t} width={width} height={height}
          opacity={spec?.opacity} corners={corners} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {kind === "grid" ? (
        <AbsoluteFill
          style={{
            opacity: opacity * 0.9,
            backgroundImage: `radial-gradient(${theme.muted} ${Math.max(1, width * 0.0016)}px, transparent 0)`,
            backgroundSize: `${width * 0.055}px ${width * 0.055}px`,
          }}
        />
      ) : null}

      {kind !== "grid"
        ? corners.map((c, i) => {
            const dir = i % 2 === 0 ? 1 : -1;
            const spin = t * 2.1 * dir;
            const breathe = 1 + Math.sin(t * 0.55 + i) * 0.03;
            const style = {
              ...place(c, size, width, height),
              opacity,
              transform: `rotate(${spin}deg) scale(${breathe})`,
            };
            if (kind === "rays") {
              return (
                <svg key={c + i} viewBox="0 0 100 100" style={style}>
                  <g fill={theme.accent}>
                    {Array.from({ length: 12 }).map((_, k) => (
                      <path key={k} d="M50 2 L55 46 Q50 51 45 46 Z"
                        transform={`rotate(${k * 30} 50 50)`} />
                    ))}
                    <circle cx="50" cy="50" r="8" />
                  </g>
                </svg>
              );
            }
            if (kind === "orbit") {
              // one wide ellipse and a satellite dot riding it
              const a = t * 0.35 * dir + i;
              return (
                <svg key={c + i} viewBox="0 0 100 100" style={{ ...style, opacity: opacity * 2.4 }}>
                  <ellipse cx="50" cy="50" rx="47" ry="30" fill="none" stroke={theme.muted}
                    strokeWidth="0.35" transform="rotate(-18 50 50)" />
                  <ellipse cx="50" cy="50" rx="36" ry="22" fill="none" stroke={theme.muted}
                    strokeWidth="0.25" strokeDasharray="1 2" transform="rotate(-18 50 50)" />
                  <circle cx={50 + 47 * Math.cos(a)} cy={50 + 30 * Math.sin(a)} r="1.4"
                    fill={theme.accent} transform="rotate(-18 50 50)" />
                </svg>
              );
            }
            if (kind === "arcs") {
              return (
                <svg key={c + i} viewBox="0 0 100 100" style={style}>
                  {[46, 34, 22].map((r, k) => (
                    <circle key={k} cx="50" cy="50" r={r} fill="none"
                      stroke={k === 1 ? theme.accent : theme.muted} strokeWidth="1.2" />
                  ))}
                </svg>
              );
            }
            return (
              <div
                key={c + i}
                style={{
                  ...style,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 40% 40%, ${theme.accent}, transparent 66%)`,
                  filter: `blur(${width * 0.035}px)`,
                }}
              />
            );
          })
        : null}
    </AbsoluteFill>
  );
};

/** Edge treatments in the editorial register: hairlines, registration marks, brackets.
 *  Low contrast and slow, like the corner shapes, but they read as print, not wallpaper. */
const EdgeDecor: React.FC<{
  kind: "frame" | "lines" | "cross" | "bars";
  theme: Theme; t: number; width: number; height: number;
  opacity?: number; corners: Corner[];
}> = ({ kind, theme, t, width, height, opacity, corners }) => {
  const u = width / 100;
  const ink = theme.muted;
  if (kind === "frame") {
    // corner brackets inset from the edge, with a hairline rule that breathes
    const inset = 5.5 * u, arm = 9 * u, sw = Math.max(1.5, 0.28 * u);
    const o = (opacity ?? 0.05) * 7;
    const grow = 1 + Math.sin(t * 0.8) * 0.06;
    const all: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
    return (
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: Math.min(0.5, o) }}>
        {all.map((c) => {
          const x = c.endsWith("left") ? inset : width - inset;
          const y = c.startsWith("top") ? inset : height - inset;
          const dx = (c.endsWith("left") ? 1 : -1) * arm * grow;
          const dy = (c.startsWith("top") ? 1 : -1) * arm * grow;
          return <path key={c} d={`M${x + dx} ${y} L${x} ${y} L${x} ${y + dy}`}
            fill="none" stroke={ink} strokeWidth={sw} />;
        })}
        <line x1={inset + arm * 1.6} x2={width - inset - arm * 1.6} y1={height - inset} y2={height - inset}
          stroke={ink} strokeWidth={sw * 0.5} strokeDasharray={`${u * 0.6} ${u * 1.2}`}
          strokeDashoffset={-t * u * 4} />
      </svg>
    );
  }
  if (kind === "lines") {
    // a band of diagonal hairlines sliding slowly along one edge
    const top = corners.some((c) => c.startsWith("top"));
    const o = Math.min(0.35, (opacity ?? 0.05) * 5);
    const gap = 3.2 * u, band = height * 0.2, shift = (t * u * 3) % gap;
    const n = Math.ceil((width + band) / gap) + 2;
    const y0 = top ? 0 : height - band;
    return (
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: o }}>
        <defs>
          <linearGradient id="lf" x1="0" y1={top ? 0 : 1} x2="0" y2={top ? 1 : 0}>
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="lm"><rect x="0" y={y0} width={width} height={band} fill="url(#lf)" /></mask>
        </defs>
        <g mask="url(#lm)" stroke={ink} strokeWidth={Math.max(1, 0.18 * u)}>
          {Array.from({ length: n }).map((_, k) => {
            const x = k * gap - band + shift;
            return <line key={k} x1={x} y1={y0 + band} x2={x + band} y2={y0} />;
          })}
        </g>
      </svg>
    );
  }
  if (kind === "cross") {
    // registration marks on a loose grid, fading in toward the edges
    const o = Math.min(0.4, (opacity ?? 0.05) * 6);
    const step = 18 * u, arm = 1.3 * u, sw = Math.max(1, 0.2 * u);
    const cols = Math.ceil(width / step) + 1, rows = Math.ceil(height / step) + 1;
    const drift = Math.sin(t * 0.4) * u;
    const marks: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * step + step * 0.25 + drift, y = r * step + step * 0.3;
        const edge = Math.min(y, height - y) / height;   // 0 at the edge, 0.5 in the middle
        const a = Math.max(0, 1 - edge * 3.2);
        if (a <= 0.02) continue;
        marks.push(
          <g key={`${r}-${c}`} opacity={a}>
            <line x1={x - arm} x2={x + arm} y1={y} y2={y} />
            <line x1={x} x2={x} y1={y - arm} y2={y + arm} />
          </g>,
        );
      }
    }
    return (
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: o }}>
        <g stroke={ink} strokeWidth={sw}>{marks}</g>
      </svg>
    );
  }
  // bars: a barcode strip along the top or bottom edge, bars breathing in width
  const top = corners.some((c) => c.startsWith("top"));
  const o = Math.min(0.3, (opacity ?? 0.05) * 4);
  const h = 4.5 * u, y = top ? 5 * u : height - 5 * u - h;
  const bars: React.ReactNode[] = [];
  let x = 6 * u, k = 0;
  while (x < width - 6 * u) {
    const w = (0.3 + ((k * 37) % 7) * 0.22) * u * (1 + 0.25 * Math.sin(t * 1.2 + k));
    bars.push(<rect key={k} x={x} y={y} width={w} height={h} fill={ink} />);
    x += w + (0.5 + ((k * 53) % 5) * 0.35) * u; k++;
  }
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: o }}>
      {bars}
    </svg>
  );
};
