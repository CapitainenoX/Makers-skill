# Driving editors over MCP

MCP servers for creative apps are community projects: names, tool counts and coverage move
fast. **Discover what is actually connected** (list your tools, look for the app prefix)
rather than trusting this page for tool names. Use it for the mental model and the traps.

## CapCut
- Servers wrap the CapCut *draft* format: create a draft, add video/audio/image/text/effect
  tracks, then open it in the app. Typical tools: create draft (dimensions + fps), add video
  with trim/speed/volume/transition, add audio, add text with font/colour/background,
  add subtitles from SRT, add effects and stickers, save draft.
- Drafts live in CapCut's local folder; the app must usually be **closed** while writing one,
  then reopened to see it.
- Traps: CJK and accented fonts need an explicit font name; 9:16 is not the default in every
  server; effect names are server-specific enums — list them, don't guess.
- Good for: handing the creator an editable project in the app they already know.

## Adobe Premiere Pro
- Bridged through CEP/UXP extensions or ExtendScript. Setup is the hard part: the extension
  must be installed and Premiere running with debug mode enabled. Coverage ranges from a
  few dozen tools to over a thousand.
- Workflow: get/create project → import to bin → create sequence (set the preset explicitly)
  → insert/overwrite clips at timecodes → apply effects and transitions → export via
  Adobe Media Encoder.
- Traps: timecode vs. seconds — check which the server takes before laying 30 clips. Effect
  names are localised in localised installs. Undo history can be per-script, so a failed
  batch may not roll back.

## After Effects
- ExtendScript-driven: create comps, add solids/text/shapes, set properties and keyframes,
  apply effects, trigger renders.
- Best used surgically: build one animated insert, render with alpha (ProRes 4444), and
  composite it in the main edit. Building the whole video in AE over MCP is slow and fragile.
- Traps: expressions are strings — a typo fails at render, not at write time. Always render
  a 1-second test before the full comp.

## DaVinci Resolve
- Uses Blackmagic's official scripting API. Servers range from ~40 to 400+ tools covering
  project/timeline/media-pool/colour/Fusion/Fairlight/render.
- External scripting is a Studio feature; free-version bridges exist that run a script
  *inside* Resolve from the Scripts menu.
- Workflow: open/create project → import to media pool → create timeline from clips →
  edit → colour page ops → add to render queue → render.
- Traps: Resolve must be running and on the right page for some calls. Project settings
  (resolution, fps) must be set *before* the timeline is created, or clips get conformed.

## Kdenlive
- Servers drive a running instance over D-Bus, or write `.kdenlive` project XML directly.
  Categories: project, media, timeline, motion, effects, audio, render.
- Writing the XML directly is the more reliable route for batch work — no GUI to stay alive.
- Traps: Kdenlive's XML references MLT producers by id; hand-editing breaks easily. Let the
  server own the file.

## OpenShot / Shotcut
- OpenShot has a Python API (`openshot-qt` / libopenshot) usable directly, and `.osp`
  projects are plain JSON — readable and writable without any MCP at all.
- Shotcut projects are MLT XML (`.mlt`), likewise plain and scriptable.
- **This is the open-source escape hatch:** when no MCP exists, generate the project file
  from the beat sheet and open it. Pair it with an `mk assemble` render so the creator gets
  both a finished MP4 and an editable project.

## Blender
- Official MCP server plus community ones; full Python API for scenes, cameras, materials,
  animation and rendering. Also has a video sequence editor, though that is rarely the
  right tool.
- Use it for 3D cinematics and title sequences. Render to image sequence or ProRes with
  alpha, then composite in the EDL.
- Traps: renders are long. Always do a low-sample test render first and show the creator a
  still before committing to the full frame range.

## FFmpeg-backed MCP servers
- Several exist (guardrailed wrappers with validation and provenance receipts). They
  overlap with `mk assemble`. Prefer `mk assemble` — it is in-repo, it lints the edit, and
  it caches stages — unless the creator specifically wants that server's workflow.

## Universal checklist

1. List the server's tools; read the schema of the ones you will use.
2. Set project resolution and fps **before** creating a timeline.
3. Import media, verify it landed, then edit.
4. Batch operations, then read the timeline back and compare to the beat sheet.
5. Render, then run `mk qc` on the result — the NLE's export settings are not automatically
   what you asked for.
6. If the bridge fails, finish with the EDL and report exactly where it stopped.
