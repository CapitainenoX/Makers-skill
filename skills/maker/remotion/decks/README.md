# Deck templates

Copy one, replace every `REPLACE`, then `mk remotion validate` before rendering.

| File | For |
|---|---|
| `example.json` | the reference studio short — one of every scene type |
| `tool-short.json` | "here is a tool, here is why" — claim, name, proof, options, number, CTA |

```bash
mk remotion deck .maker/projects/<slug>/deck.json --template tool-short
mk remotion validate .maker/projects/<slug>/deck.json
mk remotion sheet .maker/projects/<slug>/deck.json -o out/sheet.png
```
