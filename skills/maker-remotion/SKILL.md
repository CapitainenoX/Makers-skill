---
name: maker-remotion
description: >-
  Build videos that contain no footage — pure motion graphics rendered from code with
  Remotion: kinetic typography, product cards, device mockups, logo lists, terminals, big
  stats, comparisons. This is the engine for the clean light-background "studio short" look
  (bold mixed-weight type on off-white, soft raised cards, one accent colour). Use for
  "fais une vidéo en motion design", explainer shorts with no camera, product/tool promos,
  animated intros and lower thirds, or when the creator names Remotion.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# Remotion — video as code

Use this when the video's content *is* the design: no rushes, no camera, just type,
shapes and screenshots moving with intent. Footage-based edits stay in `maker-edit`.

You never hand-write a whole composition. You write a **deck** — JSON scenes — and the
components own every pixel. Same bargain as the EDL: judgement in the JSON, craft in the
renderer. That is what lets a small model produce a designed video.

## 1. Setup (once per machine, ~40 s)

```bash
. .maker/env
"$MK" remotion init          # copies the project into .maker/remotion and npm installs
```

It reuses a Chromium already on the host if it can find one. Remotion needs a
**headless shell** — modern Chrome removed old headless mode, so plain `chrome` fails
with "Failed to launch the browser process". Point `REMOTION_BROWSER_EXECUTABLE` at a
`chrome-headless-shell` binary, or let Remotion download its own.

## 2. Write the deck

```bash
"$MK" remotion deck .maker/projects/<slug>/deck.json --template example
```

Then rewrite it from the beat sheet. Full schema, every scene type and every field:
`references/deck-schema.md`. The house look and its rules: `references/studio-style.md`.

Nine scene types, each one beat:

| Type | Beat it serves |
|---|---|
| `textStack` | the spine — mixed-weight lines, the hook, every statement |
| `pill` | a name on a raised capsule: the product, the tool, the brand |
| `logoList` | options, integrations, "works with" — rows that cascade |
| `card` | a screenshot inside a phone or browser shell on a gradient |
| `bullets` | what you get, as raised chips |
| `stat` | one enormous number |
| `code` | a terminal that types itself — proof beats claims |
| `compare` | before/after, them/us |
| `outro` | the last frame that sends them somewhere |

## 3. Look at it before you judge it

```bash
"$MK" remotion validate deck.json                       # lint first, it is free
"$MK" remotion sheet deck.json -o out/sheet.png         # one frame per scene, tiled
"$MK" remotion still deck.json -o out/hook.png --scene 0
```

**Open `sheet.png` with your image reader.** A still takes ~4 s, a full render takes
minutes; iterate on stills. Never describe a design you have not seen.

The lint flags what actually breaks this format: a slow first scene, scenes over ~3 s,
three of the same scene type in a row, display lines too long to fit, a deck that is all
`textStack` (a slideshow), a missing audio bed.

## 4. Render

```bash
"$MK" remotion render deck.json -o out/final.mp4 --preview   # half scale, fast
"$MK" remotion render deck.json -o out/final.mp4             # final
"$MK" qc out/final.mp4 --target shorts
```

`--transparent` renders VP8 with alpha, for an insert you will composite over footage
in the EDL — that is the normal way to mix the two engines.

## 5. Mixing with footage

The two renderers compose. Build the motion-graphics beats here, render them with alpha
or as clips, then put them on the EDL timeline as ordinary sources:

```jsonc
// in edl.json
{ "src": "out/intro.mp4", "duration": 2.4, "fit": "cover", "transition": { "type": "cut" } }
```

Rule of thumb: screen recordings, camera and downloaded clips → `maker-edit`. Titles,
lists, stats, diagrams, anything data-driven or repeated → here.

## 6. Timing

Remotion counts in frames; the deck counts in seconds. Keep `maker-motion`'s limits:
scenes 1.2–2.2 s on vertical, first scene ≤ 1.5 s, entrances 0.18–0.25 s. The spring
presets (`pop`, `snap`, `smooth`, `heavy`) already encode the easing doctrine — `pop`
overshoots, and that overshoot is what makes a card feel snappy rather than placed.

Scenes cut by default. A `fade` transition overlaps the two scenes into a real
cross-dissolve; use it at chapter breaks, not between every card.

## 7. Going beyond the deck

When a beat genuinely needs something the scene library has no shape for, write a real
Remotion component and register it. At that point use Remotion's own documentation and
agent skills rather than guessing the API:

```bash
npx skills add remotion-dev/skills     # /remotion-markup, /remotion-render, /remotion-captions, …
```

Those cover the framework. This skill covers the look and the pipeline. Add a new scene
type to `src/scenes/`, wire it into `RENDERERS` in `src/Deck.tsx`, and extend `Scene` in
`src/deck.ts` — then it is available to every future deck, which is the point.

## 8. Output

```
**Deck** — 8 scènes, 16 s, `deck.json` · lint OK
**Planche** — `out/sheet.png` (regardée : scène 5 trop chargée, coupée en deux)
**Rendu** — `out/final.mp4` · 1080×1920 · PASS
```
