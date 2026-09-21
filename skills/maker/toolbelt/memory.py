#!/usr/bin/env python3
"""mk mem — the channel's long-term brain.

Four files under .maker/memory/ :
  market.md    what this channel is, who watches, what performs, formats, cadence
  style.md     the visual/edit signature learned over time (fonts, pacing, colours)
  feedback.md  dated liked / disliked rulings from the creator — highest authority
  log.jsonl    one line per delivered video, used for dedupe and for "what worked"
"""
from __future__ import annotations
import argparse, datetime as dt, json, re, sys
from pathlib import Path
from _common import home, write_json, emit, die

SECTIONS = {
    "market":   "Market study",
    "style":    "Style signature",
    "feedback": "Creator feedback (liked / disliked)",
}
SEEDS = {
    "market": "# Market study\n\n_Fill via `mk mem add market \"...\"` or the maker-research skill._\n\n"
              "## Channel\n## Audience\n## What performs\n## What flops\n## Formats & cadence\n## Competitors\n",
    "style": "# Style signature\n\n## Pacing\n## Typography\n## Colour & grade\n## Motion language\n"
             "## Audio\n## Hooks & structure\n## Never do\n",
    "feedback": "# Creator feedback\n\nEvery ruling is law until contradicted by a newer one.\n\n"
                "## LIKED\n## DISLIKED\n",
}


def mem_dir() -> Path:
    d = home() / "memory"
    d.mkdir(parents=True, exist_ok=True)
    for name, seed in SEEDS.items():
        p = d / f"{name}.md"
        if not p.exists():
            p.write_text(seed, encoding="utf-8")
    log = d / "log.jsonl"
    log.touch(exist_ok=True)
    return d


def today() -> str:
    return dt.date.today().isoformat()


def cmd_show(a):
    d = mem_dir()
    if a.section in ("log", "all") or a.section is None:
        lines = [json.loads(x) for x in (d / "log.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()]
    if a.section in (None, "all"):
        out = {k: (d / f"{k}.md").read_text(encoding="utf-8") for k in SECTIONS}
        out["log"] = lines[-a.limit:]
        emit(out)
    elif a.section == "log":
        emit(lines[-a.limit:])
    elif a.section in SECTIONS:
        sys.stdout.write((d / f"{a.section}.md").read_text(encoding="utf-8"))
    else:
        die(f"unknown section {a.section!r}; use {', '.join([*SECTIONS, 'log', 'all'])}")


def cmd_add(a):
    if a.section not in SECTIONS:
        die(f"unknown section {a.section!r}; use {', '.join(SECTIONS)}")
    p = mem_dir() / f"{a.section}.md"
    text = " ".join(a.text).strip()
    if not text:
        die("nothing to add")
    heading = a.under
    body = p.read_text(encoding="utf-8")
    entry = f"- [{today()}] {text}\n"
    if heading:
        pat = re.compile(rf"^(##\s+{re.escape(heading)}\s*\n)", re.M | re.I)
        m = pat.search(body)
        if m:
            body = body[:m.end()] + entry + body[m.end():]
        else:
            body = body.rstrip() + f"\n\n## {heading}\n{entry}"
    else:
        body = body.rstrip() + "\n" + entry
    p.write_text(body, encoding="utf-8")
    emit({"ok": True, "file": str(p), "added": entry.strip()})


def cmd_log(a):
    rec = {
        "date": today(), "slug": a.slug, "title": a.title, "topic": a.topic or a.title,
        "format": a.format, "duration_s": a.duration, "hook": a.hook,
        "tags": a.tags, "sources": a.sources, "notes": a.notes,
        "performance": None,
    }
    p = mem_dir() / "log.jsonl"
    with p.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
    emit({"ok": True, "logged": rec})


def _tokens(s: str) -> set[str]:
    stop = {"the", "a", "an", "de", "le", "la", "les", "un", "une", "des", "and", "et",
            "of", "for", "to", "in", "on", "with", "my", "your", "how", "i", "is"}
    return {w for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if len(w) > 2 and w not in stop}


def cmd_similar(a):
    q = _tokens(" ".join(a.query))
    rows = []
    for line in (mem_dir() / "log.jsonl").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        hay = _tokens(f"{r.get('title','')} {r.get('topic','')} {' '.join(r.get('tags') or [])}")
        if not hay:
            continue
        score = len(q & hay) / max(1, len(q | hay))
        if score >= a.threshold:
            rows.append({"score": round(score, 2), "date": r["date"], "title": r["title"],
                         "slug": r["slug"], "hook": r.get("hook")})
    rows.sort(key=lambda r: -r["score"])
    verdict = ("duplicate — pick another angle or explicitly do a sequel" if rows and rows[0]["score"] >= 0.6
               else "adjacent — differentiate the angle and the hook" if rows
               else "clear — no prior video on this")
    emit({"query": " ".join(a.query), "verdict": verdict, "matches": rows[:5]})


def main():
    ap = argparse.ArgumentParser(prog="mk mem")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("show"); s.add_argument("section", nargs="?")
    s.add_argument("--limit", type=int, default=15); s.set_defaults(fn=cmd_show)

    ad = sub.add_parser("add"); ad.add_argument("section"); ad.add_argument("text", nargs="+")
    ad.add_argument("--under", default=""); ad.set_defaults(fn=cmd_add)

    lg = sub.add_parser("log"); lg.add_argument("slug")
    lg.add_argument("--title", required=True); lg.add_argument("--topic", default="")
    lg.add_argument("--format", default=""); lg.add_argument("--duration", type=float, default=0)
    lg.add_argument("--hook", default=""); lg.add_argument("--notes", default="")
    lg.add_argument("--tags", nargs="*", default=[]); lg.add_argument("--sources", nargs="*", default=[])
    lg.set_defaults(fn=cmd_log)

    sm = sub.add_parser("similar"); sm.add_argument("query", nargs="+")
    sm.add_argument("--threshold", type=float, default=0.25); sm.set_defaults(fn=cmd_similar)

    a = ap.parse_args(); a.fn(a)


if __name__ == "__main__":
    main()
