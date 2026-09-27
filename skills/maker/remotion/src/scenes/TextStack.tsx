import React from "react";
import { Stage } from "../components/Stage";
import { TypeStack } from "../components/Type";
import type { SceneProps } from "./types";

/** Stacked display lines, optionally followed by a flowing rich caption. */
export const TextStack: React.FC<SceneProps<"textStack">> = ({ scene }) => (
  <Stage scene={scene} gap={0.7}>
    {scene.lines?.length ? (
      <TypeStack lines={scene.lines} align={scene.align} anim={scene.anim} reveal={scene.reveal} />
    ) : null}
  </Stage>
);
