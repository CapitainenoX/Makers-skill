import { TextStack } from "./TextStack";
import { Pill } from "./Pill";
import { LogoList } from "./LogoList";
import { Card } from "./Card";
import { Bullets } from "./Bullets";
import { Stat } from "./Stat";
import { Code } from "./Code";
import { Compare } from "./Compare";
import { Outro } from "./Outro";
import { MediaScene } from "./Media";
import { Tiles } from "./Tiles";
import { Annotate } from "./Annotate";
import { Marquee } from "./Marquee";
import { Quote } from "./Quote";
import { Progress } from "./Progress";
import { Chips } from "./Chips";
import { Diagram } from "./Diagram";
import { Flow } from "./Flow";
import { Mock } from "./Mock";
import { Cta } from "./Cta";
import { Kinetic } from "./Kinetic";
import { Chapter } from "./Chapter";
import { Split } from "./Split";
import { Versus } from "./Versus";
import { Steps } from "./Steps";
import { Timeline } from "./Timeline";
import { Checklist } from "./Checklist";
import { Chart } from "./Chart";
import { Orbit } from "./Orbit";
import { Gallery } from "./Gallery";
import { Focus } from "./Focus";
import { BeforeAfter } from "./BeforeAfter";
import { Notify } from "./Notify";
import { Post } from "./Post";
import type { Scene } from "../deck";

/** Every scene type the deck can name. `toolbelt/remotion.py:SCENE_TYPES` lists the same
 *  keys — adding a scene means adding it in both places. */
export const RENDERERS: Record<Scene["type"], React.FC<any>> = {
  textStack: TextStack, pill: Pill, logoList: LogoList, card: Card,
  bullets: Bullets, stat: Stat, code: Code, compare: Compare, outro: Outro,
  media: MediaScene, tiles: Tiles, annotate: Annotate, marquee: Marquee,
  quote: Quote, progress: Progress, chips: Chips, diagram: Diagram,
  flow: Flow, mock: Mock, cta: Cta,
  kinetic: Kinetic, chapter: Chapter, split: Split, versus: Versus, steps: Steps,
  timeline: Timeline, checklist: Checklist, chart: Chart, orbit: Orbit,
  gallery: Gallery, focus: Focus, beforeAfter: BeforeAfter, notify: Notify, post: Post,
};
