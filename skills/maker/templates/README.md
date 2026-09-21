# EDL templates

Copy one into `.maker/projects/<slug>/edl.json`, replace every `REPLACE/` path with a real
file, delete the beats you don't need, add the ones you do. They are starting shapes, not
finished edits — the pacing, motion and text still have to come from the beat sheet.

Validate before rendering: `mk assemble edl.json --dry-run`.

| File | For |
|---|---|
| `short-hook.json` | 9:16 short — hard hook, fast cuts, captions, meme sting |
| `youtube-explainer.json` | 16:9 long-form opening — hook, promise, chapter card |
| `screen-demo.json` | Screen capture turned into a vertical demo |
| `meme-reaction.json` | Reaction edit — punches, shake, stickers, SFX-led |
