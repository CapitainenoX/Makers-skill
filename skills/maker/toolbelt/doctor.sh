#!/usr/bin/env bash
# mk doctor — probe the host once, cache the result, never guess again.
set -euo pipefail
MK_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MAKER_HOME="${MAKER_HOME:-$PWD/.maker}"
mkdir -p "$MAKER_HOME"

have() { command -v "$1" >/dev/null 2>&1 && echo yes || echo no; }
haveany() { for c in "$@"; do command -v "$c" >/dev/null 2>&1 && { echo yes; return; }; done; echo no; }
# NB: the filter list is captured once. Piping into `grep -q` would SIGPIPE
# ffmpeg and, under `set -o pipefail`, report every early filter as missing.
FILTERS="$(command -v ffmpeg >/dev/null 2>&1 && ffmpeg -hide_banner -filters 2>/dev/null || true)"
filt() { printf '%s\n' "$FILTERS" | grep -Eq "^ *[A-Za-z.]+ +$1 " && echo yes || echo no; }
ver()  { command -v "$1" >/dev/null 2>&1 && ("$1" ${2:---version} 2>&1 | head -1 | cut -c1-70) || echo "-"; }

pymod() {
  "${MAKER_PYTHON:-python3}" -c "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('$1') else 1)" \
    >/dev/null 2>&1 && echo yes || echo no
}

FF=$(have ffmpeg); FP=$(have ffprobe); YT=$(have yt-dlp); NODE=$(have node)
PYB="${MAKER_PYTHON:-python3}"

cat > "$MAKER_HOME/capabilities.json" <<JSON
{
  "probed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "core":   { "ffmpeg": "$FF", "ffprobe": "$FP", "python": "$(have "$PYB")", "node": "$NODE" },
  "fetch":  { "yt-dlp": "$YT", "spotdl": "$(have spotdl)", "curl": "$(have curl)", "gallery-dl": "$(have gallery-dl)" },
  "voice":  { "edge-tts": "$(have edge-tts)", "piper": "$(have piper)", "kokoro": "$(pymod kokoro)",
              "elevenlabs_key": "$([ -n "${ELEVENLABS_API_KEY:-}" ] && echo yes || echo no)" },
  "vision": { "whisper": "$(have whisper)", "faster_whisper": "$(pymod faster_whisper)",
              "rembg": "$(have rembg)", "backgroundremover": "$(have backgroundremover)" },
  "render": { "remotion": "$([ -f package.json ] && grep -q remotion package.json 2>/dev/null && echo yes || echo no)",
              "blender": "$(have blender)", "imagemagick": "$(haveany magick convert)" },
  "ffmpeg_filters": { "ass": "$(filt ass)", "subtitles": "$(filt subtitles)",
                      "drawtext": "$(filt drawtext)", "xfade": "$(filt xfade)",
                      "sidechaincompress": "$(filt sidechaincompress)",
                      "chromakey": "$(filt chromakey)", "loudnorm": "$(filt loudnorm)" },
  "versions": { "ffmpeg": "$(ver ffmpeg -version)", "yt-dlp": "$(ver yt-dlp --version)" }
}
JSON

cat > "$MAKER_HOME/env" <<ENVEOF
# sourced by maker skills — regenerate with: mk doctor
export MK="$MK_DIR/mk"
export MAKER_HOME="$MAKER_HOME"
ENVEOF

echo "workspace: $MAKER_HOME"
cat "$MAKER_HOME/capabilities.json"

MISSING=""
[ "$FF" = no ] && MISSING="$MISSING ffmpeg"
[ "$FF" = yes ] && [ "$(filt ass)" = no ] && MISSING="$MISSING ffmpeg-with-libass(text-will-not-render)"
[ "$YT" = no ] && MISSING="$MISSING yt-dlp"
if [ -n "$MISSING" ]; then
  echo ""
  echo "MISSING (ask the creator before installing):$MISSING"
  echo "  ffmpeg : apt install ffmpeg | brew install ffmpeg | winget install Gyan.FFmpeg"
  echo "  yt-dlp : pipx install yt-dlp   (update often: yt-dlp -U)"
fi
