# The studio-short look

The reference: clean vertical explainers — bold type on warm off-white, soft raised
objects, one accent colour, a new idea every ~2 seconds. It reads as expensive because it
is *restrained*, not because it is busy.

**There is footage in it.** That is the thing most people get wrong when copying this
look, because the footage is presented so well it stops registering as footage. Screen
recordings sit inside phone and browser shells, on a gradient, with a real shadow, often
drifting a few pixels. The clip is doing the explaining; the frame is what makes it look
designed. A deck that is nothing but type carries about 10 seconds — not 30.

## The rules that make it work

**Black and white, strictly — the house style.** `style: "mono"` is the default: pure
white paper, pure black ink, greys in between, and no colour anywhere — not in the
accent, not in the logos (every mark is drawn in the ink of the surface it sits on), not
in the decor. Emphasis comes from weight, size, the italic serif, the marker box, an
underline, and **inversion**: every few scenes the frame flips to a black slab with white
ink (`invert`, placed automatically on the big-type beats — kinetic, stat, quote, cta —
never twice in a row). The flip itself is the rhythm; between a white and a black scene
the harness only uses hard-edged transitions (wipe, push, iris, whip, blinds), because a
dissolve averages the two into grey mush.

Two things fill the frame instead of wallpaper: a **ghost** — the scene's keyword,
outlined, three times the frame's width, drifting behind the block — and the **HUD**,
an editorial frame with the scene counter, the handle and a hairline progress bar.
Corner decor is off in this style.

`"style": "color"` brings the accent, brand-coloured logos and corner decor back; every
rule below still applies to it.

**Black on white.** That is the default and it is deliberate: `#FFFFFF` background,
near-black type; in `style: "color"`, one accent that a deck opts into with `brand.accent`. White cards on a
white page separate through elevation — a strong shadow and a hairline — not a tinted
background. The restraint is the style; colour is what you add for one word, one icon,
one number.

A warmer paper (`#F4F3F1`) is a legitimate variation, but set it per deck rather than
making it the house default.

**The sentence flows; the emphasis is inside it.** This is the single most-copied and
most-misunderstood part of the look. It is *not* a stack of lines with one weight each.
It is one sentence that wraps naturally, with individual words pulled forward:

```
every **AI assistant** you have ever used **works** this way
```

Plain words are medium-weight and muted; emphasised words are black, near-black and a
touch larger. **Read only the bold words and the sentence still works** — that is the
test, and it is what lets someone follow the video while scrolling past it.

Write it as `rich` on any scene. Markers: `**bold**`, `__accent__`, `==highlight==`
(a black box with reversed text, for the one line per video that must not be missed).

Keep it to one sentence that wraps to two lines. Three lines is a paragraph, and nobody
reads a paragraph on a short. Watch the wrap: a line ending on "il" or "de" reads as
broken even when the words are right — rewrite rather than resize.

**Stacked lines still exist** for the beats that are genuinely a list of statements
(`lines`), but the flowing sentence is the default voice.

**Tight tracking on display type.** `-0.035em` at black weight, leading at 1.0. Loose
display type is the single clearest tell of a template.

**One accent, used sparingly.** Set `brand.accent` and use it on one word, one icon, one
number per scene. Two accents is a brand; three is a mess. Left unset the deck stays
mono, which is the safe default and rarely the wrong one.

**Logos are real, and they keep their colours.** Fetch the brand's actual mark
(`mk logo get github docker node`) rather than drawing an approximation. On a
black-and-white deck the brand colours are the only colour on screen, and that contrast
is the point — do not recolour them unless a logo must deliberately recede (`--mono`).

**Every scene arrives differently.** `variant` rotates by index. Same-entrance repetition
is what a viewer feels at scene six without being able to name it.

**Elevation is the only decoration.** Two shadows on every raised object — a wide soft
one for depth (`0 28px 70px rgba(18,18,15,0.14)`) and a tight one for contact. No borders,
no gradients on text, no glow.

**Italic serif for the voice.** Lines that are the voice talking ("then you pick any
model you want") go into the italic serif (`i: true`, or `*word*` inside a sentence).
Lines that are the claim stay upright, grotesque and black. That contrast — a heavy
grotesque against a light italic serif — is the single cheapest way to look editorial.

**One face per level of importance, never more.** Display for the hook and the numbers,
body for sentences and labels, serif for the voice, mono for what a machine said (code,
handles, dates, chart values). The `typeset` decides the four; the renderer assigns them
by importance. Two display faces in one video is a ransom note.

**Coherence is measured, not hoped for.** Every logo is checked against the chip it sits
on and redrawn in the ink when its brand colour would vanish; the accent is darkened for
text when it is too light to read; a chip labelled with one brand holding another's mark
is flagged. Read `validate`'s `auto_corrected` list before you render.

**Centre the block, fill the edges.** The composition — visual above, sentence below —
is optically centred. The top and bottom are not left empty: shapes bleed off the corners
(`decor`), slowly drifting and rotating. Pinning content to the top and leaving dead space
below is what makes a copy of this look feel cheap.

Move the decor around between scenes (`corners`, and alternate `rays` / `arcs` / `blobs`).
Identical wallpaper on eleven scenes in a row is the repetition viewers feel without being
able to name.

**Everything drifts slightly.** Every scene gets a slow push (`zoom`, 0.035 by default),
alternating in and out across the deck. A perfectly static frame reads as a slide; three
or four percent of drift over two seconds reads as a camera.

**Nothing holds still and nothing is busy.** One element enters per beat, springs into
place, and stays. No particle storms, no background video. One or two complementary
`layers` — a sticker, an arrow that draws itself, a cursor that clicks — land on their
own beat after the main block, so the scene keeps moving without getting crowded.

**Fast things smear.** Whips, pushes and anything that travels far in a few frames carry
directional motion blur. It is the difference between motion that reads as speed and
motion that reads as a dropped frame. The one exception is the slow drift
on a framed object (`float: 8`, `tilt: 4`) — a few pixels of movement makes a card read
as an object in a space rather than a rectangle on a slide.

**Motion has to be monotone where the eye is reading a value.** Springs overshoot, which
is right for a card arriving and wrong for a counter: digits that run 1,240 → 1,228 →
1,240 read as a bug. Values ramp; objects spring.

## Cadence

| | |
|---|---|
| Scene length | 2–4 s — long enough to read (~1 s + 0.3 s per word on screen, half that when the voice says the words). Over ~5 s a single card stops earning its place. |
| Transitions | 0.45–0.85 s: long enough to be seen as a move, not a glitch |
| Narration | a real pause (~0.4 s) between sentences — `mk tts --pause` |
| First scene | ≤ 1.5 s, and the biggest type in the video |
| Transitions | about half cut; the rest from one motion language, never the same twice in a row |
| Entrance | `pop` spring, 0.18–0.25 s, with overshoot |
| List stagger | 75–85 ms per row |
| Total | 15–40 s |

## Structure that works for a tool/product short

1. `textStack` — the claim, biggest type in the video
2. `card` — the thing, running, inside a phone or browser
3. `media` or `annotate` — the step that proves it, pointed at
4. `logoList`, `bullets` or `marquee` — what it works with / what you get
5. `stat` — the number that settles the argument
6. `outro` — where to go next

Six beats, ~13 s. At least two of them must show something moving that is not type.
Swap 3 and 4 depending on whether proof or breadth is the stronger argument here.

For 20–40 s, add pattern interrupts every 8–10 s: a `kinetic` poster, a `chapter` wall,
a `split` or `versus`, a `focus` push onto a capture, a `chart`. Change the **family**
(type, list, logos, footage, number, ui…) at every cut, not just the type.

## Framing footage

## The shapes that carry the "works with" beats

| Beat | Scene |
|---|---|
| Two or three tools, named | `chips` — white circles, a mark in each, elevated |
| A system: one hub, several parts | `diagram` — dashed connectors from a hub to its nodes |
| A pipeline, input to output | `flow` — a white card with a numbered, dotted spine |
| One UI control, not a whole window | `mock` — rebuild the prompt bar; do not crop a screenshot |

Chips ship with geometric glyphs. For a real product mark, put the brand's own file in
`public/` and pass its path as `icon` — this repo ships nobody's trademark.

## Framing footage

| Source | Frame |
|---|---|
| A phone app, a vertical capture | `card` with `device: "phone"` on a gradient |
| A web app, a dashboard, a terminal UI | `frame: "browser"` |
| A result worth filling the screen | `frame: "full"` with a scrim and one line of text |
| Two or three things at once | `tiles` — different scales and angles, never a grid |
| One detail the viewer would otherwise miss | `annotate` with a single ring |

Crop before you import: most of a 16:9 desktop capture is empty for a 9:16 video. And
zoom the OS to 125-150% *before recording*, or the UI will not read at phone size.

## What breaks it

- More than five lines on screen at once.
- Three of the same scene type in a row — it stops being an edit. Three of the same
  *silhouette* (chips → orbit → diagram) is the same mistake in disguise.
- A logo in the wrong colour: black on a dark chip, yellow on white, or recoloured to
  "match" when the brand colour was the only colour on screen.
- A display line over ~26 characters: it wraps and the rhythm dies.
- Stock photography. This look has no photographs in it, only screenshots in device shells.
- A logo intro. There is no intro; the first frame is the claim.
- A system font. The display face is bundled with the project (`@fontsource-variable/inter`),
  never fetched from a CDN at render time — a font that fails to load takes the render
  down or silently swaps the face halfway through.
- Colour used for decoration rather than for meaning.

## Adapting it

The look is a set of tokens, not a law. For a darker channel switch `theme` to `dark` or
`ink` and keep every rule above — the structure survives the palette. Change `brand.accent`
to the channel's colour and it stops looking like the reference and starts looking like
the channel, which is the actual goal.
