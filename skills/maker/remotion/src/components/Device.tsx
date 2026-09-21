import React from "react";
import { Img, staticFile } from "remotion";
import type { Theme } from "../theme";

/** A phone or browser shell around a screenshot. Without a real bezel a
 *  screenshot on a gradient just reads as a white rectangle. */
export const Device: React.FC<{
  kind: "phone" | "browser" | "none";
  src?: string;
  width: number;
  theme: Theme;
  radius: number;
}> = ({ kind, src, width, theme, radius }) => {
  const img = src ? (src.startsWith("http") ? src : staticFile(src)) : null;

  if (kind === "none") {
    return img ? (
      <Img src={img} style={{ width, borderRadius: radius * 0.5, display: "block",
        objectFit: "cover", boxShadow: theme.shadowStrong }} />
    ) : (
      <div style={{ width, aspectRatio: "16 / 10", borderRadius: radius * 0.5,
        background: theme.surface, boxShadow: theme.shadowStrong }} />
    );
  }

  if (kind === "browser") {
    return (
      <div style={{ width, borderRadius: radius * 0.55, overflow: "hidden",
        background: "#FFFFFF", boxShadow: theme.shadowStrong }}>
        <div style={{ display: "flex", alignItems: "center", gap: width * 0.012,
          padding: `${width * 0.022}px ${width * 0.028}px`, background: "#EFEFEC" }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span key={c} style={{ width: width * 0.022, height: width * 0.022,
              borderRadius: 999, background: c }} />
          ))}
          <span style={{ flex: 1, height: width * 0.03, marginLeft: width * 0.02,
            borderRadius: 999, background: "#FFFFFF" }} />
        </div>
        {img ? (
          <Img src={img} style={{ width: "100%", display: "block", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", aspectRatio: "16 / 9", background: "#F7F7F5" }} />
        )}
      </div>
    );
  }

  // phone
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
      <div
        style={{
          position: "absolute",
          top: bezel * 1.1,
          left: "50%",
          transform: "translateX(-50%)",
          width: width * 0.3,
          height: width * 0.075,
          borderRadius: 999,
          background: "#0E0E12",
          zIndex: 2,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: width * 0.13,
          overflow: "hidden",
          background: "linear-gradient(160deg,#EDEFF6,#DCE4F2)",
        }}
      >
        {img ? (
          <Img src={img} style={{ width: "100%", height: "100%", objectFit: "cover",
            display: "block" }} />
        ) : null}
      </div>
    </div>
  );
};
