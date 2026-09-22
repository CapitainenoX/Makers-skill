#!/usr/bin/env python3
"""mk lib — the library of things that already worked.

Every video produces assets: a logo set, a music bed, a scene that landed, a caption the
creator liked. Re-sourcing them next time is wasted minutes and a different result. This
keeps them in one place, tagged, so the second video starts from the first one's wins.

Kinds: logo · sfx · music · voice · snippet (a deck fragment) · deck (a whole deck)
"""
from __future__ import annotations

import argparse, datetime as dt, json, shutil
from pathlib import Path

from _common import die, emit, home, read_json, safe_path, slugify, write_json

KINDS = ["logo", "sfx", "music", "voice", "snippet", "deck", "image"]


def lib_dir() -> Path:
    d = home() / "library"
    for k in KINDS:
        (d / k).mkdir(parents=True, exist_ok=True)
    return d


def index_path() -> Path:
    return lib_dir() / "index.json"


def load_index() -> dict:
    return read_json(index_path(), {}) or {}


def cmd_save(a):
    if a.kind not in KINDS:
        die(f"unknown kind {a.kind!r}; use {', '.join(KINDS)}")
    src = safe_path(a.path, must_exist=True)
    name = slugify(a.name or src.stem)
    dest = lib_dir() / a.kind / f"{name}{src.suffix}"
    shutil.copy2(src, dest)

    index = load_index()
    index.setdefault(a.kind, {})[name] = {
        "file": str(dest.relative_to(lib_dir())),
        "saved": dt.date.today().isoformat(),
        "why": a.why or "",
        "tags": a.tags,
        "uses": index.get(a.kind, {}).get(name, {}).get("uses", 0),
    }
    write_json(index_path(), index)
    emit({"ok": True, "kind": a.kind, "name": name, "path": str(dest),
          "next": f"mk lib use {a.kind} {name} -o <project path>"})


def cmd_list(a):
    index = load_index()
    if a.kind:
        rows = index.get(a.kind, {})
        emit({"kind": a.kind, "count": len(rows), "items": rows})
        return
    emit({"library": str(lib_dir()),
          "counts": {k: len(v) for k, v in index.items()},
          "items": index,
          "note": "the `why` field is the point — it says what this asset earned"})


def cmd_use(a):
    index = load_index()
    entry = index.get(a.kind, {}).get(slugify(a.name))
    if not entry:
        have = sorted(index.get(a.kind, {}))
        die(f"no {a.kind} named {a.name!r}. Have: {', '.join(have) or '(none)'}")
    src = lib_dir() / entry["file"]
    out = safe_path(a.output, write=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, out)
    entry["uses"] = int(entry.get("uses", 0)) + 1
    entry["last_used"] = dt.date.today().isoformat()
    write_json(index_path(), index)
    emit({"ok": True, "copied": str(out), "uses": entry["uses"], "why": entry.get("why")})


def cmd_drop(a):
    index = load_index()
    name = slugify(a.name)
    entry = index.get(a.kind, {}).pop(name, None)
    if not entry:
        die(f"no {a.kind} named {a.name!r}")
    p = lib_dir() / entry["file"]
    if p.exists():
        safe_path(p, write=True).unlink()
    write_json(index_path(), index)
    emit({"ok": True, "dropped": f"{a.kind}/{name}"})


def main():
    ap = argparse.ArgumentParser(prog="mk lib")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("save"); s.add_argument("kind"); s.add_argument("path")
    s.add_argument("--name"); s.add_argument("--why", default="")
    s.add_argument("--tags", nargs="*", default=[]); s.set_defaults(fn=cmd_save)

    l = sub.add_parser("list"); l.add_argument("kind", nargs="?"); l.set_defaults(fn=cmd_list)

    u = sub.add_parser("use"); u.add_argument("kind"); u.add_argument("name")
    u.add_argument("-o", "--output", required=True); u.set_defaults(fn=cmd_use)

    d = sub.add_parser("drop"); d.add_argument("kind"); d.add_argument("name")
    d.set_defaults(fn=cmd_drop)

    a = ap.parse_args(); a.fn(a)


if __name__ == "__main__":
    main()
