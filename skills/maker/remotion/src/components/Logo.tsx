import React, { useEffect, useState } from "react";
import { continueRender, delayRender, Img, staticFile } from "remotion";
import { contrast, ensureContrast, inkOn, parseColor, toHex } from "../color";
import { useKit } from "../kit";

/** What a logo file actually looks like, read from its SVG source.
 *
 *  This is the check that was missing: a mark was placed wherever the deck said, in
 *  whatever colour the file happened to be, and nobody looked. A Simple Icons SVG with no
 *  `fill` renders pure black — invisible on a dark chip; a yellow mark on a white chip is
 *  just as gone. Now every mark is measured against the surface it sits on. */
export type SvgInfo = {
  svg: boolean;
  /** distinct paint colours, lowercase hex; an SVG with no fill paints black */
  colors: string[];
  title?: string;
};

const cache = new Map<string, SvgInfo>();
const pending = new Map<string, Promise<SvgInfo>>();

export const resolveSrc = (src: string) =>
  /^(https?:|data:)/.test(src) ? src : staticFile(src);

const isSvgPath = (src: string) => /\.svg($|\?)/i.test(src) || src.startsWith("data:image/svg");

export const parseSvgColors = (text: string): SvgInfo => {
  const found = new Set<string>();
  const add = (raw?: string) => {
    if (!raw) return;
    const v = raw.trim().toLowerCase();
    if (!v || v === "none" || v === "transparent" || v.startsWith("url(")) return;
    if (v === "currentcolor") { found.add("#000000"); return; }
    const c = parseColor(v);
    if (c && c.a > 0.05) found.add(toHex(c));
  };
  for (const m of text.matchAll(/\b(?:fill|stroke|stop-color)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of text.matchAll(/(?:^|[;{\s"'])(?:fill|stroke|stop-color)\s*:\s*([^;}"']+)/gi)) add(m[1]);
  // A shape with no fill anywhere up its tree paints black. Simple Icons files fetched
  // from the npm package have no fill at all — that was the "wrong colour" logo.
  const hasShapes = /<(path|circle|rect|polygon|ellipse|g)\b/i.test(text);
  const rootFill = /<svg[^>]*\bfill\s*=/i.test(text) || /<svg[^>]*style\s*=\s*["'][^"']*fill\s*:/i.test(text);
  const shapeWithoutFill = /<(path|circle|rect|polygon|ellipse)\b(?![^>]*\bfill\s*=)(?![^>]*style\s*=\s*["'][^"']*fill)[^>]*>/i.test(text);
  if (hasShapes && !rootFill && shapeWithoutFill && !/<g[^>]*\bfill\s*=/i.test(text)) found.add("#000000");
  const title = /<title>([^<]+)<\/title>/i.exec(text)?.[1];
  return { svg: true, colors: [...found], title };
};

const load = (src: string): Promise<SvgInfo> => {
  const hit = pending.get(src);
  if (hit) return hit;
  const pr = fetch(resolveSrc(src))
    .then((r) => (r.ok ? r.text() : ""))
    .then((t) => (t ? parseSvgColors(t) : { svg: true, colors: [] }))
    .catch(() => ({ svg: true, colors: [] } as SvgInfo))
    .then((info) => {
      cache.set(src, info);
      return info;
    });
  pending.set(src, pr);
  return pr;
};

/** Read a logo's colours, holding the frame until they are known. */
export const useSvgInfo = (src?: string): SvgInfo | null => {
  const needs = !!src && isSvgPath(src) && !cache.has(src);
  const [handle] = useState(() => (needs ? delayRender(`logo ${src}`) : null));
  const [info, setInfo] = useState<SvgInfo | null>(() =>
    !src ? null : !isSvgPath(src) ? { svg: false, colors: [] } : cache.get(src) ?? null);

  useEffect(() => {
    if (!src || !isSvgPath(src)) return;
    let live = true;
    load(src).then((i) => {
      if (live) setInfo(i);
      if (handle !== null) continueRender(handle);
    });
    return () => {
      live = false;
    };
  }, [src, handle]);
  return info;
};

export type Tint = "auto" | "brand" | "mono" | "accent" | string;

/** The colour a mark should be painted, or null to leave the file untouched. */
export const logoColor = (
  info: SvgInfo | null,
  tint: Tint,
  surface: string,
  theme: { text: string; bg: string; accent: string },
): string | null => {
  const ink = contrast(theme.text, surface) >= contrast(theme.bg, surface) ? theme.text : theme.bg;
  if (tint === "mono") return ink;
  if (tint === "accent") return ensureContrast(theme.accent, surface, 2.2);
  if (tint !== "auto" && tint !== "brand") return tint; // an explicit colour
  if (!info || !info.svg || info.colors.length === 0) return null;
  if (info.colors.length > 1) return null;              // multi-colour: never flatten it
  const brand = info.colors[0];
  // auto: keep the brand colour while it is legible on this surface, otherwise switch to
  // the theme's ink. 1.6:1 is roughly where a filled mark stops being recognisable.
  if (tint === "auto" && contrast(brand, surface) < 1.6) return ink;
  return null;
};

/** A brand mark or any image, sized into a square box, coloured coherently.
 *  Recolouring uses the SVG as a mask, so any single-colour mark can take any colour
 *  without editing the file. */
export const Logo: React.FC<{
  src: string;
  size: number;
  /** the colour directly behind the mark — what its contrast is measured against */
  surface: string;
  tint?: Tint;
  style?: React.CSSProperties;
}> = ({ src, size, surface, tint, style }) => {
  const { theme, logos } = useKit();
  const info = useSvgInfo(src);
  const paint = logoColor(info, tint ?? logos, surface, theme);
  const box: React.CSSProperties = { width: size, height: size, flex: "none", ...style };

  if (paint) {
    const url = `url("${resolveSrc(src)}")`;
    return (
      <div
        style={{
          ...box,
          background: paint,
          WebkitMaskImage: url, maskImage: url,
          WebkitMaskSize: "contain", maskSize: "contain",
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
          WebkitMaskPosition: "center", maskPosition: "center",
        }}
      />
    );
  }
  return <Img src={resolveSrc(src)} style={{ ...box, objectFit: "contain" }} />;
};

/** The chip fill for `style: "brand"`: the mark's own colour, with the mark knocked out
 *  in whichever ink reads on it. */
export const brandFill = (info: SvgInfo | null, fallback: string) => {
  const c = info?.colors.length === 1 ? info.colors[0] : null;
  return c ? { fill: c, ink: inkOn(c) } : { fill: fallback, ink: inkOn(fallback) };
};
