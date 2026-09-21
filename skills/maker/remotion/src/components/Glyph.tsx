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
