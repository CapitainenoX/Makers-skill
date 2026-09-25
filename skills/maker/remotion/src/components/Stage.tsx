import React from "react";
import { AbsoluteFill } from "remotion";
import { Rich } from "./Rich";
import { justify, type Scene } from "../deck";
import { useKit } from "../kit";

/** The shared composition: a visual, then the flowing caption, centred as one block.
 *  `captionAt: "above"` flips it — the sentence first, then the thing it describes —
 *  which is the cheapest way to stop twelve scenes having the same silhouette. */
export const Stage: React.FC<{
  scene: Scene;
  gap?: number;
  children: React.ReactNode;
  [legacy: string]: unknown;
}> = ({ scene, gap = 0.95, children }) => {
  const { base } = useKit();
  const above = scene.captionAt === "above";
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify(scene.anchor ?? "center"),
        alignItems: "center",
        flexDirection: above ? "column-reverse" : "column",
        gap: base * gap,
        padding: `${base * 1.3}px ${base * 0.7}px`,
      }}
    >
      {children}
      <RichCaption scene={scene} />
    </AbsoluteFill>
  );
};

/** The flowing caption on its own, for scenes that lay themselves out. */
export const RichCaption: React.FC<{ scene: Scene; inverse?: boolean; [legacy: string]: unknown }> = ({
  scene, inverse,
}) =>
  scene.rich ? (
    <Rich
      text={scene.rich}
      size={scene.richSize ?? 1.02}
      delay={scene.richDelay ?? 6}
      fx={scene.textFx}
      inverse={inverse}
    />
  ) : null;
