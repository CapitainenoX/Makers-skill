/** Colour maths for the coherence rules.
 *
 *  Every decision that used to be a guess — "is this logo readable on that chip?", "can
 *  white text sit on this accent?" — is a WCAG contrast ratio here. The Python validator
 *  (`toolbelt/remotion.py`) implements the same formula, so what `validate` reports and
 *  what the renderer does agree. */

export type RGB = { r: number; g: number; b: number; a: number };

const NAMED: Record<string, string> = {
  white: "#ffffff", black: "#000000", transparent: "#00000000",
  red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00",
  orange: "#ffa500", purple: "#800080", gray: "#808080", grey: "#808080",
  currentcolor: "#000000",
};

/** Parse #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba() and a few names. */
export const parseColor = (input?: string | null): RGB | null => {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    const out = { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
    return [out.r, out.g, out.b].some(Number.isNaN) ? null : out;
  }
  const m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3 || p.slice(0, 3).some(Number.isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1 };
  }
  return null;
};

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");

export const toHex = (c: RGB) => `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;

/** Relative luminance, WCAG 2.x. */
export const luminance = (c: RGB) => {
  const ch = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
};

/** Composite a translucent colour over an opaque one. */
export const over = (top: RGB, bottom: RGB): RGB => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});

/** WCAG contrast ratio, 1..21. Unparseable input counts as perfect so it never blocks. */
export const contrast = (a?: string, b?: string): number => {
  const x = parseColor(a);
  const y = parseColor(b);
  if (!x || !y) return 21;
  const fg = x.a < 1 ? over(x, y) : x;
  const l1 = luminance(fg);
  const l2 = luminance(y);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

export const isDark = (c?: string) => {
  const x = parseColor(c);
  return x ? luminance(x) < 0.4 : false;
};

export const mix = (a: string, b: string, t: number): string => {
  const x = parseColor(a);
  const y = parseColor(b);
  if (!x || !y) return a;
  return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t,
    b: x.b + (y.b - x.b) * t, a: 1 });
};

/** Nudge `fg` toward black or white (whichever the background needs) until it reaches
 *  `min` contrast. Keeps the hue, so a yellow accent becomes a readable ochre, not grey. */
export const ensureContrast = (fg: string, bg: string, min = 4.5): string => {
  if (contrast(fg, bg) >= min) return fg;
  const target = isDark(bg) ? "#ffffff" : "#000000";
  for (let t = 0.08; t <= 1.0001; t += 0.08) {
    const c = mix(fg, target, t);
    if (contrast(c, bg) >= min) return c;
  }
  return target;
};

/** Black or white on `bg`. White wins whenever it clears 3:1 (large text, marks):
 *  white on a saturated brand colour is what designers reach for, even where black
 *  would measure higher. Below that, whichever reads better. */
export const inkOn = (bg: string, dark = "#0A0A0B", light = "#FFFFFF") =>
  contrast(light, bg) >= 3 || contrast(light, bg) >= contrast(dark, bg) ? light : dark;

/** `rgba()` of any parseable colour at a given alpha. Replaces the old `${hex}22`
 *  concatenation, which silently produced garbage for rgb() or named colours. */
export const alpha = (c: string, a: number): string => {
  const x = parseColor(c);
  if (!x) return c;
  return `rgba(${Math.round(x.r)},${Math.round(x.g)},${Math.round(x.b)},${a})`;
};
