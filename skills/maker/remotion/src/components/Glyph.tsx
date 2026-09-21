import React from "react";
import { Img, staticFile } from "remotion";
import type { Glyph as GlyphName } from "../deck";

/** Built-in geometric glyphs, drawn in code so the repo ships no third-party
 *  marks. For a real brand logo, pass a path to the brand's own asset instead —
 *  `icon: "logos/acme.svg"` resolves through Remotion's public folder. */
const BUILTINS: Record<string, (c: string) => React.ReactNode> = {
  // tapered spikes radiating from a small core — thin bars crossing the centre
  // just read as a filled disc at list size
  sparkle: (c) => (
    <g fill={c}>
      {Array.from({ length: 12 }).map((_, i) => (
        <path
          key={i}
          d="M50 3 L54.2 44 Q50 48 45.8 44 Z"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="7" />
    </g>
  ),
  gear: (c) => (
    <path fill={c} d="M50 32a18 18 0 100 36 18 18 0 000-36zm0 10a8 8 0 110 16 8 8 0 010-16zM45 4h10l2 11a38 38 0 018 3l9-7 7 7-7 9a38 38 0 013 8l11 2v10l-11 2a38 38 0 01-3 8l7 9-7 7-9-7a38 38 0 01-8 3l-2 11H45l-2-11a38 38 0 01-8-3l-9 7-7-7 7-9a38 38 0 01-3-8L12 55V45l11-2a38 38 0 013-8l-7-9 7-7 9 7a38 38 0 018-3z" />
  ),
  folder: (c) => (
    <path fill={c} d="M8 26a6 6 0 016-6h22l8 10h34a6 6 0 016 6v40a6 6 0 01-6 6H14a6 6 0 01-6-6z" />
  ),
  cube: (c) => (
    <g fill="none" stroke={c} strokeWidth="8" strokeLinejoin="round">
      <path d="M50 10l34 20v40L50 90 16 70V30z" />
      <path d="M16 30l34 20 34-20M50 50v40" />
    </g>
  ),
  chat: (c) => (
    <path fill={c} d="M14 20h72a8 8 0 018 8v36a8 8 0 01-8 8H44L24 90V72h-10a8 8 0 01-8-8V28a8 8 0 018-8z" />
  ),
  cloud: (c) => (
    <path fill={c} d="M28 74a20 20 0 01-2-40 26 26 0 0150 6 17 17 0 01-4 34z" />
  ),
  lock: (c) => (
    <g fill={c}>
      <rect x="22" y="44" width="56" height="44" rx="10" />
      <path fill="none" stroke={c} strokeWidth="9" d="M34 44V32a16 16 0 0132 0v12" />
    </g>
  ),
  rocket: (c) => (
    <path fill={c} d="M50 6c16 12 24 28 24 46l-10 12H36L26 52C26 34 34 18 50 6zm0 26a8 8 0 100 16 8 8 0 000-16zM34 72l-8 20 18-8zm32 0l8 20-18-8z" />
  ),
  code: (c) => (
    <g fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M34 30L12 50l22 20M66 30l22 20-22 20" />
    </g>
  ),
  database: (c) => (
    <g fill={c}>
      <ellipse cx="50" cy="24" rx="32" ry="12" />
      <path d="M18 24v22c0 7 14 12 32 12s32-5 32-12V24c0 7-14 12-32 12s-32-5-32-12z" />
      <path d="M18 54v22c0 7 14 12 32 12s32-5 32-12V54c0 7-14 12-32 12s-32-5-32-12z" />
    </g>
  ),
  star: (c) => (
    <path fill={c} d="M50 4l13 30 33 3-25 22 8 32-29-17-29 17 8-32-25-22 33-3z" />
  ),
  dot: (c) => <circle cx="50" cy="50" r="26" fill={c} />,
  circle: (c) => <circle cx="50" cy="50" r="34" fill="none" stroke={c} strokeWidth="9" />,
  square: (c) => <rect x="18" y="18" width="64" height="64" rx="16" fill={c} />,
  triangle: (c) => <path fill={c} d="M50 14l38 68H12z" />,
  plus: (c) => (
    <g fill={c}>
      <rect x="43" y="14" width="14" height="72" rx="7" />
      <rect x="14" y="43" width="72" height="14" rx="7" />
    </g>
  ),
  bolt: (c) => <path fill={c} d="M56 6L20 56h22l-8 40 40-52H52z" />,
  check: (c) => (
    <path fill="none" stroke={c} strokeWidth="12" strokeLinecap="round"
      strokeLinejoin="round" d="M20 52l20 20 40-44" />
  ),
  arrow: (c) => (
    <path fill="none" stroke={c} strokeWidth="11" strokeLinecap="round"
      strokeLinejoin="round" d="M18 50h58M54 28l24 22-24 22" />
  ),
  terminal: (c) => (
    <g fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="18" width="80" height="64" rx="12" />
      <path d="M28 42l14 12-14 12M52 66h18" />
    </g>
  ),
};

export const Glyph: React.FC<{ name?: GlyphName | string; size: number; color: string }> = ({
  name,
  size,
  color,
}) => {
  if (!name) return null;
  const builtin = BUILTINS[name];
  if (!builtin) {
    // treat anything unknown as a file in public/
    return (
      <Img
        src={name.startsWith("http") ? name : staticFile(name)}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      {builtin(color)}
    </svg>
  );
};
