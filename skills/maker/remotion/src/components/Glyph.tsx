import React from "react";
import type { Glyph as GlyphName } from "../deck";
import { useKit } from "../kit";
import { Logo, type Tint } from "./Logo";

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
  thumbsUp: (c) => (
    <path fill={c} d="M28 44h14l14-30a10 10 0 0114 12l-6 18h20a10 10 0 019.8 12l-7 30A12 12 0 0175 96H28zM8 44h14v52H8z" />
  ),
  bell: (c) => (
    <g fill={c}>
      <path d="M50 6a8 8 0 018 8v4a26 26 0 0120 25v18l8 14H14l8-14V43a26 26 0 0120-25v-4a8 8 0 018-8z" />
      <path d="M38 82h24a12 12 0 01-24 0z" />
    </g>
  ),
  comment: (c) => (
    <g fill={c}>
      <path d="M12 20h76a8 8 0 018 8v34a8 8 0 01-8 8H46L26 88V70H12a8 8 0 01-8-8V28a8 8 0 018-8z" />
    </g>
  ),
  share: (c) => (
    <g fill={c}>
      <circle cx="76" cy="20" r="12" /><circle cx="24" cy="50" r="12" />
      <circle cx="76" cy="80" r="12" />
      <path fill="none" stroke={c} strokeWidth="8" d="M66 26L34 44M34 56l32 18" />
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
  heart: (c) => (
    <path fill={c} d="M50 88L16 54A20 20 0 0150 26a20 20 0 0134 28z" />
  ),
  play: (c) => <path fill={c} d="M30 16l54 34-54 34z" />,
  search: (c) => (
    <g fill="none" stroke={c} strokeWidth="10" strokeLinecap="round">
      <circle cx="42" cy="42" r="26" /><path d="M62 62l24 24" />
    </g>
  ),
  user: (c) => (
    <g fill={c}>
      <circle cx="50" cy="32" r="18" />
      <path d="M14 90a36 30 0 0172 0z" />
    </g>
  ),
  clock: (c) => (
    <g fill="none" stroke={c} strokeWidth="9" strokeLinecap="round">
      <circle cx="50" cy="50" r="38" /><path d="M50 28v24l16 10" />
    </g>
  ),
  globe: (c) => (
    <g fill="none" stroke={c} strokeWidth="7">
      <circle cx="50" cy="50" r="38" />
      <ellipse cx="50" cy="50" rx="16" ry="38" />
      <path d="M12 50h76M18 30h64M18 70h64" />
    </g>
  ),
  fire: (c) => (
    <path fill={c} d="M52 6c4 18 26 26 26 52a28 28 0 01-56 0c0-12 6-20 12-26 0 10 4 16 10 18-4-18 4-32 8-44z" />
  ),
  cross: (c) => (
    <path fill="none" stroke={c} strokeWidth="12" strokeLinecap="round" d="M24 24l52 52M76 24L24 76" />
  ),
  eye: (c) => (
    <g>
      <path fill="none" stroke={c} strokeWidth="8" d="M6 50s16-28 44-28 44 28 44 28-16 28-44 28S6 50 6 50z" />
      <circle cx="50" cy="50" r="13" fill={c} />
    </g>
  ),
  download: (c) => (
    <path fill="none" stroke={c} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
      d="M50 12v50M28 42l22 22 22-22M16 86h68" />
  ),
  link: (c) => (
    <g fill="none" stroke={c} strokeWidth="9" strokeLinecap="round">
      <path d="M44 56a16 16 0 0022 0l14-14a16 16 0 00-22-22l-6 6" />
      <path d="M56 44a16 16 0 00-22 0L20 58a16 16 0 0022 22l6-6" />
    </g>
  ),
  chart: (c) => (
    <g fill={c}>
      <rect x="12" y="54" width="18" height="34" rx="4" />
      <rect x="41" y="34" width="18" height="54" rx="4" />
      <rect x="70" y="14" width="18" height="74" rx="4" />
    </g>
  ),
  mic: (c) => (
    <g fill="none" stroke={c} strokeWidth="8" strokeLinecap="round">
      <rect x="36" y="8" width="28" height="50" rx="14" fill={c} />
      <path d="M22 46a28 28 0 0056 0M50 74v18" />
    </g>
  ),
  image: (c) => (
    <g>
      <rect x="10" y="18" width="80" height="64" rx="10" fill="none" stroke={c} strokeWidth="8" />
      <circle cx="34" cy="40" r="8" fill={c} />
      <path fill={c} d="M16 76l22-22 14 14 12-12 22 20z" />
    </g>
  ),
  music: (c) => (
    <g fill={c}>
      <path d="M36 16l48-8v58h-8V24l-32 6v46h-8z" />
      <circle cx="28" cy="78" r="12" /><circle cx="72" cy="68" r="12" />
    </g>
  ),
  key: (c) => (
    <g fill="none" stroke={c} strokeWidth="9" strokeLinecap="round">
      <circle cx="32" cy="50" r="18" /><path d="M50 50h40M78 50v14M66 50v10" />
    </g>
  ),
  trophy: (c) => (
    <g fill={c}>
      <path d="M28 10h44v26a22 22 0 01-44 0z" />
      <path fill="none" stroke={c} strokeWidth="7" d="M28 18H14c0 16 8 22 16 22M72 18h14c0 16-8 22-16 22" />
      <rect x="44" y="56" width="12" height="18" /><rect x="30" y="74" width="40" height="12" rx="4" />
    </g>
  ),
  flag: (c) => (
    <g fill={c}>
      <rect x="18" y="8" width="8" height="84" rx="4" />
      <path d="M26 12h56l-12 18 12 18H26z" />
    </g>
  ),
  cursor: (c) => (
    <path fill={c} stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round"
      d="M20 10l58 38-26 6 16 30-12 6-16-30-20 18z" />
  ),
  warning: (c) => (
    <g>
      <path fill={c} d="M50 8l44 80H6z" />
      <rect x="45" y="36" width="10" height="28" rx="5" fill="#FFFFFF" />
      <circle cx="50" cy="74" r="6" fill="#FFFFFF" />
    </g>
  ),
  bookmark: (c) => <path fill={c} d="M24 8h52a6 6 0 016 6v80L50 72 18 94V14a6 6 0 016-6z" />,
  money: (c) => (
    <g fill="none" stroke={c} strokeWidth="9" strokeLinecap="round">
      <path d="M66 26c-4-6-10-8-16-8-10 0-18 6-18 14 0 20 36 12 36 32 0 8-8 14-18 14-8 0-14-4-18-10M50 8v84" />
    </g>
  ),
};

export const isBuiltinGlyph = (name?: string) => !!name && name in BUILTINS;

export const GLYPH_NAMES = Object.keys(BUILTINS);

/** A built-in glyph drawn in `color`, or — for anything that is not a built-in name — a
 *  logo file, measured against `surface` and recoloured if it would not read there. */
export const Glyph: React.FC<{
  name?: GlyphName | string;
  size: number;
  color: string;
  /** the colour behind the mark; defaults to the page */
  surface?: string;
  tint?: Tint;
}> = ({ name, size, color, surface, tint }) => {
  const { theme } = useKit();
  if (!name) return null;
  const builtin = BUILTINS[name];
  if (!builtin) {
    return <Logo src={name} size={size} surface={surface ?? theme.bg} tint={tint} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", flex: "none" }}>
      {builtin(color)}
    </svg>
  );
};
