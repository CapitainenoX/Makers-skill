#!/usr/bin/env python3
"""mk tts — narration, with a fallback chain so a voice always exists.

Order of preference, best-quality-that-is-actually-available first:
  1. ELEVENLABS_API_KEY  — best delivery; only when the creator hands over a key
  2. kokoro              — local, Apache-2.0, 82M params, CPU-fast, 54 voices
  3. piper               — local, tiny, real-time even on a Pi
  4. edge-tts            — free, no key, needs network (unofficial endpoint)
  5. say / espeak-ng     — last resort, robotic; flag it to the creator
"""
from __future__ import annotations

import re, argparse, json, os, sys, urllib.request
from pathlib import Path

from _common import die, emit, ffmpeg, run, safe_path, which, write_json

ENGINES = ["puter", "elevenlabs", "kokoro", "piper", "edge-tts", "system"]
EDGE_VOICES = {"fr": "fr-FR-HenriNeural", "fr-f": "fr-FR-DeniseNeural",
               "en": "en-US-AndrewMultilingualNeural", "en-f": "en-US-AvaMultilingualNeural"}


def available() -> list[str]:
    out = []
    if os.environ.get("PUTER_AUTH_TOKEN"):
        out.append("puter")
    if os.environ.get("ELEVENLABS_API_KEY"):
        out.append("elevenlabs")
    try:
        import importlib.util
        if importlib.util.find_spec("kokoro"):
            out.append("kokoro")
    except Exception:
        pass
    if which("piper"):
        out.append("piper")
    if which("edge-tts"):
        out.append("edge-tts")
    if which("say") or which("espeak-ng"):
        out.append("system")
    return out


def say_edge_words(text: str, voice: str, rate: str, raw: Path,
                   pause: float = 0.0) -> list[dict] | None:
    """Synthesise with edge-tts and keep every word's timing.

    The engine already knows when each word is spoken (WordBoundary events); the CLI
    throws that away. Those timings are what lets `mk remotion sync` cut the video on
    the voice — each scene starting as its phrase starts, each item landing as it is
    named. Returns None when the library is not importable.

    `pause` > 0 synthesises sentence by sentence and puts that much silence between
    them: a TTS voice runs its sentences together, and a video cut on it inherits the
    breathlessness — nothing stays on screen long enough to read."""
    try:
        import asyncio
        import edge_tts
    except ImportError:
        return None

    sentences = [x.strip() for x in re.split(r"(?<=[.!?…])\s+", text) if x.strip()] \
        if pause > 0 else [text]

    async def one(chunk: str, dest: Path) -> list[dict]:
        found: list[dict] = []
        com = edge_tts.Communicate(chunk, voice, rate=rate, boundary="WordBoundary")
        with open(dest, "wb") as fh:
            async for part in com.stream():
                if part["type"] == "audio":
                    fh.write(part["data"])
                elif part["type"] == "WordBoundary":
                    st = part["offset"] / 1e7
                    found.append({"w": part["text"], "start": st, "end": st + part["duration"] / 1e7})
        return found

    if len(sentences) == 1:
        words = asyncio.run(one(sentences[0], raw))
        return [{**w, "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in words]

    from _common import ffprobe_json
    parts, words, t = [], [], 0.0
    for k, sent in enumerate(sentences):
        dest = raw.with_name(f"{raw.stem}.part{k}.mp3")
        ws = asyncio.run(one(sent, dest))
        dur = float(ffprobe_json(dest)["format"]["duration"])
        words += [{"w": w["w"], "start": round(t + w["start"], 3), "end": round(t + w["end"], 3)}
                  for w in ws]
        parts.append(dest)
        t += dur + pause
    inputs: list[str] = []
    for p in parts:
        inputs += ["-i", str(p)]
    pads = "".join(f"[{i}:a]aresample=48000,apad=pad_dur={pause}[a{i}];" for i in range(len(parts)))
    graph = pads + "".join(f"[a{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=0:a=1[out]"
    ffmpeg([*inputs, "-filter_complex", graph, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "192k",
            str(raw)], quiet=True)
    for p in parts:
        p.unlink(missing_ok=True)
    return words


def normalise(raw: Path, out: Path, lufs: float = -16.0) -> Path:
    """Every engine gets levelled the same way so mixes stay predictable."""
    # the codec follows the extension: PCM into an .mp3 container is refused outright
    codec = {".mp3": ["-c:a", "libmp3lame", "-b:a", "192k"], ".m4a": ["-c:a", "aac", "-b:a", "192k"],
             ".ogg": ["-c:a", "libvorbis"], ".opus": ["-c:a", "libopus"]}.get(
        out.suffix.lower(), ["-c:a", "pcm_s16le"])
    ffmpeg(["-i", str(raw), "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=9,"
            "aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=mono",
            *codec, str(out)], quiet=True)
    return out


def say_elevenlabs(text: str, out: Path, voice: str, model: str) -> Path:
    key = os.environ["ELEVENLABS_API_KEY"]
    vid = voice or os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
        data=json.dumps({"text": text, "model_id": model,
                         "voice_settings": {"stability": 0.42, "similarity_boost": 0.8,
                                            "style": 0.35, "use_speaker_boost": True}}).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        out.write_bytes(r.read())
    return out


def say_kokoro(text: str, out: Path, voice: str) -> Path:
    import soundfile as sf  # noqa
    from kokoro import KPipeline
    lang = (voice or "af_heart")[0]
    pipe = KPipeline(lang_code=lang)
    chunks = [audio for _, _, audio in pipe(text, voice=voice or "af_heart")]
    if not chunks:
        die("kokoro produced no audio")
    import numpy as np
    sf.write(str(out), np.concatenate(chunks), 24000)
    return out


def main():
    ap = argparse.ArgumentParser(prog="mk tts")
    ap.add_argument("text", nargs="?", help="text, or - to read stdin")
    ap.add_argument("-o", "--output", required=True)
    ap.add_argument("--voice", default=None)
    ap.add_argument("--engine", default="auto", choices=["auto", *ENGINES])
    ap.add_argument("--lang", default="en",
                    help="en (default — the house style ships in English) | fr | any edge-tts locale")
    ap.add_argument("--rate", default="+0%", help="edge-tts speaking rate, e.g. +8%%")
    ap.add_argument("--pause", type=float, default=0.35,
                    help="silence between sentences (edge-tts). A short needs air to be read; "
                         "0 runs the sentences together as the engine does")
    ap.add_argument("--model", default="eleven_multilingual_v2")
    ap.add_argument("--lufs", type=float, default=-16.0)
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()

    if a.list:
        emit({"available": available(),
              "install": {"puter": "export PUTER_AUTH_TOKEN=... — sign in at puter.com, "
                                   "then puter.auth.getToken() in the console. Real neural "
                                   "voices with no provider API key.",
                          "kokoro": "pip install kokoro soundfile",
                          "piper": "pip install piper-tts",
                          "edge-tts": "pipx install edge-tts",
                          "elevenlabs": "export ELEVENLABS_API_KEY=... (ask the creator; "
                                        "use a short-lived key and never log it)"}})
        return

    text = sys.stdin.read() if a.text in (None, "-") else a.text
    text = text.strip()
    if not text:
        die("no text to speak")
    out = safe_path(a.output, write=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    raw = out.with_suffix(".raw.mp3")
    out.with_suffix(".words.json").unlink(missing_ok=True)   # never leave stale timings

    chain = [a.engine] if a.engine != "auto" else available()
    if not chain:
        die("no TTS engine available. Cheapest fix: pipx install edge-tts\n"
            "Or ask the creator for a short-lived ELEVENLABS_API_KEY.")

    errors = []
    for eng in chain:
        try:
            if eng == "puter":
                # Puter writes and levels the wav itself, so this branch returns early.
                import argparse as _ap
                import puter as puter_mod
                lang = a.lang if "-" in a.lang else {"fr": "fr-FR", "en": "en-US"}.get(a.lang, "en-US")
                puter_mod.cmd_say(_ap.Namespace(
                    text=text, output=str(out), voice=a.voice, engine="neural",
                    language=lang, lufs=a.lufs, provider="aws-polly"))
                return
            if eng == "elevenlabs":
                say_elevenlabs(text, raw, a.voice, a.model)
            elif eng == "kokoro":
                say_kokoro(text, raw.with_suffix(".wav"), a.voice); raw = raw.with_suffix(".wav")
            elif eng == "piper":
                model = a.voice or os.environ.get("PIPER_VOICE", "")
                if not model:
                    raise RuntimeError("piper needs --voice /path/to/voice.onnx")
                p = run(["piper", "--model", model, "--output_file", str(raw.with_suffix(".wav"))],
                        timeout=600, check=False)
                raw = raw.with_suffix(".wav")
                if not raw.exists():
                    raise RuntimeError(p.stderr or "piper produced nothing")
            elif eng == "edge-tts":
                voice = a.voice or EDGE_VOICES.get(a.lang, EDGE_VOICES["en"])
                words = say_edge_words(text, voice, a.rate, raw, a.pause)
                if words is None:      # library unavailable: the CLI still gives audio
                    run(["edge-tts", "--voice", voice, "--rate", a.rate,
                         "--text", text, "--write-media", str(raw)], timeout=300)
                else:
                    wpath = out.with_suffix(".words.json")
                    write_json(wpath, {"engine": "edge-tts", "voice": voice, "words": words})
            else:
                if which("say"):
                    run(["say", "-o", str(raw.with_suffix(".aiff")), text], timeout=300)
                    raw = raw.with_suffix(".aiff")
                else:
                    run(["espeak-ng", "-v", a.lang, "-w", str(raw.with_suffix(".wav")), text],
                        timeout=300)
                    raw = raw.with_suffix(".wav")
            if raw.exists() and raw.stat().st_size > 512:
                normalise(raw, out, a.lufs)
                raw.unlink(missing_ok=True)
                wfile = out.with_suffix(".words.json")
                emit({"ok": True, "output": str(out), "engine": eng,
                      "words": str(wfile) if wfile.exists() else None,
                      "chars": len(text), "lufs": a.lufs,
                      "tried": errors or None,
                      "warn": "robotic voice — offer the creator a better engine"
                              if eng == "system" else None,
                      "next": "mk transcribe <this file> to get an SRT for burned-in captions"})
                return
            errors.append(f"{eng}: produced no audio")
        except Exception as exc:
            errors.append(f"{eng}: {type(exc).__name__}: {exc}")
    die("every TTS engine failed:\n  " + "\n  ".join(errors))


if __name__ == "__main__":
    main()
