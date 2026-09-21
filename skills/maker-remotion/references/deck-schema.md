# Deck schema — the contract for `mk remotion render`

```jsonc
{
  "width": 1080, "height": 1920, "fps": 30,
  "theme": "light",                       // light | dark | ink
  "baseSize": 0.058,                      // type scale as a fraction of width
  "brand": { "accent": "#D97757", "font": "Inter", "watermark": "yourhandle" },
  "audio": { "src": "bed.mp3", "gain": -19, "fadeIn": 0.4, "fadeOut": 1.2 },
  "scenes": [ /* … */ ]
}
```

`audio.src` and any image `src` resolve through Remotion's `public/` folder, or may be a
full URL. Copy assets into `.maker/remotion/public/` before referencing them.

## Every scene shares

| Key | Meaning |
|---|---|
| `duration` | seconds (required) |
| `anchor` | `top` \| `center` \| `bottom` — this look favours `top` for text-led scenes |
| `bg` | override the deck background for this scene |
| `transition` | `{ "type": "cut" }` (default) or `{ "type": "fade", "duration": 0.3 }` |

A `fade` overlaps this scene onto the previous one — a true cross-dissolve, not a dip
through the background. It also shortens the total, which `validate` reports.

## Line objects (used by `textStack`, `pill`, `logoList`, `card`, `bullets`, `outro`)

```jsonc
{ "t": "Motion Design",   // the text
  "w": "black",           // light | regular | medium | semibold | bold | black
  "s": 2.05,              // size multiplier against baseSize (1 = base)
  "c": "accent",          // text | muted | accent | any CSS colour
  "i": true }             // italic — used for narration lines
```

The whole typographic idea is **one small light line above one huge black line**. A stack
of four lines alternating `0.72/medium/muted` and `2.05/black` is the reference look.

## Media — the part that matters most

Footage is not optional decoration in this look. A screen recording sitting inside a
device shell stops reading as "a clip someone pasted in" and starts reading as product
design. Every media-bearing scene takes the same descriptor:

```jsonc
"media": {
  "src": "shots/app.mp4",   // relative to public/, or a full URL
  "kind": "auto",           // auto | video | image — inferred from the extension
  "in": 0.0,                // seconds into the source
  "out": 3.0,               // seconds into the source — SET THIS, see below
  "speed": 1.0,
  "mute": true,             // default: the deck owns the audio, not the clip
  "loop": true,             // default when `out` is known
  "fit": "cover"            // cover | contain
}
```

A bare string is shorthand: `"media": "shots/app.mp4"`.

**Always set `out`.** It is the only way the renderer knows how long the usable segment
is, and therefore the only way a 3 s clip can loop under a 4 s scene. Without it a short
clip freezes on its last frame partway through. `mk remotion validate` probes every
source with ffprobe and warns you before you spend minutes rendering.

## Scenes

```jsonc
{ "type": "textStack", "duration": 1.8, "anchor": "top",
  "lines": [ … ], "align": "center", "anim": "snap",
  "reveal": "word" }                       // "word" pops each word in turn

{ "type": "pill", "duration": 1.6, "label": "opencode",
  "lines": [ … ], "sub": "free and open source" }

{ "type": "logoList", "duration": 2.8,
  "heading": [ … ],
  "items": [ { "icon": "sparkle", "label": "Claude", "sub": "optional", "accent": true } ],
  "footer": [ … ] }

{ "type": "card", "duration": 2.4,
  "lines": [ … ], "caption": [ … ],
  "device": "phone",                       // phone | browser | none
  "media": { "src": "shots/app.mp4", "out": 3 },   // video or image
  "gradient": ["#A9A6D8", "#8FB4DE"],
  "float": 8, "tilt": 4 }                  // slow drift + perspective, in px and degrees

{ "type": "media", "duration": 2.2,        // footage, framed or full-bleed
  "media": { "src": "shots/demo.mp4", "out": 2.6 },
  "frame": "browser",                      // full | card | phone | browser | none
  "lines": [ … ], "position": "top",       // top | bottom (where the text sits)
  "scrim": true,                           // dark gradient under the text on `full`
  "scale": 0.84, "float": 6, "tilt": 0 }

{ "type": "tiles", "duration": 2.6,        // 2-4 sources floating at different depths
  "lines": [ … ],
  "items": [ { "media": { "src": "shots/a.mp4", "out": 3 }, "frame": "phone" },
             { "media": "shots/b.png", "frame": "card", "label": "before",
               "x": 0.7, "y": 0.6, "scale": 0.34, "rotate": 4 } ] }

{ "type": "annotate", "duration": 2.6,     // a source with pointers that pop onto it
  "media": { "src": "shots/demo.mp4", "out": 2.8 }, "frame": "browser",
  "lines": [ … ], "scale": 0.84,
  "marks": [ { "x": 0.36, "y": 0.44, "kind": "ring",  // ring | box | dot | arrow
               "label": "ici", "at": 0.6, "size": 0.14 } ] }

{ "type": "marquee", "duration": 2.2,      // a scrolling row of chips
  "lines": [ … ], "items": ["React", "Vite", "Bun"], "speed": 70, "rows": 2 }

{ "type": "quote", "duration": 2.4,
  "text": "…", "author": "…", "role": "…" }

{ "type": "progress", "duration": 2.4,     // bars that fill
  "heading": [ … ],
  "items": [ { "label": "Render", "value": 0.92, "sub": "32s", "accent": true } ] }

{ "type": "bullets", "duration": 2.6, "heading": [ … ],
  "items": [ { "icon": "check", "label": "No timeline", "sub": "just a prompt" } ] }

{ "type": "stat", "duration": 1.8, "value": "40K", "label": "stars", "sub": "in 3 weeks",
  "countUp": true }                        // digits ramp up; the suffix is kept

{ "type": "code", "duration": 2.6, "title": "terminal", "prompt": "$",
  "lines": ["$ npm i -g maker", "  installed in 4s"] }

{ "type": "compare", "duration": 3.0,
  "left":  { "label": "Before", "items": ["4 h in Premiere", "3 exports"] },
  "right": { "label": "After",  "items": ["one prompt", "38 s"] } }

{ "type": "outro", "duration": 2.0, "lines": [ … ], "handle": "@yourhandle" }
```

`code` takes plain strings, not Line objects. Lines starting with `prompt` render bright;
the rest render as dimmed output.

## Icons

Built-in glyphs, drawn in code: `sparkle` `star` `dot` `circle` `square` `triangle`
`plus` `bolt` `check` `arrow` `terminal`.

Anything else is treated as a file in `public/` (or a URL) — that is how you use a real
brand logo. **Take brand marks from the brand's own press kit**; this repo ships none.

## Commands

```bash
mk remotion init                                  # once
mk remotion deck out.json --template example
mk remotion validate out.json                     # free, do it first
mk remotion sheet out.json -o sheet.png           # one frame per scene — LOOK AT IT
mk remotion still out.json -o hook.png --scene 0
mk remotion render out.json -o final.mp4 --preview
mk remotion render out.json -o final.mp4
mk remotion render out.json -o insert.webm --transparent
```

## Failure notes

- *"Failed to launch the browser process"* — Remotion needs `chrome-headless-shell`;
  plain Chrome dropped old headless mode. Set `REMOTION_BROWSER_EXECUTABLE`, or run
  `npx remotion browser ensure` inside `.maker/remotion`.
- *Text overflows the frame* — a display line over ~26 characters will wrap. `validate`
  warns about this; shorten the line rather than shrinking the type.
- *Fonts look wrong* — no web font is loaded by default, so the render falls back to a
  system grotesque. Put a `.woff2` in `public/` and set `brand.font`, or install a font
  on the host.
- *Render is slow* — iterate on `still` and `sheet`; only the last pass needs `render`.
- *A clip freezes partway through a scene* — its segment is shorter than the scene and
  `out` was not set, so it cannot loop. `validate` names the scene and the shortfall.
- *A clip escapes its mockup and fills the frame* — a looped video must be wrapped with
  `layout="none"`; `Loop` renders a `Sequence`, which defaults to absolute-fill. The
  built-in `Media` component already does this; anything hand-written must too.
