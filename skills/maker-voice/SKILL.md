---
name: maker-voice
description: >-
  Produce narration and captions: AI voiceover (ElevenLabs, Kokoro, Piper, edge-tts, or a
  browser-based free TTS), dubbing, transcription with Whisper, SRT generation, and burned-in
  animated captions. Use for "fais une voix off", "voix IA", "sous-titres", "transcris",
  dubbing into another language, or whenever a script needs to become audio.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# Voice — narration and captions

## 1. Which engine

```bash
. .maker/env
"$MK" tts --list -o /dev/null
```

The chain, best available first:

| Engine | When | Cost |
|---|---|---|
| **Puter** | Default when a token exists — real neural voices, no provider key | User-pays credits |
| **ElevenLabs** | The creator hands you a key and delivery matters | Their credits — ask first |
| **Kokoro** | Local, Apache-2.0, 82M params, CPU-fast, 54 voices | `pip install kokoro soundfile` |
| **Piper** | Local, tiny, real-time on weak hardware | `pip install piper-tts` + a voice |
| **edge-tts** | No key, good quality, needs network | `pipx install edge-tts` |
| **system** | Last resort | Robotic — say so to the creator |

### Puter — neural voices without a provider key

```bash
"$MK" puter say "<the script>" -o voice/vo.wav --voice Joanna
"$MK" puter voices                      # what the provider offers
"$MK" puter say "<script>" -o vo.wav --provider openai --voice nova
```

Puter fronts AWS Polly, OpenAI, ElevenLabs, Gemini and xAI on a user-pays model, so the
creator gets real narration without buying into any one provider. It needs
`PUTER_AUTH_TOKEN`: sign in once at puter.com, run `puter.auth.getToken()` in the browser
console, and export it. Read from the environment only, never written to disk.

Text is split on sentence boundaries at the API's 3000-character limit and the parts are
joined, so a long script needs no manual chunking. Output is levelled to −16 LUFS mono
like every other engine, so the mix behaves identically whichever one produced the voice.

**Write the script to the video's length, not the other way round.** Roughly 2.6 words per
second including pauses, so a 23 s video takes about 55 words. `mk mix` measures the
narration against the picture and warns when it overruns — the tail that gets cut is
always the payoff and the call to action.

Two more paths worth offering rather than assuming:

- The creator's **own editor** may have TTS built in (e.g. a local studio app with Qwen-based
  voices). If they mention one, use it — it is free and already licensed to them. Ask for the
  command or the export path once, then record it in `.maker/memory/style.md`.
- A **browser tool**, when you have one, can drive a free no-signup TTS site and download the
  WAV. Slower and manual, but it needs no key and no install.

On keys: ask for a short-lived one, use it through the environment only, never print it,
never write it to a file, and tell the creator to revoke it when the batch is done.

## 2. Generate

```bash
"$MK" tts "Ce repo a quarante mille étoiles." -o voice/vo.wav --lang fr
"$MK" tts - -o voice/vo.wav --lang fr < notes/script.txt      # long scripts via stdin
"$MK" tts "…" -o voice/vo.wav --engine elevenlabs --voice <voice_id>
```

Everything is loudness-normalised to −16 LUFS mono on the way out, so the mix behaves.

Writing for TTS: expand numbers and symbols (`40k` → `quarante mille`, `->` → "vers"),
avoid parentheses, and split long sentences — TTS engines run out of breath in exactly the
places a human would. Generate **one file per beat** rather than one long take: it lets the
edit breathe and you can re-roll a single line instead of the whole script.

## 3. Captions — non-negotiable for anything with speech

```bash
"$MK" transcribe voice/vo.wav -o subs/vo.srt          # or --subs on mk fetch
"$MK" subs subs/vo.srt -o subs/captions.ass --style shout --width 1080 --height 1920
```

Styles: `bold` (default), `shout` (big, uppercase, centre-high — shorts), `clean`,
`doc` (lower third), `centered`. Then in the EDL:

```json
"subtitles": { "src": "subs/captions.ass" }
```

Caption craft:
- 3–6 words per cue. One breath per cue. Never a full sentence sitting still.
- Keep them clear of the platform UI: nothing below y≈0.82 on vertical.
- Check the transcript against the script — Whisper mangles product names and jargon
  constantly, and a wrong name on screen is worse than no caption.
- Colour one key word per cue if the channel's style does that. One, not five.

## 4. Dubbing

Transcribe → translate → re-time → re-voice. The trap is duration: translated lines rarely
match the original length. Fix it in the script, not with `atempo` — rewrite the line
shorter. If you must stretch, keep it inside ±8 % or the voice turns to plastic.

## 5. Output

```
**Voix** — kokoro (af_heart), 6 fichiers, 41 s total, −16 LUFS
**Sous-titres** — `subs/captions.ass`, 14 cues, style shout
**Corrigé** — "Sequelize" (Whisper avait "séquelise")
```
