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

**Paper, not screen.** Background `#F4F3F1`, a warm off-white. Pure `#FFFFFF` looks like
a blank page; pure black looks like a different genre. Cards are white *on* the paper, so
the contrast comes from elevation, not colour.

**Two weights, one idea.** Every stack alternates a small medium-weight muted line with a
huge black line:

```
it is                          0.72 / medium / muted
Motion Design                  2.05 / black
that works the way your        0.72 / medium / muted
Brain Does                     2.05 / black
```

The small lines are grammar; the big lines are the message. Read only the big lines and
the video still makes sense — that is the test.

**Tight tracking on display type.** `-0.035em` at black weight, leading at 1.0. Loose
display type is the single clearest tell of a template.

**One accent, used sparingly.** A warm coral (`#D97757`) on one word, one icon, one
number per scene. Two accents is a brand; three is a mess.

**Elevation is the only decoration.** Two shadows on every raised object — a wide soft
one for depth (`0 28px 70px rgba(18,18,15,0.14)`) and a tight one for contact. No borders,
no gradients on text, no glow.

**Italic for narration.** Lines that are the voice talking ("then you pick any model you
want") go italic and muted. Lines that are the claim stay upright and black.

**Content sits high.** `anchor: "top"` with generous bottom space. Centred blocks read as
a slide; top-anchored blocks read as a page being written.

**Nothing holds still and nothing is busy.** One element enters per beat, springs into
place, and stays. No particles, no background video. The one exception is the slow drift
on a framed object (`float: 8`, `tilt: 4`) — a few pixels of movement makes a card read
as an object in a space rather than a rectangle on a slide.

**Motion has to be monotone where the eye is reading a value.** Springs overshoot, which
is right for a card arriving and wrong for a counter: digits that run 1,240 → 1,228 →
1,240 read as a bug. Values ramp; objects spring.

## Cadence

| | |
|---|---|
| Scene length | 1.4–2.4 s. Over 3 s a single card stops earning its place. |
| First scene | ≤ 1.5 s, and the biggest type in the video |
| Transitions | cuts, except a `fade` at a genuine chapter break |
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
- Three of the same scene type in a row — it stops being an edit.
- A display line over ~26 characters: it wraps and the rhythm dies.
- Stock photography. This look has no photographs in it, only screenshots in device shells.
- A logo intro. There is no intro; the first frame is the claim.
- Colour used for decoration rather than for meaning.

## Adapting it

The look is a set of tokens, not a law. For a darker channel switch `theme` to `dark` or
`ink` and keep every rule above — the structure survives the palette. Change `brand.accent`
to the channel's colour and it stops looking like the reference and starts looking like
the channel, which is the actual goal.
