import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, rise } from "../motion";
import { Device } from "../components/Device";
import { RichCaption } from "../components/RichCaption";
import type { SceneProps } from "./types";

/** 5×7 bitmap letters. A name set in pixels inside a terminal says "developer tool" before
 *  a word is read — and it builds itself column by column, like a boot screen. */
const FONT: Record<string, string[]> = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01111","10000","10000","10000","10000","10000","01111"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01111","10000","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["11111","00100","00100","00100","00100","00100","11111"],
  J: ["00111","00010","00010","00010","00010","10010","01100"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  P: ["11110","10001","10001","11110","10000","10000","10000"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  W: ["10001","10001","10001","10101","10101","10101","01010"],
  X: ["10001","10001","01010","00100","01010","10001","10001"],
  Y: ["10001","10001","01010","00100","00100","00100","00100"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"],
  "0": ["01110","10011","10101","10101","10101","11001","01110"],
  "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00010","00100","01000","11111"],
  "3": ["11110","00001","00001","01110","00001","00001","11110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "5": ["11111","10000","11110","00001","00001","10001","01110"],
  "6": ["01110","10000","10000","11110","10001","10001","01110"],
  "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"],
  "9": ["01110","10001","10001","01111","00001","00001","01110"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
  ".": ["00000","00000","00000","00000","00000","01100","01100"],
  "!": ["00100","00100","00100","00100","00100","00000","00100"],
  "?": ["01110","10001","00001","00010","00100","00000","00100"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
};

export const Pixel: React.FC<SceneProps<"pixel">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const lines = scene.text.toUpperCase().split("\n").slice(0, 3);
  const longest = Math.max(...lines.map((l) => l.length));
  const boxW = width * 0.78;
  const cell = Math.min(base * 0.34, (boxW * 0.84) / (longest * 6));
  const colour = scene.color ?? theme.accent;
  const p = enter(frame, fps, 0, "snap");
  // columns light up left to right across ~0.6 s
  const lit = (frame / (fps * 0.6)) * longest * 6;

  const art = (
    <div style={{ display: "flex", flexDirection: "column", gap: cell * 1.6,
      padding: `${cell * 3}px ${cell * 2.5}px` }}>
      {lines.map((line, li) => (
        <svg key={li} width={line.length * 6 * cell} height={7 * cell}
          viewBox={`0 0 ${line.length * 6} 7`} shapeRendering="crispEdges">
          {line.split("").flatMap((ch, ci) =>
            (FONT[ch] ?? FONT["?"]).flatMap((row, y) =>
              row.split("").map((b, x) => {
                const col = ci * 6 + x;
                if (b !== "1" || col > lit) return null;
                return (
                  <g key={`${ci}-${x}-${y}`}>
                    {/* a darker offset copy under each pixel gives the embossed arcade look */}
                    <rect x={col + 0.18} y={y + 0.18} width={0.94} height={0.94}
                      fill="rgba(0,0,0,0.45)" />
                    <rect x={col} y={y} width={0.94} height={0.94} fill={colour} />
                  </g>
                );
              })))}
        </svg>
      ))}
    </div>
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: base * 0.9,
      padding: `${base * 1.4}px ${base * 0.6}px` }}>
      <div style={{ ...rise(p, base * 0.6) }}>
        <Device kind={scene.frame ?? "slab"} width={boxW} theme={theme} radius={base}
          screen={
            <div style={{ background: "#141416", width: "100%" }}>
              <div style={{ display: "flex", gap: cell * 1.2, padding: `${cell * 1.6}px ${cell * 2}px`,
                background: "#1E1E21" }}>
                {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
                  <span key={c} style={{ width: cell * 1.5, height: cell * 1.5, borderRadius: 99,
                    background: c }} />
                ))}
              </div>
              {art}
            </div>
          } />
      </div>
      <RichCaption scene={scene} theme={theme} base={base} font={font} />
    </AbsoluteFill>
  );
};
