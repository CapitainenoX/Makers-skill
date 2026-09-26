import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Glyph } from "../components/Glyph";
import { RichCaption } from "../components/Stage";
import { stagger, useAnim, cueAt } from "../motion";
import { WEIGHTS } from "../theme";
import { alpha } from "../color";
import type { SceneProps } from "./types";

/** Notifications dropping in and stacking — social proof, a flood of results, "it just
 *  keeps happening". Each new one pushes the stack down; older ones shrink back. */
export const Notify: React.FC<SceneProps<"notify">> = ({ scene }) => {
  const { width } = useVideoConfig();
  const { kit, fps, frame, arrive, at } = useAnim();
  const { theme, fonts, base } = kit;
  const items = scene.items.slice(0, 5);
  const W = width * 0.9;
  const cardH = base * 2.3;
  const gap = base * 0.26;
  const every = 220;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: base * 0.9 }}>
      <div style={{ position: "relative", width: W, height: items.length * (cardH + gap) }}>
        {items.map((it, i) => {
          const d = cueAt(kit.cues, "items", i, fps, 4 + stagger(i, fps, every));
          // how many arrived after this one: each pushes it down a slot and back a little
          const newer = items.reduce((acc, _, k) => acc + (k > i ? at(cueAt(kit.cues, "items", k, fps, 4 + stagger(k, fps, every)), "snap") : 0), 0);
          const y = newer * (cardH + gap);
          const depth = 1 - Math.min(0.1, newer * 0.035);
          return (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 0, zIndex: 10 + i,
              transform: `translateY(${y.toFixed(2)}px) scale(${depth.toFixed(4)})`,
              opacity: 1 - Math.min(0.5, newer * 0.14) }}>
              <div style={{ ...arrive(d, base * 1.6, "snap", { dir: "down", from: 0.9 }), height: cardH,
                display: "flex", alignItems: "center", gap: base * 0.3, padding: `0 ${base * 0.36}px`,
                borderRadius: base * 0.46, background: theme.dark ? alpha(theme.surface, 0.95) : "rgba(255,255,255,0.97)",
                boxShadow: `${theme.shadowStrong}, ${theme.shadowSoft}` }}>
                <div style={{ width: base * 1.25, height: base * 1.25, borderRadius: base * 0.3, flex: "none",
                  background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Glyph name={it.icon ?? "bell"} size={base * 0.72} color={theme.onAccent} surface={theme.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: base * 0.04 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: fonts.body, fontSize: base * 0.36, fontWeight: WEIGHTS.semibold,
                      color: theme.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{it.app ?? ""}</span>
                    <span style={{ fontFamily: fonts.body, fontSize: base * 0.34, color: theme.muted }}>{it.time ?? "now"}</span>
                  </div>
                  <span style={{ fontFamily: fonts.body, fontSize: base * 0.54, fontWeight: WEIGHTS.bold,
                    color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</span>
                  {it.body ? <span style={{ fontFamily: fonts.body, fontSize: base * 0.44, color: theme.muted,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.body}</span> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};
