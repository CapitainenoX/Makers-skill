---
name: maker-remotion
description: >-
  Render motion-designed video from code with Remotion — kinetic typography plus the
  creator's own screen recordings framed inside phone and browser mockups, floating tiles,
  annotated captures, logo lists, terminals, counters and comparisons. This is the engine
  for the clean light-background "studio short" look (bold mixed-weight type on off-white,
  soft raised cards, one accent colour) and its variants (dark, editorial serif, condensed
  impact type). 34 scene types, 12 transitions with real motion blur, complementary
  layers (stickers, arrows, cursor, notifications), a type system by importance, and a
  coherence check that verifies every logo's colour against the surface it sits on.
  Use for "fais une vidéo en motion design",
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
"$MK" remotion deck .maker/projects/<slug>/deck.json --template showcase
```

`showcase` uses every new scene, transition and layer once — copy the beats you need,
then delete the rest.

Then rewrite it from the beat sheet. Full schema, every scene type and every field:
`references/deck-schema.md`. The house look and its rules: `references/studio-style.md`.

## Black and white by default

`style: "mono"` is the default: white paper, black ink, no colour anywhere — logos are
drawn in the ink of their surface, accents become underlines or reversed words.
Rhythm comes from **inversion**: some scenes flip to a black slab (chosen automatically,
never twice in a row, always joined by a hard-edged transition). Each scene carries a
**ghost** — its keyword, huge and outlined, drifting behind — and the video wears a
**HUD** (scene counter, handle, progress bar). `validate` flags any colour that slips
into a mono deck. `"style": "color"` opts out.

## The voice: one flowing sentence, emphasis inside it

Before the scene list, the thing that actually defines this look. It is **not** a stack of
lines with one weight each. It is a sentence that wraps, with words pulled forward:

```jsonc
"rich": "every **AI assistant** you have ever used **works** this way"
```

Plain words muted and medium; `**bold**` black and slightly larger; `__accent__` in the
brand colour; `*serif*` in the italic serif — the voice, a nuance; `~~underline~~` a
hand-drawn stroke that draws itself; `==highlight==` reversed out of a black box, once
per video at most; `[[logos/github.svg]]` an inline logo. Words arrive one at a time,
with an entrance (`textFx`: rise, mask, blur, pop, slide, type) that rotates by scene.

Read only the bold words — if the sentence still works, it is written right.

Put `rich` on almost any scene. `validate` errors if you put it on one that cannot render
it, and on an unclosed marker — `**GitHub` alone would print the asterisks.

## Type by importance

`"typeset"` picks a family of four faces — **display** for the hook, numbers and titles,
**body** for sentences and labels, an italic **serif** for the voice, **mono** for code,
handles and data. `studio` (Inter + Instrument Serif), `editorial` (Fraunces), `impact`
(Anton capitals), `tech` (Space Grotesk), `playful` (Bricolage). The renderer assigns the
face from the line's importance; display lines are measured and fitted to the width, so
they never wrap or overflow. Pick the typeset from the channel's tone, keep it for the
whole video.

## Centre the block, fill the edges

The composition is **visual above, sentence below, optically centred**. The top and bottom
are never dead: `decor` bleeds shapes off the corners, drifting slowly.

```jsonc
"decor": { "kind": "rays", "corners": ["top-left", "bottom-right"], "opacity": 0.1 }
```

Set it deck-wide, then override per scene and move it around. Identical wallpaper on every
scene is the repetition viewers feel without being able to name it.

## Scene types

Thirty-four, each one beat. The point of having this many is **never showing the same
silhouette three times in a row** — `validate` checks shape families, not just types
(chips → orbit → diagram is three rounds of "logos in circles").

| Family | Types | Beat |
|---|---|---|
| type | `textStack` `kinetic` `quote` | the claim; full-frame kinetic poster; someone else's words (serif) |
| wall | `chapter` | an inverted slab, a huge number, a title — resets attention |
| logos | `chips` `orbit` `diagram` `marquee` | works-with; an ecosystem circling a hub; a wired system; breadth |
| list | `bullets` `logoList` `steps` `checklist` `timeline` `flow` | what you get; 1-2-3 on a rail; ticks & strikes; dates on a spine; a pipeline |
| versus | `compare` `versus` `split` | before/after lists; two contenders + VS slam; the frame cut in two |
| number | `stat` `progress` `chart` | one huge number (count / odometer roll / ring); bars; bar-column-line charts |
| footage | `card` `media` `tiles` `annotate` `gallery` `focus` `beforeAfter` | clips in shells; a camera push onto a detail; a reveal slider |
| ui | `mock` `code` `notify` `post` | a prompt that types itself; a terminal; notifications stacking; a social card |
| name / ask | `pill` `cta` `outro` | the product; the ask; where to go |

Every scene also takes `layers` — **complementary elements**: a sticker image, a logo
sticker, a badge, an arrow or a loop that draws itself, a cursor that moves and clicks, a
notification toast, a burst, sparkles, a handwritten label. One or two per scene is what
makes a frame feel produced.

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
first scene, scenes over ~3 s, three of the same scene type **or silhouette** in a row,
one type taking over a third of the deck, no pattern interrupt in a long deck, a deck
with no footage, a missing audio bed.

### Coherence — checked, then corrected

`validate` also runs the checks a designer does by eye (`toolbelt/coherence.py`):

- **Every logo against its real surface.** The mark's colour is read from the SVG and
  measured against the chip it sits on. Under 1.6:1 it would vanish — GitHub's
  near-black on a dark chip, Snapchat's yellow on a white one — so the renderer draws it
  in the theme's ink instead, and `validate` lists it under `auto_corrected`. A forced
  `tint` that makes a mark invisible is an error.
- **The right logo for the name.** A chip labelled "Remotion" holding the React mark is
  flagged.
- **Text on its background**, custom line colours, an accent that equals the page
  (replaced by the ink), an accent too light for text (darkened for text, kept for fills).
- **Markup that would print literally**, a misspelt glyph (with a suggestion), more than
  one `==highlight==`, more than one `__accent__` per sentence, `flash` more than twice.

Read `auto_corrected` like a changelog: if you disagree with a correction, set `tint` or
`fill` on that chip explicitly.

## 3b. Cut on the voice

A narrated video whose pictures change on a clock is two videos playing at once. Edit on
the word instead: give each scene the narration it covers (`say`), let `mk tts` keep the
word timings (edge-tts writes `<voice>.words.json` next to the audio), and sync:

```bash
"$MK" tts - -o voice/vo.wav --lang en < script.txt      # + voice/vo.words.json
"$MK" remotion sync deck.json --words voice/vo.words.json
```

`sync` rewrites every `duration` so each cut lands just before its phrase, and writes
`cues` per scene: each chip, checklist line, step, kinetic line or CTA lands as its word
is said; each word of the `rich` caption appears as it is spoken; a `stat` stops counting
on the number. Paraphrased text still moves with the voice (unmatched items are spread
across the phrase). Run it again whenever the voice or the deck changes.

**Give the viewer a reason to stay.** A hook that opens a loop ("you used this today and
never heard of it"), a turn that promises something useful ("one line of it is worth
saving"), the payoff they can keep, then an ask tied to that payoff ("save this for the
next time a file is too big to send") — not a generic "subscribe".

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
"$MK" logo get github "arch linux" docker node   # brand colour written into each file
"$MK" logo check                                 # which marks will not read where
```

Real marks from Simple Icons (CC0), cached in `public/logos/`, **with the brand colour
written into the file** (the raw package files have no fill and rendered black). A
recoloured copy is its own file (`--color 111111` → `github-111111.svg`), so asking for
one colour never poisons the cache for another. Leave the colour alone: the renderer
adapts each mark to its chip. A redrawn approximation
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
"$MK" remotion jitter out/final.mp4 --deck deck.json   # stutters: must come back empty
```

`jitter` compares every frame with the next and reports isolated jumps inside smooth
motion. A contact sheet cannot show a stutter; this can, and every spike it has found was
a real bug (a box that grew, a filter toggled, a state that snapped instead of fading).

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
scenes 2–4 s on vertical (a narrated deck is timed by `mk remotion sync`), the first scene
≤ 2.5 s, transitions 0.45–0.85 s. An early version cut every 1.5 s with 0.3 s transitions:
viewers could not read it — racing is not the same as rhythm. The spring
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

### Transitions and motion blur

Twelve transitions — `cut` `fade` `slide` `push` `whip` `zoom` `blur` `wipe` `iris`
`panel` `flash` `blinds` — each meaning something (table in `references/deck-schema.md`).
Leave `transition` out and the harness fills it from the deck's **motion language**
(`motion.language`: `clean`, `punchy`, `soft`, `graphic`; the seed picks one if unset):
about half the changes cut, the rest move, never the same move twice in a row, chapters
get the biggest one. `validate` prints the plan; the render, the stills and `mk mix` read
the same resolved deck, so the whoosh lands on the whip.

Everything that travels fast carries **directional motion blur** — whips, pushes, the
kinetic slides, an odometer spinning, a cursor crossing the frame, elements springing
in. A smear along the direction of travel is what makes motion read as fast rather than
as jumpy. `motion.blur: 0` turns it off; `1.5` is heavier.

A transition never changes the timing: cuts sit on the running sum of durations.

### Energy without speed, smoothness without stutter

Dynamic is movement *inside* a readable scene, not more cuts: every scene drifts
(6 % in the mono style, eased), the frame **punches in** ~2.5 % on each emphasised word and
each named item as the voice says it (from the `sync` cues), kinetic lines keep sliding
in parallax after they land, the ghost word travels behind.

Smoothness rules the renderer now follows — keep them in any scene you add:

- An element that ever carries motion blur keeps an (identity) filter for its whole
  life. Adding and removing a filter switches the rendering path and the text jumps
  half a pixel on that frame.
- Anything that slowly scales or translates is `willChange: "transform"` (rasterised
  once, moved as a bitmap); re-rasterising text at a new scale every frame shimmers.
- Nothing changes the layout mid-scene: text that will be typed, lines that will
  appear, are laid out invisibly from frame 0. A box that grows shoves its neighbours.
- No filter with `url()` on an ancestor of something that clips (`overflow: hidden`
  strips): Chromium stops clipping.
- Overshoot is small (`pop` damping 15): a wobble at 30 fps reads as jitter.

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
**Deck** — 8 scènes, 16 s, `deck.json` · lint OK · langage `punchy` · 2 logos corrigés
**Planche** — `out/sheet.png` (regardée : scène 5 trop chargée, coupée en deux)
**Rendu** — `out/final.mp4` · 1080×1920 · PASS
```
