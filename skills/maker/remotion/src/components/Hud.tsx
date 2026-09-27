import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha } from "../color";
import { useKit } from "../kit";
import type { Placement } from "../deck";

/** An editorial frame around the whole video: the scene counter top-left, the handle
 *  top-right, a hairline progress bar at the bottom. It fills the edges of a 9:16 frame
 *  with information instead of wallpaper, and it tells the viewer the video is going
 *  somewhere — which is retention. Colours follow the scene underneath (inverted
 *  scenes get a light HUD). */
export const Hud: React.FC<{
  places: Placement[];
  inverted: boolean[];
  handle?: string;
}> = ({ places, inverted, handle }) => {
  const frame = useCurrentFrame();
  const { width, durationInFrames } = useVideoConfig();
  const { fonts, base, mono } = useKit();
  let idx = 0;
  places.forEach((p, i) => { if (frame >= p.start) idx = i; });
  const dark = inverted[idx];
  const ink = dark ? "#FAFAFA" : "#0A0A0A";
  const size = base * 0.3;
  const pad = width * 0.06;
  const n = places.length;
  const progress = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  const pad2 = (v: number) => String(v).padStart(2, "0");
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: fonts.mono, fontSize: size,
      fontWeight: 500, letterSpacing: "0.04em", color: alpha(ink, 0.55) }}>
      <div style={{ position: "absolute", top: pad * 1.1, left: pad, display: "flex", gap: size * 0.6,
        alignItems: "center" }}>
        <span style={{ color: ink }}>{pad2(idx + 1)}</span>
        <span style={{ width: size * 2.2, height: 1.5, background: alpha(ink, 0.35) }} />
        <span>{pad2(n)}</span>
      </div>
      {handle ? (
        <div style={{ position: "absolute", top: pad * 1.1, right: pad }}>{handle}</div>
      ) : null}
      <div style={{ position: "absolute", left: pad, right: pad, bottom: pad * 1.3, height: Math.max(2, base * 0.035),
        background: alpha(ink, mono ? 0.12 : 0.1), borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${(progress * 100).toFixed(2)}%`, height: "100%", background: ink }} />
      </div>
    </AbsoluteFill>
  );
};
