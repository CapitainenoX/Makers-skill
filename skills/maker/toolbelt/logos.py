#!/usr/bin/env python3
"""mk logo — real brand marks, fetched, coloured correctly, and checked.

Hand-drawn approximations of a company's logo look wrong to anyone who knows the brand,
and that is exactly the audience for a video about a GitHub project. Simple Icons ships
the real SVG for ~3000 brands under CC0, so there is no reason to redraw one.

What used to go wrong, and what this now guarantees:

- The npm copy of a Simple Icons SVG has **no fill at all**, so it rendered pure black —
  the "brand colours kept" promise was false for every logo fetched without `--color`,
  and a black mark on a dark chip vanished. Every file written here carries an explicit
  fill: the brand's own hex by default.
- The cache ignored the colour: a mark fetched once with `--color 111111` was served
  mono forever after. Each colour is now its own file (`github.svg` is the brand colour,
  `github-111111.svg` a recoloured variant), and a cached file whose fill does not match
  the request is re-fetched.
- Nothing checked the result. `mk logo check` measures every mark against the surfaces
  it can sit on and says which ones will not read; `mk remotion validate` does the same
  per scene, and the renderer switches an unreadable mark to the theme's ink by itself.

Icons land in the Remotion project's public/logos/ and are cached forever; a second deck
using the same brand costs nothing.
"""
from __future__ import annotations

import argparse, difflib, json, re, sys, urllib.request
from pathlib import Path

from _common import die, emit, home, read_json, safe_path, write_json

CDN = "https://cdn.jsdelivr.net/npm/simple-icons@15/icons/{slug}.svg"
DATA = "https://cdn.jsdelivr.net/npm/simple-icons@15/data/simple-icons.json"
COLOURED = "https://cdn.simpleicons.org/{slug}/{hex}"
BRAND = "https://cdn.simpleicons.org/{slug}"
UA = "Mozilla/5.0 (compatible; MakerSkill/1.0)"

# Brands whose Simple Icons slug is not what a person would type.
ALIASES = {
    "node": "nodedotjs", "nodejs": "nodedotjs", "node.js": "nodedotjs",
    "vscode": "visualstudiocode", "vs code": "visualstudiocode",
    "next": "nextdotjs", "nextjs": "nextdotjs", "next.js": "nextdotjs",
    "nuxt": "nuxtdotjs", "nuxtjs": "nuxtdotjs", "arch": "archlinux",
    "postgres": "postgresql", "k8s": "kubernetes", "gh": "github", "x": "x",
    "twitter": "x", "gpt": "openai", "chatgpt": "openai", "js": "javascript",
    "ts": "typescript", "tailwind": "tailwindcss", "c++": "cplusplus", "c#": "csharp",
    "dotnet": "dotnet", ".net": "dotnet", "golang": "go", "rustlang": "rust",
    "vue": "vuedotjs", "vuejs": "vuedotjs", "three": "threedotjs", "threejs": "threedotjs",
    "d3": "d3dotjs", "express": "express", "gcp": "googlecloud", "aws": "amazonwebservices",
    "ms": "microsoft", "mongo": "mongodb", "hf": "huggingface", "hugging face": "huggingface",
    "yt": "youtube", "ig": "instagram", "insta": "instagram", "tiktok": "tiktok",
    "premiere": "adobepremierepro", "premiere pro": "adobepremierepro",
    "after effects": "adobeaftereffects", "photoshop": "adobephotoshop",
    "davinci": "davinciresolve", "resolve": "davinciresolve",
}

LIGHT_SURFACE = "#ffffff"
DARK_SURFACE = "#18181c"


# ------------------------------------------------------------------ colour maths
# Same WCAG formula as the renderer (remotion/src/color.ts) so both agree.
def parse_hex(c: str) -> tuple[float, float, float] | None:
    c = (c or "").strip().lower()
    named = {"black": "#000000", "white": "#ffffff", "currentcolor": "#000000"}
    c = named.get(c, c)
    m = re.fullmatch(r"#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})", c)
    if not m:
        m2 = re.fullmatch(r"rgba?\(([^)]+)\)", c)
        if not m2:
            return None
        parts = [p for p in re.split(r"[\s,/]+", m2.group(1)) if p]
        try:
            return float(parts[0]), float(parts[1]), float(parts[2])
        except (ValueError, IndexError):
            return None
    h = m.group(1)
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def luminance(rgb) -> float:
    def ch(v):
        x = v / 255
        return x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a: str, b: str) -> float:
    x, y = parse_hex(a), parse_hex(b)
    if not x or not y:
        return 21.0
    l1, l2 = luminance(x), luminance(y)
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)


def svg_colours(text: str) -> list[str]:
    """Every paint colour an SVG uses. No fill anywhere means black — that default is
    exactly what made fetched logos render the wrong colour."""
    found: list[str] = []

    def add(v: str):
        v = v.strip().lower()
        if not v or v in ("none", "transparent") or v.startswith("url("):
            return
        rgb = parse_hex(v)
        if rgb:
            hx = "#%02x%02x%02x" % tuple(int(round(c)) for c in rgb)
            if hx not in found:
                found.append(hx)

    for m in re.finditer(r'\b(?:fill|stroke|stop-color)\s*=\s*["\']([^"\']+)["\']', text, re.I):
        add(m.group(1))
    for m in re.finditer(r'(?:^|[;{\s"\'])(?:fill|stroke|stop-color)\s*:\s*([^;}"\']+)', text, re.I):
        add(m.group(1))
    root_fill = re.search(r"<svg[^>]*\bfill\s*=", text, re.I)
    group_fill = re.search(r"<g[^>]*\bfill\s*=", text, re.I)
    bare_shape = re.search(r"<(path|circle|rect|polygon|ellipse)\b(?![^>]*\bfill\s*=)[^>]*>", text, re.I)
    if bare_shape and not root_fill and not group_fill and "#000000" not in found:
        found.append("#000000")
    return found


def with_fill(svg: str, hex_: str) -> str:
    """Give the root <svg> an explicit fill, replacing any it had."""
    hex_ = "#" + hex_.lstrip("#")
    svg = re.sub(r'(<svg\b[^>]*?)\sfill\s*=\s*"[^"]*"', r"\1", svg, count=1)
    return re.sub(r"<svg\b", f'<svg fill="{hex_}"', svg, count=1)


# ------------------------------------------------------------------ fetching
def slugify_brand(name: str) -> str:
    n = name.strip().lower()
    if n in ALIASES:
        return ALIASES[n]
    return re.sub(r"[^a-z0-9]", "", n.replace("+", "plus").replace(".", "dot"))


def fetch(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(4 * 1024 * 1024)


def catalogue() -> list[dict]:
    """Simple Icons' own index (title, slug, brand hex), cached once per machine."""
    cache = safe_path(home() / "cache" / "simple-icons.json", write=True)
    data = read_json(cache, None) if cache.exists() else None
    if not data:
        try:
            data = json.loads(fetch(DATA, timeout=60))
            cache.parent.mkdir(parents=True, exist_ok=True)
            write_json(cache, data)
        except Exception:
            data = []
    if isinstance(data, dict):             # older package layouts wrapped it
        data = data.get("icons", [])
    return data


def lookup(slug: str) -> dict | None:
    for it in catalogue():
        s = it.get("slug") or re.sub(r"[^a-z0-9]", "", str(it.get("title", "")).lower())
        if s == slug:
            return {"slug": s, "title": it.get("title"), "hex": it.get("hex")}
    return None


def suggest(name: str) -> list[str]:
    cat = catalogue()
    if not cat:
        return []
    by_title = {str(it.get("title", "")).lower(): it.get("slug") for it in cat}
    hits = difflib.get_close_matches(name.lower(), list(by_title), n=4, cutoff=0.6)
    slugs = difflib.get_close_matches(slugify_brand(name), [it.get("slug", "") for it in cat], n=4, cutoff=0.7)
    out: list[str] = []
    for s in [by_title[h] for h in hits] + slugs:
        if s and s not in out:
            out.append(s)
    return out[:5]


def project_public(explicit: str | None) -> Path:
    base = safe_path(explicit, write=True) if explicit else safe_path(home() / "remotion", write=True)
    d = base / "public" / "logos"
    d.mkdir(parents=True, exist_ok=True)
    return d


def readability(colours: list[str]) -> dict:
    if len(colours) != 1:
        return {"multicolour": len(colours) > 1}
    c = colours[0]
    on_light, on_dark = contrast(c, LIGHT_SURFACE), contrast(c, DARK_SURFACE)
    note = None
    if on_light < 1.6:
        note = "invisible on a white chip — the renderer will draw it in the ink colour; " \
               "or use `fill: \"brand\"`/`\"ink\"` on the chip"
    elif on_dark < 1.6:
        note = "invisible on a dark theme — the renderer will draw it in white there"
    return {"hex": c, "on_light": round(on_light, 2), "on_dark": round(on_dark, 2),
            **({"note": note} if note else {})}


def cmd_get(a):
    want = None
    if getattr(a, "mono", False) and not a.color:
        a.color = "111113"
    if a.color:
        want = "#" + a.color.lstrip("#").lower()
        if not parse_hex(want):
            die(f"--color {a.color!r} is not a hex colour")
    dest = project_public(a.dir)
    index_path = dest / "index.json"
    index = read_json(index_path, {}) or {}
    got, missing = [], []

    for name in a.names:
        slug = slugify_brand(name)
        info = lookup(slug)          # None when offline or unknown: the CDN still decides
        fname = f"{slug}.svg" if not want else f"{slug}-{want.lstrip('#')}.svg"
        out = dest / fname
        brand_hex = ("#" + info["hex"].lower()) if info and info.get("hex") else None
        target = want or brand_hex

        if out.exists() and not a.force:
            cols = svg_colours(out.read_text(errors="ignore"))
            # a cached file is only reused if it actually is the colour asked for
            if not target or cols == [target]:
                got.append({"name": name, "slug": slug, "path": f"logos/{fname}", "cached": True,
                            **readability(cols)})
                continue

        data, err = None, ""
        urls = [COLOURED.format(slug=slug, hex=want.lstrip("#"))] if want else [BRAND.format(slug=slug)]
        urls.append(CDN.format(slug=slug))
        for url in urls:
            try:
                data = fetch(url)
                if b"<svg" in data[:600]:
                    break
                data = None
            except Exception as exc:
                err = str(exc)[:90]
        if data is None:
            missing.append({"name": name, "slug": slug, "error": err or "not an SVG",
                            "did_you_mean": suggest(name)})
            continue
        text = data.decode("utf-8", errors="ignore")
        if target:
            text = with_fill(text, target)
        out.write_text(text)
        cols = svg_colours(text)
        if cols == ["#000000"] and not target:
            # neither the coloured endpoint nor the catalogue answered: say so rather
            # than ship a black mark as if it were the brand colour
            missing.append({"name": name, "slug": slug, "error": "fetched without its brand "
                            "colour (renders black) — rerun online, or pass --color <hex>"})
        entry = {"name": name, "title": (info or {}).get("title") or name,
                 "hex": brand_hex, "file": fname}
        index.setdefault(slug, {}).update({k: v for k, v in entry.items() if v})
        index[slug].setdefault("variants", [])
        if fname not in index[slug]["variants"]:
            index[slug]["variants"].append(fname)
        got.append({"name": name, "slug": slug, "path": f"logos/{fname}", "cached": False,
                    **readability(cols)})

    write_json(index_path, index)
    warn = [f"{g['path']}: {g['note']}" for g in got if g.get("note")]
    emit({
        "ok": bool(got), "dir": str(dest), "logos": got, "missing": missing,
        "colour": f"recoloured {want}" if want else "brand colour, written into the file",
        **({"readability": warn} if warn else {}),
        "use": 'set a chip\'s icon to the path, e.g. {"icon": "logos/github.svg", "label": "GitHub"}',
        "licence": "Simple Icons is CC0. Brand marks stay the property of their owners — "
                   "use them to refer to the product, never to imply endorsement.",
        **({} if not missing else {
            "hint": "a missing slug usually just has a different spelling — see did_you_mean, "
                    "or search simpleicons.org, then pass the exact slug"}),
    })


def cmd_check(a):
    """Measure every cached mark against the surfaces it can sit on."""
    dest = project_public(a.dir)
    index = read_json(dest / "index.json", {}) or {}
    surface = a.surface
    rows, problems, notes = [], [], []
    for p in sorted(dest.glob("*.svg")):
        cols = svg_colours(p.read_text(errors="ignore"))
        r = {"path": f"logos/{p.name}", **readability(cols)}
        if surface and len(cols) == 1:
            r["on_surface"] = round(contrast(cols[0], surface), 2)
            if r["on_surface"] < 1.6:
                problems.append(f"logos/{p.name} is {cols[0]} on {surface} — "
                                f"{r['on_surface']}:1, it will not read")
        slug = p.stem.split("-")[0]
        meta = index.get(slug) or {}
        if meta.get("hex") and len(cols) == 1 and "-" not in p.stem and \
                cols[0].lstrip("#") != str(meta["hex"]).lower().lstrip("#"):
            problems.append(f"logos/{p.name} is {cols[0]} but {meta.get('title', slug)}'s brand "
                            f"colour is #{str(meta['hex']).lower().lstrip('#')} — refetch with --force")
        if cols == ["#000000"] and str(meta.get("hex", "")).lower().lstrip("#") != "000000":
            problems.append(f"logos/{p.name}: no brand colour in the file, it renders black — "
                            f"refetch: mk logo get {slug} --force")
        if r.get("note"):
            notes.append(f"logos/{p.name}: {r['note']}")
        rows.append(r)
    emit({"dir": str(dest), "count": len(rows), "logos": rows, "problems": problems,
          "notes": notes, "ok": not problems,
          "next": "problems are wrong files — fix them. Notes depend on the theme: "
                  "`mk remotion validate <deck>` checks each mark against its real chip"})


def cmd_list(a):
    dest = project_public(a.dir)
    have = sorted(p.stem for p in dest.glob("*.svg"))
    emit({"dir": str(dest), "count": len(have), "logos": have,
          "next": "mk logo check to measure them, mk logo get <brand> ... to add more"})


def main():
    ap = argparse.ArgumentParser(prog="mk logo")
    ap.add_argument("--dir", default=None, help="Remotion project (default $MAKER_HOME/remotion)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("get"); g.add_argument("names", nargs="+")
    g.add_argument("--color", default=None, metavar="HEX",
                   help="recolour the mark (written as <slug>-<hex>.svg). Usually leave this "
                        "off: the brand colour is written into the file, and the renderer "
                        "adapts it per chip when it would not read")
    g.add_argument("--mono", action="store_true",
                   help="shorthand for --color 111113, for when a logo must not stand out")
    g.add_argument("--force", action="store_true"); g.set_defaults(fn=cmd_get)

    c = sub.add_parser("check"); c.add_argument("--surface", default=None, metavar="HEX",
                                                help="also measure against this colour")
    c.set_defaults(fn=cmd_check)

    l = sub.add_parser("list"); l.set_defaults(fn=cmd_list)

    a = ap.parse_args()
    try:
        a.fn(a)
    except KeyboardInterrupt:
        sys.exit(130)


if __name__ == "__main__":
    main()
