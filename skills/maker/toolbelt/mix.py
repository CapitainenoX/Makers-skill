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

import coherence
import edl
from _common import (die, emit, ffmpeg, ffprobe_json, home, read_json, run,
                     safe_path, slugify, which, write_json)
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
    "kinetic": ("impact", -9), "chapter": ("impact", -8), "split": ("swipe", -12),
    "versus": ("impact", -8), "steps": ("click", -13), "timeline": ("swoosh", -13),
    "checklist": ("click", -13), "chart": ("swoosh", -12), "orbit": ("swoosh", -13),
    "gallery": ("pop", -11), "focus": ("whoosh", -11), "beforeAfter": ("swipe", -11),
    "notify": ("pop", -11), "post": ("pop", -12),
}
# A moving transition wants the sound of its movement, whatever scene it lands on.
TRANSITION_SFX = {
    "whip": ("whoosh", -9), "push": ("swoosh", -12), "slide": ("swoosh", -12),
    "zoom": ("whoosh", -10), "panel": ("swipe", -10), "wipe": ("swipe", -12),
    "blinds": ("swipe", -12), "iris": ("swoosh", -13), "flash": ("impact", -8),
    "blur": ("swoosh", -14), "fade": ("swoosh", -15),
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


def normalise_stem(src: Path, target_lufs: float, cache: Path, tag: str) -> Path:
    """Level a stem before it reaches the mixer.

    Downloaded beds arrive anywhere from -6 to -25 dB. Applying a fixed -19 dB offset on
    top of that is what made the music inaudible: the file was already quiet, so it ended
    up around -38 dB and the ducking finished it off. Normalising first means the mix
    gains express a balance instead of a guess."""
    cache.mkdir(parents=True, exist_ok=True)
    out = cache / f"{tag}-{slugify(src.stem)[:24]}.wav"
    if out.exists():
        return out
    exe = which("ffmpeg") or die("ffmpeg required")
    probe = run([exe, "-hide_banner", "-nostdin", "-i", str(src), "-af",
                 f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
                 "-f", "null", "-"], timeout=600, check=False, quiet=True)
    blob = (probe.stderr or "") + (probe.stdout or "")
    stats, start = {}, blob.rfind("{")
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
    ffmpeg(["-i", str(src), "-af", f"{af},aformat=sample_fmts=s16:sample_rates=48000",
            "-c:a", "pcm_s16le", str(out)], quiet=True)
    return out


def has_audio(path: Path) -> bool:
    return any(s.get("codec_type") == "audio"
               for s in ffprobe_json(path).get("streams", []))


def duration_of(path: Path) -> float:
    try:
        return float(ffprobe_json(path)["format"]["duration"])
    except (KeyError, TypeError, ValueError):
        return 0.0


def scene_starts(deck: dict) -> list[tuple[float, str, str]]:
    """(start seconds, scene type, transition) as the renderer lays them out: the deck is
    resolved first, so an automatic whip gets its whoosh."""
    return coherence.scene_starts(coherence.resolve(deck))


def resolve_sfx(name: str, sfx_dir: Path) -> tuple[Path, str]:
    """A recorded take if one is there, otherwise synthesise it.

    `mk sound pack` writes .mp3 files with air and room in them; `mk sfx gen` writes .wav
    synths that are clean and tail-free. Recorded wins for whooshes and impacts, and the
    synth is always available so a missing key never means a silent cut."""
    for ext in (".mp3", ".ogg", ".wav"):
        p = sfx_dir / f"{name}{ext}"
        if p.exists():
            return p, "recorded" if ext != ".wav" else "synth"
    p = sfx_dir / f"{name}.wav"
    render_sfx(name, p, 0.0)
    return p, "synth"


def auto_sfx(deck: dict, sfx_dir: Path, lead: float = 0.06) -> list[dict]:
    """One one-shot per cut, landing `lead` seconds early — the ear leads the eye."""
    tracks = []
    for i, (t, kind, move) in enumerate(scene_starts(deck)):
        name, gain = TRANSITION_SFX.get(move) or SCENE_SFX.get(kind, ("swoosh", -13))
        src, origin = resolve_sfx(name, sfx_dir)
        tracks.append({"type": "sfx", "src": str(src), "origin": origin,
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
    ap.add_argument("--music-gain", type=float, default=-11.0)
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--stem-lufs", type=float, default=-16.0,
                    help="level voice and music to this before balancing them")
    ap.add_argument("--music-duck", type=float, default=None,
                    help="override how far the bed drops under the voice, in dB")
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
                       "fadeIn": 0.6, "fadeOut": 1.6, "duration": dur})
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
    origins = {t.get("origin") for t in tracks if t.get("origin")}
    warnings = []

    # A voice longer than the picture gets its ending cut off — usually the payoff and
    # the call to action, which are the two lines that matter most.
    for t in tracks:
        if t.get("type") != "voice":
            continue
        vdur = duration_of(Path(t["src"])) + float(t.get("start", 0) or 0)
        if vdur > dur + 0.15:
            warnings.append(
                f"narration runs {vdur:.1f}s against {dur:.1f}s of video — the last "
                f"{vdur - dur:.1f}s will be cut, and that is where the payoff and the CTA "
                f"live. Cut about {int((vdur - dur) * 2.6)} words, or lengthen the deck.")
        elif dur - vdur > 3.0:
            warnings.append(f"narration ends {dur - vdur:.1f}s before the video does — "
                            f"either add a line or tighten the last scenes")
    if "voice" not in kinds:
        warnings.append("no narration. Your own voice outperforms trending audio on small "
                        "channels — `mk tts` if you will not record it yourself")
    if "music" not in kinds:
        warnings.append("no music bed under the edit — `mk sound music \"<mood> loop\"` "
                        "pulls a CC0 one, then match its tempo to your cuts")
    if origins == {"synth"}:
        warnings.append("every one-shot is synthesised. `mk sound pack` fetches recorded "
                        "takes, which have air in them and sit better under a voice")

    if a.dry_run:
        emit({"ok": True, "dry_run": True, "video_s": round(dur, 2),
              "tracks": len(tracks), "kinds": sorted(k for k in kinds if k),
              "sfx_events": sum(1 for t in tracks if t.get("type") == "sfx"),
              "warnings": warnings})
        return

    cache = safe_path(home() / "cache" / "mix", write=True)
    cache.mkdir(parents=True, exist_ok=True)

    # Level the voice and the bed to the same reference before balancing them.
    for t in tracks:
        kind = t.get("type")
        if kind in ("voice", "music"):
            t["src"] = str(normalise_stem(Path(t["src"]), a.stem_lufs, cache, kind))

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
          "sfx_source": sorted(origins) or None,
          "lufs_target": a.lufs,
          "lufs_before": stats.get("input_i"), "warnings": warnings,
          "next": f"mk qc {out} --target shorts --graphics"})


if __name__ == "__main__":
    main()
