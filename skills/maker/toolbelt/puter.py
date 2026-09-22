#!/usr/bin/env python3
"""mk puter — free narration through Puter's driver API.

Puter fronts AWS Polly, OpenAI, ElevenLabs, Gemini and xAI voices on a user-pays model,
so a creator gets real neural narration without holding any provider's API key. That
matters here: a short with no voice is the single biggest retention leak, and asking a
creator to buy an ElevenLabs plan just to test the idea is a bad trade.

The JS SDK is browser-only, but it is a thin wrapper over one REST endpoint:

    POST https://api.puter.com/drivers/call
    Authorization: Bearer <token>
    {"interface":"puter-tts","driver":"aws-polly","method":"synthesize","args":{...}}

so this talks to that directly — no browser, no headless Chromium, no page to keep alive.

Token: export PUTER_AUTH_TOKEN. Sign in once at puter.com, then in the browser console
run `puter.auth.getToken()` (or copy it from the dashboard) and export it. It is read from
the environment only and never written to disk.
"""
from __future__ import annotations

import argparse, json, os, re, urllib.error, urllib.request
from pathlib import Path

from _common import die, emit, ffmpeg, home, run, safe_path, slugify, which

ENDPOINT = "https://api.puter.com/drivers/call"
MAX_CHARS = 3000          # the API rejects anything longer, per the SDK

PROVIDERS = ["aws-polly", "openai", "elevenlabs", "gemini", "xai", "speechify"]
# A few known-good defaults so a caller does not have to look anything up.
DEFAULT_VOICE = {"aws-polly": "Joanna", "openai": "nova", "elevenlabs": None,
                 "gemini": None, "xai": None, "speechify": None}


def token() -> str:
    t = os.environ.get("PUTER_AUTH_TOKEN", "").strip()
    if not t:
        die("no PUTER_AUTH_TOKEN in the environment.\n"
            "  1. sign in at https://puter.com\n"
            "  2. in the browser console: puter.auth.getToken()\n"
            "  3. export PUTER_AUTH_TOKEN=...\n"
            "Never write it into a file the repo tracks.\n"
            "Alternatives that need no token: mk tts --engine edge-tts | kokoro | piper")
    return t


def call(interface: str, driver: str, method: str, args: dict,
         timeout: int = 180) -> tuple[bytes, str]:
    """Returns (body, content-type). Audio comes back as bytes, lists as JSON text."""
    payload = json.dumps({"interface": interface, "driver": driver,
                          "method": method, "args": args}).encode()
    req = urllib.request.Request(ENDPOINT, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token()}",
        "User-Agent": "MakerSkill/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(40 * 1024 * 1024), r.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        body = e.read(4000).decode("utf-8", "replace")
        code = ""
        try:
            code = json.loads(body).get("code", "")
        except ValueError:
            pass
        if e.code == 401:
            die("Puter rejected the token (%s). Get a fresh one: sign in at puter.com, "
                "then `puter.auth.getToken()` in the console." % (code or "401"))
        if e.code == 402 or code in ("insufficient_funds", "no_credits"):
            die("Puter says the account is out of credit. Top up at puter.com, or use a "
                "local engine: mk tts --engine kokoro | piper | edge-tts")
        die(f"Puter returned HTTP {e.code} ({code or 'no code'}): {body[:300]}")
    except Exception as exc:
        die(f"Puter unreachable: {type(exc).__name__}: {exc}")


def chunks(text: str, limit: int = MAX_CHARS) -> list[str]:
    """Split on sentence ends so a seam never lands mid-word."""
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return [text]
    out, buf = [], ""
    for part in re.split(r"(?<=[.!?…])\s+", text):
        while len(part) > limit:                   # a single monstrous sentence
            out.append(part[:limit])
            part = part[limit:]
        if len(buf) + len(part) + 1 > limit:
            out.append(buf.strip())
            buf = part
        else:
            buf = f"{buf} {part}".strip()
    if buf:
        out.append(buf)
    return [c for c in out if c]


def cmd_say(a):
    out = safe_path(a.output, write=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    text = a.text
    if text in (None, "-"):
        import sys
        text = sys.stdin.read()
    text = (text or "").strip()
    if not text:
        die("no text to speak")

    voice = a.voice or DEFAULT_VOICE.get(a.provider)
    parts = chunks(text)
    cache = safe_path(home() / "cache" / "puter", write=True)
    cache.mkdir(parents=True, exist_ok=True)
    pieces = []
    for i, part in enumerate(parts):
        args = {"text": part}
        if voice:
            args["voice"] = voice
        if a.engine:
            args["engine"] = a.engine
        if a.language:
            args["language"] = a.language
        body, ctype = call("puter-tts", a.provider, "synthesize", args)
        if b"error" in body[:60] and "json" in ctype:
            die(f"Puter returned an error for chunk {i}: {body[:200].decode('utf-8','replace')}")
        p = cache / f"part{i:03d}.mp3"
        p.write_bytes(body)
        pieces.append(p)

    raw = cache / "joined.mp3"
    if len(pieces) == 1:
        raw.write_bytes(pieces[0].read_bytes())
    else:
        lst = cache / "concat.txt"
        lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in pieces),
                       encoding="utf-8")
        ffmpeg(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(raw)],
               quiet=True)

    # Same levelling as every other engine, so the mix behaves identically.
    ffmpeg(["-i", str(raw), "-af",
            f"loudnorm=I={a.lufs}:TP=-1.5:LRA=9,"
            "aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=mono",
            "-c:a", "pcm_s16le", str(out.with_suffix(".wav"))], quiet=True)
    for p in pieces:
        p.unlink(missing_ok=True)

    final = out.with_suffix(".wav")
    emit({"ok": True, "output": str(final), "provider": a.provider, "voice": voice,
          "engine": a.engine, "chunks": len(parts), "chars": len(text), "lufs": a.lufs,
          "next": "mk mix <video> -o out.mp4 --voice %s --from-deck <deck>" % final})


def cmd_voices(a):
    body, _ = call("puter-tts", a.provider, "list_voices",
                   {"engine": a.engine} if a.engine else {})
    try:
        data = json.loads(body.decode("utf-8", "replace"))
    except ValueError:
        data = body.decode("utf-8", "replace")[:2000]
    emit({"provider": a.provider, "engine": a.engine, "voices": data})


def cmd_engines(a):
    body, _ = call("puter-tts", a.provider, "list_engines", {})
    try:
        data = json.loads(body.decode("utf-8", "replace"))
    except ValueError:
        data = body.decode("utf-8", "replace")[:2000]
    emit({"provider": a.provider, "engines": data})


def main():
    ap = argparse.ArgumentParser(prog="mk puter")
    ap.add_argument("--provider", default="aws-polly", choices=PROVIDERS)
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("say"); s.add_argument("text", nargs="?")
    s.add_argument("-o", "--output", required=True)
    s.add_argument("--voice"); s.add_argument("--engine", default="neural")
    s.add_argument("--language", default="en-US")
    s.add_argument("--lufs", type=float, default=-16.0); s.set_defaults(fn=cmd_say)

    v = sub.add_parser("voices"); v.add_argument("--engine"); v.set_defaults(fn=cmd_voices)
    e = sub.add_parser("engines"); e.set_defaults(fn=cmd_engines)

    a = ap.parse_args(); a.fn(a)


if __name__ == "__main__":
    main()
