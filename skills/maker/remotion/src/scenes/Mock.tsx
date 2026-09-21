import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { Chip } from "../components/Chip";
import { TypeStack } from "../components/Type";
import { enter, rise } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

/** A single UI control, rebuilt rather than screenshotted: a prompt bar, a search box,
 *  a message. Recreating one component reads cleaner than cropping a whole window, and
 *  it stays legible at phone size. */
export const Mock: React.FC<SceneProps<"mock">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const p = enter(frame, fps, 0, "snap");
  const W = width * 0.86;
  const kind = scene.kind ?? "prompt";
  const dark = kind !== "search";

  const bg = dark ? "#16171C" : theme.surface;
  const fg = dark ? "#E9E9E6" : theme.text;
  const dim = dark ? "rgba(233,233,230,0.45)" : theme.muted;

  return (
    <Stage scene={scene} theme={theme} base={base} font={font}>
      {scene.lines ? (
        <TypeStack lines={scene.lines} theme={theme} base={base} font={font} />
      ) : null}

      <div
        style={{
          ...rise(p, base * 0.45),
          width: W,
          background: bg,
          borderRadius: base * 0.4,
          boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
          padding: base * 0.52,
          display: "flex",
          flexDirection: "column",
          gap: base * 0.3,
        }}
      >
        <span style={{ fontFamily: font, fontSize: base * 0.48, fontWeight: WEIGHTS.medium,
          letterSpacing: "-0.015em", color: fg, lineHeight: 1.25 }}>
          {scene.text}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: base * 0.18 }}>
          {scene.badge ? (
            <span style={{ fontFamily: font, fontSize: base * 0.3, fontWeight: WEIGHTS.semibold,
              color: fg, background: dark ? "rgba(255,255,255,0.1)" : `${theme.muted}22`,
              borderRadius: base * 0.16, padding: `${base * 0.08}px ${base * 0.18}px` }}>
              {scene.badge}
            </span>
          ) : null}
          <span style={{ flex: 1 }} />
          {scene.meta ? (
            <span style={{ fontFamily: font, fontSize: base * 0.3, color: dim }}>
              {scene.meta}
            </span>
          ) : null}
          <span style={{ width: base * 0.56, height: base * 0.56, borderRadius: base * 0.18,
            background: theme.accent, color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: base * 0.32, fontWeight: WEIGHTS.bold }}>
            ↑
          </span>
        </div>
      </div>

      {scene.chip ? (
        <div style={rise(enter(frame, fps, 8, "pop"), base * 0.4)}>
          <Chip {...scene.chip} size={width * 0.34} theme={theme} font={font} />
        </div>
      ) : null}
    </Stage>
  );
};
