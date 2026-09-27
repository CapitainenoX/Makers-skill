import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Media } from "./Media";
import type { Frame, MediaRef } from "../deck";
import type { Theme } from "../theme";
import { useKit } from "../kit";

/** Slow sine drift + a fixed perspective tilt. A card that breathes reads as an object
 *  in a space; a card nailed to the page reads as a slide. */
export const useFloat = (amplitude = 0, tilt = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!amplitude && !tilt) return {};
  const t = frame / fps;
  const dy = amplitude ? Math.sin(t * 1.1) * amplitude : 0;
  const dx = amplitude ? Math.cos(t * 0.73) * amplitude * 0.35 : 0;
  return {
    transform:
      `perspective(1600px) translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)` +
      (tilt ? ` rotateY(${tilt}deg) rotateX(${(tilt * -0.35).toFixed(2)}deg)` : ""),
    transformStyle: "preserve-3d" as const,
  };
};

/** A phone, browser or bare shell around a source. Without a bezel a screen recording
 *  on a gradient just reads as a rectangle of someone else's footage. */
export const Device: React.FC<{
  kind: Frame;
  media?: MediaRef;
  width: number;
  theme: Theme;
  radius: number;
}> = ({ kind, media, width, theme, radius }) => {
  const { mono } = useKit();
  const blank = mono ? "linear-gradient(160deg,#F1F1F1,#DADADA)" : "linear-gradient(160deg,#EDEFF6,#DCE4F2)";
  const lights = mono ? ["#C9C9C9", "#C9C9C9", "#C9C9C9"] : ["#FF5F57", "#FEBC2E", "#28C840"];
  const empty = (aspect: string, r: number) => (
    <div style={{ width: "100%", aspectRatio: aspect, borderRadius: r,
      background: blank }} />
  );

  if (kind === "none" || kind === "card" || kind === "full") {
    const r = radius * (kind === "card" ? 0.5 : 0.25);
    return (
      <div style={{ width, borderRadius: r, overflow: "hidden",
        boxShadow: kind === "full" ? "none" : theme.shadowStrong,
        aspectRatio: media ? undefined : "16 / 10" }}>
        {media ? <Media media={media} /> : empty("16 / 10", r)}
      </div>
    );
  }

  if (kind === "browser") {
    return (
      <div style={{ width, borderRadius: radius * 0.55, overflow: "hidden",
        background: "#FFFFFF", boxShadow: theme.shadowStrong }}>
        <div style={{ display: "flex", alignItems: "center", gap: width * 0.012,
          padding: `${width * 0.022}px ${width * 0.028}px`, background: "#EFEFEC" }}>
          {lights.map((c, k) => (
            <span key={k} style={{ width: width * 0.022, height: width * 0.022,
              borderRadius: 999, background: c }} />
          ))}
          <span style={{ flex: 1, height: width * 0.03, marginLeft: width * 0.02,
            borderRadius: 999, background: "#FFFFFF" }} />
        </div>
        <div style={{ width: "100%", aspectRatio: "16 / 10", overflow: "hidden" }}>
          {media ? <Media media={media} /> : empty("16 / 10", 0)}
        </div>
      </div>
    );
  }

  const bezel = Math.max(4, width * 0.028);
  return (
    <div
      style={{
        width,
        aspectRatio: "9 / 19.5",
        borderRadius: width * 0.16,
        background: "#0E0E12",
        padding: bezel,
        boxShadow: `${theme.shadowStrong}, inset 0 0 0 ${bezel * 0.22}px rgba(255,255,255,0.14)`,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: bezel * 1.1, left: "50%",
        transform: "translateX(-50%)", width: width * 0.3, height: width * 0.075,
        borderRadius: 999, background: "#0E0E12", zIndex: 2 }} />
      <div style={{ width: "100%", height: "100%", borderRadius: width * 0.13,
        overflow: "hidden", background: blank }}>
        {media ? <Media media={media} /> : null}
      </div>
    </div>
  );
};
