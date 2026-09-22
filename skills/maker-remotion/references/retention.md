# Holding attention

Benchmarks and failure modes for short-form in 2026, with what each one means for a deck.
This file exists because a video can be beautifully built and still die in the first
five seconds.

## The three numbers

| Checkpoint | Target | What misses it |
|---|---|---|
| First 3 s | hold **> 80 %** | a slow opening, a logo, silence, text too small to read at a glance |
| Midpoint | **> 60 %** | the body coasts after a good hook |
| Average viewed | **> 70 %** | no payoff, or a hook the video never pays back |

A view that stops before ~3 s barely counts. Engagement ratio — engaged views over total
views — is the honest read: **below 60 % means the body lost them, not the hook.**

## The investment window (3–15 s) is where channels bleed

"Good hook, weak body" is the most common failure in this format. The hook buys you about
three seconds; the next twelve decide everything. Rules that follow from it:

- **A pattern interrupt every 10–15 s.** A cut to a different shape — a diagram after a
  card, a terminal after a stat — resets the boredom clock. In deck terms: never let three
  scenes of the same type run together, and change the entrance variant between scenes.
- **An open loop every 10–15 s.** Ask something the viewer wants answered before you
  answer the previous one.
- **Something moves on every frame.** Not busy — moving. A held card with no motion is a
  slide, and slides get swiped.

## Audio is not decoration

This is the single most expensive mistake in this format, and it is worth being blunt:

- **Bad audio kills a short faster than bad visuals.** Viewers forgive a soft image; they
  do not forgive muffled speech, unbalanced levels or music louder than the voice.
- **Silence is worse than either.** A viewer who unmutes and hears nothing swipes.
- **Your own voice beats trending audio** on a small channel — platforms now favour
  original audio, and a real narration is the cheapest retention you can buy.
- **Music must match the subject and the cut.** An unrelated bed is not neutral; it
  actively signals that the video was assembled rather than made. Match the tempo to your
  cuts, not the mood adjective to the topic.
- **Mix discipline:** voice at 0 dB, bed at −19 dB sidechain-ducked under it, one-shots
  −8 to −14 dB, whole mix at −14 LUFS with true peak under −1 dBTP.

`mk mix --from-deck` places a one-shot on every scene cut automatically, 60 ms early,
chosen by scene type. `mk sound pack` fills the one-shot folder with recorded CC0 takes
and `mk sfx gen` synthesises any that are missing, so there is no excuse for a silent edit.

Choosing a bed: `mk sound music "<mood> loop"` returns CC0 candidates with their length.
Count your cuts per ten seconds and pick the one whose pulse lands near them. A bed chosen
for the topic's mood rather than the edit's tempo is the "unrelated music" failure — it
reads as assembled rather than made.

## Sound-off is the other half

Most viewing starts muted. Every claim that matters must be readable without sound:
burned captions or on-screen text, from the first frame. The two requirements are not in
tension — build for muted, reward unmuting.

## The ask

A short that never asks gets watched and forgotten. Put the CTA **while the payoff is
still warm**, not after the video has visually ended:

- Name one action. "Subscribe" beats "like, subscribe, comment and share".
- Give a reason tied to what they just watched.
- Animate it — a button that lands and pulses once is followed; a static row is wallpaper.
- Keep it under 2 s. The `cta` scene does this shape.

## Applying it to a deck

```
0.0–1.5   hook      biggest type, motion on frame 1, a stake stated
1.5–4     context   the minimum that makes the hook make sense
4–15      proof     a new scene SHAPE every 2 s, one open loop mid-way
15–…      payoff    close the loop the hook opened
last 2 s  cta       one action, animated, while the payoff still lands
```

`mk remotion validate` enforces the mechanical parts: scene length, three-in-a-row of a
type, a deck with no footage, a missing audio bed, a missing CTA.
