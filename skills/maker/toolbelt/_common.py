"""Shared helpers for the Maker toolbelt.

Hard rules enforced here:
  * every write goes through safe_path() and must land inside MAKER_HOME
  * subprocesses are always argv lists (never shell=True) and always bounded
  * remote filenames are sanitised before touching the filesystem
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

MAKER_HOME = Path(os.environ.get("MAKER_HOME", Path.cwd() / ".maker")).resolve()


# --------------------------------------------------------------------------- io
def home() -> Path:
    MAKER_HOME.mkdir(parents=True, exist_ok=True)
    return MAKER_HOME


def safe_path(p: str | Path, *, must_exist: bool = False, write: bool = False) -> Path:
    """Resolve p. Writes are confined to MAKER_HOME; reads may be anywhere."""
    path = Path(p).expanduser()
    path = (Path.cwd() / path).resolve() if not path.is_absolute() else path.resolve()
    if write:
        try:
            path.relative_to(MAKER_HOME)
        except ValueError:
            die(f"refusing to write outside the workspace: {path}\n"
                f"workspace is {MAKER_HOME} (override with MAKER_HOME=...)")
    if must_exist and not path.exists():
        die(f"not found: {path}")
    return path


def slugify(text: str, maxlen: int = 60) -> str:
    text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[-\s]+", "-", text).strip("-")
    return (text or "untitled")[:maxlen]


def write_json(path: Path, data) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)
    return path


def read_json(path: Path, default=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


# ------------------------------------------------------------------- processes
def which(name: str) -> str | None:
    return shutil.which(name)


def require(name: str, hint: str = "") -> str:
    exe = which(name)
    if not exe:
        die(f"missing dependency: {name}. {hint}")
    return exe


def run(argv: list[str], *, timeout: int = 900, check: bool = True,
        capture: bool = True, quiet: bool = False) -> subprocess.CompletedProcess:
    if not quiet:
        print("$ " + " ".join(shlex_quote(a) for a in argv), file=sys.stderr)
    try:
        proc = subprocess.run(
            argv, timeout=timeout, check=False,
            stdout=subprocess.PIPE if capture else None,
            stderr=subprocess.PIPE if capture else None,
            text=True,
        )
    except subprocess.TimeoutExpired:
        die(f"timed out after {timeout}s: {argv[0]}")
    if check and proc.returncode != 0:
        tail = (proc.stderr or "")[-1800:]
        die(f"{argv[0]} failed (exit {proc.returncode})\n{tail}")
    return proc


def shlex_quote(s: str) -> str:
    return s if re.fullmatch(r"[\w@%+=:,./-]+", s or "") else "'" + str(s).replace("'", "'\\''") + "'"


def ffmpeg(args: list[str], *, timeout: int = 1800, quiet: bool = False):
    exe = require("ffmpeg", "install it first: apt install ffmpeg | brew install ffmpeg")
    return run([exe, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", *args],
               timeout=timeout, quiet=quiet)


def ffprobe_json(path: Path) -> dict:
    exe = require("ffprobe", "ships with ffmpeg")
    proc = run([exe, "-v", "quiet", "-print_format", "json",
                "-show_format", "-show_streams", str(path)], timeout=120, quiet=True)
    return json.loads(proc.stdout or "{}")


# ----------------------------------------------------------------------- output
def die(msg: str, code: int = 1):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


def emit(data):
    """Every command prints compact JSON so a small model reads few tokens."""
    print(json.dumps(data, indent=2, ensure_ascii=False))
