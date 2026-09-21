# Autonomous mode

Triggered by "mode autonome", "fais-toi plaisir", "trouve un sujet", or any request with
no topic attached. You own the topic, the script, the edit and the verdict.

## The loop

```
pick  →  build  →  judge  →  (fix ×2 max)  →  deliver  →  learn
```

1. **Pick.** `mk mem show market` for the niche. Search for what is moving *this week* in
   it. Shortlist three angles. `mk mem similar` each one. Drop duplicates. Pick the angle
   with the sharpest hook, not the biggest topic. Write the choice and the two rejects
   into `state.decisions` — the rejects are next week's videos.
2. **Build.** Run phases 2–5 without stopping. Make every micro-decision yourself and log
   the ones a human would argue with.
3. **Judge.** `mk qc`, then render `--preview` and actually open the contact sheet.
   Score yourself against `references/rubric.md`. Be hostile.
4. **Fix.** At most two revision passes. Each pass must change something structural — a
   recut, a new hook, a different bed. Re-lettering the same edit is not a pass.
   `state.revision` tracks it.
5. **Deliver.** One table, the file paths, the decisions worth arguing about.
6. **Learn.** `mk mem log` the video. Append anything you learned to `style.md`.

## Budgets — stop at the first one you hit

| Budget | Limit |
|---|---|
| Revision passes | 2 |
| Web searches per video | 8 |
| Downloads per video | 15 |
| Full-quality renders | 1 (previews are unlimited) |
| Minutes of AI matting | 5 without asking |

Out of budget with the video still weak? Deliver the best version, say exactly what is
weak and what you would need. A shipped 7/10 beats a perfect 0/10.

## What you may decide alone

Topic, angle, hook, structure, shot order, music, memes, typography, colour, pacing,
transitions, titles, descriptions, thumbnails, which sub-skill to load, which tool to use.

## What you stop for

- No usable footage and nothing downloadable for the subject.
- A real person's likeness or voice in a context they did not consent to.
- Money: paid APIs, paid stock, anything that spends the creator's credit.
- A claim you cannot source — say "unverified" on screen or cut the claim.
- The creator's feedback file contradicts what the brief seems to ask for. Follow the
  feedback, say you did, and offer the override in one line.

## Self-review rubric

`references/rubric.md`. Run it honestly. A 6/10 you name is worth more than an 9/10
you assert.
