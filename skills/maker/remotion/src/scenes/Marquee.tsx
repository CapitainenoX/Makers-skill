import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { measureText } from "@remotion/layout-utils";
import { TypeStack } from "../components/Type";
import { RichCaption } from "../components/Stage";
import { useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** A continuously scrolling row of chips. The only place in this look where something
 *  moves at constant speed — it is a machine, so linear is correct here. Chip widths are
 *  measured, not guessed, so the loop is seamless. */
export const Marquee: React.FC<SceneProps<"marquee">> = ({ scene }) => {
  const { width, fps } = useVideoConfig();
  const { kit, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const speed = scene.speed ?? 70;            // px per second
  const rows = scene.rows ?? 2;
  const chips = scene.items.length ? scene.items : ["—"];
  const fontSize = base * 0.5;
  const padX = base * 0.48;
  const gap = base * 0.26;

  const chipW = (label: string) => {
    try {
      return measureText({ text: label, fontFamily: fonts.body, fontSize,
        fontWeight: String(WEIGHTS.semibold), letterSpacing: "-0.02em" }).width + padX * 2 + gap;
    } catch {
      return fontSize * 0.58 * label.length + padX * 2 + gap;
    }
  };
  const setW = chips.reduce((acc, c) => acc + chipW(c), 0);
  const copies = Math.max(3, Math.ceil((width * 2.4) / Math.max(1, setW)) + 1);

  const row = (rowIndex: number) => {
    const dir = rowIndex % 2 === 0 ? -1 : 1;
    const travelled = ((frame / fps) * speed * (1 + rowIndex * 0.18)) % setW;
    const shift = dir < 0 ? -travelled : travelled - setW;
    const repeated = Array.from({ length: copies }).flatMap(() => chips);
    return (
      <div key={rowIndex} style={{ ...arrive(rowIndex * 4, base * 0.6, "snap"), width: "100%" }}>
        <div style={{ display: "flex", gap, transform: `translateX(${shift}px)`, whiteSpace: "nowrap" }}>
          {repeated.map((c, i) => (
            <span key={i} style={{ background: theme.surface, borderRadius: 999,
              padding: `${base * 0.26}px ${padX}px`, boxShadow: theme.shadowSoft, fontFamily: fonts.body,
              fontSize, fontWeight: WEIGHTS.semibold, letterSpacing: "-0.02em", flex: "none",
              color: (i + rowIndex * 2) % chips.length === 0 ? theme.accentInk : theme.text }}>
              {c}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center", gap: base * 0.8,
      padding: `${base * 1.6}px 0`, overflow: "hidden" }}>
      {scene.lines ? <div style={{ padding: `0 ${base * 0.8}px` }}><TypeStack lines={scene.lines} /></div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: base * 0.26, width: "100%" }}>
        {Array.from({ length: rows }).map((_, i) => row(i))}
      </div>
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
