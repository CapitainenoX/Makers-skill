#!/usr/bin/env python3
"""mk subs — turn an SRT into styled, animated ASS captions.

Burned-in captions are not decoration: most social viewing is sound-off, and
captions that appear on the first frame measurably hold viewers. This produces
the punchy, centred, word-popped style rather than a passive grey bar.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import assbuild
from _common import emit, safe_path, die

PRESETS = {
    "bold":     dict(style="sub",     y=0.72, uppercase=False, anim="popIn"),
    "shout":    dict(style="hook",    y=0.55, uppercase=True,  anim="popIn"),
    "clean":    dict(style="caption", y=0.80, uppercase=False, anim="fadeIn"),
    "doc":      dict(style="lower",   y=0.86, uppercase=False, anim="fadeIn"),
    "centered": dict(style="sub",     y=0.50, uppercase=True,  anim="zoomIn"),
}


def main():
    ap = argparse.ArgumentParser(prog="mk subs")
    ap.add_argument("srt")
    ap.add_argument("-o", "--output", required=True)
    ap.add_argument("--style", default="bold", choices=PRESETS)
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("--font-family", default="DejaVu Sans")
    ap.add_argument("--color", default=None, help="#RRGGBB fill override")
    ap.add_argument("--y", type=float, default=None)
    a = ap.parse_args()

    src = safe_path(a.srt, must_exist=True)
    out = safe_path(a.output, write=True)
    opts = dict(PRESETS[a.style])
    if a.y is not None:
        opts["y"] = a.y
    extra = None
    if a.color:
        base = dict(assbuild.STYLES[opts["style"]]); base["fill"] = a.color
        extra = {opts["style"]: base}
        assbuild.STYLES[opts["style"]] = base
    cues = assbuild.parse_srt(src)
    if not cues:
        die(f"no cues parsed from {src}")
    assbuild.from_srt(src, a.width, a.height, out, font=a.font_family, **opts)
    emit({"ok": True, "output": str(out), "cues": len(cues),
          "span_s": round(cues[-1][1], 2), "style": a.style,
          "next": 'reference it in the EDL as "subtitles": {"src": "<this file>"}'})


if __name__ == "__main__":
    main()
