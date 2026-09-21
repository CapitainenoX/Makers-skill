import React from "react";
import { Composition } from "remotion";
import { Deck } from "./Deck";
import { DEFAULTS, totalFrames, type Deck as DeckType } from "./deck";
import example from "../decks/example.json";

/** One composition whose props *are* the deck, so `--props=deck.json` works with the
 *  plain Remotion CLI too. Canvas and duration come from the deck, so a short and a
 *  long-form piece need no code change. */
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Deck"
    component={Deck as React.FC<Record<string, unknown>>}
    defaultProps={example as unknown as DeckType as unknown as Record<string, unknown>}
    durationInFrames={totalFrames(example as unknown as DeckType)}
    fps={DEFAULTS.fps}
    width={DEFAULTS.width}
    height={DEFAULTS.height}
    calculateMetadata={({ props }) => {
      const deck = props as unknown as DeckType;
      return {
        durationInFrames: totalFrames(deck),
        fps: deck.fps ?? DEFAULTS.fps,
        width: deck.width ?? DEFAULTS.width,
        height: deck.height ?? DEFAULTS.height,
      };
    }}
  />
);
