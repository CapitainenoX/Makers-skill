#!/usr/bin/env python3
"""mk init | state | clean — project workspaces."""
from __future__ import annotations
import argparse, datetime as dt, shutil, sys
from pathlib import Path
from _common import home, safe_path, slugify, write_json, read_json, emit, die

FORMATS = {
    "shorts":  {"w": 1080, "h": 1920, "fps": 30, "max_s": 60,   "label": "vertical short"},
    "reel":    {"w": 1080, "h": 1920, "fps": 30, "max_s": 90,   "label": "vertical reel"},
    "youtube": {"w": 1920, "h": 1080, "fps": 30, "max_s": 1800, "label": "landscape long-form"},
    "yt4k":    {"w": 3840, "h": 2160, "fps": 30, "max_s": 1800, "label": "landscape 4K"},
    "square":  {"w": 1080, "h": 1080, "fps": 30, "max_s": 120,  "label": "square social"},
}
SUBDIRS = ["rushes", "assets/music", "assets/sfx", "assets/memes", "assets/broll",
           "voice", "subs", "cache", "out", "notes"]


def proj_dir(slug: str) -> Path:
    return home() / "projects" / slugify(slug)


def cmd_init(a):
    slug = slugify(a.slug)
    d = proj_dir(slug)
    for sub in SUBDIRS:
        (d / sub).mkdir(parents=True, exist_ok=True)
    state_path = d / "state.json"
    if state_path.exists() and not a.force:
        emit({"ok": True, "existing": True, "slug": slug, "dir": str(d),
              "state": read_json(state_path)})
        return
    fmt = FORMATS[a.format]
    write_json(state_path, {
        "slug": slug, "title": a.title or slug.replace("-", " "),
        "created": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "format": a.format, "canvas": fmt,
        "mode": a.mode, "phase": "brief", "revision": 0,
        "brief": {"topic": a.title or "", "audience": "", "goal": "", "reference": []},
        "decisions": [], "assets": {}, "todo": [], "blockers": [],
    })
    emit({"ok": True, "slug": slug, "dir": str(d), "canvas": fmt,
          "next": "fill state.brief, then run the research phase"})


def cmd_state(a):
    d = proj_dir(a.slug)
    p = d / "state.json"
    if not p.exists():
        die(f"no project '{a.slug}'. Run: mk init {a.slug}")
    st = read_json(p, {})
    changed = False
    for pair in a.patch:
        if "=" not in pair:
            die(f"patch must be key=value, got {pair!r}")
        key, _, val = pair.partition("=")
        node, *rest = key.split(".")
        target, path = st, [node, *rest]
        for k in path[:-1]:
            target = target.setdefault(k, {})
            if not isinstance(target, dict):
                die(f"cannot patch through non-object at {k}")
        if val.startswith(("[", "{")):
            import json as _j
            try:
                val = _j.loads(val)
            except ValueError:
                die(f"invalid JSON value for {key}")
        target[path[-1]] = val
        changed = True
    if changed:
        st["updated"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
        write_json(p, st)
    emit(st)


def cmd_clean(a):
    """Only ever deletes regenerable directories inside the workspace."""
    base = home() / "projects"
    targets = [proj_dir(a.slug)] if a.slug else sorted(base.glob("*")) if base.exists() else []
    removed, freed = [], 0
    for d in targets:
        for sub in (["cache"] if a.cache else ["cache", "out"]):
            p = safe_path(d / sub, write=True)
            if p.is_dir():
                freed += sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
                shutil.rmtree(p)
                p.mkdir(parents=True, exist_ok=True)
                removed.append(str(p))
    emit({"ok": True, "cleared": removed, "freed_mb": round(freed / 1e6, 1),
          "kept": "rushes, assets, voice, subs, notes, state.json are never touched"})


def main():
    ap = argparse.ArgumentParser(prog="mk")
    sub = ap.add_subparsers(dest="cmd", required=True)

    i = sub.add_parser("init"); i.add_argument("slug")
    i.add_argument("--title", default=""); i.add_argument("--format", default="shorts", choices=FORMATS)
    i.add_argument("--mode", default="auto", choices=["auto", "plan", "step", "assist"])
    i.add_argument("--force", action="store_true"); i.set_defaults(fn=cmd_init)

    s = sub.add_parser("state"); s.add_argument("slug"); s.add_argument("patch", nargs="*")
    s.set_defaults(fn=cmd_state)

    c = sub.add_parser("clean"); c.add_argument("slug", nargs="?")
    c.add_argument("--cache", action="store_true"); c.set_defaults(fn=cmd_clean)

    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
