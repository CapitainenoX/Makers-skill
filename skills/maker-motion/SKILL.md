---
name: maker-motion
description: >-
  The craft layer: pacing, rhythm, easing curves, kinetic typography, transitions, camera
  moves, colour and the rules that separate a dynamic edit from a slideshow with a 2-second
  zoom. Use when choosing how a video should feel, when an edit looks flat or monotone, for
  "rends ça dynamique", motion design decisions, animation timing, Framer-Motion-style
  spring work, or before building any EDL.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# Motion — why an edit feels alive

Motion is meaning. A push-in says *look closer*. A whip says *elsewhere, now*. A hold says
*this matters*. Movement that means nothing is worse than stillness, because it costs the
viewer attention and returns nothing.

## 1. Rhythm: the one thing most edits get wrong

Cut on **idea completion**, not on a clock. But measure yourself:

| Format | Avg shot | Longest allowed | Cadence |
|---|---|---|---|
| Short / Reel / TikTok | 1.2–2.2 s | 3 s, and only with motion under it | A change every ≤1.5 s: cut, push, layer, or sound |
| YouTube explainer | 2.5–4.5 s | 7 s on a talking head with b-roll cutaways | Re-hook every 40–60 s |
| Cinematic / trailer | 0.4–1.2 s in bursts | held wide shots between bursts | Contrast is the point |

`mk assemble --dry-run` measures it for you and complains. It is right more often than
your instinct.

**Vary the interval.** Four 1.5-second shots in a row is a metronome, and viewers tune
metronomes out. Go 1.2 / 0.8 / 2.4 / 1.0 — the long shot lands *because* the short ones
set it up. Rhythm is contrast, not speed.

## 2. Easing: never linear, never default

Linear motion reads as machinery. Real things accelerate and settle.

| Curve | Use for | EDL |
|---|---|---|
| `easeOutCubic` | 90 % of entrances — fast in, gentle settle | default |
| `easeOutBack` | Text pops, stickers, anything that should feel *snappy* (it overshoots) | entrances ≤0.25 s |
| `easeOutExpo` | Something arriving from far away, fast | whips, slams |
| `easeInOutCubic` | Camera moves that start and end at rest | push-ins, pans |
| `easeInCubic` | Exits — let it fall away | outros only |
| `linear` | Continuous machines: rotations, tickers, parallax | rare |

**Durations.** Entrances 0.18–0.25 s. Exits 0.12–0.18 s (leaving is always faster than
arriving). Camera moves span the shot. Transitions 0.15–0.3 s. Anything above 0.5 s
reads as hesitation — unless the hesitation *is* the point, and then make it 1.2 s so it
reads as deliberate rather than broken.

## 3. Camera on still and static footage

No shot sits still unless stillness is the statement.

```jsonc
"motion": { "type": "punch",   "from": 1.0,  "to": 1.14, "ease": "easeOutCubic" }   // emphasis
"motion": { "type": "zoomout", "amount": 0.18, "ease": "easeInOutCubic" }           // reveal
"motion": { "type": "panright","amount": 0.12 }                                     // scanning
"motion": { "type": "shake",   "amount": 0.5, "freq": 9 }                           // impact, ≤0.4 s
```

The mistake this skill exists to prevent: **one 2 % zoom spread over three seconds on
every shot**. That is not motion, it is drift. Either commit (12–18 % across a 1.5 s shot)
or hold perfectly still and let a layer carry the movement.

Direction carries meaning: push in on a claim, pull out on a consequence, pan in the
direction of reading, shake only on an actual impact.

## 4. Kinetic typography

Text is a character in the edit, not a label.

- **Two sizes and one accent colour per video.** A hook size, a caption size, one colour
  that means "this word". More than that is noise pretending to be design.
- **Animate in, hold, animate out.** `popIn` with `easeOutBack` (scale 55 → 110 → 100)
  in 0.22 s. Hold long enough to read — ~0.35 s per word, minimum 0.8 s. Exit in 0.15 s.
- **One idea per card.** If a line needs to be read twice, it is two cards.
- **Land the text on a cut or a beat.** Text arriving mid-shot for no reason looks like
  a mistake, even when the viewer can't say why.
- **Outline and shadow are structural**, not decoration: text over footage without a
  border disappears on half the frames. The built-in styles already carry them.

```jsonc
{ "type": "text", "text": "40 000 ⭐", "style": "hook", "start": 0.0, "duration": 1.3,
  "y": 0.22, "in": { "anim": "popIn", "duration": 0.22, "ease": "easeOutBack" },
  "out": { "anim": "popOut", "duration": 0.14 } }
```

## 5. Transitions

Default to the **cut**. It is free, invisible, and correct roughly 80 % of the time.
Every non-cut must answer "what does this say?":

| Transition | Says |
|---|---|
| `cut` | Next. |
| `whip` / `slideleft` | Same world, moved. Pair with a whoosh. |
| `flash` | Impact, shock, punchline. Use twice per video, maximum. |
| `fade` | Time passed. Slow — reserve it for chapter breaks. |
| `zoom` | Going deeper into the same subject. |
| `black` | A hard chapter wall. |

Match-cutting beats any transition: end one shot on a shape and start the next on the same
shape in the same place. It is free and it looks expensive.

## 6. Sound is half of motion

- Put the SFX **40–80 ms before** the cut. The ear leads the eye; landing them together
  feels late.
- One whoosh per whip, one impact per slam, one riser into the payoff. Three sounds well
  placed beat twenty scattered.
- Duck the music under the voice (`"duck": true`) — always, not when it seems necessary.
- A beat of silence before the payoff is the loudest tool you have.

## 7. Colour and grade

One look per video, applied to every shot so mixed sources stop looking mixed:

```jsonc
"grade": "eq=contrast=1.08:saturation=1.10:brightness=0.01,curves=preset=medium_contrast"
```

Downloaded clips and phone footage never match out of the box. Nudge contrast and
saturation on the odd ones until they sit together. A consistent slightly-wrong grade
reads as style; an inconsistent correct one reads as sloppy.

## 8. Borrowing from UI motion

Web-animation craft transfers directly: spring overshoot, staggered entrances (lag each
item 60–90 ms so a list *cascades* instead of appearing), transform-only movement,
and motion that respects where things came from. If a Framer-Motion-style or animation
review skill is installed, its timing and easing guidance applies here unchanged —
`maker-motion` sets the video-specific limits, that skill sharpens the curves.

## 9. Before you ship

Watch it muted. If it still reads, the motion is doing its job. Then watch it with sound
and no picture — if the rhythm survives, the edit is sound. Full rubric:
`../maker/references/rubric.md`.

Deeper timing tables and per-genre recipes: `references/recipes.md`.
