import React, { useContext } from "react";
import type { Theme } from "./theme";
import { buildTheme } from "./theme";
import { resolveFonts, type Fonts } from "./components/Fonts";

/** Text entrance styles. A deck rotates two or three of them (picked by its motion
 *  language) so the sentences do not all arrive the same way. */
export type TextFx = "rise" | "mask" | "blur" | "pop" | "slide" | "type";

export type MotionLanguage = "clean" | "punchy" | "soft" | "graphic";

/** Deck-wide rendering context: everything a component needs to stay coherent with the
 *  rest of the video without it being threaded through every prop list. */
export type KitValue = {
  theme: Theme;
  fonts: Fonts;
  /** base type size in px */
  base: number;
  /** motion-blur multiplier, 0 disables */
  blur: number;
  seed: number;
  language: MotionLanguage;
  /** the text effect for the current scene */
  textFx: TextFx;
  /** logo colouring policy for the deck */
  logos: "auto" | "brand" | "mono";
  /** black-and-white style: no colour anywhere, emphasis by weight and inversion */
  mono: boolean;
};

export const Kit = React.createContext<KitValue>({
  theme: buildTheme("light"),
  fonts: resolveFonts("studio"),
  base: 63,
  blur: 1,
  seed: 0,
  language: "clean",
  textFx: "rise",
  logos: "auto",
  mono: true,
});

export const useKit = () => useContext(Kit);

/** Text effects each motion language rotates through, scene by scene. */
export const TEXT_FX: Record<MotionLanguage, TextFx[]> = {
  clean: ["rise", "mask", "rise", "slide"],
  punchy: ["pop", "mask", "slide", "pop"],
  soft: ["blur", "rise", "blur", "mask"],
  graphic: ["mask", "slide", "mask", "pop"],
};
