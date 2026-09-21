#!/usr/bin/env bash
# Install the Maker skills into Claude Code.
#   ./install.sh            -> ~/.claude/skills   (available everywhere)
#   ./install.sh --project  -> ./.claude/skills   (this repo only)
#   ./install.sh --link     -> symlink instead of copy (for developing the skills)
set -euo pipefail

SRC="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/skills"
DEST="$HOME/.claude/skills"
MODE=copy

for arg in "$@"; do
  case "$arg" in
    --project) DEST="$PWD/.claude/skills" ;;
    --link)    MODE=link ;;
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

[ -d "$SRC" ] || { echo "error: $SRC not found — run this from the repo" >&2; exit 1; }
mkdir -p "$DEST"

for skill in "$SRC"/*/; do
  name="$(basename "$skill")"
  target="$DEST/$name"
  if [ -e "$target" ] || [ -L "$target" ]; then
    printf 'replace existing %s ? [y/N] ' "$target"
    read -r reply < /dev/tty || reply=n
    case "$reply" in [yY]*) rm -rf "$target" ;; *) echo "  skipped $name"; continue ;; esac
  fi
  if [ "$MODE" = link ]; then ln -s "${skill%/}" "$target"; else cp -R "${skill%/}" "$target"; fi
  echo "  installed $name"
done

chmod +x "$DEST/maker/toolbelt/mk" "$DEST/maker/toolbelt/doctor.sh" 2>/dev/null || true

cat <<MSG

Installed to $DEST

Next:
  1. Check the host:   bash "$DEST/maker/toolbelt/doctor.sh"
  2. Required:         ffmpeg (with libass)
     Strongly advised: yt-dlp
     Optional:         whisper, rembg, edge-tts/kokoro/piper, node (Remotion)
  3. In Claude Code:   "fais-moi un short sur <sujet>"  or  /maker

MSG
