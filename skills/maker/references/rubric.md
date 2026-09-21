# Self-review rubric

Score each line 0–2. Be hostile — you are the last viewer before the real ones.
Below 14/20: rework. 14–16: fix the two worst lines. 17+: ship.

| # | Test | 0 | 2 |
|---|---|---|---|
| 1 | **Hook ≤1.5 s** | Logo, slow fade, a face saying "hey guys" | Motion + readable text + a stated stake on frame 1 |
| 2 | **Question posed** | Viewer doesn't know why to stay | An open loop they need closed |
| 3 | **Pace** | Shots drag past their idea | Every shot ends the moment its point lands |
| 4 | **Motion** | Static frames, one lazy zoom | Push-ins, pans and layers that carry meaning |
| 5 | **Typography** | Default font, static, centred by accident | A deliberate system: 2 sizes, 1 accent, animated in |
| 6 | **Sound design** | Music only | Music + SFX on the cuts + ducking under the voice |
| 7 | **Sound-off** | Needs audio to follow | Fully readable muted |
| 8 | **Payoff** | Trails off | Lands the promise made in the hook |
| 9 | **Loop / CTA** | Just stops | Last frame sends them somewhere (loop, next, follow) |
| 10 | **Signature** | Could be anyone's channel | Recognisably *this* channel's look |

## Look before scoring

```bash
"$MK" assemble edl.json --preview
"$MK" thumb out/final.mp4 out/f1.png --at 0.4     # the hook frame
"$MK" scan out/final.mp4                          # contact sheet of the whole cut
```
Open both PNGs with your image reader. Score frames you have seen, not frames you hope for.

## Writing the verdict

State the score, the single weakest line, and what you did about it. If you did nothing,
say why. Never pad a review to sound thorough.
