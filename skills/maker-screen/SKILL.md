---
name: maker-screen
description: >-
  Direct the creator's screen recordings and turn raw captures into edited footage: what to
  record and how, then auto zooms, cursor emphasis, speed ramps on dead time, cropping for
  vertical, and framing a capture so it reads on mobile. Use for "enregistre ton écran",
  screen capture workflows, tutorial/demo footage, product walkthroughs, or when the beat
  sheet needs a shot only the creator can film.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
---

# Screen — brief the capture, then make it watchable

Raw screen capture is the most boring footage that exists and the most useful. The value
is entirely in what you do to it afterwards.

## 1. Brief the recording precisely

Ask for exactly the shots the beat sheet needs. One instruction per shot, with a duration:

```
1. Scroll lent de la page du repo, du haut jusqu'aux stars. ~8 s, sans t'arrêter.
2. Le terminal : tape la commande d'install, laisse tourner jusqu'au succès. ~20 s.
3. L'appli qui s'ouvre, tu cliques sur le bouton X. ~6 s.
```

Give the capture settings once, then stop explaining:

| Setting | Value | Why |
|---|---|---|
| Resolution | 1920×1080 minimum, 2560×1440 better | You will crop in 1.4–1.8× |
| Frame rate | 60 fps | Survives speed ramps without judder |
| Zoom the OS/browser | 125–150 % **before** recording | Text has to read at 360 px wide |
| Cursor | visible, click highlight on if the tool has it | Guides the eye |
| Window | one clean window, no desktop, no notifications | Clutter costs comprehension |
| Audio | separate track, or none — narration comes later | Keyboard noise is not sound design |

Any recorder works: OBS, the OS built-in, the browser's own. Don't prescribe software the
creator doesn't have.

## 2. Index what comes back

```bash
. .maker/env
"$MK" scan .maker/projects/<slug>/rushes --deep
```

Open the contact-sheet PNGs. Note per capture: where the action actually happens (the
region to crop to), the dead time to cut or speed up, and the moments worth a push-in.

## 3. Make it dynamic

A capture becomes watchable through four moves:

**Crop to the action.** Never show a full desktop on vertical. Frame the region:
```jsonc
{ "src": "rushes/screen.mkv", "in": 12.0, "out": 18.0, "fit": "cover",
  "motion": { "type": "punch", "from": 1.3, "to": 1.55, "ease": "easeInOutCubic" } }
```
Starting above 1.0 *is* the crop — you are already inside the frame, then you push further.

**Speed the dead time.** Installs, loads, long scrolls: `"speed": 2.2`. Keep the motion
continuous rather than cutting it — the continuity is what proves it really worked.

**Push in on the moment.** When the thing happens, `punch` 12–18 % onto it in 0.6 s.
This is the single highest-value edit on screen footage.

**Point at it.** A text layer with an arrow or a circle sticker where the click lands:
```jsonc
{ "type": "text", "text": "ici 👇", "style": "kicker", "start": 3.1, "duration": 1.2,
  "x": 0.62, "y": 0.41, "in": { "anim": "popIn" } }
```

**Sound.** Key clicks at −14 dB and a soft tick on each UI change turn silence into pace.

## 4. Vertical from horizontal

Options, best first:
1. **Crop to the action** (`fit: cover` + a starting zoom ≥1.3). Most of a 16:9 screen is
   empty for your purposes.
2. **Blur-pad** (`fit: blur`) when the whole width matters. Never bare black bars.
3. **Stack**: capture on top, face/text below — two clips composited, only worth it for
   long tutorials.

## 5. When the creator can't record

Say so and offer the substitute in the same line: a downloaded demo clip, a static
screenshot with a Ken-Burns move, or a Remotion-built mock of the UI. Do not silently
drop a beat from the sheet.

## 6. Output

```
**Captures demandées** — 3 plans, ~34 s total (brief ci-dessus)
**Reçu** — 3/3. screen-02 à 60 fps, lisible après crop 1.5×
**Traitement** — install accéléré ×2.2, push-in sur le succès, clics à −14 dB
```
