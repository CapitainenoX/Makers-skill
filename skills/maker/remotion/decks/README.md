# Deck templates

Copy one, replace every `REPLACE`, then `mk remotion validate` before rendering.

| File | For |
|---|---|
| `example.json` | the reference studio short — one of every scene type |
| `tool-short.json` | "here is a tool, here is why" — claim, name, proof, options, number, CTA |
| `footage-short.json` | **the usual one** — the creator's screen recordings, framed in mockups |

`footage-short.json` is the template to reach for when rushes exist. Put the clips in
`public/shots/`, then `mk remotion validate` measures each one and tells you whether the
scene will freeze before you spend minutes on a render.

```bash
mk remotion deck .maker/projects/<slug>/deck.json --template tool-short
mk remotion validate .maker/projects/<slug>/deck.json
mk remotion sheet .maker/projects/<slug>/deck.json -o out/sheet.png
```
