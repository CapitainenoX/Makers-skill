#!/usr/bin/env python3
"""mk mix — put sound on a silent render.

A Remotion render has no audio track at all. This bolts one on using the same mixer the
ffmpeg editor uses: voice on top, music sidechain-ducked underneath, one-shots on the
cuts, the whole thing limited and loudness-normalised.

`--from-deck` reads the deck's own scene boundaries and places the one-shots for you, so
a video gets sound design without anyone hand-timing twenty events.
"""
from __future__ import annotations

import argparse, json, shutil
from pathlib import Path

import edl
from _common import (die, emit, ffmpeg, ffprobe_json, home, read_json, run,
                     safe_path, which, write_json)
from sfx import PACK, render as render_sfx

# Which one-shot suits which scene type, and how loud it sits.
SCENE_SFX = {
    "textStack": ("swoosh", -13), "chips": ("pop", -12), "diagram": ("swipe", -12),
    "flow": ("click", -14), "mock": ("pop", -12), "card": ("whoosh", -10),
    "media": ("whoosh", -10), "tiles": ("pop", -11), "annotate": ("click", -13),
    "marquee": ("swoosh", -13), "quote": ("swipe", -14), "progress": ("click", -14),
    "stat": ("impact", -8), "compare": ("swoosh", -12), "bullets": ("click", -14),
    "code": ("click", -14), "pill": ("pop", -11), "logoList": ("pop", -12),
    "outro": ("impact", -9), "cta": ("impact", -8),
}


def loudnorm_2pass(src: Path, dst: Path, target_lufs: float) -> dict:
    """Measure, then correct. Single-pass loudnorm guesses from a look-ahead window and
    lands several dB off on sparse material — a graphics edit is mostly quiet with short
    one-shots, which is exactly the case it gets wrong."""
    exe = which("ffmpeg") or die("ffmpeg required")
    probe = run([exe, "-hide_banner", "-nostdin", "-i", str(src), "-af",
                 f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
                 "-f", "null", "-"], timeout=900, check=False, quiet=True)
    blob = (probe.stderr or "") + (probe.stdout or "")
    start = blob.rfind("{")
    stats = {}
    if start >= 0:
        try:
            stats = json.loads(blob[start:blob.rfind("}") + 1])
        except ValueError:
            stats = {}
    af = f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11"
    if stats.get("input_i"):
        af += (f":measured_I={stats['input_i']}:measured_TP={stats['input_tp']}"
               f":measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}"
               f":offset={stats.get('target_offset', 0)}:linear=true")
    ffmpeg(["-i", str(src), "-af", af, "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
            "-ar", "48000", "-movflags", "+faststart", str(dst)], quiet=True)
    return stats


def has_audio(path: Path) -> bool:
    return any(s.get("codec_type") == "audio"
               for s in ffprobe_json(path).get("streams", []))


def duration_of(path: Path) -> float:
    try:
        return float(ffprobe_json(path)["format"]["duration"])
    except (KeyError, TypeError, ValueError):
        return 0.0


def scene_starts(deck: dict) -> list[tuple[float, str]]:
    """(start seconds, scene type) honouring fade overlaps, as the renderer lays them out."""
    fps = deck.get("fps", 30)
    at, out = 0, []
    for i, s in enumerate(deck.get("scenes", [])):
        f = max(1, round(float(s.get("duration", 2)) * fps))
        tr = s.get("transition") or {}
        ov = min(round(float(tr.get("duration", 0.3)) * fps), f - 1, at) \
            if i and tr.get("type") == "fade" else 0
        start = max(0, at - ov)
        at = start + f
        out.append((start / fps, str(s.get("type", ""))))
    return out


def auto_sfx(deck: dict, sfx_dir: Path, lead: float = 0.06) -> list[dict]:
    """One one-shot per cut, landing `lead` seconds early — the ear leads the eye."""
    tracks = []
    for i, (t, kind) in enumerate(scene_starts(deck)):
        name, gain = SCENE_SFX.get(kind, ("swoosh", -13))
        src = sfx_dir / f"{name}.wav"
        if not src.exists():
            render_sfx(name, src, 0.0)
        tracks.append({"type": "sfx", "src": str(src),
                       "start": max(0.0, t - (lead if i else 0.0)), "gain": gain})
    return tracks


def main():
    ap = argparse.ArgumentParser(prog="mk mix")
    ap.add_argument("video")
    ap.add_argument("spec", nargs="?", help="mix spec JSON (tracks: voice/music/sfx)")
    ap.add_argument("-o", "--output", required=True)
    ap.add_argument("--from-deck", metavar="DECK",
                    help="place one one-shot per scene cut, chosen by scene type")
    ap.add_argument("--voice", help="shorthand: a narration file at 0 dB")
    ap.add_argument("--music", help="shorthand: a bed at -19 dB, ducked under the voice")
    ap.add_argument("--music-gain", type=float, default=-19.0)
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--sfx-dir", default=None)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    video = safe_path(a.video, must_exist=True)
    out = safe_path(a.output, write=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    dur = duration_of(video)

    tracks: list[dict] = []
    if a.spec:
        spec = read_json(safe_path(a.spec, must_exist=True), {}) or {}
        tracks += spec.get("tracks") or []
    if a.voice:
        tracks.append({"type": "voice", "src": str(safe_path(a.voice, must_exist=True)),
                       "start": 0.0, "gain": 0.0})
    if a.music:
        tracks.append({"type": "music", "src": str(safe_path(a.music, must_exist=True)),
                       "start": 0.0, "gain": a.music_gain, "duck": True,
                       "fadeIn": 0.4, "fadeOut": 1.4, "duration": dur})
    if a.from_deck:
        deck = read_json(safe_path(a.from_deck, must_exist=True), {}) or {}
        sfx_dir = safe_path(a.sfx_dir, write=True) if a.sfx_dir else safe_path(home() / "sfx", write=True)
        sfx_dir.mkdir(parents=True, exist_ok=True)
        tracks += auto_sfx(deck, sfx_dir)

    if not tracks:
        die("nothing to mix. Give a spec, or --voice / --music / --from-deck.\n"
            "A silent short is the single most common reason one dies: viewers who "
            "unmute and hear nothing swipe.")

    kinds = {t.get("type") for t in tracks}
    warnings = []
    if "voice" not in kinds:
        warnings.append("no narration. Your own voice outperforms trending audio on small "
                        "channels — `mk tts` if you will not record it yourself")
    if "music" not in kinds:
        warnings.append("no music bed under the edit")

    if a.dry_run:
        emit({"ok": True, "dry_run": True, "video_s": round(dur, 2),
              "tracks": len(tracks), "kinds": sorted(k for k in kinds if k),
              "sfx_events": sum(1 for t in tracks if t.get("type") == "sfx"),
              "warnings": warnings})
        return

    cache = safe_path(home() / "cache" / "mix", write=True)
    cache.mkdir(parents=True, exist_ok=True)

    # The mixer maps [0:a]; a silent render has no such stream, so give it one first.
    base = video
    if not has_audio(video):
        base = cache / "silent.mp4"
        ffmpeg(["-i", str(video), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
                "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac",
                "-shortest", str(base)], quiet=True)

    # The mixer's own loudnorm is a first approximation; the second pass is what actually
    # lands the target, so ask it not to normalise and correct the result here.
    mixed = edl.mix_audio(base, tracks, {"lufs": a.lufs, "clip_audio_db": -60}, cache, False)
    stats = loudnorm_2pass(mixed, out, a.lufs)

    emit({"ok": True, "output": str(out), "duration_s": round(duration_of(out), 2),
          "tracks": len(tracks), "kinds": sorted(k for k in kinds if k),
          "sfx_events": sum(1 for t in tracks if t.get("type") == "sfx"),
          "lufs_target": a.lufs,
          "lufs_before": stats.get("input_i"), "warnings": warnings,
          "next": f"mk qc {out} --target shorts --graphics"})


if __name__ == "__main__":
    main()
