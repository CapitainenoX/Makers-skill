import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { Glyph } from "../components/Glyph";
import { Media } from "../components/Media";
import { Rich } from "../components/Rich";
import { RichCaption } from "../components/Stage";
import { useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import type { SceneProps } from "./types";

const countTo = (v: string | undefined, k: number) => {
  if (!v) return "";
  const m = /^([\d.]+)(.*)$/.exec(v);
  if (!m) return v;
  const n = parseFloat(m[1]);
  const dec = (m[1].split(".")[1] ?? "").length;
  return `${(n * k).toFixed(dec)}${m[2]}`;
};

/** A social post card, neutral — no platform's branding. The text writes itself in, the
 *  counters climb, the heart pops. Use it for a real quote from a real public post the
 *  creator is allowed to show, or for the creator's own words; never to put words in
 *  someone's mouth. */
export const Post: React.FC<SceneProps<"post">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const W = width * 0.9;
  const k = interpolate(frame, [14, 14 + Math.round(fps * 1.0)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const heartAt = 14 + Math.round(fps * 0.5);
  const heart = interpolate(frame, [heartAt, heartAt + 4, heartAt + 10], [1, 1.35, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const liked = frame >= heartAt;
  const initials = scene.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const metric = (icon: string, value: string | undefined, color: string, scale = 1) => (
    <span style={{ display: "flex", alignItems: "center", gap: base * 0.14, fontFamily: fonts.body,
      fontSize: base * 0.46, fontWeight: WEIGHTS.semibold, color: theme.muted }}>
      <span style={{ transform: `scale(${scale})` }}><Glyph name={icon} size={base * 0.54} color={color} /></span>
      {countTo(value, k)}
    </span>
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: base * 0.9 }}>
      <div style={{ ...arrive(0, base * 1.2, "snap", { from: 0.92 }), width: W, background: theme.surface,
        borderRadius: base * 0.5, padding: base * 0.6, boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}`,
        display: "flex", flexDirection: "column", gap: base * 0.36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: base * 0.26 }}>
          <div style={{ width: base * 1.35, height: base * 1.35, borderRadius: "50%", overflow: "hidden", flex: "none",
            background: theme.accent, color: theme.onAccent, display: "flex", alignItems: "center",
            justifyContent: "center", fontFamily: fonts.body, fontWeight: WEIGHTS.black, fontSize: base * 0.44 }}>
            {scene.avatar ? <Media media={{ src: scene.avatar, fit: "cover" }} /> : initials}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ display: "flex", alignItems: "center", gap: base * 0.1, fontFamily: fonts.body,
              fontSize: base * 0.58, fontWeight: WEIGHTS.bold, color: theme.text }}>
              {scene.name}
              {scene.verified ? (
                <span style={{ width: base * 0.42, height: base * 0.42, borderRadius: "50%", background: theme.accent,
                  display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Glyph name="check" size={base * 0.28} color={theme.onAccent} />
                </span>
              ) : null}
            </span>
            {scene.handle ? <span style={{ fontFamily: fonts.mono, fontSize: base * 0.42, color: theme.muted }}>
              {scene.handle}</span> : null}
          </div>
        </div>
        <div style={{ display: "flex" }}>
          <Rich text={scene.text} size={0.92} align="left" maxWidth="100%" delay={5} cadence={38} />
        </div>
        {scene.media ? (
          <div style={{ ...arrive(10, base * 0.4, "snap"), borderRadius: base * 0.3, overflow: "hidden",
            aspectRatio: "16 / 10" }}>
            <Media media={scene.media} />
          </div>
        ) : null}
        <div style={{ display: "flex", gap: base * 0.6, borderTop: `1px solid ${alpha(theme.muted, 0.2)}`,
          paddingTop: base * 0.3 }}>
          {metric("comment", scene.replies, theme.muted)}
          {metric("share", scene.reposts, theme.muted)}
          {metric("heart", scene.likes, liked ? "#E5484D" : theme.muted, heart)}
        </div>
      </div>
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
