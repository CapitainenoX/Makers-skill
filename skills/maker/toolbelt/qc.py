#!/usr/bin/env python3
"""mk qc — the gate between 'rendered' and 'delivered'.

Checks the things that actually get a video rejected or skipped: wrong canvas,
loudness off spec, a dead first second, shots that drag, clipping, black frames,
silence. Returns a verdict plus the specific fix for each failure — never a bare
score. Nothing here is subjective; taste is the agent's job, this is the floor.
"""
from __future__ import annotations

import argparse, re
from pathlib import Path

from _common import die, emit, ffprobe_json, run, safe_path, which

TARGETS = {
    "shorts":  {"w": 1080, "h": 1920, "lufs": (-16, -12), "max_s": 60,   "max_shot": 2.6, "min_fps": 30},
    "reel":    {"w": 1080, "h": 1920, "lufs": (-16, -12), "max_s": 90,   "max_shot": 2.6, "min_fps": 30},
    "tiktok":  {"w": 1080, "h": 1920, "lufs": (-16, -12), "max_s": 180,  "max_shot": 2.6, "min_fps": 30},
    "youtube": {"w": 1920, "h": 1080, "lufs": (-16, -13), "max_s": 3600, "max_shot": 4.5, "min_fps": 24},
    "yt4k":    {"w": 3840, "h": 2160, "lufs": (-16, -13), "max_s": 3600, "max_shot": 4.5, "min_fps": 24},
}


def null_log(args: list[str]) -> str:
    exe = which("ffmpeg") or die("ffmpeg required")
    p = run([exe, "-hide_banner", "-nostdin", *args, "-f", "null", "-"],
            timeout=1800, check=False, quiet=True)
    return (p.stderr or "") + (p.stdout or "")


def main():
    ap = argparse.ArgumentParser(prog="mk qc")
    ap.add_argument("file")
    ap.add_argument("--target", default="shorts", choices=TARGETS)
    a = ap.parse_args()

    f = safe_path(a.file, must_exist=True)
    T = TARGETS[a.target]
    info = ffprobe_json(f)
    fmt = info.get("format", {})
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), None)
    au = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), None)
    if not v:
        die(f"{f.name} has no video stream")

    dur = float(fmt.get("duration", 0) or 0)
    try:
        n, d = v.get("r_frame_rate", "0/1").split("/"); fps = float(n) / float(d)
    except (ValueError, ZeroDivisionError):
        fps = 0.0

    log = null_log(["-i", str(f), "-filter:v",
                    "select='gt(scene,0.28)',showinfo,blackdetect=d=0.25:pic_th=0.98", "-an"])
    cuts = [float(x) for x in re.findall(r"pts_time:([\d.]+)", log)]
    blacks = [float(x) for x in re.findall(r"black_start:([\d.]+)", log)]
    shots = len(cuts) + 1
    avg_shot = round(dur / max(1, shots), 2) if dur else 0

    loud = {}
    if au:
        alog = null_log(["-i", str(f), "-filter:a", "ebur128=peak=true", "-vn"])[-2500:]
        for label, key in (("I", "lufs"), ("LRA", "lra"), ("Peak", "true_peak")):
            m = re.search(rf"{label}:\s*(-?[\d.]+)", alog)
            loud[key] = float(m.group(1)) if m else None
        slog = null_log(["-i", str(f), "-filter:a", "silencedetect=n=-45dB:d=1.0", "-vn"])
        loud["silence_starts"] = [round(float(x), 2) for x in
                                  re.findall(r"silence_start:\s*(-?[\d.]+)", slog)][:10]

    fails, warns = [], []
    if (v.get("width"), v.get("height")) != (T["w"], T["h"]):
        warns.append(f"canvas {v.get('width')}x{v.get('height')} != {T['w']}x{T['h']} for "
                     f"{a.target} — re-render with the right preset unless this is deliberate")
    if fps < T["min_fps"]:
        fails.append(f"{fps:.2f} fps is below {T['min_fps']} — motion will judder")
    if dur > T["max_s"]:
        fails.append(f"{dur:.1f}s exceeds the {T['max_s']}s limit for {a.target}")
    if not au:
        fails.append("no audio stream — the video is silent")
    else:
        lo, hi = T["lufs"]
        if loud.get("lufs") is None:
            warns.append("could not measure loudness")
        elif not (lo <= loud["lufs"] <= hi):
            fails.append(f"{loud['lufs']} LUFS is outside {lo}..{hi} — re-run the mix with "
                         f"loudnorm=I={(lo+hi)//2}")
        if (loud.get("true_peak") or -99) > -0.5:
            fails.append(f"true peak {loud['true_peak']} dBTP will clip on playback — add alimiter")
        if any(s < 1.0 for s in loud.get("silence_starts", [])):
            fails.append("silent opening — the first second must carry sound")
    if avg_shot > T["max_shot"]:
        fails.append(f"average shot {avg_shot}s > {T['max_shot']}s — the edit drags. Cut more, "
                     f"or add motion to the long shots")
    if cuts and cuts[0] > 2.0:
        warns.append(f"first cut lands at {cuts[0]:.1f}s — hooks work better with a change "
                     f"inside the first 1.5s")
    if any(b < 0.5 for b in blacks):
        fails.append("starts on black frames — viewers read that as a dead video")
    if blacks:
        warns.append(f"black frames at {blacks[:5]}")

    verdict = "PASS" if not fails else ("FIX" if len(fails) <= 2 else "REWORK")
    emit({
        "file": str(f), "target": a.target, "verdict": verdict,
        "measured": {"duration_s": round(dur, 2), "canvas": f"{v.get('width')}x{v.get('height')}",
                     "fps": round(fps, 2), "shots": shots, "avg_shot_s": avg_shot,
                     "size_mb": round(int(fmt.get("size", 0)) / 1e6, 2), **loud},
        "must_fix": fails, "consider": warns,
        "next": "deliver it" if verdict == "PASS" else "apply the must_fix list, re-render, re-run mk qc",
    })


if __name__ == "__main__":
    main()
