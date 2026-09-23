#!/usr/bin/env python3
"""mk narrate — one line of narration per beat, and the deck retimed to the voice.

Put the words on the scenes that carry them:

    { "type": "stat", "duration": 2.8, "say": "Over 160,000 stars on GitHub." }

A scene with no `say` continues the line before it, so one sentence can run across a
card and the card after it. `"say": ""` marks a silent scene that starts nothing (an
outro under the music). Scenes before the first line keep their duration.

Each line is synthesised on its own, trimmed, given presence and compression so it
cuts through the bed, then placed at the start of its first scene. Every group of
scenes is stretched or shrunk, in proportion, to hold its line plus a breath — so the
picture always changes on the voice, never half a sentence late.

Synthesising line by line is what makes this work: one long take drifts against the
cuts, and there is no clean place to cut it afterwards.
"""
from __future__ import annotations

import argparse, hashlib, os, subprocess, wave
from pathlib import Path

from _common import die, emit, ffmpeg, read_json, safe_path, which, write_json

SR = 48000

# Presence and punch for a voice that sits over music: cut mud, lift 3 kHz, add air,
# then compress so the quiet syllables survive the duck.
VOICE_CHAIN = ("highpass=f=70,equalizer=f=120:t=q:w=1:g=1.5,"
               "equalizer=f=300:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=3.5,"
               "equalizer=f=9000:t=h:w=1:g=2,"
               "acompressor=threshold=-20dB:ratio=3.5:attack=4:release=80:makeup=4dB")
TRIM = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse")


def groups_of(scenes: list[dict]) -> list[tuple[str, list[int]]]:
    """[(line, [scene indices])] — a scene without `say` joins the open group."""
    out: list[tuple[str, list[int]]] = []
    for i, s in enumerate(scenes):
        if "say" in s:
            out.append((s["say"] or "", [i]))
        elif out:
            out[-1][1].append(i)
    return out


def speak(text: str, raw: Path, engine: str, voice: str, speed: float) -> None:
    if engine == "kokoro":
        import numpy as np, soundfile as sf
        from kokoro import KPipeline
        pipe = KPipeline(lang_code=voice[0])
        chunks = [a for _, _, a in pipe(text, voice=voice, speed=speed)]
        if not chunks:
            die(f"kokoro produced no audio for: {text!r}")
        sf.write(str(raw), np.concatenate([getattr(c, "numpy", lambda: c)() for c in chunks]), 24000)
    elif engine == "piper":
        model = voice or os.environ.get("PIPER_VOICE", "")
        if not model:
            die("piper needs --voice /path/to/voice.onnx (or PIPER_VOICE)")
        p = subprocess.run(["piper", "--model", model, "--length_scale", f"{1 / speed:.3f}",
                            "--output_file", str(raw)], input=text, text=True,
                           capture_output=True, timeout=600)
        if not raw.exists():
            die(p.stderr or "piper produced nothing")
    else:
        mk = Path(__file__).with_name("tts.py")
        p = subprocess.run(["python3", str(mk), text, "-o", str(raw), "--engine", engine,
                            *(["--voice", voice] if voice else [])],
                           capture_output=True, text=True, timeout=600)
        if not raw.exists():
            die(p.stderr[-1500:] or f"{engine} produced nothing")


def seconds(path: Path) -> float:
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def main():
    ap = argparse.ArgumentParser(prog="mk narrate")
    ap.add_argument("deck")
    ap.add_argument("-o", "--output", required=True, help="the aligned narration wav")
    ap.add_argument("--engine", default="auto", help="kokoro | piper | puter | elevenlabs | edge-tts")
    ap.add_argument("--voice", default="am_michael",
                    help="kokoro voice (am_michael, am_fenrir, bm_george, af_heart…) or a piper .onnx")
    ap.add_argument("--speed", type=float, default=1.15, help="1.1–1.2 reads as energetic")
    ap.add_argument("--pad", type=float, default=0.32, help="breath after each line, s")
    ap.add_argument("--lead", type=float, default=0.06, help="voice starts this far into its scene")
    ap.add_argument("--min-scene", type=float, default=1.3)
    ap.add_argument("--no-retime", action="store_true", help="place the lines, keep the durations")
    a = ap.parse_args()

    deck_path = safe_path(a.deck, must_exist=True)
    deck = read_json(deck_path) or die("unreadable deck")
    scenes = deck.get("scenes") or die("deck has no scenes")
    groups = groups_of(scenes)
    if not any(t for t, _ in groups):
        die('no scene has a "say" line — put the narration on the scenes that carry it')

    engine = a.engine
    if engine == "auto":
        import importlib.util
        engine = ("kokoro" if importlib.util.find_spec("kokoro")
                  else "piper" if which("piper") else "puter")

    out = safe_path(a.output, write=True)
    work = out.parent / "lines"
    work.mkdir(parents=True, exist_ok=True)

    lines = []
    for n, (text, idx) in enumerate(groups):
        if not text.strip():
            lines.append({"n": n, "scenes": idx, "text": "", "file": None, "s": 0.0})
            continue
        key = hashlib.sha1(f"{engine}|{a.voice}|{a.speed}|{text}".encode()).hexdigest()[:10]
        done = work / f"{n:02d}-{key}.wav"
        if not done.exists():          # cached per line: editing one line re-voices one line
            raw = work / f"{n:02d}-{key}.raw.wav"
            speak(text, raw, engine, a.voice, a.speed)
            ffmpeg(["-i", str(raw), "-af", f"{TRIM},{VOICE_CHAIN}", "-ar", str(SR), "-ac", "1",
                    "-c:a", "pcm_s16le", str(done)], quiet=True)
            raw.unlink(missing_ok=True)
        lines.append({"n": n, "scenes": idx, "text": text, "file": str(done), "s": seconds(done)})

    if not a.no_retime:
        for ln in lines:
            if not ln["file"]:
                continue
            idx = ln["scenes"]
            need = max(ln["s"] + a.pad, a.min_scene * len(idx))
            old = sum(scenes[i]["duration"] for i in idx) or 1.0
            for i in idx:
                scenes[i]["duration"] = round(max(a.min_scene, need * scenes[i]["duration"] / old), 2)
        write_json(deck_path, deck)

    starts, t = [], 0.0
    for s in scenes:
        starts.append(t)
        t += float(s["duration"])
    total = t

    import numpy as np
    buf = np.zeros(int(total * SR) + SR // 2, dtype=np.float32)
    warnings = []
    for ln in lines:
        if not ln["file"]:
            continue
        pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", ln["file"], "-f", "f32le",
                              "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
        x = np.frombuffer(pcm, dtype=np.float32)
        at = starts[ln["scenes"][0]] + a.lead
        ln["at"] = round(at, 2)
        o = int(at * SR)
        end = min(len(buf), o + len(x))
        buf[o:end] += x[:end - o]
        room = sum(scenes[i]["duration"] for i in ln["scenes"])
        if ln["s"] + a.lead > room + 0.01:
            warnings.append(f"line {ln['n']} ({ln['s']:.2f}s) overruns its scenes ({room:.2f}s)")
    buf = buf[:int(total * SR)]
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes())

    emit({"ok": True, "output": str(out), "engine": engine, "voice": a.voice,
          "speed": a.speed, "duration_s": round(total, 2),
          "retimed": not a.no_retime,
          "lines": [{k: ln[k] for k in ("n", "text", "s", "at", "scenes") if k in ln}
                    for ln in lines if ln["file"]],
          "warnings": warnings or None,
          "next": f"mk compose -o bed.wav --deck {a.deck}   then   "
                  f"mk remotion render {a.deck} -o video.mp4 && "
                  f"mk mix video.mp4 -o final.mp4 --from-deck {a.deck} --voice {a.output} --music bed.wav"})


if __name__ == "__main__":
    main()
