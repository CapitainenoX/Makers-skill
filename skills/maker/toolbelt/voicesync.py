#!/usr/bin/env python3
"""Cut the deck on the voice.

A narrated short where the pictures change on a clock and the voice runs on its own is
two videos playing at once. Editors cut on the word: the scene changes as its phrase
starts, the logo lands as its name is said, the number stops counting as it is spoken.

Input: the deck, where each scene carries `say` — the words of the narration it covers —
and the word timings `mk tts` writes next to the audio (`vo.words.json`). Output: the
same deck with every `duration` set so the cuts sit just before each phrase, and `cues`
per scene (seconds from the scene's start) for the renderer:

    cues.items[i]  when list item i (chip, checklist line, step, kinetic line…) is named
    cues.words[k]  when token k of the scene's `rich` caption is spoken
    cues.value     when a stat's number is said

Anything that cannot be matched falls back to an even spread inside the phrase, so a
paraphrased caption still moves with the voice rather than on a clock.
"""
from __future__ import annotations

import re

STOP = {"the", "a", "an", "and", "of", "to", "it", "is", "in", "on", "for", "from", "that",
        "this", "le", "la", "les", "de", "du", "des", "un", "une", "et", "à", "en", "pour"}

# Same marker order as remotion/src/text.ts:parse, so token indexes agree.
MARKERS = [r"\[\[([^\]]+)\]\]", r"\*\*([^*]+)\*\*", r"__([^_]+)__", r"==([^=]+)==",
           r"~~([^~]+)~~", r"\*([^*\s][^*]*?)\*"]


def norm(w: str) -> str:
    return re.sub(r"[^\w]", "", w.lower().replace("'", "")).strip("_")


def rich_tokens(text: str) -> list[tuple[str, bool]]:
    """(token, is_icon) exactly as the renderer splits a rich caption."""
    spans: list[tuple[str, str]] = [(text, "plain")]
    for k, pat in enumerate(MARKERS):
        out: list[tuple[str, str]] = []
        for t, em in spans:
            if em != "plain":
                out.append((t, em))
                continue
            last = 0
            for m in re.finditer(pat, t):
                if m.start() > last:
                    out.append((t[last:m.start()], "plain"))
                out.append((m.group(1), "icon" if k == 0 else "em"))
                last = m.end()
            if last < len(t):
                out.append((t[last:], "plain"))
        spans = out
    toks: list[tuple[str, bool]] = []
    for t, em in spans:
        if em == "icon":
            toks.append((t.strip(), True))
            continue
        toks += [(w, False) for w in t.split() if w]
    return toks


def item_labels(s: dict) -> list[str]:
    t = s.get("type")
    if t == "kinetic":
        return [re.sub(r"[*_=~\[\]]", "", l) for l in s.get("lines") or []]
    if t in ("diagram", "orbit"):
        return [n.get("label") or _stem(n.get("icon")) for n in s.get("nodes") or []]
    if t == "flow":
        return [st.get("label", "") for st in s.get("steps") or []]
    if t == "cta":
        return [a.get("label", "") for a in s.get("actions") or []]
    if t == "timeline":
        return [f"{it.get('date', '')} {it.get('label', '')}" for it in s.get("items") or []]
    out = []
    for it in s.get("items") or []:
        if isinstance(it, dict):
            out.append(it.get("label") or it.get("title") or _stem(it.get("icon")))
        elif isinstance(it, str):
            out.append(it)
    return out


def _stem(icon) -> str:
    if not isinstance(icon, str):
        return ""
    base = icon.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    return {"googlechrome": "chrome", "vlcmediaplayer": "vlc", "obsstudio": "obs",
            "nodedotjs": "node"}.get(base, base)


def align(say: str, words: list[dict], ptr: int) -> tuple[int, int] | None:
    """Find the span of `words` (from ptr) that speaks `say`. Greedy, tolerant of the
    odd word the TTS split or merged differently."""
    toks = [norm(w) for w in say.split() if norm(w)]
    if not toks:
        return None
    first = None
    for j in range(ptr, min(len(words), ptr + 40)):
        if norm(words[j]["w"]) == toks[0] or (len(toks) > 1 and norm(words[j]["w"]) == toks[1]):
            first = j
            break
    if first is None:
        return None
    j, last = first, first
    for t in toks:
        for k in range(j, min(len(words), j + 4)):
            if norm(words[k]["w"]) == t:
                last, j = k, k + 1
                break
    return first, last


def spread(n: int, a: float, b: float) -> list[float]:
    if n <= 0:
        return []
    if n == 1:
        return [a]
    return [a + (b - a) * i / (n - 1) for i in range(n)]


def sync(deck: dict, words: list[dict], lead: float = 0.12, tail: float = 0.7,
         fps: int = 30) -> tuple[dict, list[str]]:
    scenes = deck.get("scenes") or []
    notes: list[str] = []
    spans: list[tuple[int, int] | None] = []
    ptr = 0
    for i, s in enumerate(scenes):
        say = s.get("say")
        if not say:
            spans.append(None)
            continue
        sp = align(say, words, ptr)
        if sp is None:
            notes.append(f"scene {i}: could not find \"{say[:40]}\" in the narration — kept its duration")
        else:
            ptr = sp[1] + 1
        spans.append(sp)

    # scene starts: on the phrase, a hair early; unsynced scenes keep their length
    starts: list[float] = []
    t = 0.0
    for i, s in enumerate(scenes):
        sp = spans[i]
        if i == 0:
            start = 0.0
        elif sp is not None:
            start = max(t + 0.5, words[sp[0]]["start"] - lead)   # never a scene under 0.5 s
        else:
            start = t
        starts.append(start)
        t = start + (float(s.get("duration", 2)) if sp is None else 0.5)
    end_voice = words[-1]["end"] if words else 0.0
    for i, s in enumerate(scenes):
        if i + 1 < len(scenes):
            dur = starts[i + 1] - starts[i]
        else:
            dur = max(end_voice + tail, starts[i] + float(s.get("duration", 1.5))) - starts[i]
        s["duration"] = round(max(0.5, round(dur * fps) / fps), 3)

    for i, s in enumerate(scenes):
        sp = spans[i]
        if sp is None:
            continue
        seg = words[sp[0]: sp[1] + 1]
        rel = lambda w: round(max(0.0, w["start"] - starts[i]), 3)
        cues: dict = {}
        # items: first spoken word matching a content word of the label
        labels = item_labels(s)
        if labels:
            times: list[float | None] = []
            used = -1
            for lab in labels:
                keys = [norm(x) for x in lab.split() if norm(x) and norm(x) not in STOP]
                hit = None
                for k, w in enumerate(seg):
                    if k > used and keys and (norm(w["w"]) in keys or any(
                            norm(w["w"]).startswith(x[:5]) for x in keys if len(x) >= 5)):
                        hit, used = rel(w), k
                        break
                times.append(hit)
            filled = _fill(times, rel(seg[0]), rel(seg[-1]))
            if any(x is not None for x in times) or len(labels) > 1:
                cues["items"] = filled
        # rich caption: token by token
        if s.get("rich"):
            toks = rich_tokens(s["rich"])
            times, k0 = [], 0
            for tok, icon in toks:
                n = norm(tok) if not icon else norm(_stem(tok))
                hit = None
                for k in range(k0, len(seg)):
                    if norm(seg[k]["w"]) == n and n:
                        hit, k0 = rel(seg[k]), k + 1
                        break
                times.append(hit)
            cues["words"] = _fill(times, rel(seg[0]), rel(seg[-1]))
        if s.get("type") == "stat":
            v = norm(str(s.get("value", "")))
            for w in seg:
                if norm(w["w"]) == v or (v and norm(w["w"]).startswith(v[:3])):
                    cues["value"] = rel(w)
                    break
        if cues:
            s["cues"] = cues
        else:
            s.pop("cues", None)
    return deck, notes


def _fill(times: list[float | None], a: float, b: float) -> list[float]:
    """Unmatched entries: interpolated between their matched neighbours."""
    out = list(times)
    n = len(out)
    known = [i for i, x in enumerate(out) if x is not None]
    if not known:
        return [round(x, 3) for x in spread(n, a, max(a, b - 0.2))]
    for i in range(n):
        if out[i] is not None:
            continue
        prev = max((k for k in known if k < i), default=None)
        nxt = min((k for k in known if k > i), default=None)
        if prev is None:
            out[i] = max(0.0, out[nxt] - 0.12 * (nxt - i))
        elif nxt is None:
            out[i] = out[prev] + 0.12 * (i - prev)
        else:
            out[i] = out[prev] + (out[nxt] - out[prev]) * (i - prev) / (nxt - prev)
    return [round(x, 3) for x in out]
