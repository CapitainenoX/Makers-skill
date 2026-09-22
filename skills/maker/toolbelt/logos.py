#!/usr/bin/env python3
"""mk logo — real brand marks, fetched and cached.

Hand-drawn approximations of a company's logo look wrong to anyone who knows the brand,
and that is exactly the audience for a video about a GitHub project. Simple Icons ships
the real SVG for ~3000 brands under CC0, so there is no reason to redraw one.

Icons land in the Remotion project's public/logos/ and are cached forever; a second deck
using the same brand costs nothing.
"""
from __future__ import annotations

import argparse, json, re, sys, urllib.parse, urllib.request
from pathlib import Path

from _common import die, emit, home, read_json, safe_path, write_json

CDN = "https://cdn.jsdelivr.net/npm/simple-icons@15/icons/{slug}.svg"
COLOURED = "https://cdn.simpleicons.org/{slug}/{hex}"
UA = "Mozilla/5.0 (compatible; MakerSkill/1.0)"

# Brands whose Simple Icons slug is not what a person would type.
ALIASES = {
    "node": "nodedotjs", "nodejs": "nodedotjs", "vscode": "visualstudiocode",
    "vs code": "visualstudiocode", "next": "nextdotjs", "nextjs": "nextdotjs",
    "nuxt": "nuxtdotjs", "arch": "archlinux", "postgres": "postgresql",
    "k8s": "kubernetes", "gh": "github", "x": "x", "twitter": "x",
    "gpt": "openai", "chatgpt": "openai", "js": "javascript", "ts": "typescript",
    "tailwind": "tailwindcss", "c++": "cplusplus", "c#": "csharp",
    "dotnet": "dotnet", "golang": "go", "rustlang": "rust",
}


def slugify_brand(name: str) -> str:
    n = name.strip().lower()
    if n in ALIASES:
        return ALIASES[n]
    # Simple Icons slugs: lowercase, no spaces or punctuation
    return re.sub(r"[^a-z0-9]", "", n)


def fetch(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(2 * 1024 * 1024)


def project_public(explicit: str | None) -> Path:
    base = safe_path(explicit, write=True) if explicit else safe_path(home() / "remotion", write=True)
    d = base / "public" / "logos"
    d.mkdir(parents=True, exist_ok=True)
    return d


def cmd_get(a):
    dest = project_public(a.dir)
    index_path = dest / "index.json"
    index = read_json(index_path, {}) or {}
    got, missing = [], []

    for name in a.names:
        slug = slugify_brand(name)
        out = dest / f"{slug}.svg"
        if out.exists() and not a.force:
            got.append({"name": name, "slug": slug, "path": f"logos/{slug}.svg", "cached": True})
            continue
        # The recolouring endpoint covers fewer brands than the package itself, so a
        # coloured miss falls back to the plain mark rather than dropping the logo.
        urls = ([COLOURED.format(slug=slug, hex=a.color.lstrip("#"))] if a.color else []) + \
               [CDN.format(slug=slug)]
        data, err = None, ""
        for url in urls:
            try:
                data = fetch(url)
                break
            except Exception as exc:
                err = str(exc)[:90]
        if data is None:
            missing.append({"name": name, "slug": slug, "error": err})
            continue
        if b"<svg" not in data[:400]:
            missing.append({"name": name, "slug": slug, "error": "not an SVG"})
            continue
        out.write_bytes(data)
        index[slug] = {"name": name, "fetched": True}
        got.append({"name": name, "slug": slug, "path": f"logos/{slug}.svg", "cached": False})

    write_json(index_path, index)
    emit({
        "ok": bool(got), "dir": str(dest), "logos": got, "missing": missing,
        "use": 'set a chip\'s icon to the path, e.g. {"icon": "logos/github.svg", "label": "GitHub"}',
        "licence": "Simple Icons is CC0. Brand marks stay the property of their owners — "
                   "use them to refer to the product, never to imply endorsement.",
        **({} if not missing else {
            "hint": "a missing slug usually just has a different spelling: check "
                    "simpleicons.org, then pass the exact slug"}),
    })


def cmd_list(a):
    dest = project_public(a.dir)
    have = sorted(p.stem for p in dest.glob("*.svg"))
    emit({"dir": str(dest), "count": len(have), "logos": have,
          "next": "mk logo get <brand> ... to add more"})


def main():
    ap = argparse.ArgumentParser(prog="mk logo")
    ap.add_argument("--dir", default=None, help="Remotion project (default $MAKER_HOME/remotion)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("get"); g.add_argument("names", nargs="+")
    g.add_argument("--color", default=None, metavar="HEX",
                   help="recolour the mark, e.g. 000000 for a mono deck")
    g.add_argument("--force", action="store_true"); g.set_defaults(fn=cmd_get)

    l = sub.add_parser("list"); l.set_defaults(fn=cmd_list)

    a = ap.parse_args()
    try:
        a.fn(a)
    except KeyboardInterrupt:
        sys.exit(130)


if __name__ == "__main__":
    main()
