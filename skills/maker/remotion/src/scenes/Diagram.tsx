import React, { useId } from "react";
import { Easing, interpolate, useVideoConfig } from "remotion";
import { Chip } from "../components/Chip";
import { Stage } from "../components/Stage";
import { TypeStack } from "../components/Type";
import { stagger, useAnim } from "../motion";
import type { SceneProps } from "./types";

/** A hub wired to its nodes. The connectors draw themselves from the hub outward before
 *  the nodes land, and a pulse travels down each wire — so the structure reads as a live
 *  system rather than as icons that happen to be near each other. */
export const Diagram: React.FC<SceneProps<"diagram">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, base } = kit;
  const nodes = scene.nodes;
  const n = nodes.length;
  const layout = scene.layout ?? (n === 5 ? "cross" : n <= 3 ? "fan" : "grid");
  const size = width * (scene.size ?? (n > 4 ? 0.17 : 0.2));
  const hubSize = size * 1.05;
  const dashed = (scene.connector ?? "dashed") === "dashed";

  const W = width * 0.78;
  const H = W * 0.92;
  const hubGap = H * 0.3;
  const pos: { x: number; y: number }[] =
    layout === "cross"
      ? [{ x: 0.22, y: 0.24 }, { x: 0.78, y: 0.24 }, { x: 0.22, y: 0.62 }, { x: 0.78, y: 0.62 },
         { x: 0.5, y: 0.92 }].slice(0, n)
      : layout === "fan"
        ? nodes.map((_, i) => ({ x: n === 1 ? 0.5 : 0.16 + (0.68 * i) / (n - 1), y: 0.55 }))
        : nodes.map((_, i) => ({ x: i % 2 === 0 ? 0.24 : 0.76, y: 0.26 + Math.floor(i / 2) * 0.42 }));

  const uid = useId().replace(/:/g, "");
  const x1 = W / 2;
  const y1 = hubGap * 0.62;
  return (
    <Stage scene={scene}>
      <div style={{ position: "relative", width: W, height: H + hubGap }}>
        <svg width={W} height={H + hubGap} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {pos.map((q, i) => {
            const x2 = q.x * W;
            const y2 = hubGap + q.y * H;
            const d = `M${x1} ${y1} V${(y1 + y2) / 2} H${x2} V${y2}`;
            const s = 3 + stagger(i, fps, 60);
            const draw = interpolate(frame, [s, s + Math.round(fps * 0.4)], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
            const pulse = ((frame - s - fps * 0.4) / (fps * 1.1)) % 1;
            return (
              <g key={i}>
                {/* the wire draws from the hub outward: a solid stroke revealed along its
                    length, used as the mask of the (dashed) visible one */}
                <mask id={`${uid}m${i}`} maskUnits="userSpaceOnUse">
                  <path d={d} fill="none" stroke="#fff" strokeWidth={base * 0.2} pathLength={1}
                    strokeDasharray="1 1" strokeDashoffset={1 - draw} />
                </mask>
                <path d={d} fill="none" stroke={theme.muted} strokeOpacity={0.55}
                  strokeWidth={Math.max(1.5, base * 0.032)} mask={`url(#${uid}m${i})`}
                  strokeDasharray={dashed ? `${base * 0.18} ${base * 0.16}` : undefined} />
                {draw >= 1 && pulse >= 0 ? (
                  <path d={d} fill="none" stroke={theme.accent} strokeWidth={Math.max(3, base * 0.07)}
                    strokeLinecap="round" pathLength={1} strokeDasharray="0.06 1"
                    strokeDashoffset={-pulse} />
                ) : null}
              </g>
            );
          })}
        </svg>
        {scene.hub ? (
          <div style={{ position: "absolute", left: x1, top: y1,
            ...arrive(0, base * 0.4, "pop", { centered: true, from: 0.5 }) }}>
            <Chip {...scene.hub} size={hubSize} />
          </div>
        ) : null}
        {pos.map((q, i) => (
          <div key={i} style={{ position: "absolute", left: q.x * W, top: hubGap + q.y * H,
            ...arrive(9 + stagger(i, fps, 85), base * 0.5, "pop", { centered: true, from: 0.5 }) }}>
            <Chip {...nodes[i]} size={size} />
          </div>
        ))}
      </div>
      {scene.lines ? <TypeStack lines={scene.lines} delay={10} /> : null}
    </Stage>
  );
};
