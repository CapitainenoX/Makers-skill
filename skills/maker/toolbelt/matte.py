#!/usr/bin/env python3
"""mk bgremove — cut a subject out of an image or a video.

Two roads, picked on evidence rather than hope:
  chroma  a real green/blue screen -> ffmpeg chromakey. Instant, frame-exact.
  ai      no screen -> rembg per frame. Correct but slow, so it is bounded and
          the cost is reported up front rather than discovered at frame 4000.
Output carries real alpha: WebM/VP9 (yuva420p) by default, ProRes 4444 for NLEs.
"""
from __future__ import annotations

import argparse, json, shutil, sys
from pathlib import Path

from _common import (die, emit, ffmpeg, ffprobe_json, run, safe_path, which)

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
MAX_AI_FRAMES = 1800          # ~60s at 30fps; beyond that, ask before burning the time


def dominant_screen(path: Path) -> str | None:
    """Sample a frame and look for a saturated green or blue wall."""
    out = run([which("ffmpeg"), "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
               "-i", str(path), "-frames:v", "1", "-vf", "scale=64:36,format=rgb24",
               "-f", "rawvideo", "-"], timeout=120, check=False, quiet=True)
    data = out.stdout.encode("latin-1", "ignore") if isinstance(out.stdout, str) else (out.stdout or b"")
    if len(data) < 64 * 36 * 3:
        return None
    px = [data[i:i + 3] for i in range(0, 64 * 36 * 3, 3)]
    green = sum(1 for r, g, b in px if g > 90 and g > r * 1.5 and g > b * 1.4)
    blue = sum(1 for r, g, b in px if b > 90 and b > r * 1.5 and b > g * 1.3)
    if green / len(px) > 0.28:
        return "0x00B140"
    if blue / len(px) > 0.28:
        return "0x0047BB"
    return None


def encode_args(fmt: str) -> list[str]:
    if fmt == "prores":
        return ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le"]
    return ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28",
            "-row-mt", "1"]


def main():
    ap = argparse.ArgumentParser(prog="mk bgremove")
    ap.add_argument("input"); ap.add_argument("output")
    ap.add_argument("--mode", default="auto", choices=["auto", "chroma", "ai"])
    ap.add_argument("--key", default=None, help="chroma colour, e.g. 0x00B140")
    ap.add_argument("--similarity", type=float, default=0.16)
    ap.add_argument("--blend", type=float, default=0.04)
    ap.add_argument("--format", default="webm", choices=["webm", "prores", "png"])
    ap.add_argument("--model", default="u2net", help="rembg model (u2net, isnet-general-use, u2net_human_seg)")
    ap.add_argument("--yes", action="store_true", help="skip the long-render confirmation")
    a = ap.parse_args()

    src = safe_path(a.input, must_exist=True)
    out = safe_path(a.output, write=True)
    out.parent.mkdir(parents=True, exist_ok=True)

    # ---- still image -------------------------------------------------------
    if src.suffix.lower() in IMAGE_EXT:
        if which("rembg"):
            run(["rembg", "i", "-m", a.model, str(src), str(out)], timeout=900)
        elif which("npx"):
            run(["npx", "--yes", "@imgly/background-removal-node", str(src), str(out)], timeout=1200)
        else:
            die("no image matting tool. Install one:\n"
                "  pip install 'rembg[cli]'            (local, offline after first model download)\n"
                "  npm i -g @imgly/background-removal-node")
        emit({"ok": True, "output": str(out), "mode": "ai-image", "model": a.model})
        return

    # ---- video -------------------------------------------------------------
    info = ffprobe_json(src)
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    dur = float(info.get("format", {}).get("duration", 0) or 0)
    fps = 30.0
    try:
        n, d = v.get("r_frame_rate", "30/1").split("/"); fps = float(n) / float(d)
    except (ValueError, ZeroDivisionError):
        pass
    frames = int(dur * fps)

    key = a.key or (dominant_screen(src) if a.mode in ("auto", "chroma") else None)
    mode = a.mode if a.mode != "auto" else ("chroma" if key else "ai")

    if mode == "chroma":
        if not key:
            die("no green/blue screen detected. Use --mode ai, or pass --key 0xRRGGBB.")
        vf = (f"chromakey={key}:{a.similarity}:{a.blend},"
              "despill=type=green:mix=0.5:expand=0.3,format=yuva420p")
        ffmpeg(["-i", str(src), "-vf", vf, *encode_args(a.format), "-an", str(out)],
               timeout=3600)
        emit({"ok": True, "output": str(out), "mode": "chroma", "key": key,
              "tip": "raise --similarity if edges keep background, lower it if the subject erodes"})
        return

    if not which("rembg"):
        die("AI matting needs rembg: pip install 'rembg[cli]'\n"
            "Alternatives: shoot against a green screen (then --mode chroma), or use the "
            "NLE's own matting if its MCP exposes one.")
    est_min = round(frames * 0.12 / 60, 1)
    if frames > MAX_AI_FRAMES and not a.yes:
        emit({"ok": False, "mode": "ai", "frames": frames,
              "estimated_minutes": est_min,
              "blocked": f"{frames} frames is a long AI matte",
              "next": ["trim the clip first (mk assemble handles in/out), then matte",
                       f"or re-run with --yes to accept roughly {est_min} min of compute"]})
        return

    work = out.parent / f".matte_{src.stem}"
    (work / "in").mkdir(parents=True, exist_ok=True)
    (work / "out").mkdir(parents=True, exist_ok=True)
    try:
        ffmpeg(["-i", str(src), "-vsync", "0", str(work / "in" / "%06d.png")], timeout=3600)
        run(["rembg", "p", "-m", a.model, str(work / "in"), str(work / "out")], timeout=7200)
        ffmpeg(["-framerate", f"{fps:.4f}", "-i", str(work / "out" / "%06d.png"),
                *encode_args(a.format), "-an", str(out)], timeout=3600)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    emit({"ok": True, "output": str(out), "mode": "ai", "model": a.model, "frames": frames,
          "note": "composite it with an image layer in the EDL, or import as an alpha clip in the NLE"})


if __name__ == "__main__":
    main()
