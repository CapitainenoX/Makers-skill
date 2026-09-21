---
name: maker-render
description: >-
  Render, inspect, self-review and deliver. Runs quality control on the finished file
  (canvas, fps, loudness, clipping, dead openings, shot pacing, black frames), scores the
  edit against the craft rubric, decides whether to revise, and produces the final export
  plus thumbnail. Use for "exporte", "rends la vidéo", "vérifie", final checks, or before
  handing anything to the creator.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Render — the gate between "rendered" and "delivered"

Never hand over a file you have not measured and looked at.

## 1. Preview, then look

```bash
. .maker/env
"$MK" assemble edl.json --preview
"$MK" thumb out/final.mp4 out/f-hook.png --at 0.4
"$MK" scan out/final.mp4
```

**Open both PNGs with your image reader.** The hook frame decides whether anyone watches;
the contact sheet shows you the whole cut at a glance — a repeated frame, a shot that
drags, a text card sitting over the wrong image. You cannot judge an edit you haven't seen,
and asserting that it "looks good" without having seen it is the one failure mode this
skill exists to prevent.

## 2. Measure

```bash
"$MK" qc out/final.mp4 --target shorts     # shorts | reel | tiktok | youtube | yt4k
```

Returns `PASS`, `FIX` or `REWORK` plus the exact remedy for each failure:

| Checked | Fails when |
|---|---|
| Canvas & fps | Wrong preset, or below the platform's minimum frame rate |
| Duration | Over the format's limit |
| Loudness | Outside −16…−12 LUFS (social) or −16…−13 (long-form) |
| True peak | Above −0.5 dBTP — it will clip on playback |
| Opening | Silent first second, or black frames at the head |
| Pacing | Average shot over the format's limit, or first cut after 2 s |

`FIX` means apply the `must_fix` list, re-render, re-run. `REWORK` means the cut itself is
wrong — go back to the EDL, not to the encoder settings.

## 3. Score it honestly

Run `../maker/references/rubric.md` against what you just watched. Below 14/20 is a rework.
Name the weakest line out loud; a review that finds nothing is a review that didn't happen.

Revision budget: **two passes**. Each must change something structural — a recut, a new
hook, a different bed. Re-lettering the same edit is not a revision. Track it:

```bash
"$MK" state <slug> revision=1 phase=review
```

Out of budget and still weak? Deliver anyway, and say precisely what is weak and what it
would take. A shipped 7/10 beats a perfect 0/10.

## 4. Final render and exports

```bash
"$MK" assemble edl.json                    # full quality
"$MK" qc out/final.mp4 --target shorts     # yes, again — the final encode is a new file
"$MK" thumb out/final.mp4 out/thumb.png --at 3.2
```

Deliverables: the MP4, the thumbnail frame (or the generated thumbnail), the SRT if there
is speech, and `notes/sources.md` for the description. If the creator wanted a project
file, that too.

## 5. Deliver

```
**<Titre>** — 38 s · 1080×1920 · PASS · −14.2 LUFS

| Beat | t | Ce qu'on voit |
|---|---|---|
| Hook | 0.0 | crash zoom sur les 40k ⭐ + "12 LIGNES" |
| …    | …  | … |

`.maker/projects/<slug>/out/final.mp4`
`.maker/projects/<slug>/out/thumb.png`

Score 17/20. Le plus faible : la fin, qui ne relance pas — j'ai ajouté un dernier plan
qui boucle sur le hook. Musique remplacée par un bed plus sombre (note du 12/03).
```

Short. Files by path. Decisions worth arguing about, and nothing else. Open questions at
the end, at most two.

## 6. Always finish with learning

Hand off to `maker-memory`: log the video, record what worked and what the creator says.
A delivery that doesn't update memory means the next video starts from zero.
