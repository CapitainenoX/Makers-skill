#!/usr/bin/env python3
"""mk remotion — the code renderer for motion-graphics videos.

Where `mk assemble` cuts footage, this renders a video that has no footage:
typography, cards, device mockups, lists, terminals. The model writes a *deck*
(JSON scenes), React components own every pixel. Same bargain as the EDL —
judgement in the JSON, craft in the renderer.

Subcommands: init · deck · validate · still · sheet · render · studio
"""
from __future__ import annotations

import argparse, json, os, shutil, sys
from pathlib import Path

from _common import (die, emit, ffmpeg, home, read_json, run, safe_path,
                     slugify, which, write_json)

TEMPLATE = Path(__file__).resolve().parent.parent / "remotion"
SCENE_TYPES = {"textStack", "pill", "logoList", "card", "bullets", "stat",
               "code", "compare", "outro"}

# Chromium lookup: reuse whatever the host already has before downloading 150 MB.
BROWSER_HINTS = [
    "PLAYWRIGHT_BROWSERS_PATH", "REMOTION_BROWSER_EXECUTABLE", "CHROME_PATH",
]
BROWSER_PATHS = [
    "/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell",
    "/opt/pw-browsers/chromium-*/chrome-linux/chrome",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]


def find_browser() -> str | None:
    if os.environ.get("REMOTION_BROWSER_EXECUTABLE"):
        return os.environ["REMOTION_BROWSER_EXECUTABLE"]
    roots = [Path(os.environ["PLAYWRIGHT_BROWSERS_PATH"])] if os.environ.get(
        "PLAYWRIGHT_BROWSERS_PATH") else []
    for root in roots:
        # a headless shell is required: modern Chrome dropped old headless mode
        for pat in ("chromium_headless_shell-*/chrome-linux/headless_shell",
                    "chromium-*/chrome-linux/chrome"):
            hits = sorted(root.glob(pat))
            if hits:
                return str(hits[-1])
    for pat in BROWSER_PATHS:
        hits = sorted(Path("/").glob(pat.lstrip("/"))) if "*" in pat else (
            [Path(pat)] if Path(pat).exists() else [])
        if hits:
            return str(hits[-1])
    return None


def project_dir(explicit: str | None) -> Path:
    return safe_path(explicit, write=True) if explicit else safe_path(home() / "remotion", write=True)


def ensure_project(d: Path) -> Path:
    if not (d / "src" / "index.ts").exists():
        die(f"no Remotion project at {d}. Run: mk remotion init")
    if not (d / "node_modules" / "remotion").exists():
        die(f"dependencies missing in {d}. Run: mk remotion init  (it is idempotent)")
    return d


def npx(d: Path, args: list[str], timeout: int = 2400):
    env_browser = find_browser()
    env = os.environ.copy()
    if env_browser:
        env["REMOTION_BROWSER_EXECUTABLE"] = env_browser
    exe = which("npx") or die("node/npx not found — install Node 18+ to use the Remotion renderer")
    cmd = [exe, "--yes", "remotion", *args]
    import subprocess
    print("$ " + " ".join(cmd), file=sys.stderr)
    proc = subprocess.run(cmd, cwd=str(d), env=env, timeout=timeout,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout or "")[-2000:]
        hint = ""
        if "Failed to launch the browser" in tail:
            hint = ("\nhint: Remotion needs a headless Chromium. Either let it download one "
                    "(npx remotion browser ensure) or point REMOTION_BROWSER_EXECUTABLE at a "
                    "chrome-headless-shell binary — plain Chrome no longer supports old headless.")
        die(f"remotion {args[0]} failed (exit {proc.returncode})\n{tail}{hint}")
    return proc


# ------------------------------------------------------------------------ init
def cmd_init(a):
    d = project_dir(a.dir)
    if not TEMPLATE.exists():
        die(f"template missing at {TEMPLATE}")
    d.mkdir(parents=True, exist_ok=True)
    for item in ("src", "decks", "public"):
        src = TEMPLATE / item
        if src.exists():
            shutil.copytree(src, d / item, dirs_exist_ok=True)
    (d / "public").mkdir(exist_ok=True)
    for f in ("package.json", "tsconfig.json", "remotion.config.ts"):
        if (TEMPLATE / f).exists():
            shutil.copy2(TEMPLATE / f, d / f)

    if not (d / "node_modules" / "remotion").exists() or a.force:
        npm = which("npm") or die("npm not found — install Node 18+")
        import subprocess
        print(f"$ npm install  (in {d})", file=sys.stderr)
        proc = subprocess.run([npm, "install", "--no-audit", "--no-fund"], cwd=str(d),
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              text=True, timeout=2400)
        if proc.returncode != 0:
            die(f"npm install failed in {d}\n{(proc.stderr or '')[-1500:]}")
    emit({"ok": True, "project": str(d), "browser": find_browser() or "will be downloaded on first render",
          "scenes_available": sorted(SCENE_TYPES),
          "next": f"mk remotion deck {d}/decks/my.json && mk remotion sheet {d}/decks/my.json"})


def cmd_deck(a):
    out = safe_path(a.output, write=True)
    src = TEMPLATE / "decks" / f"{a.template}.json"
    if not src.exists():
        available = sorted(p.stem for p in (TEMPLATE / "decks").glob("*.json"))
        die(f"no template {a.template!r}. Available: {', '.join(available)}")
    out.parent.mkdir(parents=True, exist_ok=True)
    deck = read_json(src, {})
    if a.title:
        deck.setdefault("brand", {})["watermark"] = a.title
    write_json(out, deck)
    emit({"ok": True, "deck": str(out), "scenes": len(deck.get("scenes", [])),
          "next": f"edit it, then: mk remotion sheet {out}"})


# -------------------------------------------------------------------- validate
def lint(deck: dict) -> tuple[list[str], list[str]]:
    errors, warns = [], []
    scenes = deck.get("scenes") or []
    if not scenes:
        errors.append("deck has no scenes")
        return errors, warns
    fps = deck.get("fps", 30)
    h, w = deck.get("height", 1920), deck.get("width", 1080)
    vertical = h > w
    total = sum(float(s.get("duration", 2)) for s in scenes)

    for i, s in enumerate(scenes):
        t = s.get("type")
        if t not in SCENE_TYPES:
            errors.append(f"scene {i}: unknown type {t!r}; use one of {sorted(SCENE_TYPES)}")
        d = float(s.get("duration", 2))
        if d > 3.5 and vertical:
            warns.append(f"scene {i} ({t}) runs {d}s — over ~3s a single card stops earning its place")
        if t == "textStack" and len(s.get("lines") or []) > 5:
            warns.append(f"scene {i}: {len(s['lines'])} lines is more than one beat — split it")
        for ln in (s.get("lines") or []):
            if not isinstance(ln, dict):
                continue                      # `code` scenes hold plain strings
            if float(ln.get("s", 1)) >= 1.4 and len(str(ln.get("t", ""))) > 26:
                warns.append(f"scene {i}: \"{str(ln['t'])[:30]}…\" is long for a display line — it will wrap")

    if vertical and total > 60:
        warns.append(f"{total:.1f}s exceeds the 60s Shorts limit")
    first = float(scenes[0].get("duration", 2))
    if first > 2.0:
        warns.append(f"first scene is {first}s — the hook has to land inside 1.5s")
    avg = total / len(scenes)
    limit = 2.6 if vertical else 4.5
    if avg > limit:
        warns.append(f"average scene {avg:.1f}s exceeds {limit}s — it will feel like a slideshow")
    runs, prev, n = [], None, 0
    for s in scenes:
        if s.get("type") == prev:
            n += 1
        else:
            if n >= 3:
                runs.append(prev)
            prev, n = s.get("type"), 1
    if n >= 3:
        runs.append(prev)
    for r in runs:
        warns.append(f"three or more `{r}` scenes in a row — vary the scene type or it reads as one long card")
    if len({s.get("type") for s in scenes}) == 1:
        warns.append("every scene is the same type — that is a slideshow, not an edit")
    if not deck.get("audio"):
        warns.append("no audio bed — silence kills retention")
    return errors, warns


def cmd_validate(a):
    deck = read_json(safe_path(a.deck, must_exist=True), None)
    if not isinstance(deck, dict):
        die("deck must be a JSON object")
    errors, warns = lint(deck)
    fps = deck.get("fps", 30)
    total = sum(float(s.get("duration", 2)) for s in deck.get("scenes", []))
    emit({"ok": not errors, "scenes": len(deck.get("scenes", [])),
          "duration_s": round(total, 2), "frames": int(total * fps),
          "canvas": f"{deck.get('width',1080)}x{deck.get('height',1920)}@{fps}",
          "errors": errors, "warnings": warns,
          "next": "mk remotion sheet <deck> to look at it" if not errors else "fix the errors first"})


# ------------------------------------------------------------------- rendering
def scene_mid_frames(deck: dict) -> list[int]:
    fps = deck.get("fps", 30)
    at, mids = 0, []
    for i, s in enumerate(deck.get("scenes", [])):
        f = max(1, round(float(s.get("duration", 2)) * fps))
        tr = s.get("transition") or {}
        ov = min(round(float(tr.get("duration", 0.3)) * fps), f - 1, at) \
            if i and tr.get("type") == "fade" else 0
        start = max(0, at - ov)
        at = start + f
        mids.append(start + round(f * 0.62))
    return mids


def cmd_still(a):
    d = ensure_project(project_dir(a.dir))
    deck_path = safe_path(a.deck, must_exist=True)
    out = safe_path(a.output, write=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    frame = a.frame
    if a.scene is not None:
        mids = scene_mid_frames(read_json(deck_path, {}))
        if not 0 <= a.scene < len(mids):
            die(f"scene {a.scene} out of range (0..{len(mids)-1})")
        frame = mids[a.scene]
    npx(d, ["still", "src/index.ts", "Deck", str(out), f"--props={deck_path}",
            f"--frame={frame}", "--log=error"], timeout=900)
    emit({"ok": True, "output": str(out), "frame": frame,
          "next": "open it with your image reader — do not judge a design you have not seen"})


def cmd_sheet(a):
    """One frame per scene, tiled. The cheap way to review a whole deck."""
    d = ensure_project(project_dir(a.dir))
    deck_path = safe_path(a.deck, must_exist=True)
    deck = read_json(deck_path, {})
    mids = scene_mid_frames(deck)
    if not mids:
        die("deck has no scenes")
    out = safe_path(a.output, write=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = safe_path(home() / "cache" / "sheet", write=True)
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True, exist_ok=True)
    shots = []
    for i, f in enumerate(mids):
        p = tmp / f"s{i:02d}.png"
        npx(d, ["still", "src/index.ts", "Deck", str(p), f"--props={deck_path}",
                f"--frame={f}", "--log=error"], timeout=900)
        shots.append(p)
    n = len(shots)
    cols = max(1, min(n, a.cols))
    rows = (n + cols - 1) // cols
    if rows > 1:
        cols = (n + rows - 1) // rows          # balance the grid, don't strand a row
        rows = (n + cols - 1) // cols
    tw = 320
    th = max(2, round(tw * deck.get("height", 1920) / deck.get("width", 1080) / 2) * 2)

    inputs: list[str] = []
    for shot in shots:
        inputs += ["-i", str(shot)]
    blanks = cols * rows - n
    for _ in range(blanks):
        inputs += ["-f", "lavfi", "-i", f"color=c=0x1A1A1A:s={tw}x{th}:d=1"]
    total = n + blanks
    # every tile is forced to the same size — xstack refuses a ragged grid
    scale = "".join(f"[{i}:v]scale={tw}:{th},setsar=1,format=rgb24[v{i}];" for i in range(total))
    refs = "".join(f"[v{i}]" for i in range(total))
    graph = (scale + refs + (f"hstack=inputs={total}" if rows == 1 else
             f"xstack=inputs={total}:layout=" +
             "|".join(f"{(i % cols) * tw}_{(i // cols) * th}" for i in range(total))))
    ffmpeg([*inputs, "-filter_complex", graph, "-frames:v", "1", str(out)], quiet=True)
    emit({"ok": True, "output": str(out), "scenes": len(shots), "frames": mids,
          "next": "open it with your image reader, then fix the weakest scene"})


def cmd_render(a):
    d = ensure_project(project_dir(a.dir))
    deck_path = safe_path(a.deck, must_exist=True)
    deck = read_json(deck_path, {})
    errors, warns = lint(deck)
    if errors:
        die("deck does not validate:\n  " + "\n  ".join(errors))
    out = safe_path(a.output, write=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    args = ["render", "src/index.ts", "Deck", str(out), f"--props={deck_path}", "--log=error",
            f"--concurrency={a.concurrency}"]
    if a.preview:
        args += ["--scale=0.5", "--crf=30"]
    if a.transparent:
        args += ["--codec=vp8", "--pixel-format=yuva420p"]
    npx(d, args, timeout=a.timeout)
    size = out.stat().st_size / 1e6 if out.exists() else 0
    emit({"ok": True, "output": str(out), "size_mb": round(size, 2),
          "scenes": len(deck.get("scenes", [])),
          "duration_s": round(sum(float(s.get("duration", 2)) for s in deck.get("scenes", [])), 2),
          "quality": "preview" if a.preview else "final", "warnings": warns,
          "next": f"mk qc {out} --target shorts --graphics"})


def cmd_studio(a):
    d = ensure_project(project_dir(a.dir))
    emit({"ok": True, "run_this_yourself": f"cd {d} && npx remotion studio",
          "note": "the studio is an interactive server — start it in your own terminal, "
                  "it will not return control to the agent"})


def main():
    ap = argparse.ArgumentParser(prog="mk remotion")
    ap.add_argument("--dir", default=None, help="Remotion project dir (default $MAKER_HOME/remotion)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    i = sub.add_parser("init"); i.add_argument("--force", action="store_true"); i.set_defaults(fn=cmd_init)

    dk = sub.add_parser("deck"); dk.add_argument("output")
    dk.add_argument("--template", default="example"); dk.add_argument("--title", default="")
    dk.set_defaults(fn=cmd_deck)

    v = sub.add_parser("validate"); v.add_argument("deck"); v.set_defaults(fn=cmd_validate)

    s = sub.add_parser("still"); s.add_argument("deck"); s.add_argument("-o", "--output", required=True)
    s.add_argument("--frame", type=int, default=20); s.add_argument("--scene", type=int, default=None)
    s.set_defaults(fn=cmd_still)

    sh = sub.add_parser("sheet"); sh.add_argument("deck"); sh.add_argument("-o", "--output", required=True)
    sh.add_argument("--cols", type=int, default=6); sh.set_defaults(fn=cmd_sheet)

    r = sub.add_parser("render"); r.add_argument("deck"); r.add_argument("-o", "--output", required=True)
    r.add_argument("--preview", action="store_true"); r.add_argument("--transparent", action="store_true")
    r.add_argument("--concurrency", type=int, default=2); r.add_argument("--timeout", type=int, default=3600)
    r.set_defaults(fn=cmd_render)

    st = sub.add_parser("studio"); st.set_defaults(fn=cmd_studio)

    a = ap.parse_args(); a.fn(a)


if __name__ == "__main__":
    main()
