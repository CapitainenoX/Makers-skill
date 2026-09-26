/** Design tokens. The light theme is the default "clean studio" look: white paper,
 *  near-black type, one accent, soft physical shadows.
 *
 *  A theme is never used raw: `buildTheme` derives the tokens that keep colour coherent
 *  whatever accent the creator picks — a readable accent for text, the right ink on an
 *  accent fill, an inverted panel for pattern interrupts. */
import { alpha, contrast, ensureContrast, inkOn, isDark } from "./color";

export type ThemeName = "light" | "paper" | "dark" | "ink";

export type Theme = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  /** the brand colour, for fills, icons, bars */
  accent: string;
  shadowStrong: string;
  shadowSoft: string;
  /** the accent nudged until it reads as text on `bg` (≥ 3:1, large type) */
  accentInk: string;
  /** black or white, whichever reads on an accent fill */
  onAccent: string;
  /** a hairline / track colour */
  line: string;
  /** an inverted surface — a dark slab on a light deck and the reverse */
  panel: string;
  onPanel: string;
  dark: boolean;
};

type BaseTheme = Pick<Theme, "bg" | "surface" | "text" | "muted" | "accent" |
  "shadowStrong" | "shadowSoft">;

export const THEMES: Record<ThemeName, BaseTheme> = {
  light: {
    // Black on white is the default. A deck turns colour on by setting brand.accent.
    bg: "#FFFFFF",
    surface: "#FFFFFF",
    text: "#0A0A0B",
    muted: "#6B6B74",
    accent: "#111113",
    shadowStrong: "0 26px 64px rgba(10,10,12,0.16)",
    shadowSoft: "0 1px 3px rgba(10,10,12,0.10), 0 0 0 1px rgba(10,10,12,0.05)",
  },
  paper: {
    bg: "#F4F3F1",
    surface: "#FFFFFF",
    text: "#141412",
    muted: "#6E6C66",
    accent: "#141412",
    shadowStrong: "0 28px 70px rgba(18,18,15,0.14)",
    shadowSoft: "0 1px 3px rgba(18,18,15,0.10), 0 0 0 1px rgba(18,18,15,0.05)",
  },
  dark: {
    bg: "#0C0C0E",
    surface: "#18181C",
    text: "#F5F5F2",
    muted: "#8E8E89",
    accent: "#D97757",
    shadowStrong: "0 28px 70px rgba(0,0,0,0.55)",
    shadowSoft: "0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
  },
  ink: {
    bg: "#101820",
    surface: "#18222C",
    text: "#EAF2F8",
    muted: "#8499A9",
    accent: "#4CC2FF",
    shadowStrong: "0 28px 70px rgba(0,0,0,0.5)",
    shadowSoft: "0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
  },
};

/** The black-and-white look: pure white paper, pure black ink, greys in between, and
 *  its negative for inverted scenes. No accent colour at all — emphasis comes from
 *  weight, size, the serif, the marker box and inversion. */
export const MONO: Record<"light" | "dark", BaseTheme> = {
  light: {
    bg: "#FFFFFF", surface: "#FFFFFF", text: "#0A0A0A", muted: "#6E6E6E", accent: "#0A0A0A",
    shadowStrong: "0 26px 64px rgba(0,0,0,0.16)",
    shadowSoft: "0 1px 3px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)",
  },
  dark: {
    bg: "#0A0A0A", surface: "#171717", text: "#FAFAFA", muted: "#9A9A9A", accent: "#FAFAFA",
    shadowStrong: "0 28px 70px rgba(0,0,0,0.6)",
    shadowSoft: "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.10)",
  },
};

export const buildTheme = (name: ThemeName | undefined, accent?: string, mono = false,
                           invert = false): Theme => {
  const dark0 = name === "dark" || name === "ink";
  const base = mono
    ? MONO[dark0 !== invert ? "dark" : "light"]
    : invert
      ? THEMES[isDark(THEMES[name ?? "light"]?.bg) ? "light" : "dark"]
      : THEMES[name ?? "light"] ?? THEMES.light;
  const acc = mono ? base.text : accent || base.accent;
  const dark = isDark(base.bg);
  // An accent that equals the page (black on a black theme, white on white) is not an
  // accent at all; fall back to the ink so emphasis never disappears.
  const usable = contrast(acc, base.bg) < 1.35 ? base.text : acc;
  return {
    ...base,
    accent: usable,
    accentInk: ensureContrast(usable, base.bg, 3),
    onAccent: inkOn(usable),
    line: alpha(base.muted, dark ? 0.28 : 0.2),
    panel: base.text,
    onPanel: base.bg,
    dark,
  };
};

/** A grotesque stack that degrades gracefully when no web font is loaded. */
export const FONT_STACK =
  '"Inter Variable", "Inter", "Helvetica Neue", Helvetica, ' +
  '"Segoe UI", Roboto, "DejaVu Sans", Arial, sans-serif';

export const WEIGHTS = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 800,
} as const;

export type WeightName = keyof typeof WEIGHTS;
