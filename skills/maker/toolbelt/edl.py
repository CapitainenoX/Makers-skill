#!/usr/bin/env python3
"""mk assemble — render a declarative Edit Decision List into a finished video.

The model writes JSON, this script writes the ffmpeg. That is the whole point:
a small model never has to reason about filter graphs, and the graph is always
built the same correct way.

Pipeline (each stage cached, so a re-render only redoes what changed):
  1. normalise  every clip -> cache/seg_NNN.mp4   (trim, speed, fit, motion)
  2. join       concat, or xfade chain when transitions are used
  3. layers     text / image overlays with eased in-out animation
  4. audio      voice + music (ducked) + sfx + clip audio -> loudnorm
  5. subtitles  burn an .ass file if asked

Schema reference: references/edl-schema.md next to this toolbelt's skill.
"""
from __future__ import annotations

import argparse, json, math, os, sys
from pathlib import Path

import assbuild
from _common import (die, emit, ffmpeg, ffprobe_json, read_json,
                     safe_path, which)

PRESETS = {
    "shorts":  (1080, 1920, 30), "reel": (1080, 1920, 30),
    "youtube": (1920, 1080, 30), "yt4k": (3840, 2160, 30),
    "square":  (1080, 1080, 30),
}
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "C:/Windows/Fonts/arialbd.ttf",
]

# --------------------------------------------------------------------- easing
def ease(name: str, p: str) -> str:
    """Return an ffmpeg expression easing normalised progress `p` (0..1).

    easeOutBack overshoots — that little overshoot is what makes an edit read
    as 'snappy' rather than 'a computer moved a rectangle'.
    """
    n = (name or "easeOutCubic").strip()
    return {
        "linear":        f"({p})",
        "easeOutCubic":  f"(1-pow(1-({p}),3))",
        "easeInCubic":   f"(pow({p},3))",
        "easeInOutCubic": f"(if(lt({p},0.5),4*pow({p},3),1-pow(-2*({p})+2,3)/2))",
        "easeOutExpo":   f"(if(gte({p},1),1,1-pow(2,-10*({p}))))",
        "easeOutBack":   f"(1+2.70158*pow(({p})-1,3)+1.70158*pow(({p})-1,2))",
        "easeOutQuint":  f"(1-pow(1-({p}),5))",
    }.get(n, f"(1-pow(1-({p}),3))")


def prog(t0: float, dur: float, tvar: str = "t") -> str:
    dur = max(1e-3, float(dur))
    return f"min(1,max(0,({tvar}-{t0:.4f})/{dur:.4f}))"


# ----------------------------------------------------------------- utilities
def duration_of(path: Path) -> float:
    info = ffprobe_json(path)
    try:
        return float(info["format"]["duration"])
    except (KeyError, TypeError, ValueError):
        for s in info.get("streams", []):
            if s.get("duration"):
                return float(s["duration"])
    return 0.0


def has_audio(path: Path) -> bool:
    return any(s.get("codec_type") == "audio" for s in ffprobe_json(path).get("streams", []))


def font_dir_for(family_hint: str | None) -> str | None:
    """libass resolves families through fontconfig; we only need a fontsdir when
    the creator ships a font file with the project."""
    for c in FONT_CANDIDATES:
        if Path(c).exists():
            return str(Path(c).parent)
    return None


def atempo_chain(speed: float) -> str:
    """atempo only accepts 0.5..2.0, so chain it."""
    parts, s = [], float(speed)
    while s > 2.0:
        parts.append("atempo=2.0"); s /= 2.0
    while s < 0.5:
        parts.append("atempo=0.5"); s *= 2.0
    parts.append(f"atempo={s:.6f}")
    return ",".join(parts)


def even(expr: str) -> str:
    return f"floor(({expr})/2)*2"


# -------------------------------------------------------------- stage 1: clips
def fit_chain(fit: str, w: int, h: int, bg: str) -> str:
    if fit == "contain":
        return (f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
                f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color={bg}")
    if fit == "blur":
        return (f"split=2[bg][fg];"
                f"[bg]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
                f"gblur=sigma=40,eq=brightness=-0.12[bgb];"
                f"[fg]scale={w}:{h}:force_original_aspect_ratio=decrease[fgs];"
                f"[bgb][fgs]overlay=(W-w)/2:(H-h)/2")
    if fit == "stretch":
        return f"scale={w}:{h}"
    return f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"


def motion_chain(motion: dict | None, w: int, h: int, dur: float) -> str:
    """Time-varying crop then rescale: smooth zoom/pan with no zoompan jitter."""
    if not motion or motion.get("type") in (None, "none", "static"):
        return ""
    kind = motion["type"]
    e = motion.get("ease", "easeInOutCubic")
    p = prog(0.0, dur)
    amt = float(motion.get("amount", 0.08))

    if kind in ("punch", "zoom", "zoomin", "zoomout"):
        z0 = float(motion.get("from", 1.0 if kind != "zoomout" else 1.0 + amt))
        z1 = float(motion.get("to", 1.0 + amt if kind != "zoomout" else 1.0))
        z = f"({z0:.4f}+({z1:.4f}-{z0:.4f})*{ease(e, p)})"
        return (f"scale=w='{even(f'{w}*{z}')}':h='{even(f'{h}*{z}')}':eval=frame,"
                f"crop={w}:{h}:'(iw-ow)/2':'(ih-oh)/2'")

    if kind in ("pan", "panleft", "panright", "panup", "pandown"):
        z = 1.0 + max(0.06, amt)
        w2, h2 = int(w * z) // 2 * 2, int(h * z) // 2 * 2
        span_x, span_y = w2 - w, h2 - h
        move = ease(e, p)
        dirs = {
            "panleft":  (f"({span_x}*(1-{move}))", f"{span_y // 2}"),
            "panright": (f"({span_x}*{move})",     f"{span_y // 2}"),
            "panup":    (f"{span_x // 2}",         f"({span_y}*(1-{move}))"),
            "pandown":  (f"{span_x // 2}",         f"({span_y}*{move})"),
        }
        x, y = dirs.get(kind, dirs["panright"])
        return f"scale={w2}:{h2},crop=w={w}:h={h}:x='{x}':y='{y}'"

    if kind == "shake":
        freq = float(motion.get("freq", 9))
        px = max(2, int(w * amt * 0.12))
        z = 1.05
        cw, ch = int(w / z) // 2 * 2, int(h / z) // 2 * 2
        return (f"crop=w={cw}:h={ch}:"
                f"x='(iw-ow)/2+{px}*sin({freq}*2*PI*t)':"
                f"y='(ih-oh)/2+{px}*cos({freq*1.3:.2f}*2*PI*t)',scale={w}:{h}")

    if kind == "whip":  # motion blur streak, used under whip-pan transitions
        return f"crop=w={even(str(w))}:h={h}:x='(iw-ow)/2':y=0,scale={w}:{h},tblend=all_mode=average"
    return ""


def build_segment(idx: int, clip: dict, spec: dict, cache: Path, fast: bool) -> tuple[Path, float]:
    """Render one shot to a normalised segment: same size, fps, pix_fmt and audio
    layout as every other shot, so joining can never desync."""
    w, h, fps, bg = spec["w"], spec["h"], spec["fps"], spec["bg"]
    out = cache / f"seg_{idx:03d}.mp4"
    src = str(clip.get("src", "")).strip()
    speed = float(clip.get("speed", 1.0)) or 1.0
    kind = "color" if (not src or src.startswith(("color:", "#"))) else \
           "image" if Path(src).suffix.lower() in {".png", ".jpg", ".jpeg", ".webp",
                                                   ".bmp", ".tif", ".tiff"} else "video"
    args: list[str] = []
    vf: list[str] = []
    src_has_audio = False

    if kind == "color":
        colour = src.split(":", 1)[1] if src.startswith("color:") else (src or bg)
        dur = float(clip.get("duration", 2.0))
        args += ["-f", "lavfi", "-i", f"color=c={colour}:s={w}x{h}:r={fps}:d={dur:.3f}"]
    elif kind == "image":
        p = safe_path(src, must_exist=True)
        dur = float(clip.get("duration", 2.5))
        args += ["-loop", "1", "-t", f"{dur:.3f}", "-i", str(p)]
        vf.append(fit_chain(clip.get("fit", "cover"), w, h, bg))
    else:
        p = safe_path(src, must_exist=True)
        src_dur = duration_of(p)
        tin = float(clip.get("in", 0.0))
        tout = float(clip.get("out", src_dur if src_dur else tin + 3.0))
        if src_dur:
            tout = min(tout, src_dur)
        if tout <= tin:
            die(f"clip {idx} ({Path(src).name}): out={tout} must be greater than in={tin}")
        args += ["-ss", f"{tin:.3f}", "-t", f"{(tout - tin):.3f}", "-i", str(p)]
        dur = (tout - tin) / speed
        src_has_audio = has_audio(p)
        if speed != 1.0:
            vf.append(f"setpts=PTS/{speed:.6f}")
        vf.append(fit_chain(clip.get("fit", "cover"), w, h, bg))

    motion = motion_chain(clip.get("motion"), w, h, dur)
    if motion:
        vf.append(motion)
    if clip.get("grade"):
        vf.append(str(clip["grade"]))          # raw eq/curves chain, creator-supplied
    vf += [f"fps={fps}", "setsar=1", "format=yuv420p"]

    keep_audio = src_has_audio and float(clip.get("volume", 0.0)) > -60
    if keep_audio:
        af = ([atempo_chain(speed)] if speed != 1.0 else []) + [
            f"volume={float(clip.get('volume', 0.0)):.2f}dB",
            "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo",
        ]
        extra = ["-filter:a", ",".join(af)]
        maps = ["-map", "0:v:0", "-map", "0:a:0"]
    else:
        args += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
        extra = []
        maps = ["-map", "0:v:0", "-map", f"{1 if kind != 'color' else 1}:a:0"]

    crf, preset = ("30", "veryfast") if fast else ("18", "medium")
    ffmpeg([*args, "-filter:v", ",".join(x for x in vf if x), *maps, *extra,
            "-t", f"{dur:.3f}", "-c:v", "libx264", "-crf", crf, "-preset", preset,
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-movflags", "+faststart", str(out)], quiet=True)
    return out, duration_of(out)


# --------------------------------------------------------------- stage 2: join
XFADE = {"fade": "fade", "dissolve": "fade", "wipeleft": "wipeleft", "wiperight": "wiperight",
         "slideleft": "slideleft", "slideright": "slideright", "slideup": "slideup",
         "slidedown": "slidedown", "flash": "fadewhite", "black": "fadeblack",
         "whip": "slideleft", "zoom": "zoomin", "pixel": "pixelize", "radial": "radial",
         "circle": "circleopen", "smooth": "smoothleft"}


def join(segments: list[tuple[Path, float]], clips: list[dict], cache: Path, fast: bool) -> Path:
    out = cache / "joined.mp4"
    trans = [c.get("transition") or {} for c in clips[1:]]
    if not any(t.get("type") and t["type"] != "cut" for t in trans):
        lst = cache / "concat.txt"
        lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p, _ in segments), encoding="utf-8")
        ffmpeg(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)], quiet=True)
        return out

    inputs, fc, vlab, alab, offset = [], [], "[0:v]", "[0:a]", segments[0][1]
    for p, _ in segments:
        inputs += ["-i", str(p)]
    for i in range(1, len(segments)):
        t = trans[i - 1] or {}
        kind = XFADE.get(str(t.get("type", "fade")).lower(), "fade")
        d = max(0.08, min(float(t.get("duration", 0.3)), segments[i][1] - 0.05, offset - 0.05))
        offset -= d
        fc.append(f"{vlab}[{i}:v]xfade=transition={kind}:duration={d:.3f}:offset={offset:.3f}[v{i}]")
        fc.append(f"{alab}[{i}:a]acrossfade=d={d:.3f}[a{i}]")
        vlab, alab = f"[v{i}]", f"[a{i}]"
        offset += segments[i][1]
    crf, preset = ("30", "veryfast") if fast else ("18", "medium")
    ffmpeg([*inputs, "-filter_complex", ";".join(fc), "-map", vlab, "-map", alab,
            "-c:v", "libx264", "-crf", crf, "-preset", preset, "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", str(out)], quiet=True)
    return out


# ------------------------------------------------------------- stage 3: layers
# Text is rendered with libass, not drawtext: ffmpeg 7 builds without libharfbuzz
# have no drawtext at all, and ASS gives animated scale/rotation that drawtext
# cannot do. Images/stickers/GIFs still go through the overlay chain.

def anchor(val, axis_len: int) -> str:
    if isinstance(val, str) and val.lower() == "center":
        return f"{axis_len / 2:.1f}"
    try:
        f = float(val)
    except (TypeError, ValueError):
        return str(val)
    return f"{f * axis_len:.1f}" if 0.0 <= f <= 1.0 else f"{f:.1f}"


def layer_offsets(anim_in: dict | None, anim_out: dict | None,
                  start: float, end: float, w: int, h: int) -> tuple[str, str]:
    """(dx, dy) ffmpeg expressions for an image layer's entrance and exit."""
    ain, aout = anim_in or {}, anim_out or {}
    din = float(ain.get("duration", 0.22))
    dout = float(aout.get("duration", 0.18))
    ein = ease(ain.get("ease", "easeOutBack"), prog(start, din))
    eout = ease(aout.get("ease", "easeOutCubic"), prog(max(0.0, end - dout), dout))
    travel = int(min(w, h) * 0.06)
    dx = dy = "0"
    kin, kout = ain.get("anim", "popIn"), aout.get("anim", "fadeOut")
    if kin == "slideUp":     dy = f"({travel}*(1-{ein}))"
    elif kin == "slideDown": dy = f"(-{travel}*(1-{ein}))"
    elif kin == "slideLeft": dx = f"({travel}*(1-{ein}))"
    elif kin == "slideRight":dx = f"(-{travel}*(1-{ein}))"
    elif kin == "popIn":     dy = f"({int(travel * 0.55)}*(1-{ein}))"
    if kout == "slideDown":  dy = f"({dy}+{travel}*{eout})"
    elif kout == "popOut":   dy = f"({dy}-{int(travel * 0.4)}*{eout})"
    return dx, dy


def apply_image_layers(base: Path, layers: list[dict], spec: dict,
                       cache: Path, fast: bool) -> Path:
    imgs = [L for L in layers if L.get("type", "text") != "text"]
    if not imgs:
        return base
    w, h = spec["w"], spec["h"]
    inputs, fc, lab = ["-i", str(base)], [], "[0:v]"
    for n, L in enumerate(imgs, start=1):
        p = safe_path(L["src"], must_exist=True)
        start = float(L.get("start", 0.0))
        dur = float(L.get("duration", 2.0))
        animated = p.suffix.lower() in {".gif", ".webm", ".mp4", ".mov", ".webp", ".mkv"}
        if animated:
            inputs += ["-stream_loop", "-1", "-i", str(p)]
        else:
            inputs += ["-loop", "1", "-t", f"{dur:.3f}", "-i", str(p)]
        tw = int(w * float(L.get("scale", 0.35))) // 2 * 2
        fin = min(float((L.get("in") or {}).get("duration", 0.22)), dur / 3)
        fout = min(float((L.get("out") or {}).get("duration", 0.18)), dur / 3)
        rot = f",rotate={float(L['rotate']):.4f}*PI/180:c=none:ow=rotw({float(L['rotate']):.4f}*PI/180):oh=roth({float(L['rotate']):.4f}*PI/180)" if L.get("rotate") else ""
        fc.append(
            f"[{n}:v]scale={tw}:-2,format=rgba{rot},"
            f"fade=t=in:st=0:d={max(0.01, fin):.2f}:alpha=1,"
            f"fade=t=out:st={max(0.01, dur - fout):.2f}:d={max(0.01, fout):.2f}:alpha=1,"
            f"setpts=PTS-STARTPTS+{start:.3f}/TB[i{n}]")
        dx, dy = layer_offsets(L.get("in"), L.get("out"), start, start + dur, w, h)
        fc.append(f"{lab}[i{n}]overlay=x='{anchor(L.get('x', 0.5), w)}-w/2+{dx}':"
                  f"y='{anchor(L.get('y', 0.5), h)}-h/2+{dy}':"
                  f"enable='between(t,{start:.3f},{start + dur:.3f})':eval=frame[l{n}]")
        lab = f"[l{n}]"
    out = cache / "layered.mp4"
    crf, preset = ("30", "veryfast") if fast else ("18", "medium")
    ffmpeg([*inputs, "-filter_complex", ";".join(fc), "-map", lab, "-map", "0:a?",
            "-c:v", "libx264", "-crf", crf, "-preset", preset, "-pix_fmt", "yuv420p",
            "-c:a", "copy", str(out)], quiet=True)
    return out


# -------------------------------------------------------------- stage 4: audio
def mix_audio(base: Path, tracks: list[dict], spec: dict, cache: Path, fast: bool) -> Path:
    if not tracks:
        return base
    inputs, fc, labels, voice_lab = ["-i", str(base)], [], [], None
    bed_gain = float(spec.get("clip_audio_db", -6))
    fc.append(f"[0:a]volume={bed_gain}dB,aformat=sample_fmts=fltp:sample_rates=48000:"
              f"channel_layouts=stereo[bed]")
    labels.append("[bed]")
    music_labs = []
    for i, t in enumerate(tracks, start=1):
        p = safe_path(t["src"], must_exist=True)
        inputs += ["-i", str(p)]
        kind = t.get("type", "sfx")
        chain = ["aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"]
        if t.get("in") is not None or t.get("out") is not None:
            chain.append(f"atrim=start={float(t.get('in',0)):.3f}"
                         + (f":end={float(t['out']):.3f}" if t.get("out") is not None else ""))
            chain.append("asetpts=PTS-STARTPTS")
        default_gain = {"voice": 0.0, "music": -19.0, "sfx": -8.0}.get(kind, -6.0)
        chain.append(f"volume={float(t.get('gain', default_gain)):.2f}dB")
        if t.get("fadeIn"):
            chain.append(f"afade=t=in:st=0:d={float(t['fadeIn']):.2f}")
        if t.get("fadeOut") and t.get("duration"):
            d = float(t["fadeOut"]); tot = float(t["duration"])
            chain.append(f"afade=t=out:st={max(0, tot-d):.2f}:d={d:.2f}")
        start_ms = int(float(t.get("start", 0.0)) * 1000)
        if start_ms:
            chain.append(f"adelay={start_ms}|{start_ms}")
        lab = f"[a{i}]"
        fc.append(f"[{i}:a]{','.join(chain)}{lab}")
        if kind == "voice" and voice_lab is None:
            voice_lab = lab
        if kind == "music" and t.get("duck", True):
            music_labs.append(lab)
        else:
            labels.append(lab)

    # sidechain-duck every music bed under the voice, then mix everything
    if music_labs and voice_lab:
        fc.append(f"{voice_lab}asplit={len(music_labs)+1}" +
                  "".join(f"[vc{k}]" for k in range(len(music_labs) + 1)))
        labels = [l for l in labels if l != voice_lab] + [f"[vc{len(music_labs)}]"]
        for k, ml in enumerate(music_labs):
            fc.append(f"{ml}[vc{k}]sidechaincompress=threshold=0.045:ratio=9:attack=12:"
                      f"release=340:makeup=1[duck{k}]")
            labels.append(f"[duck{k}]")
    else:
        labels += music_labs

    fc.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:dropout_transition=0[mixed]")
    fc.append("[mixed]alimiter=limit=0.94,loudnorm=I=" + str(spec.get("lufs", -14)) +
              ":TP=-1.5:LRA=11[aout]")
    out = cache / "mixed.mp4"
    ffmpeg([*inputs, "-filter_complex", ";".join(fc), "-map", "0:v", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
            "-shortest", str(out)], quiet=True)
    return out


# ----------------------------------------------------------- stage 5: finalise
def ass_escape(p: Path) -> str:
    return p.as_posix().replace("\\", "/").replace(":", r"\:").replace("'", r"\'")


def finish(base: Path, edl: dict, out_path: Path, spec: dict,
           cache: Path, fast: bool) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    w, h = spec["w"], spec["h"]
    fontsdir = spec.get("fontsdir")
    tracks: list[Path] = []

    texts = [L for L in (edl.get("layers") or []) if L.get("type", "text") == "text"]
    if texts:
        tracks.append(assbuild.build(texts, w, h, cache / "text.ass",
                                     font=spec["font_family"],
                                     extra_styles=edl.get("text_styles")))
    subs = edl.get("subtitles")
    if subs:
        sp = safe_path(subs["src"] if isinstance(subs, dict) else subs, must_exist=True)
        if sp.suffix.lower() == ".ass":
            tracks.append(sp)
        else:
            o = subs if isinstance(subs, dict) else {}
            tracks.append(assbuild.from_srt(
                sp, w, h, cache / "subs.ass", style=o.get("style", "sub"),
                font=spec["font_family"], y=float(o.get("y", 0.72)),
                uppercase=bool(o.get("uppercase", False)),
                anim=o.get("anim", "popIn")))

    if not tracks:
        ffmpeg(["-i", str(base), "-c", "copy", "-movflags", "+faststart", str(out_path)],
               quiet=True)
        return out_path

    opt = f":fontsdir='{ass_escape(Path(fontsdir))}'" if fontsdir else ""
    vf = ",".join(f"ass='{ass_escape(t)}'{opt}" for t in tracks)
    crf, preset = ("30", "veryfast") if fast else ("18", "medium")
    ffmpeg(["-i", str(base), "-vf", vf, "-c:v", "libx264", "-crf", crf, "-preset", preset,
            "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", str(out_path)],
           quiet=True)
    return out_path


# ------------------------------------------------------------------ validation
def lint(edl: dict, clips: list[dict], spec: dict) -> list[str]:
    warn = []
    durs = []
    for c in clips:
        if c.get("duration"):
            durs.append(float(c["duration"]))
        elif c.get("in") is not None and c.get("out") is not None:
            durs.append((float(c["out"]) - float(c["in"])) / float(c.get("speed", 1) or 1))
    if durs:
        avg = sum(durs) / len(durs)
        limit = 2.6 if spec["h"] > spec["w"] else 4.5
        if avg > limit:
            warn.append(f"average shot length {avg:.1f}s exceeds {limit}s — the edit will feel flat. "
                        f"Cut more, or add motion/layers to the long shots.")
        if durs and durs[0] > 2.0:
            warn.append("first shot is longer than 2s — the hook must land inside 1.5s.")
    if not any(L.get("type", "text") == "text" and L.get("start", 0) < 1.5 for L in edl.get("layers", [])):
        warn.append("no on-screen text in the first 1.5s — sound-off viewers have nothing to read.")
    statics = sum(1 for c in clips if not (c.get("motion") or {}).get("type"))
    if clips and statics / len(clips) > 0.5:
        warn.append(f"{statics}/{len(clips)} shots have no motion — add punch-ins, pans or shakes.")
    if not edl.get("audio"):
        warn.append("no audio bed declared — silence kills retention.")
    return warn


# ------------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(prog="mk assemble")
    ap.add_argument("edl")
    ap.add_argument("-o", "--output", default=None)
    ap.add_argument("--fast", action="store_true", help="draft quality, ~4x faster")
    ap.add_argument("--preview", action="store_true", help="fast + half resolution")
    ap.add_argument("--dry-run", action="store_true", help="validate and print the plan only")
    ap.add_argument("--font", default=None, help="path to a .ttf/.otf to make available to libass")
    a = ap.parse_args()

    edl = read_json(safe_path(a.edl, must_exist=True))
    if not isinstance(edl, dict):
        die("EDL must be a JSON object")
    clips = edl.get("clips") or []
    if not clips:
        die("EDL has no clips")

    p = edl.get("preset", "shorts")
    if isinstance(p, dict):
        w, h, fps = int(p["w"]), int(p["h"]), int(p.get("fps", 30))
    else:
        if p not in PRESETS:
            die(f"unknown preset {p!r}; use {', '.join(PRESETS)} or an object")
        w, h, fps = PRESETS[p]
    if a.preview:
        w, h = w // 2 // 2 * 2, h // 2 // 2 * 2
    fontfile = a.font or edl.get("font")
    spec = {"w": w, "h": h, "fps": fps, "bg": edl.get("background", "black"),
            "font_family": edl.get("font_family", "DejaVu Sans"),
            "fontsdir": str(Path(fontfile).parent) if fontfile and Path(fontfile).exists() else None,
            "lufs": edl.get("lufs", -14), "clip_audio_db": edl.get("clip_audio_db", -6)}

    warnings = lint(edl, clips, spec)
    out_path = safe_path(a.output or edl.get("output") or "out/final.mp4", write=True)

    if a.dry_run:
        emit({"ok": True, "dry_run": True, "canvas": f"{w}x{h}@{fps}", "clips": len(clips),
              "layers": len(edl.get("layers") or []), "audio": len(edl.get("audio") or []),
              "output": str(out_path), "warnings": warnings})
        return

    # cache next to the project when the output sits in one, otherwise at workspace root
    from _common import MAKER_HOME
    candidate = out_path.parent.parent / "cache"
    try:
        candidate.resolve().relative_to(MAKER_HOME)
    except ValueError:
        candidate = MAKER_HOME / "cache"
    cache = safe_path(candidate, write=True)
    cache.mkdir(parents=True, exist_ok=True)
    fast = a.fast or a.preview

    segs = [build_segment(i, c, spec, cache, fast) for i, c in enumerate(clips)]
    stage = join(segs, clips, cache, fast)
    stage = apply_image_layers(stage, edl.get("layers") or [], spec, cache, fast)
    stage = mix_audio(stage, edl.get("audio") or [], spec, cache, fast)
    final = finish(stage, edl, out_path, spec, cache, fast)

    emit({"ok": True, "output": str(final), "duration_s": round(duration_of(final), 2),
          "canvas": f"{w}x{h}@{fps}", "shots": len(segs),
          "size_mb": round(final.stat().st_size / 1e6, 2),
          "quality": "draft" if fast else "final",
          "warnings": warnings,
          "next": f"mk qc {final}"})


if __name__ == "__main__":
    main()
