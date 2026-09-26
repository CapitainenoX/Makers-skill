import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { stagger, useAnim } from "../motion";
import { WEIGHTS } from "../theme";
import { RichCaption } from "../components/Stage";
import { justify } from "../deck";
import type { SceneProps } from "./types";

/** A terminal whose commands type themselves, character by character, and whose output
 *  lands line by line. Proof beats claims.
 *
 *  The terminal is always a dark slab. It used to take the theme's surface, which on the
 *  default white theme meant near-white text on a white card — invisible. */
export const Code: React.FC<SceneProps<"code">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive } = useAnim();
  const { theme, fonts, base } = kit;
  const prompt = scene.prompt ?? "$";
  const bg = theme.dark ? "#1A1A1A" : "#141414";
  const fg = "#EDEDE9";
  const dim = "rgba(237,237,233,0.6)";
  const typing = scene.typing !== false;
  const cps = 38; // characters per second while typing

  // schedule: each command types over its length, output lines follow 120ms apart
  let t = 6;
  const plan = scene.lines.map((l) => {
    const isCmd = l.startsWith(prompt);
    const start = t;
    const len = isCmd && typing ? Math.round(((l.length - prompt.length) / cps) * fps) : 0;
    t = start + len + (isCmd ? Math.round(fps * 0.16) : stagger(1, fps, 120));
    return { l, isCmd, start, len };
  });
  const cursorOn = Math.floor(frame / 9) % 2 === 0;

  return (
    <AbsoluteFill style={{ justifyContent: justify(scene.anchor), alignItems: "center",
      gap: base * 0.8, padding: `${base * 1.4}px ${base * 0.7}px` }}>
      <div style={{ ...arrive(0, base * 0.8, "snap", { from: 0.94 }), width: width * 0.9,
        borderRadius: base * 0.42, background: bg, overflow: "hidden",
        boxShadow: `${theme.shadowStrong}, 0 0 0 1px rgba(255,255,255,${theme.dark ? 0.16 : 0.06})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: base * 0.16,
          padding: `${base * 0.3}px ${base * 0.36}px`, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {(kit.mono ? ["#5A5A5A", "#5A5A5A", "#5A5A5A"] : ["#FF5F57", "#FEBC2E", "#28C840"]).map((c, k) => (
            <span key={k} style={{ width: base * 0.17, height: base * 0.17, borderRadius: 999, background: c }} />
          ))}
          {scene.title ? (
            <span style={{ marginLeft: base * 0.2, fontFamily: fonts.mono, fontSize: base * 0.28,
              fontWeight: WEIGHTS.medium, color: "rgba(255,255,255,0.5)" }}>{scene.title}</span>
          ) : null}
        </div>
        <div style={{ padding: base * 0.44, display: "flex", flexDirection: "column", gap: base * 0.14,
          minHeight: base * 2.4 }}>
          {plan.map(({ l, isCmd, start, len }, i) => {
            // a line not typed yet still takes its place (invisible): a terminal that
            // grows as lines arrive shoves the whole block up — a visible jolt
            if (frame < start) {
              return (
                <div key={i} style={{ fontFamily: fonts.mono, fontSize: base * (scene.lines.length <= 3 ? 0.6 : 0.5),
                  lineHeight: 1.4, whiteSpace: "pre-wrap", wordBreak: "break-word", visibility: "hidden" }}>
                  {l}
                </div>
              );
            }
            const shown = isCmd && len > 0
              ? prompt + l.slice(prompt.length, prompt.length + Math.ceil(((frame - start) / len) * (l.length - prompt.length)))
              : l;
            const typingNow = isCmd && frame < start + len;
            const isLast = i === plan.length - 1 || frame < plan[i + 1].start;
            return (
              <div key={i} style={{ fontFamily: fonts.mono, fontSize: base * (scene.lines.length <= 3 ? 0.6 : 0.5), lineHeight: 1.4,
                color: isCmd ? fg : dim, whiteSpace: "pre-wrap", wordBreak: "break-word",
                opacity: isCmd ? 1 : Math.min(1, (frame - start) / 4) }}>
                {isCmd ? (
                  <>
                    <span style={{ color: kit.mono || theme.accent === theme.text ? (kit.mono ? "#8A8A8A" : "#7EE787") : theme.accent }}>{prompt}</span>
                    {shown.slice(prompt.length)}
                  </>
                ) : shown}
                {(typingNow || isLast) && cursorOn ? (
                  // zero net width: the caret never pushes the text into a new line
                  <span style={{ display: "inline-block", width: base * 0.2, height: base * 0.4,
                    marginLeft: 2, marginRight: -(base * 0.2 + 2), verticalAlign: "text-bottom", background: fg }} />
                ) : null}
                {/* the rest of the command, invisible: the line wraps where it will end up
                    from the first character, instead of jumping to two lines mid-typing */}
                {isCmd ? <span style={{ visibility: "hidden" }}>{l.slice(shown.length)}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
