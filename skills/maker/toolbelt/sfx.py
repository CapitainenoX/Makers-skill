#!/usr/bin/env python3
"""mk sfx gen — sound design synthesised on the spot.

A short needs six or seven one-shots: a whoosh on the cut, a pop on the card, a tick on
the list item, an impact on the payoff. Downloading them means an API key, a licence to
check and a file to ship. Synthesising them with ffmpeg means none of that, they are
tuned to the edit, and they are free of any claim.

Each kind is a real recipe (noise shaped by a filter sweep, a detuned sine with a pitch
envelope), not a beep.
"""
from __future__ import annotations

import argparse, math
from pathlib import Path

from _common import die, emit, ffmpeg, home, run, safe_path, which

SR = 48000

# kind -> (duration s, lavfi source, filter chain). `V` is substituted with the gain.
RECIPES: dict[str, tuple[float, str, str]] = {
    # air moving past the camera: filtered noise with a rising then falling band
    "whoosh": (0.55, f"anoisesrc=c=pink:r={SR}:d=0.55",
               "highpass=f=300,lowpass=f=6000,"
               "afade=t=in:st=0:d=0.18:curve=qsin,afade=t=out:st=0.28:d=0.27:curve=exp,"
               "aecho=0.8:0.6:24:0.22"),
    # the same, reversed: pulls the eye toward the cut instead of away
    "swoosh": (0.45, f"anoisesrc=c=white:r={SR}:d=0.45",
               "highpass=f=700,lowpass=f=9000,"
               "afade=t=in:st=0:d=0.32:curve=exp,afade=t=out:st=0.36:d=0.09"),
    # a card landing: short sine blip with a fast pitch drop
    "pop": (0.16, f"sine=frequency=880:r={SR}:d=0.16",
            "vibrato=f=32:d=0.6,afade=t=out:st=0.02:d=0.14:curve=exp,highpass=f=200"),
    # UI tick for list items and captions
    "click": (0.07, f"anoisesrc=c=white:r={SR}:d=0.07",
              "highpass=f=2200,lowpass=f=9000,afade=t=out:st=0.004:d=0.066:curve=exp"),
    # the payoff: low body plus a noise transient
    "impact": (0.9, f"sine=frequency=62:r={SR}:d=0.9",
               "afade=t=out:st=0.05:d=0.85:curve=exp,"
               "aecho=0.9:0.8:60:0.28,lowpass=f=900"),
    # tension into a reveal
    "riser": (1.6, f"anoisesrc=c=pink:r={SR}:d=1.6",
              "highpass=f=200,lowpass=f=12000,"
              "afade=t=in:st=0:d=1.5:curve=exp,tremolo=f=9:d=0.35"),
    # a soft mark for an on-screen highlight
    "swipe": (0.3, f"anoisesrc=c=brown:r={SR}:d=0.3",
              "highpass=f=900,lowpass=f=7000,afade=t=in:st=0:d=0.06,"
              "afade=t=out:st=0.1:d=0.2:curve=exp"),
    # counter / number ticking up
    "tick": (0.05, f"sine=frequency=1600:r={SR}:d=0.05",
             "afade=t=out:st=0.002:d=0.048:curve=exp"),
}

PACK = ["whoosh", "swoosh", "pop", "click", "impact", "riser", "swipe", "tick"]


# Every one-shot leaves at the same peak, so the gains in a mix spec mean the same thing
# for a click as for an impact. Without this, raw recipe output ranged over 20 dB.
TARGET_PEAK_DB = -3.0


def peak_db(path: Path) -> float:
    exe = which("ffmpeg") or die("ffmpeg required")
    p = run([exe, "-hide_banner", "-nostdin", "-i", str(path), "-af", "volumedetect",
             "-f", "null", "-"], timeout=120, check=False, quiet=True)
    import re as _re
    m = _re.search(r"max_volume:\s*(-?[\d.]+) dB", (p.stderr or "") + (p.stdout or ""))
    return float(m.group(1)) if m else 0.0


def render(kind: str, out: Path, gain_db: float) -> Path:
    if kind not in RECIPES:
        die(f"unknown sfx {kind!r}. Available: {', '.join(sorted(RECIPES))}")
    dur, source, chain = RECIPES[kind]
    out.parent.mkdir(parents=True, exist_ok=True)
    raw = out.with_suffix(".raw.wav")
    ffmpeg(["-f", "lavfi", "-i", source, "-af", chain, "-t", f"{dur:.3f}",
            "-c:a", "pcm_s16le", str(raw)], quiet=True)
    trim = TARGET_PEAK_DB - peak_db(raw) + gain_db
    ffmpeg(["-i", str(raw), "-af",
            f"volume={trim:.2f}dB,alimiter=limit=0.94,"
            f"aformat=sample_fmts=s16:sample_rates={SR}:channel_layouts=stereo",
            "-c:a", "pcm_s16le", str(out)], quiet=True)
    raw.unlink(missing_ok=True)
    return out


def cmd_gen(a):
    d = safe_path(a.outdir, write=True) if a.outdir else safe_path(home() / "sfx", write=True)
    kinds = PACK if a.all else a.kinds
    if not kinds:
        die("name a kind, or pass --all. Available: " + ", ".join(sorted(RECIPES)))
    made = []
    for k in kinds:
        p = render(k, d / f"{k}.wav", a.gain)
        made.append({"kind": k, "path": str(p), "duration_s": RECIPES[k][0]})
    emit({"ok": True, "dir": str(d), "sfx": made,
          "placement": "put the one-shot 40-80 ms BEFORE the cut it punctuates — the ear "
                       "leads the eye, and landing them together already feels late",
          "levels": "whoosh/swoosh -8 dB, pop/click -14 dB, impact -5 dB, riser -10 dB",
          "next": "reference them from the mix spec: mk mix <video> <audio.json> -o out.mp4"})


def cmd_list(a):
    emit({"kinds": {k: {"duration_s": v[0]} for k, v in sorted(RECIPES.items())},
          "pack": PACK,
          "note": "synthesised with ffmpeg — no API key, no licence to clear, no attribution"})


def main():
    ap = argparse.ArgumentParser(prog="mk sfx")
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("gen"); g.add_argument("kinds", nargs="*")
    g.add_argument("--all", action="store_true"); g.add_argument("-o", "--outdir")
    g.add_argument("--gain", type=float, default=0.0); g.set_defaults(fn=cmd_gen)
    l = sub.add_parser("list"); l.set_defaults(fn=cmd_list)
    a = ap.parse_args(); a.fn(a)


if __name__ == "__main__":
    main()
