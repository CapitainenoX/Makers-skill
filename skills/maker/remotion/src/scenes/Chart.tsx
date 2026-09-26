import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { Glyph } from "../components/Glyph";
import { RichCaption } from "../components/Stage";
import { stagger, useAnim, cueAt } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import { justify } from "../deck";
import type { SceneProps } from "./types";

const fmt = (v: number, unit = "") => {
  const abs = Math.abs(v);
  const s = abs >= 1e6 ? `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M`
    : abs >= 1e4 ? `${Math.round(v / 1e3)}K`
    : abs >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
  return `${s}${unit}`;
};

/** Data you watch arrive. `bar` (horizontal, the vertical-video default), `column`, or
 *  `line` — the line draws itself and its last point pulses. Values count up with the
 *  bars; the highlighted item takes the accent, the rest stay ink-grey. One chart, one
 *  point: if two bars matter, it is two scenes. */
export const Chart: React.FC<SceneProps<"chart">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const kind = scene.kind ?? "bar";
  const items = scene.items;
  const max = scene.max ?? Math.max(...items.map((i) => i.value), 1);
  const d0 = scene.heading ? 8 : 2;
  const at = (i: number) => cueAt(kit.cues, "items", i, fps, d0 + stagger(i, fps, 90));
  const grow = (i: number) => interpolate(frame, [at(i), at(i) + Math.round(fps * 0.8)],
    [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const hasAccent = items.some((i) => i.accent);
  const colorOf = (i: number) => items[i].accent || (!hasAccent && i === items.length - 1) ? theme.accent : alpha(theme.text, 0.82);
  const W = width * 0.84;

  let body: React.ReactNode;
  if (kind === "line") {
    const H = W * 0.62;
    const pts = items.map((it, i) => [items.length === 1 ? W / 2 : (i / (items.length - 1)) * W,
      H - (it.value / max) * H * 0.9] as const);
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const draw = interpolate(frame, [d0, d0 + Math.round(fps * 1.1)], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    const last = pts[pts.length - 1];
    const pulse = ((frame - d0 - fps * 1.1) / fps) % 1;
    body = (
      <div style={{ ...arrive(0, base * 0.6, "snap"), position: "relative", width: W }}>
        <svg width={W} height={H} style={{ overflow: "visible", display: "block" }}>
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <line key={g} x1={0} x2={W} y1={H - g * H * 0.9} y2={H - g * H * 0.9} stroke={theme.line} strokeWidth={1.5} />
          ))}
          <path d={`${d} L${last[0]} ${H} L${pts[0][0]} ${H} Z`} fill={alpha(theme.accent, 0.1)}
            style={{ clipPath: `inset(0 ${(1 - draw) * 100}% 0 0)` }} />
          <path d={d} fill="none" stroke={theme.accent} strokeWidth={base * 0.09} strokeLinecap="round"
            strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
          {draw >= 1 ? (
            <>
              <circle cx={last[0]} cy={last[1]} r={base * (0.22 + 0.4 * Math.max(0, pulse))} fill="none"
                stroke={theme.accent} strokeWidth={3} opacity={1 - Math.max(0, pulse)} />
              <circle cx={last[0]} cy={last[1]} r={base * 0.17} fill={theme.accent} />
            </>
          ) : null}
        </svg>
        {draw >= 1 ? (
          <div style={{ position: "absolute", left: last[0], top: last[1] - base * 0.5,
            transform: "translate(-80%,-100%)", background: theme.text, color: theme.bg, borderRadius: 99,
            padding: `${base * 0.1}px ${base * 0.28}px`, fontFamily: fonts.mono, fontSize: base * 0.52,
            fontWeight: WEIGHTS.bold, whiteSpace: "nowrap" }}>
            {fmt(items[items.length - 1].value, scene.unit)}
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: base * 0.2 }}>
          {items.map((it, i) => (
            <span key={i} style={{ fontFamily: fonts.body, fontSize: base * 0.44, color: theme.muted }}>{it.label}</span>
          ))}
        </div>
      </div>
    );
  } else if (kind === "column") {
    const H = W * 0.8;
    const colW = Math.min(base * 1.6, (W / items.length) * 0.62);
    body = (
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", width: W, height: H,
        borderBottom: `2px solid ${theme.line}` }}>
        {items.map((it, i) => {
          const g = grow(i);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: base * 0.12 }}>
              <span style={{ fontFamily: fonts.mono, fontSize: base * 0.52, fontWeight: WEIGHTS.bold,
                color: items[i].accent ? theme.accentInk : theme.text, opacity: Math.min(1, g * 3) }}>
                {fmt(it.value * g, scene.unit)}
              </span>
              <div style={{ width: colW, height: (it.value / max) * H * 0.82 * g, background: colorOf(i),
                borderRadius: `${base * 0.18}px ${base * 0.18}px 0 0` }} />
            </div>
          );
        })}
      </div>
    );
  } else {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.5, width: W }}>
        {items.map((it, i) => {
          const g = grow(i);
          return (
            <div key={i} style={{ ...arrive(at(i), base * 0.3, "snap"),
              display: "flex", flexDirection: "column", gap: base * 0.1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: base * 0.2 }}>
                {it.icon ? <Glyph name={it.icon} size={base * 0.7} color={theme.text} surface={theme.bg} /> : null}
                <span style={{ fontFamily: fonts.body, fontSize: base * 0.7, fontWeight: WEIGHTS.semibold,
                  color: theme.text }}>{it.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: base * 0.2 }}>
                <div style={{ height: base * 0.8, width: `${Math.max(0.02, (it.value / max) * g) * 74}%`,
                  background: colorOf(i), borderRadius: base * 0.14 }} />
                <span style={{ fontFamily: fonts.mono, fontSize: base * 0.6, fontWeight: WEIGHTS.bold,
                  color: it.accent ? theme.accentInk : theme.muted }}>{fmt(it.value * g, scene.unit)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center", gap: base * 0.8,
      padding: `${base * 1.6}px ${base * 0.8}px` }}>
      {scene.heading ? <TypeStack lines={scene.heading} /> : null}
      {body}
      {kind === "column" ? (
        <div style={{ display: "flex", justifyContent: "space-around", width: W, marginTop: -base * 0.5 }}>
          {items.map((it, i) => (
            <span key={i} style={{ fontFamily: fonts.body, fontSize: base * 0.46, color: theme.muted,
              textAlign: "center", width: W / items.length }}>{it.label}</span>
          ))}
        </div>
      ) : null}
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
