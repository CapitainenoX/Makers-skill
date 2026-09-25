import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";
import { alpha } from "../color";

export type DecorKind = "rays" | "blobs" | "grid" | "arcs" | "plus" | "squiggle" | "stars" | "none";
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type DecorSpec = {
  kind?: DecorKind;
  corners?: Corner[];
  opacity?: number;
  scale?: number;
};

const place = (c: Corner, size: number): React.CSSProperties => ({
  position: "absolute",
  width: size,
  height: size,
  left: c.endsWith("left") ? -size * 0.5 : undefined,
  right: c.endsWith("right") ? -size * 0.5 : undefined,
  top: c.startsWith("top") ? -size * 0.42 : undefined,
  bottom: c.startsWith("bottom") ? -size * 0.42 : undefined,
});

/** Shapes that bleed off the edges so the top and bottom of a 9:16 frame are never
 *  dead space. Deliberately slow and low-contrast: this is wallpaper, not an event.
 *  It drifts against the scene's own push, which is what gives the frame depth. */
const KINDS: DecorKind[] = ["rays", "arcs", "plus", "blobs", "squiggle", "grid", "stars"];
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
  const { fps, width } = useVideoConfig();
  const pick = seed + index;
  const kind: DecorKind = spec?.kind ?? KINDS[pick % KINDS.length];
  if (kind === "none") return null;

  const t = frame / fps;
  const corners = spec?.corners ?? CORNER_SETS[pick % CORNER_SETS.length];
  const opacity = spec?.opacity ?? (theme.dark ? 0.1 : 0.07);
  const size = width * (spec?.scale ?? 0.82);
  const ink = theme.accent;

  if (kind === "grid") {
    return (
      <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
        <AbsoluteFill
          style={{
            opacity: opacity * 1.6,
            backgroundImage: `radial-gradient(${theme.muted} ${Math.max(1, width * 0.0016)}px, transparent 0)`,
            backgroundSize: `${width * 0.055}px ${width * 0.055}px`,
            backgroundPosition: `${(t * 5) % (width * 0.055)}px 0px`,
            WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 28%, transparent 72%, #000 100%)",
            maskImage: "linear-gradient(180deg, #000 0%, transparent 28%, transparent 72%, #000 100%)",
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {corners.map((c, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        const spin = t * 2.1 * dir;
        const breathe = 1 + Math.sin(t * 0.55 + i) * 0.03;
        const drift = Math.sin(t * 0.4 + i) * width * 0.012;
        const style: React.CSSProperties = {
          ...place(c, size),
          opacity,
          transform: `translateY(${drift.toFixed(2)}px) rotate(${spin.toFixed(3)}deg) scale(${breathe.toFixed(4)})`,
        };
        const key = c + i;
        if (kind === "rays") {
          return (
            <svg key={key} viewBox="0 0 100 100" style={style}>
              <g fill={ink}>
                {Array.from({ length: 12 }).map((_, k) => (
                  <path key={k} d="M50 2 L55 46 Q50 51 45 46 Z" transform={`rotate(${k * 30} 50 50)`} />
                ))}
                <circle cx="50" cy="50" r="8" />
              </g>
            </svg>
          );
        }
        if (kind === "arcs") {
          return (
            <svg key={key} viewBox="0 0 100 100" style={{ ...style, opacity: opacity * 2.2 }}>
              {[46, 34, 22].map((r, k) => (
                <circle key={k} cx="50" cy="50" r={r} fill="none"
                  stroke={k === 1 ? ink : theme.muted} strokeWidth="0.9" />
              ))}
            </svg>
          );
        }
        if (kind === "plus") {
          return (
            <svg key={key} viewBox="0 0 100 100" style={{ ...style, opacity: opacity * 2 }}>
              {Array.from({ length: 16 }).map((_, k) => {
                const x = 10 + (k % 4) * 26;
                const y = 10 + Math.floor(k / 4) * 26;
                return (
                  <path key={k} d={`M${x - 2} ${y}h4M${x} ${y - 2}v4`}
                    stroke={k % 5 === 0 ? ink : theme.muted} strokeWidth="1.1" strokeLinecap="round" />
                );
              })}
            </svg>
          );
        }
        if (kind === "squiggle") {
          return (
            <svg key={key} viewBox="0 0 100 100" style={{ ...style, opacity: opacity * 2.4 }}>
              {[0, 1, 2].map((k) => (
                <path key={k} d={`M5 ${30 + k * 16} q 7.5 -8 15 0 t 15 0 t 15 0 t 15 0 t 15 0 t 15 0`}
                  fill="none" stroke={k === 1 ? ink : theme.muted} strokeWidth="2"
                  strokeLinecap="round" />
              ))}
            </svg>
          );
        }
        if (kind === "stars") {
          return (
            <svg key={key} viewBox="0 0 100 100" style={{ ...style, opacity: opacity * 2.2 }}>
              {[[30, 30, 9], [64, 22, 5], [58, 60, 12], [22, 70, 5], [80, 76, 7]].map(([x, y, r], k) => {
                const tw = 0.6 + 0.4 * Math.sin(t * 2 + k * 1.3);
                return (
                  <path key={k} fill={k % 2 ? theme.muted : ink} opacity={tw}
                    d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`} />
                );
              })}
            </svg>
          );
        }
        return (
          <div
            key={key}
            style={{
              ...style,
              opacity: opacity * 1.6,
              borderRadius: "50%",
              background: `radial-gradient(circle at 40% 40%, ${alpha(ink, 0.9)}, transparent 66%)`,
              filter: `blur(${width * 0.035}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
