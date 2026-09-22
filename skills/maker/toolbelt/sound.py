#!/usr/bin/env python3
"""mk sound — real recorded audio from Freesound.

`mk sfx gen` synthesises one-shots: precise, free, and a little clinical. This fetches
recorded material — whooshes with air in them, room tone, ambience, short musical beds —
filtered by licence so nothing lands in a project without a known right to use it.

Credits are written as they are downloaded, into credits.md next to the files. A CC-BY
sound with no credit in the description is a licence breach, and nobody remembers the
author a week later.

Auth: export FREESOUND_API_KEY (the API key from freesound.org/apiv2/apply).
The key is read from the environment only — never written to a file, never printed.
"""
from __future__ import annotations

import argparse, json, os, re, urllib.error, urllib.parse, urllib.request
from pathlib import Path

from _common import die, emit, home, read_json, safe_path, slugify, write_json

API = "https://freesound.org/apiv2"
FIELDS = "id,name,license,username,duration,previews,url,tags,avg_rating,num_downloads"

LICENCES = {
    # slug -> (Freesound filter value, needs attribution)
    "cc0": ('"Creative Commons 0"', False),
    "by": ('"Attribution"', True),
    "any-commercial": ('("Creative Commons 0" OR "Attribution")', True),
}

# What a short actually needs, as search terms that return usable results.
PACK = {
    # Names match SCENE_SFX in mix.py, so `mk sound pack` covers every automatic cut.
    "whoosh": ("whoosh transition swoosh", 0.2, 2.5),
    "swoosh": ("swoosh short transition air", 0.1, 1.5),
    "tick": ("tick short ui blip", 0.02, 0.4),
    "impact": ("impact hit boom cinematic", 0.3, 4.0),
    "pop": ("pop ui click bubble", 0.05, 1.0),
    "click": ("ui click tap interface", 0.02, 0.8),
    "riser": ("riser build up tension", 0.5, 10.0),
    "swipe": ("swipe slide ui transition", 0.1, 2.0),
    "notification": ("notification ding alert ui", 0.1, 3.0),
    "keyboard": ("keyboard typing mechanical", 0.3, 5.0),
}


def api_key() -> str:
    key = os.environ.get("FREESOUND_API_KEY", "").strip()
    if not key:
        die("no FREESOUND_API_KEY in the environment.\n"
            "  export FREESOUND_API_KEY=...   (get one at freesound.org/apiv2/apply)\n"
            "Never paste it into a file the repo tracks.")
    return key


def request(path: str, params: dict) -> dict:
    url = f"{API}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Token {api_key()}",
        "User-Agent": "MakerSkill/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return json.loads(r.read(8 * 1024 * 1024))
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            die("Freesound rejected the key (HTTP %d). Check FREESOUND_API_KEY, and note "
                "that downloading ORIGINAL files needs OAuth2 — previews, which this uses, "
                "only need the key." % e.code)
        die(f"Freesound returned HTTP {e.code} for {path}")
    except Exception as exc:
        die(f"Freesound unreachable: {type(exc).__name__}: {exc}")


def search(query: str, licence: str, dmin: float, dmax: float, n: int,
           sort: str = "rating_desc") -> list[dict]:
    if licence not in LICENCES:
        die(f"unknown licence {licence!r}; use {', '.join(LICENCES)}")
    filt = f"license:{LICENCES[licence][0]} duration:[{dmin} TO {dmax}]"
    data = request("/search/text/", {
        "query": query, "filter": filt, "fields": FIELDS,
        "page_size": max(1, min(n, 25)), "sort": sort,
    })
    return data.get("results", [])


def download(url: str, dest: Path) -> Path:
    req = urllib.request.Request(url, headers={
        "Authorization": f"Token {api_key()}", "User-Agent": "MakerSkill/1.0"})
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read(60 * 1024 * 1024))
    return dest


def record_credit(d: Path, rec: dict, filename: str, licence: str) -> None:
    """Attribution written at download time, when it is still known."""
    needs = LICENCES.get(licence, ("", True))[1]
    line = (f"- `{filename}` — [{rec['name']}]({rec['url']}) by **{rec['username']}**, "
            f"{rec['license'].rstrip('/').split('/')[-2].upper() if '/' in rec['license'] else rec['license']}"
            f"{'  ← credit required in the description' if needs else ''}\n")
    p = d / "credits.md"
    if not p.exists():
        p.write_text("# Audio credits\n\nPaste the lines that say *credit required* into "
                     "the video description.\n\n", encoding="utf-8")
    body = p.read_text(encoding="utf-8")
    if filename not in body:
        p.write_text(body + line, encoding="utf-8")


def best_preview(rec: dict) -> str | None:
    pv = rec.get("previews") or {}
    return pv.get("preview-hq-mp3") or pv.get("preview-hq-ogg") or pv.get("preview-lq-mp3")


def outdir(explicit: str | None, sub: str) -> Path:
    base = safe_path(explicit, write=True) if explicit else safe_path(home() / "sound" / sub, write=True)
    base.mkdir(parents=True, exist_ok=True)
    return base


def brief(rec: dict) -> dict:
    return {"id": rec["id"], "name": rec["name"][:60], "by": rec["username"],
            "duration_s": round(rec["duration"], 2),
            "licence": rec["license"].rstrip("/").split("/")[-2] if "/" in rec["license"] else rec["license"],
            "rating": round(rec.get("avg_rating") or 0, 1),
            "downloads": rec.get("num_downloads")}


def cmd_search(a):
    hits = search(a.query, a.license, a.min, a.max, a.n)
    emit({"query": a.query, "licence": a.license, "count": len(hits),
          "results": [brief(r) for r in hits],
          "next": f'mk sound get "{a.query}" --license {a.license} to download the top match'})


def cmd_get(a):
    hits = search(a.query, a.license, a.min, a.max, max(a.n, 1))
    if not hits:
        emit({"ok": False, "query": a.query,
              "reason": "no result under that licence and duration",
              "next": ["widen with --license any-commercial",
                       "relax --min/--max",
                       "or synthesise it: mk sfx gen whoosh"]})
        return
    d = outdir(a.outdir, "sfx" if a.max <= 6 else "music")
    got = []
    for rec in hits[: a.n]:
        url = best_preview(rec)
        if not url:
            continue
        name = f"{slugify(a.name or rec['name'])[:40]}-{rec['id']}.mp3"
        path = download(url, d / name)
        record_credit(d, rec, name, a.license)
        got.append({**brief(rec), "path": str(path)})
    emit({"ok": bool(got), "query": a.query, "dir": str(d), "files": got,
          "credits": str(d / "credits.md"),
          "quality": "HQ preview (~128 kbps mp3). Original masters need OAuth2; for a bed "
                     "under a voice this is indistinguishable.",
          "next": "mk mix <video> -o out.mp4 --music <file> --from-deck <deck>"})


def find_one(query: str, licence: str, dmin: float, dmax: float) -> tuple[dict | None, str]:
    """Try the tight query first, then loosen. A single strict search comes back empty
    often enough that giving up on it would leave holes in every pack."""
    attempts = [
        (query, licence, dmin, dmax, "exact"),
        (query.split()[0], licence, dmin * 0.5, dmax * 2, "widened"),
        (query.split()[0], "any-commercial", dmin * 0.5, dmax * 2, "licence relaxed"),
    ]
    for q, lic, lo, hi, how in attempts:
        for rec in search(q, lic, lo, hi, 5):
            if best_preview(rec):
                return rec, (how if how == "exact" else f"{how} ({lic})")
    return None, "no match"


def cmd_pack(a):
    """One usable take of each one-shot a short needs, in a single call."""
    d = outdir(a.outdir, "sfx")
    got, missed = [], []
    for kind, (query, dmin, dmax) in PACK.items():
        rec, how = find_one(query, a.license, dmin, dmax)
        if rec is None:
            missed.append(kind)
            continue
        name = f"{kind}.mp3"
        download(best_preview(rec), d / name)
        lic = "any-commercial" if "relaxed" in how else a.license
        record_credit(d, rec, name, lic)
        got.append({"kind": kind, "matched": how, **brief(rec)})
    relaxed = [g["kind"] for g in got if g.get("matched") != "exact"]
    emit({"ok": bool(got), "dir": str(d), "pack": got, "missing": missed,
          "relaxed": relaxed or None,
          "credits": str(d / "credits.md"),
          **({"check": "some takes came from a relaxed search — listen before you ship, and "
                       "read credits.md: a relaxed licence may require attribution"}
             if relaxed else {}),
          "note": "recorded takes have air and room in them; `mk sfx gen` stays useful for "
                  "the clinical ones (tick, click) where you want no tail at all"})


def cmd_music(a):
    hits = search(a.query or "ambient loop background instrumental",
                  a.license, a.min, a.max, a.n, sort="downloads_desc")
    if not hits:
        emit({"ok": False, "reason": "nothing under that licence and length",
              "next": "widen --license any-commercial, or raise --max"})
        return
    d = outdir(a.outdir, "music")
    got = []
    for rec in hits[: a.n]:
        url = best_preview(rec)
        if not url:
            continue
        name = f"{slugify(rec['name'])[:40]}-{rec['id']}.mp3"
        download(url, d / name)
        record_credit(d, rec, name, a.license)
        got.append({**brief(rec), "path": str(d / name)})
    emit({"ok": bool(got), "dir": str(d), "tracks": got, "credits": str(d / "credits.md"),
          "choosing": "match the TEMPO of your cuts, not the mood of the topic. Count your "
                      "cuts per 10s and pick a bed whose pulse lands near them.",
          "next": "mk mix <video> -o out.mp4 --music <file> --from-deck <deck>"})


def main():
    ap = argparse.ArgumentParser(prog="mk sound")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p, dmin, dmax):
        p.add_argument("--license", default="cc0", choices=list(LICENCES))
        p.add_argument("--min", type=float, default=dmin)
        p.add_argument("--max", type=float, default=dmax)
        p.add_argument("-n", type=int, default=5)
        p.add_argument("-o", "--outdir")

    s = sub.add_parser("search"); s.add_argument("query"); common(s, 0.05, 30)
    s.set_defaults(fn=cmd_search)

    g = sub.add_parser("get"); g.add_argument("query"); g.add_argument("--name")
    common(g, 0.05, 6); g.set_defaults(n=1, fn=cmd_get)

    p = sub.add_parser("pack"); p.add_argument("--license", default="cc0", choices=list(LICENCES))
    p.add_argument("-o", "--outdir"); p.set_defaults(fn=cmd_pack)

    m = sub.add_parser("music"); m.add_argument("query", nargs="?")
    common(m, 20, 300); m.set_defaults(fn=cmd_music)

    a = ap.parse_args()
    if not hasattr(a, "n"):
        a.n = 1
    a.fn(a)


if __name__ == "__main__":
    main()
