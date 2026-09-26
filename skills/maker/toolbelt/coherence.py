#!/usr/bin/env python3
"""Coherence for Remotion decks: the checks a designer does by eye, done every time.

Two jobs, both deterministic:

1. **resolve(deck)** — fill in what the author left to the harness: the transition into
   each scene, picked from the deck's motion language so a video has a consistent way of
   moving (not eleven random effects) and never the same effect twice in a row. The
   render, the stills and `mk mix` all read the same resolved deck, so the whoosh lands
   on the whip.

2. **check(deck, public)** — the things that made videos look wrong without failing:
   a logo painted in a colour that disappears on its chip, a mark that is not the brand
   its label names, text on a background it does not read on, a `**marker` left open so
   the asterisks show on screen, the same shape five times in a row.

The renderer applies the same colour rules (remotion/src/color.ts, components/Logo.tsx):
what this reports as "auto-corrected" is exactly what will be drawn.
"""
from __future__ import annotations

import difflib, json, re
from pathlib import Path

from logos import contrast, parse_hex, svg_colours

# ------------------------------------------------------------------ vocabulary
SCENE_TYPES = {
    "textStack", "pill", "logoList", "card", "bullets", "stat", "code", "compare", "outro",
    "media", "tiles", "annotate", "marquee", "quote", "progress", "chips", "diagram",
    "flow", "mock", "cta",
    "kinetic", "chapter", "split", "versus", "steps", "timeline", "checklist", "chart",
    "orbit", "gallery", "focus", "beforeAfter", "notify", "post",
}
# scenes that are pointless without footage
MEDIA_REQUIRED = {"media", "annotate", "tiles", "gallery", "focus", "beforeAfter"}
# scenes that do NOT draw the flowing `rich` caption (they have their own text model)
NO_RICH = {"kinetic", "chapter", "split", "quote"}
# The silhouette a scene leaves on screen. Two different types with the same silhouette
# still read as repetition: chips -> orbit -> diagram is three rounds of "logos in circles".
FAMILY = {
    "textStack": "type", "kinetic": "type", "quote": "type", "chapter": "wall",
    "chips": "logos", "orbit": "logos", "diagram": "logos", "logoList": "list",
    "marquee": "logos", "bullets": "list", "checklist": "list", "steps": "list",
    "flow": "list", "timeline": "list", "compare": "versus", "versus": "versus",
    "split": "versus", "beforeAfter": "footage", "card": "footage", "media": "footage",
    "tiles": "footage", "annotate": "footage", "gallery": "footage", "focus": "footage",
    "stat": "number", "progress": "number", "chart": "number", "code": "ui", "mock": "ui",
    "notify": "ui", "post": "ui", "pill": "name", "cta": "ask", "outro": "ask",
}
TRANSITIONS = {"cut", "fade", "slide", "push", "whip", "zoom", "blur", "wipe", "iris",
               "panel", "flash", "blinds"}
TRANSITION_SECONDS = {"cut": 0, "fade": 0.55, "slide": 0.6, "push": 0.65, "whip": 0.45,
                      "zoom": 0.6, "blur": 0.55, "wipe": 0.65, "iris": 0.7,
                      "panel": 0.85, "flash": 0.35, "blinds": 0.7}
LANGUAGES = ["clean", "punchy", "soft", "graphic"]
# The palette each motion language draws from, most frequent first.
PALETTE = {
    "clean": ["push", "wipe", "slide", "push", "blur"],
    "punchy": ["whip", "zoom", "push", "whip", "flash"],
    "soft": ["blur", "slide", "fade", "iris", "blur"],
    "graphic": ["wipe", "blinds", "iris", "push", "panel"],
}
# What a chapter wall gets: the biggest move the language has.
CHAPTER_MOVE = {"clean": "wipe", "punchy": "zoom", "soft": "fade", "graphic": "panel"}
TEXT_FX = {"rise", "mask", "blur", "pop", "slide", "type"}
TYPESETS = {"studio", "editorial", "impact", "tech", "playful"}
BACKDROPS = {"plain", "spotlight", "mesh", "grain", "dots", "lines"}
GLYPHS = {
    "sparkle", "gear", "folder", "cube", "chat", "cloud", "lock", "rocket", "code",
    "database", "thumbsUp", "bell", "comment", "share", "star", "dot", "circle", "square",
    "triangle", "plus", "bolt", "check", "arrow", "terminal", "heart", "play", "search",
    "user", "clock", "globe", "fire", "cross", "eye", "download", "link", "chart", "mic",
    "image", "music", "key", "trophy", "flag", "cursor", "warning", "money", "bookmark",
}
# Scenes where an item's label IS the name of the mark next to it ("GitHub" under the
# GitHub logo). Elsewhere a label is a description and may sit beside any icon.
LABEL_NAMES_MARK = {"chips", "diagram", "orbit", "logoList", "versus", "pill"}
# Scenes that paint their icons in a fixed ink on an accent tile — nothing to check.
TINTED_ICONS = {"notify", "steps"}
# Scenes whose icons sit on the page rather than on a raised white chip.
ON_PAGE = {"logoList", "timeline", "chart", "stat", "kinetic", "split", "textStack"}
LAYER_KINDS = {"image", "icon", "badge", "arrow", "burst", "cursor", "toast", "scribble",
               "sparkles", "label", "emoji"}

# Same tokens as remotion/src/theme.ts
THEMES = {
    "light": {"bg": "#ffffff", "surface": "#ffffff", "text": "#0a0a0b", "accent": "#111113"},
    "paper": {"bg": "#f4f3f1", "surface": "#ffffff", "text": "#141412", "accent": "#141412"},
    "dark": {"bg": "#0c0c0e", "surface": "#18181c", "text": "#f5f5f2", "accent": "#d97757"},
    "ink": {"bg": "#101820", "surface": "#18222c", "text": "#eaf2f8", "accent": "#4cc2ff"},
}


def is_mono(deck: dict) -> bool:
    """Black and white is the house style; `style: "color"` opts out."""
    return deck.get("style", "mono") == "mono"


def _grey(c: str) -> bool:
    rgb = parse_hex(c)
    return bool(rgb) and max(rgb) - min(rgb) <= 10


# Scenes that look best as a black slab in the black-and-white style: big type, one
# number, the ask. Never footage (captures are light) and never two slabs in a row.
INVERT_PREF = {"kinetic", "stat", "quote", "cta", "versus", "code", "orbit", "post"}
NEVER_INVERT = {"chapter", "media", "tiles", "gallery", "focus", "beforeAfter", "card",
                "annotate", "split"}
# Transitions that blend the two scenes' pixels — grey mush across a black/white flip.
SOFT_MOVES = {"fade", "blur", "zoom", "slide"}
HARD_MOVES = ["wipe", "push", "iris", "whip", "blinds"]
MONO_BACKDROPS = ["plain", "dots", "plain", "lines", "plain", "grain"]


def seed_of(seed) -> int:
    """Same 32-bit string hash as motion.ts:seedOf."""
    if isinstance(seed, (int, float)):
        return abs(int(round(seed)))
    if not seed:
        return 0
    h = 0
    for ch in str(seed):
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    if h >= 0x80000000:
        h -= 0x100000000
    return abs(h)


def language_of(deck: dict) -> str:
    lang = (deck.get("motion") or {}).get("language")
    return lang if lang in LANGUAGES else LANGUAGES[seed_of(deck.get("seed")) % len(LANGUAGES)]


# ------------------------------------------------------------------ resolve
def resolve(deck: dict) -> dict:
    """A copy of the deck with every decision the harness owns made explicit."""
    out = json.loads(json.dumps(deck))
    scenes = out.get("scenes") or []
    motion = out.setdefault("motion", {})
    lang = language_of(out)
    motion["language"] = lang
    if is_mono(out):
        # Rhythm in black and white is inversion: a black slab every few scenes, on the
        # beats that carry big type or one number, never twice in a row.
        prev, since = False, 0
        for i, s in enumerate(scenes):
            if "invert" in s:
                prev = bool(s["invert"])
                since = 0 if prev else since + 1
                continue
            t = s.get("type")
            want = t not in NEVER_INVERT and not prev and (
                (t in INVERT_PREF and since >= 1) or since >= 3 or (i == 0 and t in INVERT_PREF))
            s["invert"] = bool(want)
            prev = s["invert"]
            since = 0 if prev else since + 1
        if not out.get("backdrop"):
            seed0 = seed_of(out.get("seed"))
            for i, s in enumerate(scenes):
                if not s.get("backdrop") and not s.get("invert"):
                    s["backdrop"] = MONO_BACKDROPS[(i + seed0) % len(MONO_BACKDROPS)]
    if motion.get("transitions", "auto") == "cut":
        return out
    seed = seed_of(out.get("seed"))
    pal = PALETTE[lang]
    flashes = sum(1 for s in scenes if (s.get("transition") or {}).get("type") == "flash")
    prev_type = None
    recent: list[str] = []
    dirs = ["left", "up", "left", "right", "up", "down"]
    for i, s in enumerate(scenes):
        if i == 0:
            continue
        t = s.get("transition")
        if t:
            prev_type = t.get("type")
            continue
        kind = s.get("type")
        # Rhythm: a cut is still right most of the time. Roughly every other change
        # moves; the hook-to-second-scene change and every chapter wall always do.
        h = (seed // 7 + i * 2654435761) & 0xFFFF
        moves = kind == "chapter" or i == 1 or kind == "cta" or (h % 100) < 55
        prev_kind = scenes[i - 1].get("type")
        if FAMILY.get(kind) == FAMILY.get(prev_kind) and kind != "chapter":
            moves = True           # same silhouette twice: the transition is the change
        if not moves:
            prev_type = "cut"
            continue
        if kind == "chapter":
            choice = CHAPTER_MOVE[lang]
        else:
            k = (seed + i * 3) % len(pal)
            choice = pal[k]
            tries = 0
            while (choice == prev_type or choice in recent or (choice == "flash" and flashes >= 2)
                   or (choice == "panel" and kind != "chapter" and lang != "graphic")) and tries < 6:
                k = (k + 1) % len(pal)
                choice = pal[k]
                tries += 1
        # Between a white scene and a black one, a dissolve averages them into grey
        # mush. A polarity change takes a hard edge: the flip itself is the effect.
        if is_mono(out) and bool(s.get("invert")) != bool(scenes[i - 1].get("invert")) \
                and choice in SOFT_MOVES:
            choice = None
            for k in range(len(HARD_MOVES)):
                c = HARD_MOVES[(seed + i + k) % len(HARD_MOVES)]
                if c not in recent:
                    choice = c
                    break
            choice = choice or "wipe"
        if choice == "flash":
            flashes += 1
        recent = (recent + [choice])[-2:]
        tr = {"type": choice}
        if choice in ("push", "whip", "slide", "wipe", "blinds", "panel"):
            tr["dir"] = dirs[(seed + i) % len(dirs)]
        s["transition"] = tr
        prev_type = choice
    return out


def scene_starts(deck: dict) -> list[tuple[float, str, str]]:
    """(start seconds, scene type, transition type) — cuts sit exactly on the running sum
    of durations, as remotion/src/deck.ts:layout places them."""
    fps = deck.get("fps", 30)
    at, out = 0, []
    for s in deck.get("scenes", []):
        f = max(1, round(float(s.get("duration", 2)) * fps))
        out.append((at / fps, str(s.get("type", "")), (s.get("transition") or {}).get("type", "cut")))
        at += f
    return out


# ------------------------------------------------------------------ helpers
MARKER_RE = [r"\[\[[^\]]+\]\]", r"\*\*[^*]+\*\*", r"__[^_]+__", r"==[^=]+==", r"~~[^~]+~~",
             r"\*[^*\s][^*]*?\*"]


def leftover_markers(text: str) -> list[str]:
    """Markers that will not parse and so print literally on screen."""
    s = text
    for r in MARKER_RE:
        s = re.sub(r, " ", s)
    bad = [m for m in ("[[", "]]", "**", "__", "==", "~~") if m in s]
    if "*" in s and "**" not in bad:
        bad.append("*")
    return bad


def rich_texts(s: dict) -> list[str]:
    out = []
    for key in ("rich", "text"):
        if isinstance(s.get(key), str) and (key == "rich" or s.get("type") in ("quote", "post")):
            out.append(s[key])
    if s.get("type") == "kinetic":
        out += [l for l in s.get("lines") or [] if isinstance(l, str)]
    if s.get("type") == "split":
        for k in ("a", "b"):
            if isinstance((s.get(k) or {}).get("text"), str):
                out.append(s[k]["text"])
    return out


def is_file(icon) -> bool:
    return isinstance(icon, str) and ("/" in icon or "." in icon)


def scene_media(s: dict) -> list[dict]:
    """Every media reference in a scene, normalised to a spec dict."""
    out = []

    def take(m):
        m = {"src": m} if isinstance(m, str) else (m if isinstance(m, dict) else None)
        if m and m.get("src"):
            out.append(m)

    for key in ("media", "src", "before", "after", "avatar"):
        take(s.get(key))
    for key in ("a", "b", "left", "right"):
        if isinstance(s.get(key), dict):
            take(s[key].get("media"))
    for it in (s.get("items") or []):
        if isinstance(it, dict):
            take(it.get("media"))
    for l in (s.get("layers") or []):
        if isinstance(l, dict) and l.get("kind") == "image":
            take(l.get("src"))
    return out


def scene_icons(s: dict) -> list[tuple[str, dict]]:
    """(icon, the chip-ish spec it sits in) for every icon slot in a scene."""
    found: list[tuple[str, dict]] = []

    def take(v, spec=None):
        if isinstance(v, str) and v and not v.startswith("http"):
            found.append((v, spec or {}))

    for key in ("hub", "chip"):
        if isinstance(s.get(key), dict):
            take(s[key].get("icon"), s[key])
    for key in ("items", "nodes", "steps", "actions"):
        for it in (s.get(key) or []):
            if isinstance(it, dict):
                take(it.get("icon"), it)
    for key in ("a", "b", "left", "right"):
        if isinstance(s.get(key), dict):
            take(s[key].get("icon"), s[key])
    take(s.get("icon"))
    for l in (s.get("layers") or []):
        if isinstance(l, dict) and l.get("kind") in ("icon", "toast"):
            take(l.get("src"), l)
    for t in rich_texts(s):
        for m in re.finditer(r"\[\[([^\]]+)\]\]", t):
            take(m.group(1).strip())
    return found


def logo_title(public: Path, icon: str) -> str | None:
    p = public / icon
    idx = public / "logos" / "index.json"
    slug = Path(icon).stem.split("-")[0]
    try:
        meta = json.loads(idx.read_text()).get(slug) if idx.exists() else None
        if meta and meta.get("title"):
            return meta["title"]
    except (ValueError, OSError):
        pass
    try:
        m = re.search(r"<title>([^<]+)</title>", p.read_text(errors="ignore"))
        return m.group(1) if m else None
    except OSError:
        return None


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower().replace("+", "plus").replace(".", "dot"))


# ------------------------------------------------------------------ check
def check(deck: dict, public: Path | None) -> tuple[list[str], list[str], list[str]]:
    """(errors, warnings, fixes). `fixes` lists what the renderer will auto-correct."""
    errors, warns, fixes = [], [], []
    scenes = deck.get("scenes") or []
    theme_name = deck.get("theme", "light")
    if theme_name not in THEMES:
        errors.append(f"theme {theme_name!r} unknown; use one of {sorted(THEMES)}")
        theme_name = "light"
    th = dict(THEMES[theme_name])
    mono = is_mono(deck)
    accent = (deck.get("brand") or {}).get("accent")
    if mono:
        th["accent"] = th["text"]
        if accent:
            warns.append(f"brand.accent {accent} is ignored: the deck is black and white "
                         f"(style \"mono\", the default). Set \"style\": \"color\" to use it")
        colours = []
        for i, s in enumerate(scenes):
            for ln in (s.get("lines") or []) + (s.get("heading") or []):
                if isinstance(ln, dict) and parse_hex(ln.get("c") or "") and not _grey(ln["c"]):
                    colours.append(f"scene {i} line colour {ln['c']}")
            for l in s.get("layers") or []:
                if isinstance(l, dict) and parse_hex(l.get("color") or "") and not _grey(l["color"]):
                    colours.append(f"scene {i} layer colour {l['color']}")
            if s.get("bg") and parse_hex(s["bg"]) and not _grey(s["bg"]):
                colours.append(f"scene {i} bg {s['bg']}")
            if s.get("gradient"):
                colours.append(f"scene {i} gradient")
        if colours:
            warns.append("colour in a black-and-white deck — " + "; ".join(colours[:4]) +
                         ". It breaks the style: remove it, or set \"style\": \"color\"")
    elif accent:
        if not parse_hex(accent):
            errors.append(f"brand.accent {accent!r} is not a colour")
        else:
            th["accent"] = accent
            c = contrast(accent, th["bg"])
            if c < 1.35:
                warns.append(f"brand.accent {accent} is the page colour ({c:.2f}:1) — it will be "
                             f"replaced by the ink; pick an accent that differs from the background")
            elif c < 3:
                fixes.append(f"brand.accent {accent} is {c:.2f}:1 on the page: accent *text* is "
                             f"darkened automatically to read; fills keep the exact colour")
    if deck.get("typeset") and deck["typeset"] not in TYPESETS:
        errors.append(f"typeset {deck['typeset']!r} unknown; use one of {sorted(TYPESETS)}")
    if deck.get("backdrop") and deck["backdrop"] not in BACKDROPS:
        errors.append(f"backdrop {deck['backdrop']!r} unknown; use one of {sorted(BACKDROPS)}")
    logos_policy = deck.get("logos", "mono" if mono else "auto")
    dark = contrast("#ffffff", th["bg"]) > contrast("#000000", th["bg"])

    marks = 0
    transitions = []
    for i, s in enumerate(scenes):
        t = s.get("type")
        where = f"scene {i} ({t})"
        bg = s.get("bg") or th["bg"]
        # -- text colour against its page
        if s.get("bg"):
            if not parse_hex(s["bg"]):
                if not str(s["bg"]).startswith(("linear-", "radial-")):
                    warns.append(f"{where}: bg {s['bg']!r} is not a colour I can check")
            elif contrast(th["text"], s["bg"]) < 3:
                errors.append(f"{where}: the theme's text ({th['text']}) is {contrast(th['text'], s['bg']):.2f}:1 "
                              f"on bg {s['bg']} — unreadable. Drop the bg or switch the deck theme")
        for ln in (s.get("lines") or []) + (s.get("heading") or []) + (s.get("footer") or []) + (s.get("caption") or []):
            if isinstance(ln, dict) and ln.get("c") not in (None, "text", "muted", "accent"):
                if parse_hex(ln["c"]) and t != "media" and contrast(ln["c"], bg) < 3:
                    warns.append(f"{where}: line \"{str(ln.get('t'))[:24]}\" is {ln['c']} on {bg} "
                                 f"({contrast(ln['c'], bg):.2f}:1) — it will not read")
        # -- markers
        for txt in rich_texts(s):
            bad = leftover_markers(txt)
            if bad:
                errors.append(f"{where}: unclosed marker {' '.join(bad)} in \"{txt[:40]}\" — it would "
                              f"print on screen. Close it: **bold** __accent__ *serif* ~~under~~ ==mark==")
            marks += len(re.findall(r"==[^=]+==", txt))
            if len(re.findall(r"__[^_]+__", txt)) > 1:
                warns.append(f"{where}: more than one __accent__ in one sentence — one colour word per scene")
        if s.get("rich") and t in NO_RICH:
            errors.append(f"{where}: `rich` is not drawn by this scene type — put the text in its own "
                          f"field ({'lines' if t == 'kinetic' else 'title/sub' if t == 'chapter' else 'a.text / b.text' if t == 'split' else 'text'})")
        if s.get("textFx") and s["textFx"] not in TEXT_FX:
            errors.append(f"{where}: textFx {s['textFx']!r} unknown; use one of {sorted(TEXT_FX)}")
        if s.get("backdrop") and s["backdrop"] not in BACKDROPS:
            errors.append(f"{where}: backdrop {s['backdrop']!r} unknown; use one of {sorted(BACKDROPS)}")
        # -- transitions
        tr = s.get("transition")
        if tr is not None:
            if not isinstance(tr, dict) or tr.get("type") not in TRANSITIONS:
                errors.append(f"{where}: transition {tr!r} — type must be one of {sorted(TRANSITIONS)}")
            else:
                transitions.append(tr["type"])
                if tr.get("dir") and tr["dir"] not in ("left", "right", "up", "down"):
                    errors.append(f"{where}: transition dir {tr['dir']!r} must be left/right/up/down")
        # -- layers
        layers = s.get("layers") or []
        if len(layers) > 3:
            warns.append(f"{where}: {len(layers)} layers — one or two complementary elements lift a "
                         f"frame, more is clutter")
        for l in layers:
            if not isinstance(l, dict) or l.get("kind") not in LAYER_KINDS:
                errors.append(f"{where}: layer kind must be one of {sorted(LAYER_KINDS)}")
                continue
            for k in ("x", "y"):
                v = l.get(k)
                if not isinstance(v, (int, float)) or not -0.1 <= v <= 1.1:
                    errors.append(f"{where}: layer {l['kind']} needs {k} between 0 and 1 (fraction of the frame)")
            if l.get("at") is not None and float(l["at"]) >= float(s.get("duration", 2)):
                warns.append(f"{where}: layer {l['kind']} appears at {l['at']}s, after the scene ends")
        # -- icons: known glyph, file exists, readable, and the right brand
        for icon, spec in scene_icons(s):
            if not is_file(icon):
                if icon not in GLYPHS:
                    close = difflib.get_close_matches(icon, sorted(GLYPHS), n=1)
                    errors.append(f"{where}: icon {icon!r} is neither a built-in glyph nor a file"
                                  + (f" — did you mean {close[0]!r}?" if close else
                                     f". For a brand: mk logo get {icon}"))
                continue
            if public is None:
                continue
            path = public / icon
            if not path.exists():
                errors.append(f"{where}: icon not found — {icon}. Fetch it: mk logo get {Path(icon).stem}")
                continue
            if path.suffix.lower() != ".svg":
                continue
            cols = svg_colours(path.read_text(errors="ignore"))
            label = spec.get("label")
            if label and t in LABEL_NAMES_MARK:
                title = logo_title(public, icon)
                names = {norm(x) for x in (title, Path(icon).stem.split("-")[0]) if x}
                ln = norm(label)
                if names and ln and not any(ln in n or n in ln or
                                            difflib.SequenceMatcher(None, ln, n).ratio() > 0.6 for n in names):
                    warns.append(f"{where}: the label says \"{label}\" but {icon} is "
                                 f"{title or Path(icon).stem} — wrong logo for the name?")
            if len(cols) != 1 or t in TINTED_ICONS or spec.get("kind") == "toast":
                continue
            fill = spec.get("fill", "surface")
            page = bg if t in ON_PAGE or not spec else th["surface"]
            surface = {"accent": th["accent"], "ink": th["text"], "ghost": bg}.get(fill, page)
            if fill == "brand":
                continue          # the chip takes the logo's colour; the mark is knocked out
            tint = spec.get("tint") or logos_policy
            if tint == "mono":
                continue          # drawn in the ink of whatever it sits on — always reads
            if tint not in ("auto", "brand", "mono", "accent") and parse_hex(tint):
                c = contrast(tint, surface)
                if c < 1.6:
                    errors.append(f"{where}: {icon} tinted {tint} on a {surface} chip is {c:.2f}:1 — invisible")
                continue
            c = contrast(cols[0], surface)
            if c < 1.6:
                if tint == "brand":
                    errors.append(f"{where}: {icon} is {cols[0]} on {surface} ({c:.2f}:1) with tint "
                                  f"\"brand\" forced — it will be invisible. Use tint auto, or fill: \"brand\"")
                elif tint == "auto":
                    fixes.append(f"{where}: {icon} ({cols[0]}) would vanish on its {surface} chip "
                                 f"({c:.2f}:1) — drawn in the {'light' if dark else 'dark'} ink instead")
        # -- structural sanity per type
        if t in MEDIA_REQUIRED and not scene_media(s):
            errors.append(f"{where}: needs a `media` source")
        if t == "focus":
            for k in ("x", "y"):
                if not isinstance(s.get(k), (int, float)) or not 0 <= s[k] <= 1:
                    errors.append(f"{where}: focus needs {k} between 0 and 1 — the point to zoom onto")
        if t == "kinetic" and not s.get("lines"):
            errors.append(f"{where}: kinetic needs `lines`, a list of short strings")
        if t == "chart" and len(s.get("items") or []) < 2:
            warns.append(f"{where}: a chart with fewer than two values is a stat — use `stat`")
        if t in ("versus",) and not (s.get("left") and s.get("right")):
            errors.append(f"{where}: versus needs `left` and `right`")
        if t == "split" and not (s.get("a") and s.get("b")):
            errors.append(f"{where}: split needs `a` and `b`")
        if t == "beforeAfter" and not (s.get("before") and s.get("after")):
            errors.append(f"{where}: beforeAfter needs `before` and `after`")

    if marks > 1:
        warns.append(f"{marks} ==highlights== in the video — the marker is for the ONE line that must "
                     f"not be missed; more than one and none of them stands out")
    if transitions.count("flash") > 2:
        warns.append(f"{transitions.count('flash')} flash transitions — twice per video at most, or it "
                     f"stops meaning impact")
    for a, b, c in zip(transitions, transitions[1:], transitions[2:]):
        if a == b == c and a != "cut":
            warns.append(f"three `{a}` transitions in a row — the effect becomes the wallpaper")
            break
    # silhouettes: a different type with the same shape is still repetition
    fams = [FAMILY.get(s.get("type"), s.get("type")) for s in scenes]
    for i in range(len(fams) - 2):
        if fams[i] == fams[i + 1] == fams[i + 2]:
            warns.append(f"scenes {i}-{i + 2} are all `{fams[i]}` shapes "
                         f"({', '.join(s.get('type') for s in scenes[i:i + 3])}) — different types, same "
                         f"silhouette. Break it with a different family")
            break
    if len(scenes) >= 8:
        counts: dict[str, int] = {}
        for s in scenes:
            counts[s.get("type")] = counts.get(s.get("type"), 0) + 1
        for k, n in counts.items():
            if n / len(scenes) > 0.34:
                warns.append(f"`{k}` is {n} of {len(scenes)} scenes — past a third, the video is that "
                             f"one shape on repeat. There are {len(SCENE_TYPES)} types")
    return errors, warns, fixes
