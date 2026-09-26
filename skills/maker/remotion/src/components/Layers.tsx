import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layer } from "../deck";
import { useKit } from "../kit";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { blurFilter, enter } from "../motion";
import { Glyph, isBuiltinGlyph } from "./Glyph";
import { Media } from "./Media";

const colorOf = (c: string | undefined, theme: ReturnType<typeof useKit>["theme"]) =>
  !c || c === "accent" ? theme.accent : c === "text" ? theme.text : c === "muted" ? theme.muted : c;

/** Complementary elements over a scene: stickers, pointers, bursts, a notification.
 *  They are what make a frame feel produced rather than generated — and each one lands
 *  on its own beat (`at`), so the scene keeps moving after its main block has settled. */
export const Layers: React.FC<{ layers?: Layer[]; sceneFrames: number }> = ({ layers, sceneFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const kit = useKit();
  const { theme, fonts, base } = kit;
  if (!layers?.length) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {layers.map((l, i) => {
        const start = Math.round((l.at ?? 0.35 + i * 0.25) * fps);
        const end = l.until !== undefined ? Math.round(l.until * fps) : sceneFrames + 60;
        if (frame < start - 1 || frame > end + 8) return null;
        const fx = l.fx ?? (l.kind === "toast" ? "drop" : l.kind === "arrow" || l.kind === "scribble" ? "fade" : "pop");
        const preset = fx === "pop" ? "pop" : fx === "drop" ? "snap" : "smooth";
        const p = enter(frame, fps, start, preset);
        const pv = enter(frame - 1, fps, start, preset);
        const out = interpolate(frame, [end, end + 7], [1, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
        const bob = l.float ? Math.sin((frame - start) / fps * 2.2 + i) * base * 0.08 : 0;
        const w = width * (l.size ?? (l.kind === "toast" ? 0.78 : l.kind === "image" ? 0.3 : 0.14));
        const rot = l.rotate ?? 0;

        let tr = "";
        let filter: string | undefined;
        if (fx === "pop") tr = `scale(${(0.3 + 0.7 * p).toFixed(4)})`;
        else if (fx === "drop") {
          const d = -(1 - p) * base * 2.2;
          tr = `translateY(${d.toFixed(2)}px)`;
          filter = blurFilter(0, (p - pv) * base * 2.2, kit.blur);
        } else if (fx === "slide") {
          tr = `translateX(${((1 - p) * base * 2.4).toFixed(2)}px)`;
          filter = blurFilter((p - pv) * base * 2.4, 0, kit.blur);
        } else if (fx === "spin") tr = `rotate(${((1 - p) * -160).toFixed(2)}deg) scale(${(0.4 + 0.6 * p).toFixed(4)})`;
        const wrap: React.CSSProperties = {
          position: "absolute",
          left: l.x * width,
          top: l.y * height,
          transform: `translate(-50%,-50%) translateY(${bob.toFixed(2)}px) ${tr} rotate(${rot}deg)`,
          opacity: Math.min(1, p * 1.6) * out,
          filter,
        };
        const color = colorOf(l.color, theme);

        switch (l.kind) {
          case "image": {
            const shape = l.shape ?? "rounded";
            const radius = shape === "circle" ? "50%" : shape === "none" ? 0 : base * 0.3;
            return (
              <div key={i} style={{ ...wrap, width: w, aspectRatio: shape === "circle" ? "1" : undefined,
                borderRadius: radius, overflow: "hidden",
                border: shape === "sticker" ? `${base * 0.12}px solid #FFFFFF` : undefined,
                boxShadow: shape === "none" ? "none" : `${theme.shadowStrong}, ${theme.shadowSoft}` }}>
                {l.src ? <Media media={{ src: l.src, fit: "cover" }} /> : null}
              </div>
            );
          }
          case "icon":
          case "emoji": {
            if (l.kind === "emoji" && l.text) {
              return (
                <div key={i} style={{ ...wrap, fontSize: w * 0.9, lineHeight: 1,
                  filter: `${filter ?? ""} drop-shadow(0 ${base * 0.12}px ${base * 0.2}px rgba(0,0,0,0.18))` }}>
                  {l.text}
                </div>
              );
            }
            const sticker = l.shape === "sticker" || l.shape === "circle";
            return (
              <div key={i} style={{ ...wrap, width: sticker ? w * 1.4 : w, height: sticker ? w * 1.4 : w,
                borderRadius: "50%", background: sticker ? theme.surface : "transparent",
                boxShadow: sticker ? `${theme.shadowStrong}, ${theme.shadowSoft}` : "none",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Glyph name={l.src ?? "sparkle"} size={w} color={color}
                  surface={sticker ? theme.surface : theme.bg} tint={l.tint} />
              </div>
            );
          }
          case "badge":
          case "label": {
            const badge = l.kind === "badge";
            return (
              <div key={i} style={{ ...wrap, whiteSpace: "nowrap",
                background: badge ? color : "transparent",
                color: badge ? (color === theme.accent ? theme.onAccent : "#FFFFFF") : color,
                borderRadius: 999, padding: badge ? `${base * 0.16}px ${base * 0.34}px` : 0,
                fontFamily: badge ? fonts.body : fonts.serif,
                fontStyle: badge ? "normal" : "italic",
                fontSize: base * (badge ? 0.42 : 0.62),
                fontWeight: badge ? WEIGHTS.black : 400,
                letterSpacing: badge ? "0.02em" : "-0.01em",
                textTransform: badge ? "uppercase" : undefined,
                boxShadow: badge ? theme.shadowStrong : "none" }}>
                {l.text}
              </div>
            );
          }
          case "toast":
            return (
              <div key={i} style={{ ...wrap, width: w, display: "flex", alignItems: "center",
                gap: base * 0.3, padding: base * 0.32, borderRadius: base * 0.42,
                background: theme.dark ? alpha(theme.surface, 0.92) : "rgba(255,255,255,0.94)",
                boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}` }}>
                <div style={{ width: base * 0.9, height: base * 0.9, borderRadius: base * 0.22,
                  background: theme.accent, display: "flex", alignItems: "center",
                  justifyContent: "center", flex: "none" }}>
                  <Glyph name={l.src ?? "bell"} size={base * 0.52} color={theme.onAccent}
                    surface={theme.accent} tint={isBuiltinGlyph(l.src) ? undefined : theme.onAccent} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontFamily: fonts.body, fontSize: base * 0.4, fontWeight: WEIGHTS.bold,
                    color: theme.text, letterSpacing: "-0.01em" }}>{l.text}</span>
                  {l.sub ? (
                    <span style={{ fontFamily: fonts.body, fontSize: base * 0.34, color: theme.muted,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.sub}</span>
                  ) : null}
                </div>
              </div>
            );
          case "burst": {
            const b = interpolate(frame, [start, start + Math.round(fps * 0.45)], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
            return (
              <svg key={i} width={w * 2} height={w * 2} viewBox="-50 -50 100 100"
                style={{ position: "absolute", left: l.x * width, top: l.y * height,
                  transform: "translate(-50%,-50%)", overflow: "visible", opacity: (1 - b) * out }}>
                {Array.from({ length: 10 }).map((_, k) => {
                  const a = (k / 10) * Math.PI * 2 + rot * (Math.PI / 180);
                  const r0 = 14 + b * 22;
                  const r1 = r0 + 12 * (1 - b) + 3;
                  return (
                    <line key={k} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0}
                      x2={Math.cos(a) * r1} y2={Math.sin(a) * r1}
                      stroke={k % 2 ? theme.text : color} strokeWidth={4} strokeLinecap="round" />
                  );
                })}
              </svg>
            );
          }
          case "sparkles":
            return (
              <svg key={i} width={w * 2} height={w * 2} viewBox="-50 -50 100 100"
                style={{ position: "absolute", left: l.x * width, top: l.y * height,
                  transform: "translate(-50%,-50%)", overflow: "visible", opacity: out }}>
                {[[-26, -18, 11], [22, -26, 7], [28, 18, 13], [-18, 26, 6]].map(([x, y, r], k) => {
                  const s = Math.max(0, enter(frame, fps, start + k * 3, "pop")) *
                    (0.75 + 0.25 * Math.sin((frame - start) / fps * 5 + k * 1.7));
                  return (
                    <path key={k} fill={k % 2 ? theme.text : color}
                      transform={`translate(${x} ${y}) scale(${s.toFixed(3)})`}
                      d={`M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r}Z`} />
                  );
                })}
              </svg>
            );
          case "arrow":
          case "scribble": {
            const draw = interpolate(frame, [start, start + Math.round(fps * 0.4)], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
            const x1 = l.x * width;
            const y1 = l.y * height;
            if (l.kind === "scribble") {
              // a loose hand-drawn loop around a point — "look here" without a UI ring
              const rx = w * 0.62;
              const ry = w * 0.36;
              const d = `M ${x1 - rx} ${y1 + ry * 0.1} C ${x1 - rx} ${y1 - ry * 1.1}, ${x1 + rx * 1.05} ${y1 - ry * 1.15}, ${x1 + rx} ${y1 - ry * 0.05} S ${x1 - rx * 0.3} ${y1 + ry * 1.25}, ${x1 - rx * 0.95} ${y1 - ry * 0.35}`;
              return (
                <svg key={i} width={width} height={height} style={{ position: "absolute", inset: 0,
                  overflow: "visible", opacity: out }}>
                  <path d={d} fill="none" stroke={color} strokeWidth={base * 0.09}
                    strokeLinecap="round" pathLength={1} strokeDasharray="1 1"
                    strokeDashoffset={1 - draw} transform={`rotate(${rot} ${x1} ${y1})`} />
                </svg>
              );
            }
            const [tx, ty] = l.to ?? [l.x + 0.15, l.y + 0.1];
            const x2 = tx * width;
            const y2 = ty * height;
            // a curved stroke that bows to one side, with a head that lands once drawn
            const mx = (x1 + x2) / 2 - (y2 - y1) * 0.25;
            const my = (y1 + y2) / 2 + (x2 - x1) * 0.25;
            const ang = Math.atan2(y2 - my, x2 - mx);
            const hl = base * 0.42;
            const head = (s: number) =>
              `M ${x2 + Math.cos(ang + Math.PI - 0.5 * s) * hl} ${y2 + Math.sin(ang + Math.PI - 0.5 * s) * hl} L ${x2} ${y2} L ${x2 + Math.cos(ang + Math.PI + 0.5 * s) * hl} ${y2 + Math.sin(ang + Math.PI + 0.5 * s) * hl}`;
            const headIn = interpolate(draw, [0.85, 1], [0, 1], { extrapolateLeft: "clamp" });
            return (
              <svg key={i} width={width} height={height} style={{ position: "absolute", inset: 0,
                overflow: "visible", opacity: out }}>
                <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke={color}
                  strokeWidth={base * 0.09} strokeLinecap="round" pathLength={1}
                  strokeDasharray="1 1" strokeDashoffset={1 - draw} />
                {headIn > 0 ? (
                  <path d={head(headIn)} fill="none" stroke={color} strokeWidth={base * 0.09}
                    strokeLinecap="round" strokeLinejoin="round" />
                ) : null}
              </svg>
            );
          }
          case "cursor": {
            const [tx, ty] = l.to ?? [l.x, l.y];
            const travel = Math.round(fps * 0.6);
            const m = interpolate(frame, [start, start + travel], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
            const mv = interpolate(frame - 1, [start, start + travel], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
            const cx = (l.x + (tx - l.x) * m) * width;
            const cy = (l.y + (ty - l.y) * m) * height;
            const vx = (m - mv) * (tx - l.x) * width;
            const vy = (m - mv) * (ty - l.y) * height;
            const click = frame - (start + travel);
            const ripple = interpolate(click, [0, Math.round(fps * 0.4)], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
            const press = click >= 0 && click < 5 ? 0.86 : 1;
            const size = base * 0.95;
            return (
              <div key={i} style={{ position: "absolute", left: 0, top: 0, opacity: Math.min(1, p * 2) * out }}>
                {click >= 0 ? (
                  <div style={{ position: "absolute", left: tx * width, top: ty * height,
                    width: size * 1.8, height: size * 1.8, borderRadius: "50%",
                    transform: `translate(-50%,-50%) scale(${0.3 + ripple})`,
                    border: `${Math.max(2, base * 0.05)}px solid ${color}`, opacity: 1 - ripple }} />
                ) : null}
                <div style={{ position: "absolute", left: cx, top: cy,
                  transform: `translate(-18%,-10%) scale(${press})`,
                  filter: `${blurFilter(vx, vy, kit.blur) ?? ""} drop-shadow(0 ${base * 0.08}px ${base * 0.14}px rgba(0,0,0,0.3))` }}>
                  <Glyph name="cursor" size={size} color={theme.dark ? "#FFFFFF" : "#0A0A0B"} />
                </div>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </AbsoluteFill>
  );
};
