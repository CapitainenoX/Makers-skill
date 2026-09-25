import React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { Chip } from "../components/Chip";
import { Glyph } from "../components/Glyph";
import { TypeStack } from "../components/Type";
import { useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

/** A single UI control, rebuilt rather than screenshotted: a prompt bar, a search box,
 *  a message. The text types itself with a caret, then the send button presses — the
 *  control is used, not just shown. */
export const Mock: React.FC<SceneProps<"mock">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const W = width * 0.86;
  const kind = scene.kind ?? "prompt";
  const dark = kind !== "search";

  const bg = dark ? "#16171C" : theme.surface;
  const fg = dark ? "#E9E9E6" : theme.text;
  const dim = dark ? "rgba(233,233,230,0.45)" : theme.muted;

  const typing = scene.typing !== false;
  const start = 6;
  const typeFrames = Math.round((scene.text.length / 34) * fps);
  const shownN = typing
    ? Math.floor(interpolate(frame, [start, start + typeFrames], [0, scene.text.length], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
    : scene.text.length;
  const done = frame >= start + typeFrames;
  const press = done ? interpolate(frame - start - typeFrames, [2, 5, 10], [1, 0.82, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const caret = !done || Math.floor(frame / 9) % 2 === 0;

  return (
    <Stage scene={scene}>
      {scene.lines ? <TypeStack lines={scene.lines} /> : null}
      <div style={{ ...arrive(0, base * 0.7, "snap", { from: 0.92 }), width: W, background: bg,
        borderRadius: kind === "search" ? 999 : base * 0.4,
        boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
        padding: kind === "search" ? `${base * 0.36}px ${base * 0.5}px` : base * 0.52,
        display: "flex", flexDirection: kind === "search" ? "row" : "column",
        alignItems: kind === "search" ? "center" : "stretch", gap: base * 0.3 }}>
        {kind === "search" ? <Glyph name="search" size={base * 0.6} color={dim} /> : null}
        <span style={{ fontFamily: fonts.body, fontSize: base * 0.48, fontWeight: WEIGHTS.medium,
          letterSpacing: "-0.015em", color: fg, lineHeight: 1.25, minHeight: kind === "search" ? undefined : base * 1.2,
          flex: kind === "search" ? 1 : undefined }}>
          {scene.text.slice(0, shownN)}
          {caret ? <span style={{ display: "inline-block", width: Math.max(2, base * 0.045), height: base * 0.52,
            marginLeft: 2, verticalAlign: "text-bottom", background: theme.accent === theme.text ? fg : theme.accent }} /> : null}
        </span>
        {kind !== "search" ? (
          <div style={{ display: "flex", alignItems: "center", gap: base * 0.18 }}>
            {scene.badge ? (
              <span style={{ fontFamily: fonts.body, fontSize: base * 0.3, fontWeight: WEIGHTS.semibold,
                color: fg, background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                borderRadius: base * 0.16, padding: `${base * 0.08}px ${base * 0.18}px` }}>
                {scene.badge}
              </span>
            ) : null}
            <span style={{ flex: 1 }} />
            {scene.meta ? (
              <span style={{ fontFamily: fonts.mono, fontSize: base * 0.28, color: dim }}>{scene.meta}</span>
            ) : null}
            <span style={{ width: base * 0.6, height: base * 0.6, borderRadius: base * 0.18,
              background: theme.accent === theme.text && dark ? "#FFFFFF" : theme.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: `scale(${press})` }}>
              <svg width={base * 0.32} height={base * 0.32} viewBox="0 0 100 100">
                <path d="M50 84V18M22 44l28-28 28 28" fill="none" strokeWidth="13" strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke={theme.accent === theme.text && dark ? "#0A0A0B" : theme.onAccent} />
              </svg>
            </span>
          </div>
        ) : null}
      </div>
      {scene.chip ? (
        <div style={arrive(Math.min(start + typeFrames + 4, 30), base * 0.5, "pop", { from: 0.5 })}>
          <Chip {...scene.chip} size={width * 0.3} />
        </div>
      ) : null}
    </Stage>
  );
};
