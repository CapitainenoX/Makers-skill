import React from "react";
import { useVideoConfig } from "remotion";
import { Chip } from "../components/Chip";
import { Stage } from "../components/Stage";
import { TypeStack } from "../components/Type";
import { stagger, useAnim } from "../motion";
import type { SceneProps } from "./types";

/** A row or grid of logo chips. The whole "works with everything" beat in one shape.
 *  Chips drop in from alternating sides with a pop and a small spin, then breathe. */
export const Chips: React.FC<SceneProps<"chips">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const n = scene.items.length;
  const cols = scene.columns ?? (n <= 3 ? n : n === 4 ? 2 : 3);
  const size = width * (scene.size ?? (cols <= 2 ? 0.26 : cols === 3 ? 0.2 : 0.17));
  const dirs = ["up", "left", "down", "right"] as const;
  return (
    <Stage scene={scene}>
      {scene.lines ? <TypeStack lines={scene.lines} /> : null}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, auto)`,
        gap: `${size * 0.42}px ${size * 0.4}px`, justifyItems: "center", alignItems: "start" }}>
        {scene.items.map((it, i) => {
          const breathe = 1 + 0.02 * Math.sin(frame / fps * 2 + i * 1.3);
          return (
            <div key={i} style={arrive(stagger(i, fps, 95), size * 0.5, "pop",
              { dir: dirs[(i + kit.seed) % 4], from: 0.4, rotate: i % 2 ? 12 : -12 })}>
              <div style={{ transform: `scale(${breathe.toFixed(4)})` }}>
                <Chip {...it} size={size} />
              </div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};
