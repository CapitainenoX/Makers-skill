---
name: maker-assets
description: >-
  Source every file a video needs: download YouTube/TikTok/Vimeo clips and audio, find music
  and no-copyright beds, pull meme sounds (Myinstants), GIFs and reaction clips (Tenor/Giphy),
  CC0 b-roll (Pexels/Pixabay), grab auto-captions, and index the creator's own rushes. Use for
  "télécharge cette vidéo", "trouve une musique", "ajoute un mème", "j'ai importé mes rushs",
  b-roll hunting, or any missing-footage problem.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# Assets — get the exact files the beat sheet asks for

Source against the beat sheet, never "in general". Every download costs time and every
unused file costs clarity.

## 0. The creator's own material comes first

If rushes exist, they win over anything downloadable. Index them before searching:

```bash
. .maker/env
"$MK" scan .maker/projects/<slug>/rushes --deep
```

This returns duration, resolution, orientation, detected cuts, loudness, dead/black/silent
regions — **and one contact-sheet PNG per file**. Open those PNGs with your image reader.
That is how you watch the footage without flooding the context.

Then write, per rush, the in/out points worth using:

```
cam-01.mov  0:12–0:18  the reaction, usable        (horizontal → blur-pad)
cam-01.mov  0:41–0:47  the install, screen readable
screen.mkv  1:02–1:09  scroll, too slow → speed 1.6
```

Anything with no usable range, say so — don't pad the edit with it.

## 1. Downloads

```bash
"$MK" fetch <url> --clip 00:01:12 00:01:26   # only the seconds you need
"$MK" fetch <url> --max-height 1080          # 4K is wasted on a 9:16 crop
"$MK" fetch <url> --audio                    # audio only
"$MK" fetch <url> --subs fr,en               # auto-captions as SRT, often faster than transcribing
```

`yt-dlp` is a moving target. When it fails:
1. `yt-dlp -U` — fixes most 403s and extractor errors.
2. `--cookies chrome` (or firefox/edge/brave) — for age/region gates.
3. Another source. Do not fight a gate for one b-roll shot.

## 2. Music

```bash
"$MK" music "dark lofi trap no copyright instrumental"   # search + download + tag
"$MK" music "https://…"                                  # a specific track
```

Choosing a bed: match the **edit's tempo**, not the mood adjective. Count your planned
cuts per 10 seconds; pick a track whose beat lands near them. A 90 BPM bed under a
4-cuts-per-second montage reads as sluggish no matter how good the track is.

Rights, said plainly: commercial platforms fingerprint audio. Prefer no-copyright /
CC-BY libraries or the creator's own licence. Never tell the creator a track is "probably
fine" — either it is cleared or you flag it.

## 3. Memes, reactions, SFX

```bash
"$MK" sfx vine boom -n 3
"$MK" sfx "bruh sound effect" -n 2
"$MK" gif "confused travolta" -n 4        # TENOR_API_KEY or GIPHY_API_KEY
```

If a source blocks the request, the command tells you what it tried and what to do next —
usually freesound.org (CC0), pixabay sound-effects, or lifting the sound from a clip with
`mk fetch --audio --clip`. Your browser tool is also a legitimate fallback: open the page,
download the file, drop it in `assets/`.

Use memes like punctuation, not paragraphs. One reaction on the turn of the story beats
four sprinkled through it. A meme that the niche does not already know is just confusion.

Meme sounds are user-uploaded and of unknown provenance — fine for social, a real risk on
monetised long-form. Say which one you're in.

## 4. B-roll

```bash
"$MK" stock "server room neon" -n 3        # PEXELS_API_KEY or PIXABAY_API_KEY
```

Before downloading stock, ask whether you can *make* the shot instead: a screen recording
(`maker-screen`), a text-and-motion card, a terminal capture. Made footage is on-brand;
stock footage is everyone's.

## 5. Organise

```
.maker/projects/<slug>/
  rushes/          creator-supplied — never modified in place
  assets/music/    beds
  assets/sfx/      impacts, whooshes, risers
  assets/memes/    reactions, stickers, GIFs
  assets/broll/    downloaded footage
  voice/           narration
```

Write `notes/sources.md` as you go — one line per asset: what it is, where it came from,
its licence. This is the file you paste into the video description later.

## 6. Output

```
**Rushes** — 6 fichiers, 4 min utilisables, 3 plans retenus
**Téléchargé** — 2 clips (CC-BY), 1 bed (no-copyright), 2 SFX
**Manque** — le plan du terminal : je l'enregistre en screen capture (voir maker-screen)
```

Then `maker-motion` decides the look, and `maker-edit` builds.
