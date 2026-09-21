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

## Scenes

```jsonc
{ "type": "textStack", "duration": 1.8, "anchor": "top",
  "lines": [ … ], "align": "center", "anim": "snap" }

{ "type": "pill", "duration": 1.6, "label": "opencode",
  "lines": [ … ], "sub": "free and open source" }

{ "type": "logoList", "duration": 2.8,
  "heading": [ … ],
  "items": [ { "icon": "sparkle", "label": "Claude", "sub": "optional", "accent": true } ],
  "footer": [ … ] }

{ "type": "card", "duration": 2.4,
  "lines": [ … ], "caption": [ … ],
  "device": "phone",                       // phone | browser | none
  "src": "shots/app.png",                  // omitted -> an empty device
  "gradient": ["#A9A6D8", "#8FB4DE"] }

{ "type": "bullets", "duration": 2.6, "heading": [ … ],
  "items": [ { "icon": "check", "label": "No timeline", "sub": "just a prompt" } ] }

{ "type": "stat", "duration": 1.8, "value": "40K", "label": "stars", "sub": "in 3 weeks" }

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
