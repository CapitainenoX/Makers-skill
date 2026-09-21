#!/usr/bin/env python3
"""mk fetch | music | sfx | gif | stock — sourcing footage, audio and memes.

Every download lands inside the workspace, under a sanitised filename, through
a bounded request. Nothing downloaded is ever passed to a shell.
"""
from __future__ import annotations

import argparse, json, os, re, ssl, sys, urllib.parse, urllib.request
from pathlib import Path

from _common import (die, emit, home, read_json, require, run, safe_path,
                     slugify, which, write_json)

UA = "Mozilla/5.0 (compatible; MakerSkill/1.0)"
MEDIA_EXT = re.compile(r"\.(mp3|wav|ogg|m4a|mp4|webm|gif|png|jpg|jpeg)$", re.I)


# ------------------------------------------------------------------ http utils
def _ctx() -> ssl.SSLContext:
    for var in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
        if os.environ.get(var) and Path(os.environ[var]).exists():
            return ssl.create_default_context(cafile=os.environ[var])
    for p in ("/root/.ccr/ca-bundle.crt", "/etc/ssl/certs/ca-certificates.crt"):
        if Path(p).exists():
            return ssl.create_default_context(cafile=p)
    return ssl.create_default_context()


class Unreachable(RuntimeError):
    """A site said no. Never a traceback — the agent needs a next move, not a stack."""


def http_get(url: str, *, timeout: int = 45, binary: bool = False, headers: dict | None = None):
    if not url.lower().startswith(("http://", "https://")):
        die(f"refusing non-http url: {url[:80]}")
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*",
                                               "Accept-Language": "en,fr;q=0.8",
                                               **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_ctx()) as r:
            data = r.read(80 * 1024 * 1024)      # hard cap, never unbounded
    except urllib.error.HTTPError as e:
        raise Unreachable(f"HTTP {e.code} from {urllib.parse.urlparse(url).netloc}") from None
    except Exception as e:
        raise Unreachable(f"{type(e).__name__}: {e} ({urllib.parse.urlparse(url).netloc})") from None
    return data if binary else data.decode("utf-8", "replace")


def save(url: str, dest: Path, *, timeout: int = 90) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(http_get(url, timeout=timeout, binary=True))
    return dest


def outdir(sub: str, explicit: str | None) -> Path:
    base = safe_path(explicit, write=True) if explicit else safe_path(home() / "downloads" / sub, write=True)
    base.mkdir(parents=True, exist_ok=True)
    return base


# ------------------------------------------------------------------- yt-dlp ops
def ytdlp_base(dest_tpl: str) -> list[str]:
    exe = require("yt-dlp", "pipx install yt-dlp (then keep it updated: yt-dlp -U)")
    return [exe, "--no-playlist", "--no-exec", "--no-continue", "--restrict-filenames",
            "--no-warnings", "--retries", "3", "--socket-timeout", "30",
            "--print", "after_move:filepath", "-o", dest_tpl]


def cmd_fetch(a):
    d = outdir("video", a.outdir)
    tpl = str(d / "%(title).80s.%(ext)s")
    cmd = ytdlp_base(tpl)
    if a.audio:
        cmd += ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
    else:
        h = a.max_height
        cmd += ["-f", f"bestvideo[height<={h}]+bestaudio/best[height<={h}]/best",
                "--merge-output-format", "mp4"]
    if a.clip:
        s, e = a.clip
        cmd += ["--download-sections", f"*{s}-{e}", "--force-keyframes-at-cuts"]
    if a.subs:
        cmd += ["--write-auto-subs", "--sub-langs", a.subs, "--convert-subs", "srt"]
    if a.cookies:
        cmd += ["--cookies-from-browser", a.cookies]
    proc = run([*cmd, a.url], timeout=1800, check=False)
    paths = [l.strip() for l in (proc.stdout or "").splitlines() if l.strip()]
    if proc.returncode != 0 and not paths:
        die("yt-dlp failed. Most common causes, in order:\n"
            "  1. stale binary   -> yt-dlp -U   (fixes most 403/extractor errors)\n"
            "  2. needs cookies  -> --cookies chrome|firefox\n"
            "  3. geo/age gate   -> try another source\n"
            f"stderr: {(proc.stderr or '')[-800:]}")
    emit({"ok": True, "files": paths, "dir": str(d),
          "reminder": "check the licence before publishing; prefer CC-BY or your own footage"})


def cmd_music(a):
    d = outdir("music", a.outdir)
    q = a.query
    if "open.spotify.com" in q and which("spotdl"):
        run(["spotdl", "download", q, "--output", str(d)], timeout=1800)
        emit({"ok": True, "dir": str(d), "engine": "spotdl"})
        return
    target = q if q.lower().startswith(("http://", "https://")) else f"ytsearch1:{q}"
    cmd = ytdlp_base(str(d / "%(title).80s.%(ext)s"))
    cmd += ["-x", "--audio-format", "mp3", "--audio-quality", "0",
            "--embed-metadata", "--embed-thumbnail"]
    proc = run([*cmd, target], timeout=1800, check=False)
    paths = [l.strip() for l in (proc.stdout or "").splitlines() if l.strip()]
    if not paths:
        die(f"nothing downloaded for {q!r}. stderr: {(proc.stderr or '')[-600:]}")
    emit({"ok": True, "files": paths, "dir": str(d),
          "reminder": "commercial platforms flag copyrighted music — prefer no-copyright / "
                      "CC libraries, or the creator's own licence"})


# ----------------------------------------------------------- memes & reactions
SFX_SOURCES = [
    ("myinstants", "https://www.myinstants.com/en/search/?name={q}",
     r"/media/sounds/[\w\-./%]+\.mp3", "https://www.myinstants.com"),
    ("myinstants-fr", "https://www.myinstants.com/fr/search/?name={q}",
     r"/media/sounds/[\w\-./%]+\.mp3", "https://www.myinstants.com"),
    ("instants.meme", "https://instants.meme/?s={q}",
     r"https?://[\w\-./%]+\.mp3", ""),
]


def cmd_sfx(a):
    """Meme sounds. Public pages, plain GET, no auth, several sources tried in turn."""
    q = urllib.parse.quote_plus(" ".join(a.query))
    found, seen, tried = [], set(), []
    for name, tpl, pattern, prefix in SFX_SOURCES:
        try:
            html = http_get(tpl.format(q=q))
        except Unreachable as exc:
            tried.append(f"{name}: {exc}")
            continue
        for m in re.finditer(pattern, html):
            u = prefix + m.group(0)
            if u not in seen:
                seen.add(u); found.append(u)
        if found:
            break
    if not found:
        emit({"ok": False, "query": " ".join(a.query), "files": [], "tried": tried,
              "next": [
                  "freesound.org (CC0) with FREESOUND_API_KEY, or pixabay.com/sound-effects",
                  "`mk fetch <youtube-url> --audio --clip S E` to lift the sound from a clip",
                  "open the site in your browser tool and download the button directly",
              ]})
        return
    d = outdir("sfx", a.outdir)
    files, failed = [], []
    for u in found[: a.n]:
        name = slugify(urllib.parse.unquote(Path(urllib.parse.urlparse(u).path).stem))
        try:
            files.append(str(save(u, d / f"{name}.mp3")))
        except Exception as exc:                       # one bad url never kills the batch
            failed.append(f"{u} -> {exc}")
    emit({"ok": bool(files), "query": " ".join(a.query), "files": files, "dir": str(d),
          "failed": failed,
          "note": "meme sounds are user-uploaded — fine for social, risky for monetised long-form",
          **({} if files else {"next": "every candidate url was blocked — use freesound.org, "
                               "pixabay sound-effects, or lift the sound with `mk fetch --audio --clip`"})})


def cmd_gif(a):
    q = " ".join(a.query)
    d = outdir("memes", a.outdir)
    tenor, giphy = os.environ.get("TENOR_API_KEY"), os.environ.get("GIPHY_API_KEY")
    if tenor:
        url = ("https://tenor.googleapis.com/v2/search?q=" + urllib.parse.quote_plus(q) +
               f"&key={tenor}&limit={a.n}&media_filter=mp4,gif&contentfilter=medium")
        items = json.loads(http_get(url)).get("results", [])
        picks = [(it["id"], (it["media_formats"].get("mp4") or it["media_formats"]["gif"])["url"])
                 for it in items]
    elif giphy:
        url = ("https://api.giphy.com/v1/gifs/search?q=" + urllib.parse.quote_plus(q) +
               f"&api_key={giphy}&limit={a.n}&rating=pg13")
        items = json.loads(http_get(url)).get("data", [])
        picks = [(it["id"], it["images"]["original"]["url"]) for it in items]
    else:
        emit({"ok": False, "reason": "no GIF api key",
              "fix": "export TENOR_API_KEY=... (free at tenor.com/gifapi) or GIPHY_API_KEY=...",
              "alternative": "mk fetch <youtube-url> --clip S E  for a reaction clip instead"})
        return
    files = []
    for gid, u in picks:
        ext = ".mp4" if ".mp4" in u else ".gif"
        try:
            files.append(str(save(u, d / f"{slugify(q)}-{gid}{ext}")))
        except Exception as exc:
            print(f"skip {u}: {exc}", file=sys.stderr)
    emit({"ok": True, "query": q, "files": files, "dir": str(d)})


def cmd_stock(a):
    q = " ".join(a.query)
    d = outdir("broll", a.outdir)
    pexels, pixabay = os.environ.get("PEXELS_API_KEY"), os.environ.get("PIXABAY_API_KEY")
    files = []
    if pexels:
        req = urllib.request.Request(
            "https://api.pexels.com/videos/search?per_page=%d&query=%s" % (a.n, urllib.parse.quote_plus(q)),
            headers={"Authorization": pexels, "User-Agent": UA})
        with urllib.request.urlopen(req, timeout=45, context=_ctx()) as r:
            data = json.loads(r.read())
        for v in data.get("videos", []):
            best = max(v["video_files"], key=lambda f: (f.get("width") or 0))
            files.append(str(save(best["link"], d / f"{slugify(q)}-{v['id']}.mp4", timeout=300)))
    elif pixabay:
        url = (f"https://pixabay.com/api/videos/?key={pixabay}&q=" +
               urllib.parse.quote_plus(q) + f"&per_page={max(3, a.n)}")
        for v in json.loads(http_get(url)).get("hits", []):
            link = v["videos"]["large"]["url"] or v["videos"]["medium"]["url"]
            files.append(str(save(link, d / f"{slugify(q)}-{v['id']}.mp4", timeout=300)))
    else:
        emit({"ok": False, "reason": "no stock api key",
              "fix": "export PEXELS_API_KEY=... or PIXABAY_API_KEY=... (both free)",
              "alternative": "generate b-roll instead: screen recording, Remotion scene, "
                             "or `mk fetch` a CC-BY source you have cleared"})
        return
    emit({"ok": True, "query": q, "files": files, "dir": str(d), "licence": "CC0-ish, attribution appreciated"})


def main():
    ap = argparse.ArgumentParser(prog="mk")
    sub = ap.add_subparsers(dest="cmd", required=True)

    f = sub.add_parser("fetch"); f.add_argument("url"); f.add_argument("-o", "--outdir")
    f.add_argument("--audio", action="store_true")
    f.add_argument("--clip", nargs=2, metavar=("START", "END"))
    f.add_argument("--max-height", type=int, default=1080)
    f.add_argument("--subs", default=None, metavar="LANGS", help="e.g. en,fr")
    f.add_argument("--cookies", default=None, choices=["chrome", "firefox", "edge", "brave", "safari"])
    f.set_defaults(fn=cmd_fetch)

    m = sub.add_parser("music"); m.add_argument("query"); m.add_argument("-o", "--outdir")
    m.set_defaults(fn=cmd_music)

    s = sub.add_parser("sfx"); s.add_argument("query", nargs="+"); s.add_argument("-n", type=int, default=5)
    s.add_argument("-o", "--outdir"); s.set_defaults(fn=cmd_sfx)

    g = sub.add_parser("gif"); g.add_argument("query", nargs="+"); g.add_argument("-n", type=int, default=5)
    g.add_argument("-o", "--outdir"); g.set_defaults(fn=cmd_gif)

    st = sub.add_parser("stock"); st.add_argument("query", nargs="+"); st.add_argument("-n", type=int, default=5)
    st.add_argument("-o", "--outdir"); st.set_defaults(fn=cmd_stock)

    a = ap.parse_args()
    try:
        a.fn(a)
    except Unreachable as exc:
        emit({"ok": False, "error": str(exc),
              "next": "the source blocked or timed out — try another source, or fetch the "
                      "asset through your browser tool and drop it in the project folder"})
        sys.exit(0)


if __name__ == "__main__":
    main()
