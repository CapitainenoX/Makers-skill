# EDL schema — the contract for `mk assemble`

One JSON file describes a whole video. `mk assemble edl.json` renders it. You never
write ffmpeg; the engine builds the graph, caches every stage, and lints the result.

```jsonc
{
  "output": ".maker/projects/<slug>/out/final.mp4",
  "preset": "shorts",              // shorts | reel | youtube | yt4k | square | {"w":1080,"h":1350,"fps":30}
  "background": "#0b0b0f",         // used by contain/pad fits
  "font_family": "DejaVu Sans",    // any family fontconfig can resolve
  "lufs": -14,                     // final loudness target
  "clip_audio_db": -6,             // how loud the clips' own audio sits under the mix

  "clips": [ /* the spine — see below */ ],
  "layers": [ /* text and images on top */ ],
  "audio":  [ /* voice, music, sfx */ ],
  "subtitles": { "src": "subs/vo.srt", "style": "bold", "y": 0.72 },
  "text_styles": { "myStyle": { "size": 0.09, "fill": "#FF3B30", "outline": 0.07,
                                "shadow": 3, "bold": true, "box": false } }
}
```

## clips — one entry per shot, played in order

| Key | Type | Meaning |
|---|---|---|
| `src` | path \| `"color:#101018"` \| `""` | video, image, or a solid card |
| `in` / `out` | seconds | trim inside the source (video only) |
| `duration` | seconds | required for images and colour cards |
| `speed` | float | `1.4` = 40 % faster, audio follows |
| `fit` | `cover`\|`contain`\|`blur`\|`stretch` | `blur` = blurred pillarbox, the safe way to put 16:9 into 9:16 |
| `volume` | dB | `-40` or lower mutes the source |
| `motion` | object | see below — **omit it only when you mean stillness** |
| `grade` | raw filter string | e.g. `"eq=contrast=1.08:saturation=1.12,curves=preset=medium_contrast"` |
| `transition` | object | how this clip *enters* from the previous one |

```jsonc
"motion":     { "type": "punch", "from": 1.0, "to": 1.14, "ease": "easeOutCubic" }
// type: punch | zoom | zoomout | panleft | panright | panup | pandown | shake | whip | none
// ease: linear | easeOutCubic | easeInCubic | easeInOutCubic | easeOutExpo | easeOutBack | easeOutQuint
// amount: 0.08 default; shake also takes freq (Hz)

"transition": { "type": "whip", "duration": 0.22 }
// cut (default, free) | fade | flash | black | whip | slideleft/right/up/down
// | wipeleft/right | zoom | pixel | circle | radial | smooth
```

## layers — text and images over the spine

```jsonc
{ "type": "text", "text": "IL A FAIT QUOI ?!", "style": "hook",
  "start": 0.0, "duration": 1.4, "x": "center", "y": 0.22,
  "color": "#FFD400", "uppercase": true, "blur": 0.6, "z": 1,
  "in":  { "anim": "popIn",   "duration": 0.22, "ease": "easeOutBack" },
  "out": { "anim": "fadeOut", "duration": 0.18 } }

{ "type": "image", "src": "assets/memes/x.mp4",   // png/jpg/webp/gif/mp4 all work
  "start": 2.4, "duration": 1.6, "x": 0.75, "y": 0.32,
  "scale": 0.34, "rotate": -6,
  "in": { "anim": "slideRight" }, "out": { "anim": "popOut" } }
```

- Built-in text styles: `hook`, `title`, `caption`, `kicker`, `lower`, `sub`.
- Entrances: `popIn`, `zoomIn`, `rotateIn`, `slideUp/Down/Left/Right`, `fadeIn`, `none`.
- Exits: `fadeOut`, `popOut`, `slideDown`, `none`.
- `x`/`y` are 0–1 fractions of the canvas, a pixel value above 1, or `"center"`.
- Text is rendered through libass, so it survives ffmpeg builds without `drawtext`.

## audio

```jsonc
{ "type": "voice", "src": "voice/vo.wav", "start": 0.0, "gain": 0 }
{ "type": "music", "src": "assets/music/bed.mp3", "start": 0, "gain": -19,
  "duck": true, "fadeIn": 0.4, "fadeOut": 1.5, "duration": 34 }
{ "type": "sfx",   "src": "assets/sfx/whoosh.mp3", "start": 1.35, "gain": -6 }
```

`duck: true` sidechains that bed under every `voice` track automatically. The whole mix
is limited then loudness-normalised to `lufs`. Place a `sfx` 40–80 ms **before** the cut
it punctuates — the impact should land with the frame, not after it.

## Running it

```bash
"$MK" assemble edl.json --dry-run     # validate + read the lint warnings. Always do this first.
"$MK" assemble edl.json --preview     # half-res draft, ~4× faster — for looking at
"$MK" assemble edl.json               # final
```

The lint refuses to be polite: it flags long average shots, a slow first cut, missing
early text, static shots and a missing audio bed. Treat every warning as a note from
an editor who has seen your footage.

## Failure notes

- `out must be greater than in` — you trimmed past the end of the source; run `mk probe`.
- No text appears — the ffmpeg build lacks libass. `mk doctor` reports it under `ffmpeg_filters`.
- Transition looks wrong — transitions shorten the timeline; `--dry-run` shows the real duration.
- Slow render — `--preview` while iterating; only the last pass needs full quality.
