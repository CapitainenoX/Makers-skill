import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useLayoutWidth } from "../layout";
import { Chip } from "../components/Chip";
import { Stage } from "../components/Stage";
import { TypeStack } from "../components/Type";
import { enter, rise, stagger } from "../motion";
import type { SceneProps } from "./types";

/** A row or grid of logo chips. The whole "works with everything" beat in one shape. */
export const Chips: React.FC<SceneProps<"chips">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const width = useLayoutWidth();
  const n = scene.items.length;
  const cols = scene.columns ?? (n <= 3 ? n : n === 4 ? 2 : 3);
  const size = width * (scene.size ?? (cols <= 2 ? 0.26 : cols === 3 ? 0.2 : 0.17));

  return (
    <Stage scene={scene} theme={theme} base={base} font={font}>
      {scene.lines ? (
        <TypeStack lines={scene.lines} theme={theme} base={base} font={font} />
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, auto)`,
          gap: `${size * 0.42}px ${size * 0.4}px`,
          justifyItems: "center",
          alignItems: "start",
        }}
      >
        {scene.items.map((it, i) => {
          const p = enter(frame, fps, stagger(i, fps, 95), "pop");
          return (
            <div key={i} style={rise(p, size * 0.4)}>
              <Chip {...it} size={size} theme={theme} font={font} />
            </div>
          );
        })}
      </div>
    </Stage>
  );
};
