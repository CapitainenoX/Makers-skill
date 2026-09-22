/** Design tokens. The light theme is the default "clean studio" look: warm
 *  off-white paper, near-black type, one accent, soft physical shadows. */
export type ThemeName = "light" | "dark" | "ink";

export type Theme = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  shadowStrong: string;
  shadowSoft: string;
};

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    // Black on white is the default. A deck turns colour on by setting brand.accent.
    bg: "#FFFFFF",
    surface: "#FFFFFF",
    text: "#0A0A0B",
    muted: "#71717A",
    accent: "#111113",
    shadowStrong: "0 26px 64px rgba(10,10,12,0.16)",
    shadowSoft: "0 1px 3px rgba(10,10,12,0.10), 0 0 0 1px rgba(10,10,12,0.05)",
  },
  dark: {
    bg: "#0C0C0E",
    surface: "#18181C",
    text: "#F5F5F2",
    muted: "#8A8A85",
    accent: "#D97757",
    shadowStrong: "0 28px 70px rgba(0,0,0,0.55)",
    shadowSoft: "0 2px 8px rgba(0,0,0,0.4)",
  },
  ink: {
    bg: "#101820",
    surface: "#18222C",
    text: "#EAF2F8",
    muted: "#7F93A3",
    accent: "#4CC2FF",
    shadowStrong: "0 28px 70px rgba(0,0,0,0.5)",
    shadowSoft: "0 2px 8px rgba(0,0,0,0.35)",
  },
};

/** A grotesque stack that degrades gracefully when no web font is loaded.
 *  Override per deck with `brand.font`. */
export const FONT_STACK =
  '"Inter", "Helvetica Now Display", "Helvetica Neue", Helvetica, ' +
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
