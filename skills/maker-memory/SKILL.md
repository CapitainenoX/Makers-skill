---
name: maker-memory
description: >-
  The channel's long-term brain: what the market is, what the creator liked and hated, the
  style signature learned over time, and every video already published (for deduplication).
  Use for "retiens ça", "j'aime pas ce style", "on a déjà fait ça ?", recording feedback,
  updating the channel's style, or at the end of every video. Read it before deciding
  anything; its rulings outrank the agent's own preferences.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Memory — so the next video starts ahead, not from zero

Four files in `.maker/memory/`. They are small on purpose: a briefing, not an archive.

| File | Holds | Lifetime |
|---|---|---|
| `market.md` | Niche, audience, formats that perform, competitors | Re-verify ~every 60 days |
| `style.md` | The channel's learned signature — pacing, type, colour, audio | Grows slowly |
| `feedback.md` | Dated liked/disliked rulings from the creator | Permanent, newest wins |
| `log.jsonl` | One line per delivered video | Append-only |

## Reading — before you decide anything

```bash
. .maker/env
"$MK" mem show feedback      # ALWAYS, before scripting or choosing a look
"$MK" mem show style
"$MK" mem show market
```

**Precedence, highest first:** the creator's message in this conversation → `feedback.md`
→ `style.md` → `market.md` → the craft defaults in `maker-motion` → your own taste.

When feedback contradicts what the brief seems to want, follow the feedback, say you did
in one line, and offer the override. Don't silently pick either side.

## Writing — the moment it happens, not at the end

Capture feedback the instant the creator expresses a preference, in their words:

```bash
"$MK" mem add feedback "DISLIKE: les zooms lents de 3s, 'ça fait diaporama'" --under DISLIKED
"$MK" mem add feedback "LIKE: le hook en texte plein écran frame 1" --under LIKED
"$MK" mem add style "Bed toujours sous -19 dB, ducké" --under Audio
"$MK" mem add style "Jamais d'intro de chaîne" --under "Never do"
```

One ruling per line, dated automatically. Write what they meant, not a paraphrase that
sounds more professional than what they said.

Promote a rule to `style.md` once it has held across **two** videos. A single reaction is
feedback; a repeated one is style.

## Deduplication — before writing any script

```bash
"$MK" mem similar "repo github qui remplace notion"
```

- `duplicate` → drop the angle, or pitch it explicitly as a sequel with a genuinely new take.
- `adjacent` → fine, but the hook must not repeat the earlier one. Read the old hook first.
- `clear` → go.

## Logging — at the end of every delivery, without exception

```bash
"$MK" mem log <slug> --title "Ce repo remplace Notion" \
  --hook "12 lignes. 40 000 étoiles." --duration 38 --format shorts \
  --tags github oss notion --sources "youtube:xyz" --notes "bed sombre, hook texte plein écran"
```

Later, when the creator reports numbers, add them as feedback — that is how "what performs"
in `market.md` stops being a guess.

## Self-improvement

After each video, ask one question: *what would I do differently, and is it a rule?*
If yes, one line into `style.md`. If it contradicts an existing line, replace it rather
than stacking — contradictory memory is worse than none.

Keep each file under ~40 lines. When one grows past that, consolidate: merge duplicates,
drop anything superseded, keep the sharpest phrasing. A memory nobody can read in ten
seconds will not be read.

## Reset

If the channel pivots, archive rather than delete:
`mv .maker/memory/market.md .maker/memory/market.2026-09.md` and start a fresh one.
The old numbers are still evidence.
