import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, rise, stagger } from "../motion";
import { Glyph } from "../components/Glyph";
import { Chip } from "../components/Chip";
import { RichCaption } from "../components/RichCaption";
import { parse } from "../text";
import { WEIGHTS } from "../theme";
import type { SceneProps } from "./types";

const SERIF = '"Iowan Old Style", "Palatino Linotype", Georgia, "DejaVu Serif", serif';

/** System notifications: a dark card with an accent rim, an app mark, a serif title and
 *  one line where the number is bold. Two of them wired by a dashed path through a
 *  chip is the "before → after" of a plan, a quota, a price — told as UI, not as a chart. */
export const Toast: React.FC<SceneProps<"toast">> = ({ scene, theme, base, font }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const items = scene.items.slice(0, 3);
  const cardW = width * 0.76;
  const cardH = base * 1.75;
  const gapY = scene.link ? base * 2.9 : base * 0.9;
  const shift = width * 0.05;
  const rim = scene.color ?? theme.accent;

  const card = (it: typeof items[number], i: number) => {
    const p = enter(frame, fps, stagger(i, fps, scene.link ? 420 : 140), "pop");
    const icon = it.icon ?? "sparkle";
    const isFile = /[./]/.test(icon);
    return (
      <div
        key={i}
        style={{
          ...rise(p, base * 0.7),
          width: cardW,
          height: cardH,
          marginLeft: i % 2 === 0 ? -shift : shift,
          display: "flex",
          alignItems: "center",
          gap: base * 0.4,
          padding: `0 ${base * 0.45}px`,
          borderRadius: base * 0.36,
          background: "linear-gradient(180deg, #17171A, #0C0C0E)",
          border: `${Math.max(2, base * 0.05)}px solid ${rim}`,
          boxShadow: `0 ${base * 0.55}px ${base * 0.9}px rgba(0,0,0,0.28), 0 ${base * 0.1}px ${base * 0.2}px rgba(0,0,0,0.2)`,
        }}
      >
        <div style={{ width: cardH * 0.68, height: cardH * 0.68, borderRadius: base * 0.2,
          background: "#232327", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0 }}>
          {isFile ? (
            <Img src={icon.startsWith("http") ? icon : staticFile(icon)}
              style={{ width: cardH * 0.44, height: cardH * 0.44, objectFit: "contain" }} />
          ) : (
            <Glyph name={icon} size={cardH * 0.46} color={rim} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: base * 0.04, minWidth: 0 }}>
          <span style={{ fontFamily: SERIF, fontSize: base * 0.62, fontWeight: 700,
            color: "#F5F5F2", letterSpacing: "-0.01em", lineHeight: 1.05 }}>
            {it.title}
          </span>
          <span style={{ fontFamily: font, fontSize: base * 0.5, color: "#E6E6E2",
            fontWeight: WEIGHTS.medium, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
            {parse(it.text).map((t, k) => (
              <span key={k} style={{ fontWeight: t.em === "plain" ? WEIGHTS.medium : WEIGHTS.black,
                color: t.em === "accent" ? rim : undefined }}>
                {k ? " " : ""}{t.text}
              </span>
            ))}
          </span>
        </div>
      </div>
    );
  };

  // The dashed path draws itself between the two cards, then the chip pops on it.
  const draw = interpolate(frame, [Math.round(fps * 0.25), Math.round(fps * 0.8)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
  });
  const pathH = gapY + cardH;
  const chipP = enter(frame, fps, Math.round(fps * 0.45), "pop");

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: base * 0.9,
      padding: `${base * 1.4}px ${base * 0.6}px` }}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column",
        alignItems: "center", gap: gapY }}>
        {scene.link && items.length >= 2 ? (
          <svg
            width={cardW}
            height={pathH}
            viewBox={`0 0 100 100`}
            preserveAspectRatio="none"
            style={{ position: "absolute", top: cardH / 2, left: 0, overflow: "visible" }}
          >
            <path
              d="M 96 0 C 118 20, 110 40, 50 50 S -18 80, 4 100"
              fill="none"
              stroke={theme.text}
              strokeOpacity={0.75}
              strokeWidth={0.9}
              strokeDasharray="2.4 2"
              vectorEffect="non-scaling-stroke"
              pathLength={100}
              style={{ strokeWidth: Math.max(2, base * 0.06),
                clipPath: `inset(0 0 ${((1 - draw) * 100).toFixed(1)}% 0)` }}
            />
          </svg>
        ) : null}
        {items.map((it, i) => (
          <React.Fragment key={i}>
            {card(it, i)}
          </React.Fragment>
        ))}
        {scene.link && items.length >= 2 ? (
          <div style={{ position: "absolute", top: cardH + gapY / 2, left: "50%",
            transform: `translate(-50%,-50%) scale(${Math.max(0, chipP).toFixed(4)})` }}>
            <Chip {...scene.link} size={base * 1.9} theme={theme} font={font} />
          </div>
        ) : null}
      </div>
      <RichCaption scene={scene} theme={theme} base={base} font={font} />
    </AbsoluteFill>
  );
};
