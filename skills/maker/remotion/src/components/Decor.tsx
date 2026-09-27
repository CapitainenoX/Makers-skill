import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";
import { activeLook } from "../look";

export type DecorKind =
  | "rays" | "blobs" | "grid" | "arcs"
  | "burst"      // chunky, saturated starbursts cropped off the corners — the loud one
  | "blueprint"  // dashed construction grid with dots on the crossings
  | "ghost"      // one huge pale pictogram behind the type
  | "none";
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type DecorSpec = {
  kind?: DecorKind;
  corners?: Corner[];
  opacity?: number;
  scale?: number;
  /** for `ghost`: which pictogram — invader, asterisk, ring, hash, bolt */
  glyph?: "invader" | "asterisk" | "ring" | "hash" | "bolt";
};

/** An irregular starburst: rays of different lengths and widths, like a paper cut-out.
 *  A perfectly regular star reads as clip-art; the unevenness reads as drawn. */
const burstPath = (seed: number) => {
  const n = 11;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (((seed * 7 + i * 13) % 10) - 5) * 0.012;
    const len = 44 + (((seed * 5 + i * 17) % 9) - 4) * 1.4;
    const half = 0.13 + (((seed + i * 3) % 5) * 0.014);
    const tip = (d: number, off: number) =>
      `${(50 + Math.cos(a + off) * d).toFixed(2)} ${(50 + Math.sin(a + off) * d).toFixed(2)}`;
    pts.push(`L ${tip(10, -half * 1.3)}`, `L ${tip(len, -half * 0.62)}`,
      `L ${tip(len + 1.5, 0)}`, `L ${tip(len, half * 0.62)}`, `L ${tip(10, half * 1.3)}`);
  }
  return `M ${pts[0].slice(2)} ${pts.slice(1).join(" ")} Z`;
};

const INVADER = [
  "00100000100", "00010001000", "00111111100", "01101110110",
  "11111111111", "10111111101", "10100000101", "00011011000",
];

const GhostGlyph: React.FC<{ glyph: NonNullable<DecorSpec["glyph"]>; color: string }> = ({
  glyph, color,
}) => {
  if (glyph === "invader") {
    return (
      <svg viewBox="0 0 11 8" style={{ width: "100%", height: "100%" }} shapeRendering="crispEdges">
        {INVADER.flatMap((row, y) =>
          row.split("").map((c, x) =>
            c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={color} /> : null))}
      </svg>
    );
  }
  const paths: Record<string, React.ReactNode> = {
    asterisk: <g fill={color}>{[0, 60, 120].map((r) => (
      <rect key={r} x="44" y="6" width="12" height="88" rx="6" transform={`rotate(${r} 50 50)`} />))}</g>,
    ring: <circle cx="50" cy="50" r="36" fill="none" stroke={color} strokeWidth="14" />,
    hash: <g fill={color}><rect x="28" y="8" width="11" height="84" rx="3" transform="skewX(-8)" />
      <rect x="62" y="8" width="11" height="84" rx="3" transform="skewX(-8)" />
      <rect x="8" y="30" width="84" height="11" rx="3" /><rect x="8" y="60" width="84" height="11" rx="3" /></g>,
    bolt: <path d="M58 4 L22 56 L46 56 L38 96 L78 40 L54 40 Z" fill={color} />,
  };
  return <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>{paths[glyph]}</svg>;
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
const KINDS: DecorKind[] = ["rays", "arcs", "blobs", "grid", "burst", "blueprint", "ghost"];
const GLYPHS: NonNullable<DecorSpec["glyph"]>[] = ["invader", "asterisk", "ring", "hash", "bolt"];
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
  /** false when the deck is mono — a saturated burst in near-black is a stain, not colour */
  colourful?: boolean;
}> = ({ spec, theme, seed = 0, index = 0, colourful = true }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const pick = seed + index;
  const family = activeLook().decor;
  const kind: DecorKind =
    spec?.kind ?? (spec ? "none" : (family[pick % family.length] as DecorKind) ?? KINDS[pick % KINDS.length]);
  if (kind === "none") return null;

  const t = frame / fps;
  const corners = spec?.corners ?? CORNER_SETS[pick % CORNER_SETS.length];
  const size = width * (spec?.scale ?? (kind === "burst" ? 0.78 : 0.82));
  const opacity = spec?.opacity ?? (
    kind === "burst" ? (colourful ? 1 : 0.1)
    : kind === "blueprint" ? 0.5
    : kind === "ghost" ? 0.07
    : 0.05);
  // Loud decor arrives with the scene instead of just being there.
  const arrive = Math.min(1, Math.max(0, frame / (fps * 0.45)));
  const arriveE = 1 - (1 - arrive) ** 3;

  if (kind === "blueprint") {
    const cell = width * 0.2;
    const dash = `${width * 0.008}px`;
    const cols = Math.ceil(width / cell) + 1;
    const rows = Math.ceil(height / cell) + 1;
    const ox = (width % cell) / 2;
    const oy = (height % cell) / 2;
    const line = theme.muted;
    return (
      <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none", opacity: opacity * arriveE,
        // the grid fades toward the edges so it frames the centre instead of papering it
        WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 50%, #000 40%, transparent 100%)",
        maskImage: "radial-gradient(ellipse 70% 55% at 50% 50%, #000 40%, transparent 100%)" }}>
        <svg width={width} height={height}>
          {Array.from({ length: cols }).map((_, i) => (
            <line key={`v${i}`} x1={ox + i * cell} x2={ox + i * cell} y1={0} y2={height}
              stroke={line} strokeWidth={1.4} strokeDasharray={`${dash} ${dash}`} opacity={0.55} />
          ))}
          {Array.from({ length: rows }).map((_, j) => (
            <line key={`h${j}`} y1={oy + j * cell} y2={oy + j * cell} x1={0} x2={width}
              stroke={line} strokeWidth={1.4} strokeDasharray={`${dash} ${dash}`} opacity={0.55} />
          ))}
          {Array.from({ length: cols }).flatMap((_, i) =>
            Array.from({ length: rows }).map((__, j) => (
              <circle key={`d${i}-${j}`} cx={ox + i * cell} cy={oy + j * cell}
                r={width * 0.0055} fill={line} />
            )))}
        </svg>
      </AbsoluteFill>
    );
  }

  if (kind === "ghost") {
    const glyph = spec?.glyph ?? GLYPHS[pick % GLYPHS.length];
    const g = width * (spec?.scale ?? 0.78);
    return (
      <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none",
        justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: g, height: g, opacity: opacity * arriveE,
          transform: `scale(${(0.92 + arriveE * 0.08 + Math.sin(t * 0.5) * 0.01).toFixed(4)})` }}>
          <GhostGlyph glyph={glyph} color={theme.text} />
        </div>
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
            if (kind === "burst") {
              // a heavier, slower spin, and a spin-in on arrival
              return (
                <svg key={c + i} viewBox="0 0 100 100" style={{
                  ...style,
                  transform: `rotate(${(spin * 1.6 + (1 - arriveE) * 40 * dir).toFixed(2)}deg) ` +
                    `scale(${(breathe * (0.6 + arriveE * 0.4)).toFixed(4)})`,
                  opacity: opacity * arriveE,
                  filter: `drop-shadow(0 ${width * 0.006}px ${width * 0.01}px rgba(0,0,0,0.12))`,
                }}>
                  <path d={burstPath(seed + i)} fill={colourful ? theme.accent : theme.text} />
                </svg>
              );
            }
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
