---
name: maker-script
description: >-
  Write the thing that makes people watch: hooks, story structure, beat sheets, voiceover
  scripts, on-screen text, titles, descriptions, tags, thumbnail concepts and image prompts
  (Nano Banana, Midjourney, Flux). Use for "écris le script", "trouve un hook", "un titre",
  "une description", "un prompt pour la miniature", narration writing, or before any edit —
  the beat sheet is what the editing phase consumes.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# Script — structure before decoration

Nobody skips a video because the transition was wrong. They skip because nothing was at
stake. Build the stake first.

## 1. The hook (spend half your effort here)

The first 1.5 seconds must do three things at once: **show motion**, **state a stake**,
**open a loop**. Pick one shape:

| Shape | Pattern | Example |
|---|---|---|
| Contradiction | "Everyone does X. X is wrong." | "Arrête d'utiliser Notion." |
| Number | A specific, strange figure | "12 lignes de code. 40 000 étoiles." |
| Threat | Something the viewer will lose | "Ton repo public fuite ça, là, maintenant." |
| Result-first | Show the end, then rewind | Final render on frame 1, then "voilà comment" |
| Impossible | A claim that demands proof | "Ce script monte la vidéo à ma place." |

Rules: under 9 words. Present tense. No "aujourd'hui on va voir". No greeting. No channel
name. If the hook needs a sentence of setup, it is not a hook.

## 2. Structure by length

**Short (15–60 s)** — one idea, no subplots.
```
0.0–1.5  HOOK        motion + text + stake
1.5–4    CONTEXT     the minimum to make the hook make sense
4–…      PROOF       2–4 beats, each a visual, each ≤ 4 s
last 3 s PAYOFF      close the loop, then a frame that loops back to the hook
```

**Long (4–15 min)** — the hook rules still apply, plus a re-hook every 40–60 s:
a new question, a pattern break (cut to a different look), or a stakes bump.
```
0–15 s   HOOK + PROMISE (what they'll have by the end)
…        CHAPTERS, each: question → attempt → complication → answer
−20 s    PAYOFF, then the next video as the natural continuation
```

Never plan a channel intro. Never plan "before we start". Never plan an outro card that
sits on screen doing nothing.

## 3. The beat sheet — this is the deliverable

Write `.maker/projects/<slug>/notes/beats.md`. Every row must be buildable:

| t | Beat | On screen | Text | Audio | Motion |
|---|---|---|---|---|---|
| 0.0 | Hook | crash zoom on the repo stars | "12 LIGNES. 40K ⭐" | whoosh + bed in | punch 1.0→1.15 |
| 1.4 | Turn | scroll of the README | "et ça remplace ça 👇" | — | panup |
| 3.0 | Proof 1 | terminal install | "3 commandes" | key clicks | punch |

If a row has no visual, it is not a beat — it is a thought. Cut it or find footage.

## 4. Voiceover script

Write for the ear: short sentences, one idea each, no subordinate clauses. Read it aloud
mentally — if you need a breath mid-sentence, split it. ~2.6 words/second is the planning
rate; a 40 s short holds about 95 words *including* pauses, so write 80.

Mark the edit in the script so the editor phase can follow it:
```
Ce repo a 40 000 étoiles. [CUT]
Et il fait une seule chose. [beat] Mais il la fait mieux que tout le monde. [CUT — punch in]
```

Hand it to `maker-voice` as plain text with the brackets stripped.

## 5. Titles, descriptions, tags

- **Title**: the hook, compressed. Front-load the noun that matters. Under 60 characters
  so it survives mobile truncation. No clickbait you don't pay off in the video.
- **Description**: first line repeats the promise (it's the only line most people see),
  then timestamps for long-form, then sources and credits. Credit every asset you
  downloaded — it is both correct and cheap insurance.
- **Tags**: the words a viewer would actually type. Five is plenty.

Give three title options, ranked, with one line of reasoning each. Never give ten.

## 6. Thumbnail

Concept first, prompt second. A thumbnail works when it can be read at 120 px wide:
one subject, one contrast, at most three words. The title and the thumbnail must not say
the same thing — together they should make a sentence.

Image prompt shape (Nano Banana / Flux / Midjourney all take this well):
```
<subject, doing something, with an expression>, <one strong contrast: colour, scale, light>,
<framing: close-up, rule-of-thirds left, subject facing camera>, <style: photographic /
3D render / flat vector>, <background: simple, high separation>, no text, 16:9
```
Ask for no text in the image, then add the words in the edit — you control the font there,
and you can read it at 120 px.

## 7. Output

```
**Hook** — "…"
**Beats** — `.maker/projects/<slug>/notes/beats.md` (6 beats, 38 s planned)
**Titres** — 1. … 2. … 3. …
**Miniature** — <concept in one line> + prompt ready
```

Then `maker-assets` sources exactly what the beat sheet lists — nothing else.
