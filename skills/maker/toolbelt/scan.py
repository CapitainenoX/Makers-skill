#!/usr/bin/env python3
"""mk probe | scan | transcribe | thumb — look at the creator's rushes.

`mk scan` is how the agent actually *watches* footage without burning tokens:
it returns a compact JSON index (cuts, motion, loudness, silence, black frames)
plus a contact-sheet PNG per file. The agent then opens that one PNG with its
image reader instead of streaming thousands of frames through the context.
"""
from __future__ import annotations

import argparse, math, re
from pathlib import Path

from _common import (die, emit, ffmpeg, ffprobe_json, home, run, safe_path,
                     slugify, which)

VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".mts", ".mpg", ".wmv"}
AUDIO_EXT = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".gif"}


def _fps(stream: dict) -> float:
    try:
        n, d = stream.get("r_frame_rate", "0/1").split("/")
        return round(float(n) / float(d), 3) if float(d) else 0.0
    except (ValueError, ZeroDivisionError):
        return 0.0


def summarize(path: Path) -> dict:
    info = ffprobe_json(path)
    fmt = info.get("format", {})
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), None)
    out = {
        "file": str(path), "name": path.name,
        "size_mb": round(int(fmt.get("size", 0)) / 1e6, 2),
        "duration_s": round(float(fmt.get("duration", 0) or 0), 2),
        "kind": "video" if v and path.suffix.lower() not in IMAGE_EXT else
                "image" if path.suffix.lower() in IMAGE_EXT else "audio",
    }
    if v:
        out["video"] = {"codec": v.get("codec_name"), "w": v.get("width"), "h": v.get("height"),
                        "fps": _fps(v), "pix_fmt": v.get("pix_fmt"),
                        "orientation": "vertical" if (v.get("height", 0) or 0) > (v.get("width", 0) or 0)
                                       else "horizontal"}
    out["audio"] = ({"codec": a.get("codec_name"), "channels": a.get("channels"),
                     "sample_rate": a.get("sample_rate")} if a else None)
    return out


def _null_run(args: list[str], timeout: int = 900) -> str:
    exe = which("ffmpeg") or die("ffmpeg required")
    p = run([exe, "-hide_banner", "-nostdin", *args, "-f", "null", "-"],
            timeout=timeout, check=False, quiet=True)
    return (p.stderr or "") + (p.stdout or "")


def scene_cuts(path: Path, threshold: float = 0.28, limit: int = 120) -> list[float]:
    log = _null_run(["-i", str(path), "-filter:v",
                     f"select='gt(scene,{threshold})',showinfo", "-an"])
    hits = [round(float(m), 2) for m in re.findall(r"pts_time:([\d.]+)", log)]
    return hits[:limit]


def loudness(path: Path) -> dict:
    log = _null_run(["-i", str(path), "-filter:a", "ebur128=peak=true", "-vn"])
    tail = log[-2500:]
    def grab(label):
        m = re.search(rf"{label}:\s*(-?[\d.]+)", tail)
        return float(m.group(1)) if m else None
    return {"integrated_lufs": grab("I"), "lra": grab("LRA"), "true_peak_db": grab("Peak")}


def events(path: Path) -> dict:
    log = _null_run(["-i", str(path), "-filter:v", "blackdetect=d=0.35:pic_th=0.98,"
                     "freezedetect=n=-60dB:d=1.2", "-filter:a",
                     "silencedetect=n=-34dB:d=0.7", "-map", "0"])
    return {
        "black": [round(float(x), 2) for x in re.findall(r"black_start:([\d.]+)", log)][:20],
        "frozen": [round(float(x), 2) for x in re.findall(r"freeze_start:\s*([\d.]+)", log)][:20],
        "silence": [round(float(x), 2) for x in re.findall(r"silence_start:\s*(-?[\d.]+)", log)][:30],
    }


def contact_sheet(path: Path, dest: Path, dur: float, cols: int = 4, rows: int = 3) -> Path | None:
    n = cols * rows
    if dur <= 0:
        return None
    dest.parent.mkdir(parents=True, exist_ok=True)
    step = max(0.2, dur / (n + 1))
    ffmpeg(["-i", str(path), "-vf",
            f"fps=1/{step:.4f},scale=320:-2,drawbox=x=0:y=0:w=iw:h=2:color=black@0.4:t=fill,"
            f"tile={cols}x{rows}", "-frames:v", "1", str(dest)], quiet=True)
    return dest if dest.exists() else None


def cmd_probe(a):
    emit(summarize(safe_path(a.path, must_exist=True)))


def cmd_scan(a):
    root = safe_path(a.path, must_exist=True)
    files = ([root] if root.is_file()
             else sorted(p for p in root.rglob("*")
                         if p.suffix.lower() in VIDEO_EXT | AUDIO_EXT | IMAGE_EXT))
    if not files:
        die(f"no media found in {root}")
    sheets_dir = safe_path(home() / "cache" / "sheets", write=True)
    index, notes = [], []
    for f in files[: a.limit]:
        rec = summarize(f)
        if rec["kind"] == "video":
            dur = rec["duration_s"]
            rec["cuts"] = scene_cuts(f) if a.deep or dur <= 600 else []
            rec["shot_count"] = len(rec["cuts"]) + 1
            rec["avg_shot_s"] = round(dur / max(1, rec["shot_count"]), 2) if dur else None
            if rec.get("audio"):
                rec["loudness"] = loudness(f)
            rec["events"] = events(f) if a.deep else {}
            sheet = contact_sheet(f, sheets_dir / f"{slugify(f.stem)}.png", dur)
            rec["contact_sheet"] = str(sheet) if sheet else None
            if rec["video"]["orientation"] == "horizontal":
                notes.append(f"{f.name}: horizontal source — reframe or blur-pad for vertical output")
            if rec.get("loudness", {}).get("integrated_lufs") is not None and \
               rec["loudness"]["integrated_lufs"] < -30:
                notes.append(f"{f.name}: very quiet ({rec['loudness']['integrated_lufs']} LUFS)")
        elif rec["kind"] == "audio":
            rec["loudness"] = loudness(f)
        index.append(rec)

    total = round(sum(r["duration_s"] for r in index), 1)
    emit({"root": str(root), "files": len(index), "total_duration_s": total,
          "usable_minutes": round(total / 60, 1), "notes": notes, "index": index,
          "next": "open each contact_sheet PNG with your image reader, then pick in/out points"})


def cmd_transcribe(a):
    src = safe_path(a.path, must_exist=True)
    out = safe_path(a.output or (home() / "transcripts" / f"{slugify(src.stem)}.srt"), write=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    if which("whisper"):
        run(["whisper", str(src), "--model", a.model, "--output_format", "srt",
             "--output_dir", str(out.parent), "--task", "transcribe"] +
            (["--language", a.language] if a.language else []), timeout=3600)
        produced = out.parent / f"{src.stem}.srt"
        if produced.exists() and produced != out:
            produced.replace(out)
    else:
        try:
            from faster_whisper import WhisperModel  # noqa
        except ImportError:
            die("no transcriber. Install one: pipx install openai-whisper  |  "
                "pip install faster-whisper")
        from faster_whisper import WhisperModel
        model = WhisperModel(a.model, device="auto", compute_type="int8")
        segs, _ = model.transcribe(str(src), language=a.language, vad_filter=True)

        def stamp(t):
            h, rem = divmod(t, 3600); m, s = divmod(rem, 60)
            return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(s%1*1000):03d}"
        lines = []
        for i, seg in enumerate(segs, 1):
            lines += [str(i), f"{stamp(seg.start)} --> {stamp(seg.end)}", seg.text.strip(), ""]
        out.write_text("\n".join(lines), encoding="utf-8")
    emit({"ok": True, "srt": str(out),
          "next": f"mk subs {out} -o <project>/subs/captions.ass --style bold"})


def cmd_thumb(a):
    src = safe_path(a.path, must_exist=True)
    out = safe_path(a.output, write=True)
    ffmpeg(["-ss", f"{a.at:.3f}", "-i", str(src), "-frames:v", "1",
            "-vf", "scale=1280:-2", str(out)], quiet=True)
    emit({"ok": True, "output": str(out), "at_s": a.at})


def main():
    ap = argparse.ArgumentParser(prog="mk")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("probe"); p.add_argument("path"); p.set_defaults(fn=cmd_probe)

    s = sub.add_parser("scan"); s.add_argument("path")
    s.add_argument("--deep", action="store_true", help="also detect black/frozen/silent regions")
    s.add_argument("--limit", type=int, default=40); s.set_defaults(fn=cmd_scan)

    t = sub.add_parser("transcribe"); t.add_argument("path")
    t.add_argument("-o", "--output"); t.add_argument("--model", default="small")
    t.add_argument("--language", default=None); t.add_argument("--srt", action="store_true")
    t.set_defaults(fn=cmd_transcribe)

    th = sub.add_parser("thumb"); th.add_argument("path"); th.add_argument("output")
    th.add_argument("--at", type=float, default=1.5); th.set_defaults(fn=cmd_thumb)

    a = ap.parse_args(); a.fn(a)


if __name__ == "__main__":
    main()
