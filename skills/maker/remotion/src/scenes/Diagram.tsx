import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useLayoutWidth } from "../layout";
import { Chip } from "../components/Chip";
import { Stage } from "../components/Stage";
import { TypeStack } from "../components/Type";
import { enter, riseAt, stagger } from "../motion";
import type { SceneProps } from "./types";

/** A hub wired to its nodes. The connectors draw themselves in before the nodes land,
 *  so the structure reads as a system rather than as icons that happen to be near
 *  each other. */
export const Diagram: React.FC<SceneProps<"diagram">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const width = useLayoutWidth();
  const nodes = scene.nodes;
  const n = nodes.length;
  const layout = scene.layout ?? (n === 5 ? "cross" : n <= 3 ? "fan" : "grid");
  const size = width * (scene.size ?? (n > 4 ? 0.17 : 0.2));
  const hubSize = size * 1.05;
  const dashed = (scene.connector ?? "dashed") === "dashed";

  const W = width * 0.78;
  const H = W * 0.92;

  // node centres inside a W x H box, hub sits above at (W/2, -hubGap)
  const hubGap = H * 0.3;
  const pos: { x: number; y: number }[] =
    layout === "cross"
      ? [
          { x: 0.22, y: 0.24 }, { x: 0.78, y: 0.24 },
          { x: 0.22, y: 0.62 }, { x: 0.78, y: 0.62 },
          { x: 0.5, y: 0.92 },
        ].slice(0, n)
      : layout === "fan"
        ? nodes.map((_, i) => ({ x: n === 1 ? 0.5 : 0.16 + (0.68 * i) / (n - 1), y: 0.55 }))
        : nodes.map((_, i) => ({ x: i % 2 === 0 ? 0.24 : 0.76, y: 0.26 + Math.floor(i / 2) * 0.42 }));

  const drawn = enter(frame, fps, 3, "smooth");

  return (
    <Stage scene={scene} theme={theme} base={base} font={font}>
      <div style={{ position: "relative", width: W, height: H + hubGap }}>
        <svg
          width={W}
          height={H + hubGap}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          {pos.map((q, i) => {
            const x1 = W / 2;
            const y1 = hubGap * 0.62;
            const x2 = q.x * W;
            const y2 = hubGap + q.y * H;
            const len = Math.hypot(x2 - x1, y2 - y1);
            return (
              <path
                key={i}
                d={`M${x1} ${y1} V${(y1 + y2) / 2} H${x2} V${y2}`}
                fill="none"
                stroke={`${theme.muted}88`}
                strokeWidth={Math.max(1.5, base * 0.028)}
                strokeDasharray={dashed ? `${base * 0.18} ${base * 0.16}` : undefined}
                style={{
                  strokeDashoffset: 0,
                  opacity: Math.min(1, enter(frame, fps, 2 + stagger(i, fps, 60), "smooth") * 1.4),
                  clipPath: `inset(0 ${(1 - drawn) * 100}% 0 0)`,
                }}
              />
            );
          })}
        </svg>

        {scene.hub ? (
          <div
            style={{
              position: "absolute",
              left: W / 2,
              top: hubGap * 0.62,
              ...riseAt(enter(frame, fps, 0, "pop"), base * 0.4),
            }}
          >
            <Chip {...scene.hub} size={hubSize} theme={theme} font={font} />
          </div>
        ) : null}

        {pos.map((q, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: q.x * W,
              top: hubGap + q.y * H,
              ...riseAt(enter(frame, fps, 7 + stagger(i, fps, 85), "pop"), base * 0.42),
            }}
          >
            <Chip {...nodes[i]} size={size} theme={theme} font={font} />
          </div>
        ))}
      </div>

      {scene.lines ? (
        <TypeStack lines={scene.lines} theme={theme} base={base} font={font} delay={10} />
      ) : null}
    </Stage>
  );
};
