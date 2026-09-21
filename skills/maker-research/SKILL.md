---
name: maker-research
description: >-
  Study a video market before making anything: find the niche, what currently performs in it,
  which formats win, what competitors ship, and whether this channel already covered the topic.
  Use for "idée de vidéo", "what should I post", "trouve un sujet", trend checks, competitor
  analysis, topic validation, or before writing any script. Writes its findings into the
  channel's long-term market memory so the study is done once, not every time.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# Research — know the market before you touch a timeline

A video that is edited beautifully about the wrong thing is a wasted day. This phase is
cheap; the edit is not.

## 1. Read memory first

```bash
. .maker/env
"$MK" mem show market
```

If `market.md` already has a Channel and an Audience section, **do not re-study the
niche**. Go straight to step 3 (topic hunt). Re-study only when the creator says the
channel changed, or the file is older than ~60 days.

## 2. First time only: build the market file

Ask the creator only what you genuinely cannot infer (4 questions maximum, at once):
channel/handle, subject, target platform, what they think works. Then verify, don't trust:

- Search the niche's current top performers. Note **format** (talking head, screen capture,
  faceless voiceover, edit-heavy montage), **length**, **hook pattern**, **upload cadence**.
- Open 3–5 actual top videos. Read the titles and thumbnails as a set: what promise
  repeats? That repetition *is* the market.
- Find the ceiling and the floor: the best-performing small channel tells you what is
  reachable; the biggest tells you what is saturated.

Write it down, one line at a time:

```bash
"$MK" mem add market "Audience: FR devs 18-34, watch muted on mobile at night" --under Audience
"$MK" mem add market "Winning format: 35-50s faceless screen-capture + hard captions" --under "What performs"
"$MK" mem add market "Flops: >90s explainers, anything with a 5s branded intro" --under "What flops"
```

Keep it under ~40 lines total. Memory is a briefing, not an archive.

## 3. Topic hunt

1. Search for what moved **this week** in the niche. Recency beats authority here.
2. Shortlist three angles, each phrased as a *hook*, not a subject.
   Bad: "Un projet GitHub cool". Good: "Ce repo de 12 lignes remplace Notion."
3. Dedupe every one of them:
   ```bash
   "$MK" mem similar "repo github qui remplace notion"
   ```
   - `duplicate` → drop it, or pitch it explicitly as a sequel with a new angle.
   - `adjacent` → keep it, but the hook must not repeat the earlier one.
4. Pick on **hook sharpness**, not topic size. Record the two rejects in `state.decisions`.

## 4. Validate the angle in one pass

| Check | Kill the angle if |
|---|---|
| Is there a visual? | The whole subject is abstract and you have nothing to show |
| Is there a stake? | Nobody loses anything if they scroll past |
| Can it be told in the target length? | It needs 4 minutes and the format is 45 s |
| Is the claim true? | You cannot source it — either cut it or label it unverified on screen |

## 5. Output

Write to `state.brief` and report in five lines:

```
**Angle retenu** — "<hook>"
Marché : <format qui marche> · <durée> · <plateforme>
Pourquoi : <la raison en une ligne>
Écarté : <angle 2> (déjà traité le 12/03), <angle 3> (pas de visuel)
```

Then hand off to `maker-script`. Do not start sourcing before the script exists — you will
download the wrong things.

## Notes

- Platform numbers drift. When you cite one, cite where it came from and when.
- The creator's `feedback.md` outranks anything you find on the web. Read it before deciding.
- Three angles is the limit. More is procrastination wearing a research costume.
