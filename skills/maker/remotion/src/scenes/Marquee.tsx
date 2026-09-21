import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TypeStack } from "../components/Type";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** A continuously scrolling row of chips. The only place in this look where something
 *  moves at constant speed — it is a machine, so linear is correct here. */
export const Marquee: React.FC<SceneProps<"marquee">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const speed = scene.speed ?? 70;            // px per second
  const rows = scene.rows ?? 2;
  const chips = scene.items.length ? scene.items : ["—"];

  // Estimate one set's width so the loop is seamless, then repeat past both edges.
  const chipW = (label: string) => base * 0.5 * 0.58 * label.length + base * 0.96 + base * 0.26;
  const setW = chips.reduce((acc, c) => acc + chipW(c), 0);
  const copies = Math.max(3, Math.ceil((width * 2.2) / Math.max(1, setW)) + 1);

  const row = (rowIndex: number) => {
    const dir = rowIndex % 2 === 0 ? -1 : 1;
    const travelled = ((frame / fps) * speed) % setW;
    const shift = dir < 0 ? -travelled : travelled - setW;
    const repeated = Array.from({ length: copies }).flatMap(() => chips);
    return (
      <div
        key={rowIndex}
        style={{
          display: "flex",
          gap: base * 0.26,
          transform: `translateX(${shift - setW * 0.5}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {repeated.map((c, i) => (
          <span
            key={i}
            style={{
              background: theme.surface,
              borderRadius: 999,
              padding: `${base * 0.26}px ${base * 0.48}px`,
              boxShadow: theme.shadowSoft,
              fontFamily: font,
              fontSize: base * 0.5,
              fontWeight: WEIGHTS.semibold,
              letterSpacing: "-0.02em",
              color: i % 5 === 2 ? theme.accent : theme.text,
            }}
          >
            {c}
          </span>
        ))}
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor),
        alignItems: "center",
        gap: base * 0.8,
        padding: `${base * 1.6}px 0`,
        overflow: "hidden",
      }}
    >
      {scene.lines ? (
        <div style={{ padding: `0 ${base * 0.8}px` }}>
          <TypeStack lines={scene.lines} theme={theme} base={base} font={font} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.26, width: "100%" }}>
        {Array.from({ length: rows }).map((_, i) => row(i))}
      </div>
    </AbsoluteFill>
  );
};
