# Deck schema — the contract for `mk remotion render`

```jsonc
{
  "width": 1080, "height": 1920, "fps": 30,
  "style": "mono",                        // mono (default, strict black & white) | color
  "hud": true,                            // scene counter + handle + progress bar (mono default)
  "ghost": true,                          // giant outlined keyword behind scenes (mono default)
  "theme": "light",                       // light | paper | dark | ink  (mono: light or dark)
  "typeset": "studio",                    // studio | editorial | impact | tech | playful
  "baseSize": 0.058,                      // type scale as a fraction of width
  "brand": { "accent": "#D97757", "font": "", "watermark": "yourhandle" },
  "seed": "my-video-slug",   // shifts entrances, push direction, decor and transitions
  "zoom": 0,                 // camera push on every scene; 0 (default) holds it still
  "motion": {
    "language": "graphic",   // clean | punchy | soft | graphic — mono default: graphic
    "blur": 1,               // motion-blur strength, 0 disables
    "transitions": "auto",   // auto (default) | cut
    "punch": false           // whole-frame punch-in on emphasised words — off by default
  },
  "backdrop": "plain",       // plain | spotlight | mesh | grain | dots | lines
  "logos": "auto",           // auto | brand | mono — how logo files are coloured
  "audio": { "src": "bed.mp3", "gain": -19, "fadeIn": 0.4, "fadeOut": 1.2 },
  "scenes": [ /* … */ ]
}
```

## Typesets — a face per level of importance

| `typeset` | display (hook, numbers, titles) | body (captions, labels) | serif (`*voice*`) | mono (code, handles, data) |
|---|---|---|---|---|
| `studio` (default) | Inter 800, tight | Inter | Instrument Serif italic | JetBrains Mono |
| `editorial` | Fraunces 600 | Inter | Fraunces italic | JetBrains Mono |
| `impact` | Anton, capitals | Inter | Instrument Serif italic | JetBrains Mono |
| `tech` | Space Grotesk 700 | Inter | Instrument Serif italic | JetBrains Mono |
| `playful` | Bricolage Grotesque 800 | Bricolage Grotesque | Fraunces italic | JetBrains Mono |

All bundled — no font is fetched at render time. The renderer assigns the face by
importance, so you rarely name one: a big heavy line (`s ≥ 1.3`, bold+) is **display**,
an italic line (`i: true`) is the **serif** voice, the rest is **body**; terminals,
handles, dates and chart values are **mono**. Force one with `"f": "display"` on a line.
Display lines are **measured and shrunk to fit the width** — they never wrap or overflow.

`audio.src` and any image `src` resolve through Remotion's `public/` folder, or may be a
full URL. Copy assets into `.maker/remotion/public/` before referencing them.

## Every scene shares

| Key | Meaning |
|---|---|
| `duration` | seconds (required) |
| `anchor` | `top` \| `center` \| `bottom` — default `center`; the edges are filled by `decor` |
| `variant` | `up` `down` `left` `right` `scale` `fade` `zoomOut` `tiltLeft` `tiltRight` `riseFar` — how this scene's block arrives. Left unset it rotates by index **and the deck seed** |
| `zoom` | slow push on this scene as a fraction (deck default `0`, still). Opt-in: moving text shimmers |
| `bg` | override the deck background for this scene |
| `backdrop` | override the deck backdrop for this scene |
| `transition` | how this scene arrives — see below. Omit it and the harness picks |
| `textFx` | `rise` `mask` `blur` `pop` `slide` `type` — how the words arrive. Omit it and it rotates within the motion language |
| `invert` | the negative of the deck: black page, white ink. Omitted, `mk remotion` inverts big-type beats on a rhythm in the mono style |
| `ghost` | the outlined keyword behind the scene, or `false`. Default: the first bold word, else the label / value / title |
| `say` | the narration this scene covers — `mk remotion sync` times the scene and its items on it |
| `cues` | written by `sync`: `{ items: [s…], words: [s…], value: s }`, seconds from the scene's start |
| `captionAt` | `below` (default) or `above` — flips the visual/caption order, a cheap way to change a scene's silhouette |
| `layers` | complementary elements over the scene — see below |

## Transitions

```jsonc
"transition": { "type": "whip", "dir": "left", "duration": 0.26 }
```

| type | says | notes |
|---|---|---|
| `cut` | next | free; still right most of the time |
| `fade` | time passed | chapter breaks only |
| `slide` | the next card lands on this one | old scene sinks back and dims |
| `push` | same world, moved | both scenes travel, light motion blur |
| `whip` | elsewhere, now | fast push with a strong directional smear |
| `zoom` | deeper into the subject | old scene flies past the camera |
| `blur` | a change of thought | soft defocus through |
| `wipe` | clean replacement | hard edge across |
| `iris` | focus opens from a point | `"at": [0.5, 0.4]` |
| `panel` | chapter wall | accent + ink slabs sweep across |
| `flash` | impact, punchline | twice per video at most — `validate` counts |
| `blinds` | graphic rhythm | reveal in strips |

`dir` is where the content moves: `left` means the new scene enters from the right.

**Timing never changes.** A transition starts on the cut; the outgoing scene is held on
screen underneath for those frames. Cuts sit exactly on the running sum of `duration`s —
the same arithmetic `mk mix` uses to put a one-shot on each cut.

**Leave it out and the harness decides.** With `motion.transitions: "auto"` (the default),
`mk remotion` fills every missing transition from the deck's motion language: roughly half
the changes cut, the rest move; never the same move twice in a row; a `chapter` always
gets the language's biggest move; `flash` at most twice. The choices are printed by
`validate` and written into the resolved deck that the render, the stills and `mk mix`
all read — so an automatic whip gets its whoosh.

| language | palette |
|---|---|
| `clean` | push · wipe · slide · blur |
| `punchy` | whip · zoom · push · flash |
| `soft` | blur · slide · fade · iris |
| `graphic` | wipe · blinds · iris · push · panel |

## Layers — complementary elements

One or two per scene make a frame feel produced; `validate` warns past three.

```jsonc
"layers": [
  { "kind": "badge",    "text": "free", "x": 0.78, "y": 0.38, "rotate": 8, "at": 0.5 },
  { "kind": "image",    "src": "shots/face.png", "x": 0.8, "y": 0.2, "size": 0.26, "shape": "circle" },
  { "kind": "icon",     "src": "logos/github.svg", "x": 0.2, "y": 0.3, "shape": "sticker", "float": true },
  { "kind": "arrow",    "x": 0.25, "y": 0.62, "to": [0.4, 0.54], "at": 0.7 },   // draws itself
  { "kind": "scribble", "x": 0.5, "y": 0.45, "size": 0.3 },                     // hand-drawn loop
  { "kind": "cursor",   "x": 0.3, "y": 0.7, "to": [0.82, 0.56], "at": 1.0 },    // moves, clicks
  { "kind": "toast",    "text": "New star", "sub": "40,001", "src": "star", "x": 0.5, "y": 0.12 },
  { "kind": "burst",    "x": 0.7, "y": 0.3 },     // lines pop out of a point, once
  { "kind": "sparkles", "x": 0.2, "y": 0.4 },     // twinkling stars
  { "kind": "label",    "text": "the slow part", "x": 0.3, "y": 0.2 },   // serif italic note
  { "kind": "emoji",    "text": "🔥", "x": 0.8, "y": 0.25 }
]
```

Common keys: `x`/`y` (centre, 0–1 of the frame), `at`/`until` (seconds), `size` (width
fraction), `rotate`, `color` (`accent` | `text` | `muted` | CSS), `fx` (`pop` `drop`
`slide` `spin` `fade`), `float` (idle bob).

## Line objects (used by `textStack`, `pill`, `logoList`, `card`, `bullets`, `outro`, headings)

```jsonc
{ "t": "Motion Design",   // the text
  "w": "black",           // light | regular | medium | semibold | bold | black
  "s": 2.05,              // size multiplier against baseSize (1 = base)
  "c": "accent",          // text | muted | accent | any CSS colour
  "i": true,              // the narration voice — set in the italic serif
  "f": "display" }        // optional: display | body | serif | mono
```

The whole typographic idea is **one small light line above one huge black line**. A stack
of four lines alternating `0.72/medium/muted` and `2.05/black` is the reference look.

## `rich` — the flowing caption

Every scene that shows something takes a `rich` sentence under it. This is the voice of
the format; `lines` is for the beats that really are a list.

```jsonc
"rich": "every **AI assistant** you have ever used **works** this way",
"richSize": 1.02,          // multiplier on baseSize
"richDelay": 6             // frames before the words start arriving
```

| Marker | Renders as |
|---|---|
| `**word**` | black, near-black, slightly larger — the words that carry the sentence |
| `__word__` | the accent colour (darkened automatically if it would not read) — one per scene |
| `*word*` | italic serif — the voice, a nuance, an aside |
| `~~word~~` | a hand-drawn stroke draws itself under the words |
| `==word==` | the words land, then a marker strokes across and the ink flips — one per video |
| `[[logos/github.svg]]` | an inline logo or glyph, sized to the line |
| plain | medium weight, muted |

Words arrive one at a time, with the scene's `textFx`. Every scene draws `rich` except
`kinetic`, `chapter`, `split` and `quote`, which have their own text fields; `validate`
errors rather than letting it silently vanish, and errors on an **unclosed marker** —
`**GitHub` with no closing pair would print the asterisks on screen.

## `decor` — filling the top and bottom

```jsonc
"decor": { "kind": "rays",              // rays | arcs | blobs | grid | plus | squiggle | stars | none
           "corners": ["top-left", "bottom-right"],
           "opacity": 0.1, "scale": 0.8 }
```

Set it on the deck for a default and override it per scene. **Leave it out entirely and
the seed picks** the family and the corners per scene, so the border treatment differs
between scenes and between videos without you choosing anything.

Give every deck a different `seed` — the video's slug works. It shifts the entrance
rotation, the push direction and the decor, so two videos never move the same way.

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
  "fit": "cover",           // cover | contain
  "scroll": true,           // a tall capture pans top -> bottom over the scene
  "kenBurns": 0.08          // slow push into a still
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

{ "type": "chips", "duration": 1.8,      // white circles holding marks
  "items": [ { "icon": "sparkle", "label": "claude", "accent": true },
             { "icon": "logos/acme.svg", "label": "Acme" } ],   // a file = your own logo
  "columns": 4, "size": 0.18,
  "rich": "**ten agents**, already **wired**" }

{ "type": "diagram", "duration": 2.4,    // a hub wired to its parts
  "hub": { "icon": "gear", "accent": true },
  "nodes": [ { "icon": "terminal", "label": "Arch" }, { "icon": "cube", "label": "Hyprland" } ],
  "layout": "grid",                      // grid | fan | cross
  "connector": "dashed",                 // dashed | solid
  "rich": "but the **infrastructure** underneath it" }

{ "type": "flow", "duration": 2.4,       // a pipeline on a white card
  "title": "LLM (Large Language Model)",
  "steps": [ { "label": "Input", "icon": "chat" }, { "label": "Output", "icon": "bolt" } ],
  "rich": "it moves through the model's **trained parameters**" }

{ "type": "cta", "duration": 1.8,        // the ask — one action, animated
  "actions": [ { "icon": "bell", "label": "Subscribe", "accent": true } ],
  "rich": "if this saved you an hour, ==say so==" }

{ "type": "mock", "duration": 1.8,       // one rebuilt UI control
  "kind": "prompt", "text": "Build me a landing page for a hair salon.",
  "badge": "Chat", "meta": "Sonnet 5 · Medium",
  "chip": { "icon": "sparkle", "accent": true },
  "rich": "every time you send a **prompt**" }
```

`code` takes plain strings, not Line objects. Lines starting with `prompt` type
themselves character by character (`"typing": false` to print them); the rest land as
dimmed output. The terminal is always a dark slab, whatever the theme.

`stat` with `"style": "roll"` is a real odometer: the units turn and the higher digits
flip only on the carry. `"from": 1990` starts a year or a big number near its value
instead of at zero; `"kicker": "open source since"` sets a small label above the number.
The number only appears once it starts moving — a static start value would read as a
claim.

`mock` types its `text` with a caret, then presses the send button (`"typing": false`
to show it static). `stat` takes `"style": "roll"` (odometer digits), `"ring": 0.92`
(a progress ring around the number) and an `icon`.

### Structure and pattern interrupts

```jsonc
{ "type": "kinetic", "duration": 1.6,    // full-frame type, fitted to the width
  "style": "stack",                      // stack (mask reveal) | punch (one line at a time) | slide
  "lines": ["stop editing", "**by** *hand*", "__start__ shipping"] }

{ "type": "chapter", "duration": 1.6,    // inverted slab, huge number, title, rule
  "number": "01", "title": "The setup", "sub": "two minutes, once", "invert": true }

{ "type": "split", "duration": 2.0,      // the frame cut in two; halves open from the divider
  "a": { "text": "**before**: hours in a *timeline*" },
  "b": { "media": "shots/after.png", "label": "after", "text": "one **prompt**" },
  "dir": "rows" }                        // rows (vertical default) | columns

{ "type": "versus", "duration": 2.0,     // two sides slide in, the VS badge slams
  "left":  { "label": "By hand", "icon": "clock", "items": ["4 h"] },
  "right": { "label": "Claude", "icon": "logos/claude.svg", "accent": true, "items": ["38 s"] } }

{ "type": "steps", "duration": 2.2, "heading": [ … ],     // numbered cards on a rail
  "items": [ { "label": "Install", "sub": "one command", "icon": "download" } ] }

{ "type": "timeline", "duration": 2.2,   // a spine that draws down, events pop on it
  "items": [ { "date": "2024", "label": "Open sourced", "icon": "logos/github.svg", "accent": true } ] }

{ "type": "checklist", "duration": 2.2,  // checks draw themselves; done:false = cross + strike
  "items": [ { "label": "You need After Effects", "done": false }, { "label": "Real logos" } ] }

{ "type": "chart", "duration": 2.2,      // bar (default) | column | line
  "kind": "bar", "unit": "s", "items": [ { "label": "Maker", "value": 38, "accent": true } ] }

{ "type": "orbit", "duration": 2.2,      // satellites circle a hub on counter-rotating rings
  "hub": { "icon": "logos/claude.svg", "fill": "brand" },
  "nodes": [ { "icon": "logos/github.svg" }, { "icon": "logos/docker.svg" } ], "speed": 14 }
```

### Footage and complementary images

```jsonc
{ "type": "gallery", "duration": 2.2,    // 2-6 images or clips: grid | fan | stack
  "layout": "fan", "focus": 1,           // focus lifts one forward after they land
  "items": [ { "media": "shots/a.png", "label": "edit" }, { "media": "shots/b.png" } ] }

{ "type": "focus", "duration": 2.4,      // camera push onto a detail + spotlight
  "media": "shots/app.png", "x": 0.3, "y": 0.2, "magnify": 2.4, "label": "this button",
  "frame": "card" }                      // card | full

{ "type": "beforeAfter", "duration": 2.4, // a handle sweeps across to reveal the change
  "before": "shots/old.png", "after": "shots/new.png", "labels": ["Before", "After"] }

{ "type": "notify", "duration": 2.4,     // notifications drop in and stack
  "items": [ { "app": "GitHub", "title": "New star", "body": "40,001", "icon": "logos/github.svg" } ] }

{ "type": "post", "duration": 2.4,       // a neutral social card; counters climb, heart pops
  "name": "Ada", "handle": "@ada", "verified": true, "text": "Made my first short with **one prompt**.",
  "likes": "12.4K", "reposts": "1.2K", "replies": "318" }
```

`post` is for a real public post the creator may show, or their own words — never to put
words in a real person's mouth.

## Icons

Built-in glyphs, drawn in code: `sparkle` `star` `dot` `circle` `square` `triangle`
`plus` `bolt` `check` `arrow` `terminal` `gear` `folder` `cube` `chat` `cloud` `lock`
`rocket` `code` `database` `thumbsUp` `bell` `comment` `share` `heart` `play` `search`
`user` `clock` `globe` `fire` `cross` `eye` `download` `link` `chart` `mic` `image`
`music` `key` `trophy` `flag` `cursor` `warning` `money`. A misspelt glyph is an error
with a suggestion, not a broken image.

Chips take `fill` — `surface` (white chip, default), `brand` (filled with the logo's own
colour, mark knocked out in white/black), `accent`, `ink` (an inverted chip), `ghost` —
and `tint` — `auto` (default), `brand`, `mono`, `accent` or a hex.

**Logo colour is checked, not assumed.** Each mark is measured against the surface it
actually sits on. Under `tint: "auto"` a mark that would drop below 1.6:1 (GitHub's
near-black on a dark chip, Snapchat's yellow on a white one) is drawn in the theme's
ink instead; `validate` lists every such correction under `auto_corrected`, and errors
when a forced tint would make a mark invisible. It also warns when a chip's label names
a different brand than its logo ("Remotion" on the React mark).

**For a real product, use the real mark.** `mk logo get github docker node` fetches them
from Simple Icons (CC0) into `public/logos/`, then `"icon": "logos/github.svg"`.

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
- *Text overflows the frame* — display lines are measured and shrunk to fit, so they
  cannot overflow; a line over ~26 characters just ends up smaller. Shorten it.
- *A logo is the wrong colour* — `mk logo check`. Files fetched before this version had
  no fill (they rendered black): `mk logo get <brand> --force` rewrites them with the
  brand colour.
- *Fonts look wrong* — every typeset face is bundled through `@fontsource`, so it needs
  no network. If one is missing, run `mk remotion init --force`. Set `brand.font` to
  put your own family in front of the display and body faces.
- *Render is slow* — iterate on `still` and `sheet`; only the last pass needs `render`.
- *A clip freezes partway through a scene* — its segment is shorter than the scene and
  `out` was not set, so it cannot loop. `validate` names the scene and the shortfall.
- *A clip escapes its mockup and fills the frame* — a looped video must be wrapped with
  `layout="none"`; `Loop` renders a `Sequence`, which defaults to absolute-fill. The
  built-in `Media` component already does this; anything hand-written must too.
