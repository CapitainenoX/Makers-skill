---
name: maker-edit
description: >-
  Build the actual cut. Writes the EDL that `mk assemble` renders with ffmpeg, or drives a
  real NLE over MCP — CapCut, Adobe Premiere Pro, After Effects, DaVinci Resolve, Kdenlive,
  OpenShot, Shotcut, Blender — or generates motion-graphics scenes as code with Remotion.
  Use for "monte la vidéo", assembling a timeline, applying cuts/effects/transitions,
  "utilise CapCut/Premiere/Resolve", exporting a project file, or turning a beat sheet
  into a finished edit.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# Edit — turn the beat sheet into a timeline

## 1. Pick the engine before writing anything

| Situation | Engine |
|---|---|
| No NLE, or nobody will open this again | **EDL + `mk assemble`** — default, fastest, reproducible |
| The creator names an app, or will hand-finish | **That app's MCP** |
| No footage at all: type, cards, stats, mockups, diagrams | **`maker-remotion`** |
| 3D, camera moves, cinematics | **Blender MCP**, composite the render back into the EDL |

Check what is actually connected before choosing — list your MCP tools and look for the
app's prefix. If the named app has no MCP here, say so in one line and build the EDL
instead; do not stall waiting for a server that isn't there.

Mixed is normal and usually best: render the motion-graphics inserts with Remotion, matte
the subject with `mk bgremove`, assemble everything with the EDL, and only hand a project
file to the NLE if the creator wants to touch it.

## 2. Default path — the EDL

Write `.maker/projects/<slug>/edl.json` straight from the beat sheet. Full contract:
`../maker/references/edl-schema.md`. Templates: `../maker/templates/`.

```bash
. .maker/env
"$MK" assemble edl.json --dry-run     # validate + read every lint warning
"$MK" assemble edl.json --preview     # half-res draft to actually look at
"$MK" assemble edl.json               # final
```

Work in this order, and render a preview after each step rather than at the end:

1. **Spine.** Clips, in/out, order. No layers, no music. Watch it. If the story doesn't
   work silent and bare, no amount of layering saves it.
2. **Motion.** A `motion` on every shot (`maker-motion` decides which).
3. **Sound.** Bed + ducking first, then SFX on the cuts.
4. **Text.** Hook card, then captions.
5. **Polish.** Grade, stickers, the one flash you are allowed.

The lint is not decoration. "average shot length exceeds…" means the edit drags — recut,
don't rationalise.

## 3. Driving an NLE over MCP

The tool names differ per server; the workflow does not:

1. **Inspect.** List projects/timelines. Never assume the state of an app someone else
   has open.
2. **Import.** Add the media you sourced to the project bin.
3. **Lay the spine.** Append clips with in/out points, in beat-sheet order.
4. **Apply.** Transitions, speed, effects, text, per the beat sheet.
5. **Export or hand over.** Render if the server can; otherwise leave a clean timeline
   and tell the creator exactly what is on it.

Rules that apply to every one of them:

- **Non-destructive.** Create a new timeline/sequence. Never overwrite the creator's work.
- **Verify each step.** Read back the timeline after a batch of operations. NLE bridges
  drop calls silently; a "successful" 40-call sequence with 37 clips is a real failure mode.
- **Batch, then check.** One call per clip is slow and fragile. Group, then verify.
- **Idempotence.** If a run half-completed, clear the new timeline and redo it rather than
  patching a half-state you cannot see.
- **Fallback.** If the bridge dies mid-edit, finish with the EDL and say what happened.

Per-app specifics — draft paths, scripting APIs, known limits, which MCP servers exist:
`references/nle-mcp.md`. Read it when you actually target an app.

## 4. Motion-graphics inserts

Anything with no footage in it — titles, lists, charts, device mockups, lower thirds —
belongs to `maker-remotion`, which renders it from a JSON deck. Render the insert with
alpha and drop it onto the EDL timeline as an ordinary clip:

```bash
"$MK" remotion render insert.json -o out/intro.webm --transparent
```

```jsonc
// then in edl.json, as a layer over the footage
{ "type": "image", "src": "out/intro.webm", "start": 0.0, "duration": 2.4,
  "x": 0.5, "y": 0.5, "scale": 1.0 }
```

Keep each insert short and single-purpose. A whole video built in Remotion is a slow
render and a hard edit — unless the whole video genuinely has no footage, and then it is
`maker-remotion`'s job from the start, not yours.

## 5. Output

```
**Montage** — 14 plans, 38 s, EDL `edl.json`
**Rendu** — `.maker/projects/<slug>/out/final.mp4`
**Lint** — 1 avertissement traité (plan 7 trop long → recoupé à 1.6 s)
```

Then `maker-render` reviews and delivers. Do not declare a cut finished before QC has run.
