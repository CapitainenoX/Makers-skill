---
name: maker-remotion
description: >-
  Render motion-designed video from code with Remotion — kinetic typography plus the
  creator's own screen recordings framed inside phone and browser mockups, floating tiles,
  annotated captures, logo lists, terminals, counters and comparisons. This is the engine
  for the clean light-background "studio short" look (bold mixed-weight type on off-white,
  soft raised cards, one accent colour). Use for "fais une vidéo en motion design",
  explainer shorts, product/tool promos, presenting rushes so well they stop looking like
  rushes, animated intros and lower thirds, or when the creator names Remotion.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# Remotion — video as code

Use this when the video's content *is* the design: type, shapes, and — this is the part
people miss — **the creator's own footage, framed so well it stops reading as footage**.
A screen recording inside a phone shell on a gradient, drifting a few pixels, is not "a
clip in a video"; it is product design. A deck of nothing but type carries about ten
seconds, not thirty.

Cutting footage *as footage* — camera, rushes, montage, b-roll — stays in `maker-edit`.

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

## The voice: one flowing sentence, emphasis inside it

Before the scene list, the thing that actually defines this look. It is **not** a stack of
lines with one weight each. It is a sentence that wraps, with words pulled forward:

```jsonc
"rich": "every **AI assistant** you have ever used **works** this way"
```

Plain words muted and medium; `**bold**` black and slightly larger; `__accent__` in the
brand colour; `==highlight==` reversed out of a black box, once per video at most. Words
arrive one at a time.

Read only the bold words — if the sentence still works, it is written right.

Put `rich` on almost any scene. `validate` errors if you put it on one that cannot render
it, rather than letting it silently vanish.

## Centre the block, fill the edges

The composition is **visual above, sentence below, optically centred**. The top and bottom
are never dead: `decor` bleeds shapes off the corners, drifting slowly.

```jsonc
"decor": { "kind": "rays", "corners": ["top-left", "bottom-right"], "opacity": 0.1 }
```

Set it deck-wide, then override per scene and move it around. Identical wallpaper on every
scene is the repetition viewers feel without being able to name it.

## Scene types

Nineteen, each one beat. Bold ones carry footage; starred ones carry logos and structure:

| Type | Beat it serves |
|---|---|
| `textStack` | stacked display lines, for a genuine list of statements |
| `cta` | the ask — one action, a button that lands and pulses once |
| ★ `chips` | white circles holding marks — the "works with" beat |
| ★ `diagram` | a hub wired to its parts, dashed connectors |
| ★ `flow` | a pipeline on a white card, numbered and dotted |
| ★ `mock` | one rebuilt UI control — a prompt bar, not a cropped screenshot |
| **`card`** | a clip inside a phone or browser shell, on a gradient, drifting |
| **`media`** | footage framed, or full-bleed under a scrim and one line |
| **`tiles`** | two to four sources floating at different scales and angles |
| **`annotate`** | a capture with a ring, box or arrow popping onto the detail |
| `pill` | a name on a raised capsule: the product, the tool, the brand |
| `logoList` | options, integrations, "works with" — rows that cascade |
| `marquee` | a scrolling row of chips — breadth, without a list |
| `bullets` | what you get, as raised chips |
| `stat` | one enormous number, counting up |
| `progress` | bars that fill — a value you watch arrive |
| `code` | a terminal that types itself — proof beats claims |
| `compare` | before/after, them/us |
| `quote` | someone else's words, given room |
| `outro` | the last frame that sends them somewhere |

Chips take a built-in glyph (`sparkle` `gear` `cube` `terminal` `database` `rocket` …) or
a path to the creator's own logo in `public/`. This repo ships nobody's trademark — for a
real brand mark, take it from that brand's press kit.

Put the clips in `.maker/remotion/public/shots/` and reference them by that relative path.
**Always set `media.out`** — it is how a 3 s clip loops under a 4 s scene instead of
freezing on its last frame. `validate` probes every source and tells you before you render.

## 3. Look at it before you judge it

```bash
"$MK" remotion validate deck.json                       # lint first, it is free
"$MK" remotion sheet deck.json -o out/sheet.png         # one frame per scene, tiled
"$MK" remotion still deck.json -o out/hook.png --scene 0
```

**Open `sheet.png` with your image reader.** A still takes ~4 s, a full render takes
minutes; iterate on stills. Never describe a design you have not seen.

The lint flags what actually breaks this format: a missing or too-short clip, a slow
first scene, scenes over ~3 s, three of the same scene type in a row, display lines too
long to fit, a deck with no footage in it at all, fewer than four scene shapes across a
long deck, a missing audio bed.

## 4. Sound — not optional

A silent short is the most expensive mistake in this format, and an unrelated music bed
is barely better: it signals the video was assembled rather than made. The renderer
outputs silent video on purpose; sound is a separate, deterministic pass.

```bash
"$MK" sound pack                                      # recorded one-shots (Freesound, CC0)
"$MK" sound music "minimal tech ambient loop"         # a bed, with its credit recorded
"$MK" sfx gen --all                                   # synthesised fallback, no key needed
"$MK" tts "<the script>" -o voice/vo.wav --lang en    # your own voice beats trending audio
"$MK" mix out/video.mp4 -o out/final.mp4 \
     --from-deck deck.json --voice voice/vo.wav --music assets/bed.mp3 \
     --sfx-dir .maker/sound/sfx
```

Two sources of one-shots, and the mix prefers the first: **recorded** takes from Freesound
have air and room in them and sit better under a voice; **synthesised** ones are clean and
tail-free, need no key, and are always there so a missing key never means a silent cut.
`mk sound pack` names its files to match the cut types the mixer looks for.

Freesound needs `FREESOUND_API_KEY` in the environment (free, from
freesound.org/apiv2/apply). It is read from the environment only — never write a key into
a file the repo tracks. Every download appends to `credits.md` beside the files; paste the
lines marked *credit required* into the description, because a CC-BY sound without credit
is a licence breach and nobody remembers the author a week later.

`--from-deck` reads the scene boundaries and drops one one-shot per cut, 60 ms early,
chosen by scene type. Voice sits at 0 dB, the bed ducks under it, the whole mix is
loudness-normalised in two passes to −14 LUFS.

Pick music that matches the **tempo of your cuts**, not the mood of the topic. Full
reasoning and the retention numbers behind all of this: `references/retention.md`.

## 5. Logos — real ones

```bash
"$MK" logo get github "arch linux" docker node --color 111111
"$MK" logo list
```

Real marks from Simple Icons (CC0), cached in `public/logos/`. A redrawn approximation
looks wrong to exactly the audience that knows the brand — which is the audience for a
video about a GitHub project. Reference one as a chip icon:

```jsonc
{ "icon": "logos/github.svg", "label": "GitHub" }
```

## 6. Render

```bash
"$MK" remotion render deck.json -o out/final.mp4 --preview   # half scale, fast
"$MK" remotion render deck.json -o out/final.mp4             # final
"$MK" qc out/final.mp4 --target shorts
```

`--transparent` renders VP8 with alpha, for an insert you will composite over footage
in the EDL — that is the normal way to mix the two engines.

## 7. Mixing with footage

The two renderers compose. Build the motion-graphics beats here, render them with alpha
or as clips, then put them on the EDL timeline as ordinary sources:

```jsonc
// in edl.json
{ "src": "out/intro.mp4", "duration": 2.4, "fit": "cover", "transition": { "type": "cut" } }
```

Rule of thumb: screen recordings, camera and downloaded clips → `maker-edit`. Titles,
lists, stats, diagrams, anything data-driven or repeated → here.

## 8. Timing and motion

Remotion counts in frames; the deck counts in seconds. Keep `maker-motion`'s limits:
scenes 1.2–2.2 s on vertical, first scene ≤ 1.5 s, entrances 0.18–0.25 s. The spring
presets (`pop`, `snap`, `smooth`, `heavy`) already encode the easing doctrine — `pop`
overshoots, and that overshoot is what makes a card feel snappy rather than placed.

Three moves carry most of the life in this look:

- `"reveal": "word"` on a `textStack` — each word pops in turn, so a written line lands
  like a spoken one. Use it on the hook, not on every card.
- `"float": 8, "tilt": 4` on a `card` or `media` — a slow sine drift with perspective.
  Enough to feel alive, not enough to notice.
- `stat` counts its digits up on a monotonic ramp, never on the spring: a value that
  overshoots and comes back reads as a bug, not as energy.
- The `rich` caption reveals word by word, so a written line lands like a spoken one.
- `==highlight==` is animated: the words land as normal text, then the marker strokes
  across them and the ink flips. A box that appears with the word reads as a label; the
  sweep reads as someone highlighting a line.
- Every scene arrives from a different direction. `variant` rotates by index unless the
  deck names one — that rotation is what stops eleven scenes entering eleven times the
  same way.

The display face (Inter) is **bundled with the project**, not fetched. A font pulled from
a CDN at render time fails on an offline machine, behind a proxy, or on any host whose CA
the renderer does not trust — and it took the whole render down when it did.

Scenes cut by default. A `fade` transition overlaps the two scenes into a real
cross-dissolve; use it at chapter breaks, not between every card.

## 9. Going beyond the deck

When a beat genuinely needs something the scene library has no shape for, write a real
Remotion component and register it. At that point use Remotion's own documentation and
agent skills rather than guessing the API:

```bash
npx skills add remotion-dev/skills     # /remotion-markup, /remotion-render, /remotion-captions, …
```

Those cover the framework. This skill covers the look and the pipeline. Add a new scene
type to `src/scenes/`, wire it into `RENDERERS` in `src/Deck.tsx`, and extend `Scene` in
`src/deck.ts` — then it is available to every future deck, which is the point.

## 10. Output

```
**Deck** — 8 scènes, 16 s, `deck.json` · lint OK
**Planche** — `out/sheet.png` (regardée : scène 5 trop chargée, coupée en deux)
**Rendu** — `out/final.mp4` · 1080×1920 · PASS
```
