# `mk` — the toolbelt

Every command prints JSON. Paths are yours to pass straight into the next command.
Writes are confined to `$MAKER_HOME` (default `./.maker`); reads work anywhere.

## Setup
```bash
"$MK" doctor                                  # capabilities.json — read once, trust it
"$MK" init ghost-projects --format shorts --title "Ce repo GitHub…"
"$MK" state ghost-projects phase=build revision=1
"$MK" clean ghost-projects --cache            # only ever deletes cache/ and out/
```
Formats: `shorts` `reel` `youtube` `yt4k` `square`.

## Memory
```bash
"$MK" mem show                                # everything
"$MK" mem show feedback                       # one section
"$MK" mem add style "hook always ≤ 1.2 s" --under Pacing
"$MK" mem similar "projet github qui remplace notion"    # dedupe BEFORE writing a script
"$MK" mem log ghost-projects --title "…" --hook "…" --duration 41 --tags github oss
```

## Sourcing
```bash
"$MK" fetch <url> --clip 00:01:12 00:01:26 --max-height 1080
"$MK" fetch <url> --audio                     # audio only
"$MK" fetch <url> --subs fr,en                # pull auto-captions as SRT
"$MK" music "lofi dark trap no copyright"     # ytsearch1 + mp3 + metadata
"$MK" sfx vine boom -n 3
"$MK" gif "confused travolta" -n 4            # needs TENOR_API_KEY or GIPHY_API_KEY
"$MK" stock "server room neon" -n 3           # needs PEXELS_API_KEY or PIXABAY_API_KEY
```
`yt-dlp` breaks often; when it 403s, the fix is almost always `yt-dlp -U`, then cookies.

## Looking at footage
```bash
"$MK" probe rushes/a.mov
"$MK" scan rushes/ --deep                     # index + contact sheets
"$MK" transcribe voice/vo.wav -o subs/vo.srt
"$MK" thumb out/final.mp4 out/thumb.png --at 3.2
```
`scan` writes one contact-sheet PNG per file. **Open those PNGs with your image reader.**
That is how you watch the rushes without spending the context window on frames.

## Building
```bash
"$MK" assemble edl.json --dry-run
"$MK" assemble edl.json --preview
"$MK" subs subs/vo.srt -o subs/captions.ass --style shout --width 1080 --height 1920
"$MK" tts "Ce projet a 40 000 étoiles." -o voice/vo.wav --lang fr
"$MK" tts --list -o /dev/null                 # which engines exist here
"$MK" bgremove rushes/cam.mp4 out/cam.webm --mode auto
```

## Delivering
```bash
"$MK" qc out/final.mp4 --target shorts        # PASS | FIX | REWORK + the exact fixes
```

## Environment keys (all optional, all creator-supplied)
`ELEVENLABS_API_KEY` · `TENOR_API_KEY` · `GIPHY_API_KEY` · `PEXELS_API_KEY` ·
`PIXABAY_API_KEY` · `PIPER_VOICE` · `MAKER_HOME` · `MAKER_PYTHON`

Never print a key, never write one into a file, never commit one. Ask for a short-lived
key, use it, and tell the creator to revoke it.
