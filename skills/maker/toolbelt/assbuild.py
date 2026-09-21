"""ASS (libass) text engine — the Maker Skill's typography layer.

Why ASS and not drawtext: ffmpeg 7 drops `drawtext` on any build without
libharfbuzz, while `ass`/`subtitles` (libass) is present essentially everywhere.
ASS also does what drawtext cannot — animated scale, rotation, per-word karaoke
timing, overshoot — which is exactly what kinetic typography needs.
"""
from __future__ import annotations

import re
from pathlib import Path

# name -> (size ratio of canvas width, fill, outline px ratio, shadow, bold, box)
STYLES = {
    "hook":    dict(size=0.098, fill="#FFFFFF", outline=0.075, shadow=3, bold=True,  box=False),
    "title":   dict(size=0.078, fill="#FFFFFF", outline=0.060, shadow=3, bold=True,  box=False),
    "caption": dict(size=0.052, fill="#FFFFFF", outline=0.030, shadow=2, bold=True,  box=True),
    "kicker":  dict(size=0.046, fill="#FFD400", outline=0.035, shadow=2, bold=True,  box=False),
    "lower":   dict(size=0.034, fill="#FFFFFF", outline=0.022, shadow=2, bold=False, box=True),
    "sub":     dict(size=0.050, fill="#FFFFFF", outline=0.032, shadow=2, bold=True,  box=False),
}
# accel values approximate the easing families; ASS has no bezier curves
ACCEL = {"linear": 1.0, "easeOutCubic": 0.45, "easeOutQuint": 0.3, "easeOutExpo": 0.25,
         "easeInCubic": 2.2, "easeInOutCubic": 1.0, "easeOutBack": 0.45}


def ass_colour(hexcol: str, alpha: int = 0) -> str:
    """#RRGGBB -> &HAABBGGRR (ASS is little-endian BGR with inverted alpha)."""
    c = str(hexcol or "#FFFFFF").strip()
    named = {"white": "#FFFFFF", "black": "#000000", "yellow": "#FFD400",
             "red": "#FF3B30", "green": "#30D158", "blue": "#0A84FF"}
    c = named.get(c.lower(), c).lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    if len(c) != 6:
        c = "FFFFFF"
    r, g, b = c[0:2], c[2:4], c[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def ts(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    h = int(seconds // 3600); m = int(seconds % 3600 // 60)
    s = seconds % 60
    return f"{h:d}:{m:02d}:{s:05.2f}"


def esc(text: str) -> str:
    return (str(text).replace("\\", "⧵").replace("{", "(").replace("}", ")")
            .replace("\r\n", "\n").replace("\n", r"\N"))


def _header(w: int, h: int, styles: dict[str, dict], font: str) -> str:
    out = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {w}", f"PlayResY: {h}",
           "WrapStyle: 2", "ScaledBorderAndShadow: yes", "YCbCr Matrix: TV.709", "",
           "[V4+ Styles]",
           "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
           "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, "
           "BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"]
    for name, st in styles.items():
        size = int(st["size"] * w) if st["size"] < 1 else int(st["size"])
        out.append(
            f"Style: {name},{font},{size},{ass_colour(st['fill'])},{ass_colour('#FFD400')},"
            f"{ass_colour('#000000')},{ass_colour('#000000', 0x60 if st['box'] else 0x80)},"
            f"{-1 if st['bold'] else 0},0,0,0,100,100,0,0,"
            f"{3 if st['box'] else 1},"
            # BorderStyle 3 reuses Outline as box padding, so it needs real room
            f"{max(8, int(size * 0.20)) if st['box'] else max(2, int(st['outline'] * size))},"
            f"{st['shadow']},"
            f"5,{int(w*0.06)},{int(w*0.06)},{int(h*0.05)},1")
    out += ["", "[Events]",
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    return "\n".join(out)


def _anim_tags(L: dict, w: int, h: int, dur: float) -> str:
    """Build the override block for one text event: position + entrance + exit."""
    x = L.get("x", "center"); y = L.get("y", 0.78)
    px = w / 2 if x in ("center", None) else (float(x) * w if 0 <= float(x) <= 1 else float(x))
    py = h / 2 if y == "center" else (float(y) * h if 0 <= float(y) <= 1 else float(y))

    ain = L.get("in") or {}
    aout = L.get("out") or {}
    kin, kout = ain.get("anim", "popIn"), aout.get("anim", "fadeOut")
    din = int(max(0.0, float(ain.get("duration", 0.22))) * 1000)
    dout = int(max(0.0, float(aout.get("duration", 0.18))) * 1000)
    total = int(dur * 1000)
    acc = ACCEL.get(ain.get("ease", "easeOutBack"), 0.45)
    travel = int(min(w, h) * 0.055)

    tags = ["\\an5"]
    if kin in ("slideUp", "slideDown", "slideLeft", "slideRight"):
        dx, dy = {"slideUp": (0, travel), "slideDown": (0, -travel),
                  "slideLeft": (travel, 0), "slideRight": (-travel, 0)}[kin]
        tags.append(f"\\move({px+dx:.0f},{py+dy:.0f},{px:.0f},{py:.0f},0,{din})")
    else:
        tags.append(f"\\pos({px:.0f},{py:.0f})")

    if kin == "popIn":
        o = int(din * 0.62)
        tags.append(f"\\fscx55\\fscy55\\t(0,{o},{acc},\\fscx110\\fscy110)"
                    f"\\t({o},{din},1,\\fscx100\\fscy100)")
    elif kin == "zoomIn":
        tags.append(f"\\fscx80\\fscy80\\t(0,{din},{acc},\\fscx100\\fscy100)")
    elif kin == "rotateIn":
        tags.append(f"\\frz{L.get('angle', 9)}\\t(0,{din},{acc},\\frz0)")

    if kout == "popOut" and total > dout:
        tags.append(f"\\t({total-dout},{total},1,\\fscx118\\fscy118\\alpha&HFF&)")
    tags.append(f"\\fad({din},{0 if kout in ('none', 'popOut') else dout})")

    if L.get("color"):
        tags.append(f"\\1c{ass_colour(L['color'])}")
    if L.get("size"):
        tags.append(f"\\fs{int(L['size'])}")
    if L.get("blur"):
        tags.append(f"\\blur{float(L['blur']):.1f}")
    if L.get("tags"):
        tags.append(str(L["tags"]))            # raw ASS override escape hatch
    return "{" + "".join(tags) + "}"


def build(layers: list[dict], w: int, h: int, out: Path, *,
          font: str = "DejaVu Sans", extra_styles: dict | None = None) -> Path:
    styles = dict(STYLES)
    styles.update(extra_styles or {})
    lines = [_header(w, h, styles, font)]
    for L in layers:
        if L.get("type", "text") != "text":
            continue
        start = float(L.get("start", 0.0))
        dur = float(L.get("duration", 2.0))
        style = L.get("style", "caption")
        if style not in styles:
            style = "caption"
        text = esc(L.get("text", ""))
        if L.get("uppercase"):
            text = text.upper()
        lines.append(f"Dialogue: {int(L.get('z', 0))},{ts(start)},{ts(start+dur)},{style},,0,0,0,,"
                     f"{_anim_tags(L, w, h, dur)}{text}")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


# ------------------------------------------------------------------ SRT import
SRT_TIME = re.compile(r"(\d+):(\d\d):(\d\d)[,.](\d{1,3})")


def parse_srt(path: Path) -> list[tuple[float, float, str]]:
    cues, block = [], []
    for raw in Path(path).read_text(encoding="utf-8", errors="replace").splitlines() + [""]:
        if raw.strip():
            block.append(raw)
            continue
        if len(block) >= 2:
            timing = next((b for b in block if "-->" in b), None)
            if timing:
                a, b = timing.split("-->")
                def sec(m):
                    h, mi, s, ms = m.groups()
                    return int(h) * 3600 + int(mi) * 60 + int(s) + int(ms.ljust(3, "0")) / 1000
                ma, mb = SRT_TIME.search(a), SRT_TIME.search(b)
                if ma and mb:
                    body = "\n".join(block[block.index(timing) + 1:]).strip()
                    cues.append((sec(ma), sec(mb), body))
        block = []
    return cues


def from_srt(srt: Path, w: int, h: int, out: Path, *, style: str = "sub",
             font: str = "DejaVu Sans", y: float = 0.72, uppercase: bool = False,
             anim: str = "popIn", pop_per_line: bool = True) -> Path:
    layers = []
    for start, end, text in parse_srt(srt):
        layers.append({
            "type": "text", "text": text, "style": style, "start": start,
            "duration": max(0.25, end - start), "y": y, "uppercase": uppercase,
            "in": {"anim": anim if pop_per_line else "fadeIn", "duration": 0.14},
            "out": {"anim": "none", "duration": 0.08},
        })
    return build(layers, w, h, out, font=font)
