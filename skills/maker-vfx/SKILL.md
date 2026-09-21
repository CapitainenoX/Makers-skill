---
name: maker-vfx
description: >-
  Visual effects and compositing: remove backgrounds from video or images (AI matting or
  chroma key), green-screen keying, overlays and glitch/RGB-split/light-leak looks, masks,
  screen-replacement, 3D cinematics via Blender, and compositing rendered elements back into
  the cut. Use for "enlève le fond", "fond vert", "ajoute des effets", "un effet glitch",
  cinematics, or any shot that needs an element that wasn't filmed.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# VFX — only what the story needs

An effect that the viewer notices *as an effect* has usually failed. The exceptions are
effects that are the joke, and those must be obvious.

## 1. Background removal

```bash
. .maker/env
"$MK" bgremove rushes/cam.mp4 out/cam.webm --mode auto      # detects a green screen itself
"$MK" bgremove assets/logo.jpg assets/logo.png              # stills
```

Two roads, chosen on evidence:

- **chroma** — a real green/blue wall. Instant, frame-exact, includes despill.
  Tune with `--similarity` (raise it if background survives at the edges, lower it if the
  subject erodes) and `--blend` (0.02–0.08 softens the edge).
- **ai** — no screen. `rembg` per frame: correct but slow. The command reports the frame
  count and estimated minutes and **stops** above ~1 minute of footage until you pass
  `--yes`. Trim first, matte second — always.

Output carries real alpha (`webm`/VP9 by default, `--format prores` for an NLE). Composite
it as an image layer in the EDL, or import it as an alpha clip.

Before either: can you avoid the matte? A tighter crop, a different angle, or a background
you actually want is faster and cleaner than any key.

## 2. Looks you can build with the EDL's `grade` field

These are raw ffmpeg filter chains — they go straight into a clip's `"grade"`:

```jsonc
// hard contrast, slightly cool — the default "tech" look
"eq=contrast=1.10:saturation=1.08,curves=preset=medium_contrast,colorbalance=bs=0.04"

// warm cinematic
"eq=contrast=1.06:saturation=0.94,curves=preset=lighter,colorbalance=rm=0.05:bs=-0.03"

// RGB split / chromatic aberration, one frame of chaos
"rgbashift=rh=-4:bh=4,eq=saturation=1.2"

// VHS / degraded
"noise=alls=14:allf=t,eq=saturation=0.8:contrast=1.15,gblur=sigma=0.4"

// bloom on highlights
"split[a][b];[b]curves=preset=strong_contrast,gblur=sigma=18[g];[a][g]blend=all_mode=screen:all_opacity=0.35"

// hard vignette
"vignette=PI/4"
```

Apply one look to every shot in the video. Mixed sources with a single grade look
intentional; a perfect grade applied unevenly looks broken.

## 3. Glitch and impact, in time

Glitch is punctuation. Put it on the frame of an impact, for 2–4 frames, never as a
transition style you use throughout.

- **Frame glitch**: a 0.1 s clip with `rgbashift` + `noise`, cut in on the beat.
- **Shake**: `"motion": {"type": "shake", "amount": 0.5, "freq": 9}` for ≤0.4 s.
- **Flash**: `"transition": {"type": "flash", "duration": 0.14}` — twice per video, maximum.
- **Light leak / overlay**: a downloaded overlay clip as an image layer with
  `blend=all_mode=screen` on top, at 30–50 % opacity.

## 4. Screen replacement and inserts

Rather than tracking a screen (hard, and it shows when it slips), cut to the screen
content full-frame with a `punch` motion. It reads as a deliberate cutaway, it is legible
on mobile, and it takes minutes instead of an afternoon.

When you genuinely need the composite, `maker-screen` covers recording the insert cleanly,
and a corner-pin/track has to come from an NLE or After Effects over MCP.

## 5. 3D and cinematics

Blender over MCP for title sequences, product spins and camera moves that don't exist in
the footage. The discipline:

1. Low-sample test render of a **single frame**. Show it to the creator. Then commit.
2. Render to image sequence or ProRes 4444 with alpha, never straight to a compressed MP4.
3. Composite into the EDL as a layer, and grade it to match the footage — an ungraded 3D
   insert always looks pasted on.
4. Renders are long. Budget them explicitly and say so before starting.

## 6. Output

```
**VFX** — fond retiré sur cam-01 (chroma, despill), look "tech" sur les 14 plans
**Glitch** — 3 frames sur le point d'impact à 12.4 s
**Coût** — 2 min de matte IA
```
