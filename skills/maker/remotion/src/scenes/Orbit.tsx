import React from "react";
import { useVideoConfig } from "remotion";
import { Chip } from "../components/Chip";
import { Stage } from "../components/Stage";
import { stagger, useAnim } from "../motion";
import { alpha } from "../color";
import type { SceneProps } from "./types";

/** A hub with its satellites circling it on two rings, counter-rotating. An ecosystem, a
 *  platform and its integrations — "everything connects to this" as motion rather than
 *  as a grid. The satellites stay upright while they travel. */
export const Orbit: React.FC<SceneProps<"orbit">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, base } = kit;
  const S = width * 0.84;
  const nodes = scene.nodes;
  const inner = nodes.length > 5 ? nodes.slice(0, Math.ceil(nodes.length / 2)) : nodes;
  const outer = nodes.length > 5 ? nodes.slice(Math.ceil(nodes.length / 2)) : [];
  const speed = scene.speed ?? 14; // degrees per second
  const t = frame / fps;
  const chip = width * (scene.size ?? 0.13);

  const ring = (list: typeof nodes, r: number, dir: number, offset: number) =>
    list.map((node, i) => {
      const a = ((i / list.length) * 360 + offset + dir * speed * t) * (Math.PI / 180);
      const x = S / 2 + Math.cos(a) * r;
      const y = S / 2 + Math.sin(a) * r;
      return (
        <div key={`${r}-${i}`} style={{ position: "absolute", left: x, top: y,
          ...arrive(6 + stagger(i + (dir < 0 ? inner.length : 0), fps, 70), base * 0.4, "pop",
            { centered: true, from: 0.3 }) }}>
          <Chip {...node} size={chip} label={undefined} />
        </div>
      );
    });

  return (
    <Stage scene={scene}>
      <div style={{ position: "relative", width: S, height: S }}>
        <svg width={S} height={S} style={{ position: "absolute", inset: 0 }}>
          {[S * 0.3, S * 0.46].slice(0, outer.length ? 2 : 1).map((r, k) => (
            <circle key={k} cx={S / 2} cy={S / 2} r={r} fill="none" stroke={alpha(theme.muted, 0.35)}
              strokeWidth={1.6} strokeDasharray={`${base * 0.12} ${base * 0.14}`}
              style={{ opacity: Math.min(1, frame / 8) }} />
          ))}
        </svg>
        {ring(inner, S * 0.3, 1, -90)}
        {ring(outer, S * 0.46, -1, -60)}
        {scene.hub ? (
          <div style={{ position: "absolute", left: S / 2, top: S / 2,
            ...arrive(0, base * 0.3, "pop", { centered: true, from: 0.4 }) }}>
            <Chip {...scene.hub} size={width * 0.24} />
          </div>
        ) : null}
      </div>
    </Stage>
  );
};
