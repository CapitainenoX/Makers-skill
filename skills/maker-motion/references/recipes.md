# Motion recipes by genre

Starting points, not laws. Adjust to the channel's style file, which outranks this.

## Faceless short (tech, news, explainer) — 35–50 s
- Shots 1.2–1.8 s. Hook shot 0.9 s with `punch 1.0→1.16 easeOutCubic`.
- Text: `hook` card on frame 1, then hard captions from the VO the whole way.
- Transitions: cuts, one `whip` at the turn, one `flash` on the payoff.
- Audio: bed at −19 dB ducked, whoosh on the whip, impact on the payoff.
- Grade: contrast 1.08, saturation 1.12. Everything slightly cooler than source.

## Screen-capture / product demo
- Speed the boring parts 1.5–2.5× rather than cutting them — continuity sells competence.
- `punch` into the UI element being discussed, `panup` for scrolls.
- Never show a full desktop: crop to the region, 1.4–1.8× scale, so it reads on mobile.
- Add a soft radius + drop shadow on the capture if the channel style does that.
- Key clicks and UI ticks at −14 dB make a silent capture feel alive.

## Reaction / meme edit
- Shots 0.6–1.4 s. Zoom punches on every reaction beat.
- Meme layer enters `popIn`/`slideRight`, 1.2–1.6 s, rotated 4–8° so it reads as pasted on.
- `shake` 0.3 s on impacts only.
- SFX carry the edit; the music is secondary.

## Cinematic / trailer
- Bursts of 0.4–0.8 s cuts between held 2–4 s wides. The contrast is the whole effect.
- `easeInOutCubic` camera moves, slow and continuous. No shake unless it is an impact.
- Text: one word per card, `zoomIn` over 0.6 s, big tracking, centred.
- Sound designs the structure: riser → silence → hit. The silence is not optional.
- Letterbox only if the channel actually uses it.

## Talking head + b-roll
- Cut to b-roll every 4–7 s, hold 2–3 s, come back.
- Jump cuts on the speaker are fine at the pace of speech; hide them with a 4 % scale
  change between takes.
- Lower third `slideUp` at 1.5 s, out at 5 s.
- Punch in 3–5 % on the take where they make the actual point.

## Tutorial / long-form explainer
- Re-hook every 40–60 s: new question on screen, or a pattern break to a different look.
- Chapter cards: 1.2 s, `black` transition in, `fade` out.
- Diagram builds stagger 80 ms per element, `easeOutCubic`.
- Keep the pace under the density of the information — when the idea is hard, slow the
  cutting and let the motion carry the energy instead.

# Timing cheat sheet

| Thing | Duration |
|---|---|
| Text in | 0.18–0.25 s |
| Text out | 0.12–0.18 s |
| Text hold | 0.35 s/word, min 0.8 s |
| Sticker/meme in | 0.15–0.22 s |
| Whip / slide transition | 0.18–0.25 s |
| Flash | 0.12–0.18 s |
| Fade (chapter) | 0.4–0.6 s |
| Shake burst | 0.2–0.4 s |
| Punch-in across a shot | the whole shot, 10–18 % |
| Stagger between list items | 60–90 ms |
| SFX lead before the cut | 40–80 ms |
